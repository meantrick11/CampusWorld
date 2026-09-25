'use strict';

/**
 * 内容服务：取送、闲置、求购、校园墙的发布、编辑、查询与状态维护。
 *
 * 纯业务逻辑，只依赖仓库契约与注入的时钟，因此可以在 Node 下真实运行测试。
 * 云对象（jirun-content / jirun-admin）负责把服务端 token 得来的 actor 传进来，
 * 并把抛出的错误码转换为统一返回。
 *
 * 关键约束：
 * - 所有写操作先校验身份与归属，再校验版本，最后才写入。
 * - 编辑创建新版本：旧公开版本在新版本通过前保持原样，待审正文不泄漏。
 * - 已下架或已删除的内容不能通过编辑恢复。
 * - 状态变更只影响业务状态，与任何资金动作无关。
 */

const { assertRepository } = require('./content-repository.js');
const { validateContent } = require('./validation.js');
const { VISIBILITY, REVISION_STATUS, canReadPublic } = require('./content-policy.js');

const ERROR_CODES = {
	AUTH_REQUIRED: 'AUTH_REQUIRED',
	FORBIDDEN: 'FORBIDDEN',
	INVALID_INPUT: 'INVALID_INPUT',
	VERSION_CONFLICT: 'VERSION_CONFLICT',
	CONTENT_UNAVAILABLE: 'CONTENT_UNAVAILABLE',
	DEPENDENCY_UNAVAILABLE: 'DEPENDENCY_UNAVAILABLE'
};

/** 新建内容时的初始业务状态；校园墙没有业务状态。 */
const INITIAL_BUSINESS_STATUS = {
	delivery: 'seeking',
	idle: 'available',
	wanted: 'seeking',
	wall: null
};

/**
 * 业务状态白名单。只允许表内相邻推进，已结束状态不能再回到进行中。
 * 这些状态只描述信息状态，不产生结算、退款或放款。
 */
const STATUS_TRANSITIONS = {
	delivery: {
		seeking: ['contacted', 'completed', 'closed'],
		contacted: ['completed', 'closed'],
		completed: ['closed'],
		closed: []
	},
	idle: {
		available: ['sold', 'gifted', 'closed'],
		sold: ['closed'],
		gifted: ['closed'],
		closed: []
	},
	wanted: {
		seeking: ['fulfilled', 'closed'],
		fulfilled: ['closed'],
		closed: []
	}
};

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_MAX = 50;

function fail(code, message) {
	const error = new Error(message || code);
	error.code = code;
	return error;
}

const describeErrors = (errors) =>
	errors.map((item) => `${item.field}:${item.code}`).join(', ');

function createContentService({ repository, clock } = {}) {
	assertRepository(repository);
	const now = typeof clock === 'function' ? clock : () => Date.now();

	const requireActor = (actor) => {
		if (!actor || typeof actor.userId !== 'string' || actor.userId.trim() === '') {
			throw fail(ERROR_CODES.AUTH_REQUIRED, '请先登录');
		}
		return actor;
	};

	const requireRequestId = (input) => {
		const requestId = input && input.requestId;
		if (typeof requestId !== 'string' || requestId.trim() === '') {
			throw fail(ERROR_CODES.INVALID_INPUT, '缺少 requestId');
		}
		return requestId;
	};

	const isReviewer = (actor) => Boolean(actor && actor.isReviewer === true);

	const clampLimit = (limit) => {
		const value = Number(limit);
		if (!Number.isFinite(value) || value <= 0) return DEFAULT_PAGE_SIZE;
		return Math.min(Math.floor(value), PAGE_SIZE_MAX);
	};

	/** 归一化写入负载：只取允许的字段，不接受客户端附加的内部字段。 */
	const normalizePayload = (input) => ({
		kind: input.kind,
		title: typeof input.title === 'string' ? input.title : '',
		body: typeof input.body === 'string' ? input.body : '',
		mediaIds: Array.isArray(input.mediaIds) ? input.mediaIds.slice() : [],
		mediaTypes: Array.isArray(input.mediaTypes) ? input.mediaTypes.slice() : [],
		details: input.details
	});

	const assertValid = (payload) => {
		const result = validateContent(payload);
		if (!result.valid) {
			throw fail(ERROR_CODES.INVALID_INPUT, describeErrors(result.errors));
		}
	};

	/** 公开 DTO：不包含版本指针、审核意见或任何内部字段。 */
	const toPublicDTO = (root, revision) => ({
		id: root._id,
		kind: root.kind,
		author: { userId: root.authorId },
		title: revision.title,
		body: revision.body,
		media: (revision.mediaIds || []).map((id) => ({ id })),
		details: revision.details,
		businessStatus: root.businessStatus,
		createdAt: root.createdAt
	});

	/** 本人 DTO：附带审核状态与版本号，供「我的发布」维护使用。 */
	const toMineDTO = (root, row) => {
		const revision = row.latest || row.published || null;
		const reviewStatus = row.latest
			? row.latest.reviewStatus
			: row.published
				? row.published.reviewStatus
				: REVISION_STATUS.PENDING;
		return {
			...toPublicDTO(root, revision || { title: '', body: '', mediaIds: [], details: {} }),
			visibility: root.visibility,
			reviewStatus,
			pendingRevisionId: root.pendingRevisionId,
			version: root.version,
			updatedAt: root.updatedAt
		};
	};

	/** 读取根内容并做归属校验，返回可供后续写入的副本。 */
	const loadOwnedRoot = async (actor, id, { allowRemoved = false } = {}) => {
		if (typeof id !== 'string' || id.trim() === '') {
			throw fail(ERROR_CODES.INVALID_INPUT, '缺少内容标识');
		}
		const root = await repository.getById(id);
		if (!root || root.visibility === VISIBILITY.DELETED) {
			throw fail(ERROR_CODES.CONTENT_UNAVAILABLE, '该内容暂不可查看');
		}
		// 先判归属：他人无权得知内容是否已下架等细节
		if (root.authorId !== actor.userId) {
			throw fail(ERROR_CODES.FORBIDDEN, '只能操作自己发布的信息');
		}
		if (!allowRemoved && root.visibility === VISIBILITY.REMOVED) {
			throw fail(ERROR_CODES.CONTENT_UNAVAILABLE, '已下架内容不能修改');
		}
		return root;
	};

	const commitRoot = async (root, expectedVersion) => {
		const saved = await repository.saveWithVersion(root, expectedVersion);
		if (!saved.ok) {
			throw fail(ERROR_CODES.VERSION_CONFLICT, '内容已被修改，请刷新后重试');
		}
		return saved.current;
	};

	/**
	 * 预留 requestId 后执行写入。业务失败时释放预留，避免永久占用。
	 * 预留成功但同键并发请求会收到可重试的 DEPENDENCY_UNAVAILABLE，
	 * 这样「响应丢失后重试」既不会产生第二条内容，也不会被误判为参数错误。
	 */
	const withRequestKey = async (actorId, requestId, handler) => {
		const claim = await repository.reserveRequest(actorId, requestId);
		if (!claim.ok) {
			if (claim.result) return claim.result;
			throw fail(ERROR_CODES.DEPENDENCY_UNAVAILABLE, '相同请求正在处理，请稍后重试');
		}
		try {
			const result = await handler();
			await repository.completeRequest(actorId, requestId, result);
			return result;
		} catch (error) {
			await repository.releaseRequest(actorId, requestId);
			throw error;
		}
	};

	// ---------------- 发布与编辑 ----------------

	async function submitContent(actor, input) {
		const user = requireActor(actor);
		const requestId = requireRequestId(input);

		return withRequestKey(user.userId, requestId, async () => {
			const payload = normalizePayload(input);
			assertValid(payload);

			const timestamp = now();
			const created = await repository.createContentWithRevision({
				linkAs: 'pending',
				root: {
					authorId: user.userId,
					kind: payload.kind,
					publishedRevisionId: null,
					pendingRevisionId: null,
					visibility: VISIBILITY.PENDING,
					businessStatus: INITIAL_BUSINESS_STATUS[payload.kind],
					version: 1,
					deletedByAuthor: false,
					createdAt: timestamp,
					updatedAt: timestamp
				},
				revision: {
					revision: 1,
					title: payload.title,
					body: payload.body,
					mediaIds: payload.mediaIds,
					details: payload.details,
					reviewStatus: REVISION_STATUS.PENDING,
					createdAt: timestamp
				}
			});

			return {
				id: created.root._id,
				version: created.root.version,
				visibility: created.root.visibility
			};
		});
	}

	async function editContent(actor, input) {
		const user = requireActor(actor);
		const requestId = requireRequestId(input);

		return withRequestKey(user.userId, requestId, async () => {
			const root = await loadOwnedRoot(user, input.id);
			if (root.version !== input.expectedVersion) {
				throw fail(ERROR_CODES.VERSION_CONFLICT, '内容已被修改，请刷新后重试');
			}

			const payload = normalizePayload(input);

			// 未提交的字段沿用当前最新版本的内容，避免局部编辑被当成清空
			const base =
				(await repository.getLatestRevision(root._id)) ||
				(await repository.getPublishedRevision(root._id)) ||
				{};

			const mediaProvided = Array.isArray(input.mediaIds) || Array.isArray(input.mediaTypes);
			const merged = {
				kind: root.kind,
				title: input.title === undefined ? base.title || '' : payload.title,
				body: input.body === undefined ? base.body || '' : payload.body,
				mediaIds: mediaProvided ? payload.mediaIds : base.mediaIds || [],
				mediaTypes: payload.mediaTypes,
				details: input.details === undefined ? base.details : payload.details
			};
			assertValid(merged);

			const timestamp = now();
			const revision = await repository.createRevision({
				contentId: root._id,
				revision: (base.revision || 0) + 1,
				title: merged.title,
				body: merged.body,
				mediaIds: merged.mediaIds,
				details: merged.details,
				reviewStatus: REVISION_STATUS.PENDING,
				createdAt: timestamp
			});

			// visibility 保持原值：已公开内容在“新版本通过”之前继续展示旧版本
			const next = {
				...root,
				pendingRevisionId: revision._id,
				updatedAt: timestamp
			};
			const current = await commitRoot(next, input.expectedVersion);

			return { id: current._id, version: current.version, visibility: current.visibility };
		});
	}

	// ---------------- 状态维护与删除 ----------------

	async function updateStatus(actor, input) {
		const user = requireActor(actor);
		const requestId = requireRequestId(input);

		return withRequestKey(user.userId, requestId, async () => {
			const root = await loadOwnedRoot(user, input.id);
			if (root.version !== input.expectedVersion) {
				throw fail(ERROR_CODES.VERSION_CONFLICT, '内容已被修改，请刷新后重试');
			}

			const transitions = STATUS_TRANSITIONS[root.kind];
			if (!transitions) {
				throw fail(ERROR_CODES.INVALID_INPUT, '该类型没有业务状态');
			}

			let businessStatus = input.status;
			const allowed = transitions[root.businessStatus] || [];
			if (businessStatus === undefined || businessStatus === null) {
				// 仅调整剩余数量时可以不传状态
				businessStatus = root.businessStatus;
			} else if (typeof businessStatus !== 'string' || businessStatus === '') {
				throw fail(ERROR_CODES.INVALID_INPUT, '状态取值不合法');
			} else if (!allowed.includes(businessStatus)) {
				throw fail(ERROR_CODES.INVALID_INPUT, '不允许的状态变化');
			}

			// 闲置数量归零时退出有效列表，使用 closed 而不是伪造成交
			if (root.kind === 'idle' && input.remainingQuantity === 0) {
				if (!allowed.includes('closed') && businessStatus !== 'closed') {
					throw fail(ERROR_CODES.INVALID_INPUT, '不允许的状态变化');
				}
				businessStatus = 'closed';
			}

			const current = await commitRoot(
				{ ...root, businessStatus, updatedAt: now() },
				input.expectedVersion
			);

			return { id: current._id, version: current.version, businessStatus: current.businessStatus };
		});
	}

	async function deleteContent(actor, input) {
		const user = requireActor(actor);
		const requestId = requireRequestId(input);

		return withRequestKey(user.userId, requestId, async () => {
			const root = await loadOwnedRoot(user, input.id, { allowRemoved: true });
			if (root.version !== input.expectedVersion) {
				throw fail(ERROR_CODES.VERSION_CONFLICT, '内容已被修改，请刷新后重试');
			}

			const current = await commitRoot(
				{
					...root,
					visibility: VISIBILITY.DELETED,
					deletedByAuthor: true,
					pendingRevisionId: null,
					updatedAt: now()
				},
				input.expectedVersion
			);

			return { id: current._id, visibility: current.visibility };
		});
	}

	// ---------------- 查询 ----------------

	async function getPublic(actor, input) {
		const id = input && input.id;
		if (typeof id !== 'string' || id.trim() === '') {
			throw fail(ERROR_CODES.INVALID_INPUT, '缺少内容标识');
		}

		const root = await repository.getById(id);
		if (!root || root.visibility === VISIBILITY.DELETED) {
			throw fail(ERROR_CODES.CONTENT_UNAVAILABLE, '该内容暂不可查看');
		}

		const viewerId = actor && actor.userId;
		const privileged = viewerId === root.authorId || isReviewer(actor);

		if (privileged) {
			// 作者与审核员可预览自己当前的版本（含待审）
			const latest = await repository.getLatestRevision(root._id);
			const revision = latest || (await repository.getPublishedRevision(root._id));
			if (!revision) throw fail(ERROR_CODES.CONTENT_UNAVAILABLE, '该内容暂不可查看');
			return { ...toPublicDTO(root, revision), visibility: root.visibility, pendingRevisionId: root.pendingRevisionId };
		}

		const revision = root.publishedRevisionId
			? await repository.getRevision(root.publishedRevisionId)
			: null;
		if (!revision || !canReadPublic({ visibility: root.visibility, revisionStatus: revision.reviewStatus })) {
			throw fail(ERROR_CODES.CONTENT_UNAVAILABLE, '该内容暂不可查看');
		}
		return toPublicDTO(root, revision);
	}

	async function listPublic(actor, query = {}) {
		const page = await repository.listPublic({
			kind: query.kind,
			keyword: query.keyword,
			category: query.category,
			region: query.region,
			cursor: query.cursor,
			limit: clampLimit(query.limit)
		});
		return {
			items: page.items.map((row) => toPublicDTO(row.root, row.published)),
			nextCursor: page.nextCursor
		};
	}

	async function listMine(actor, query = {}) {
		const user = requireActor(actor);
		const page = await repository.listMine({
			authorId: user.userId,
			kind: query.kind,
			status: query.status,
			cursor: query.cursor,
			limit: clampLimit(query.limit)
		});
		return {
			items: page.items.map((row) => toMineDTO(row.root, row)),
			nextCursor: page.nextCursor
		};
	}

	// ---------------- 审核（T04 最小分支，T09 扩展举报与复核） ----------------

	async function decideContent(actor, input) {
		const user = requireActor(actor);
		if (!isReviewer(user)) {
			throw fail(ERROR_CODES.FORBIDDEN, '需要审核权限');
		}
		const requestId = requireRequestId(input);
		const action = input.action;
		if (action !== 'approve' && action !== 'reject') {
			throw fail(ERROR_CODES.INVALID_INPUT, '不支持的审核动作');
		}

		return withRequestKey(user.userId, requestId, async () => {
			const revisionId = input.targetId;
			if (typeof revisionId !== 'string' || revisionId.trim() === '') {
				throw fail(ERROR_CODES.INVALID_INPUT, '缺少审核目标');
			}

			const revision = await repository.getRevision(revisionId);
			if (!revision) throw fail(ERROR_CODES.CONTENT_UNAVAILABLE, '待审版本不存在');

			const root = await repository.getById(revision.contentId);
			if (!root || root.visibility === VISIBILITY.DELETED) {
				throw fail(ERROR_CODES.CONTENT_UNAVAILABLE, '该内容暂不可查看');
			}
			if (root.version !== input.expectedVersion) {
				throw fail(ERROR_CODES.VERSION_CONFLICT, '内容已变化，请重新审核');
			}
			// 必须是当前待审版本：否则会用旧版本的审核结果发布用户后来修改的版本
			if (!root.pendingRevisionId || root.pendingRevisionId !== revisionId) {
				throw fail(ERROR_CODES.VERSION_CONFLICT, '待审版本已变化，请重新审核');
			}

			const timestamp = now();
			const approved = action === 'approve';
			await repository.saveRevisionStatus(
				revisionId,
				approved ? REVISION_STATUS.APPROVED : REVISION_STATUS.REJECTED
			);

			const next = {
				...root,
				pendingRevisionId: null,
				publishedRevisionId: approved ? revisionId : root.publishedRevisionId,
				visibility: approved
					? VISIBILITY.PUBLISHED
					: root.publishedRevisionId
						? VISIBILITY.PUBLISHED
						: VISIBILITY.REJECTED,
				updatedAt: timestamp
			};
			const current = await commitRoot(next, input.expectedVersion);

			const decision = await repository.appendDecision({
				contentId: root._id,
				revisionId,
				revision: revision.revision,
				action,
				reason: input.reason || '',
				actorId: user.userId,
				createdAt: timestamp
			});
			await repository.appendAuditLog({
				action: `content.${action}`,
				targetType: 'content',
				targetId: root._id,
				revisionId,
				actorId: user.userId,
				reason: input.reason || '',
				createdAt: timestamp
			});

			return {
				decisionId: decision._id,
				outcome: approved ? 'approved' : 'rejected',
				version: current.version
			};
		});
	}

	return {
		submitContent,
		editContent,
		updateStatus,
		deleteContent,
		getPublic,
		listPublic,
		listMine,
		decideContent
	};
}

module.exports = {
	createContentService,
	ERROR_CODES,
	INITIAL_BUSINESS_STATUS,
	STATUS_TRANSITIONS
};
