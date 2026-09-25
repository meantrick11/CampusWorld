'use strict';

/**
 * 内容治理服务：举报、审核决定、下架、复核、账号限制、配置与概览。
 *
 * 纯业务逻辑，只依赖仓储契约与注入的时钟，可在 Node 下真实运行测试。
 *
 * 关键约束：
 * - 管理员身份来自服务端 actor，客户端声称的 isAdmin／isReviewer 一律无效。
 * - 审核动作按目标类型走白名单，不存在「什么都能做」的通用动作。
 * - 审核针对具体版本：旧版本的审核结果不能发布用户后来修改的版本。
 * - 提交举报不改变内容可见性；只有审核决定里的 remove／uphold 才改变。
 * - 复核通过也不能恢复作者已删除的内容。
 * - 账号限制必须给出原因并留痕，且只允许发布与私聊两个范围。
 * - 配置不允许出现任何付费能力开关。
 * - 不提供管理员浏览他人私聊的能力。
 */

const { assertRepository } = require('./moderation-repository.js');
const {
	canRestore,
	canReview,
	isAllowedAdminAction,
	isAllowedRestrictionScope,
	isAllowedReportReason,
	canAppealDecision,
	isForbiddenConfigKey
} = require('./moderation-policy.js');
const { canReadPublic, VISIBILITY, REVISION_STATUS } = require('./content-policy.js');

const ERROR_CODES = {
	AUTH_REQUIRED: 'AUTH_REQUIRED',
	FORBIDDEN: 'FORBIDDEN',
	INVALID_INPUT: 'INVALID_INPUT',
	VERSION_CONFLICT: 'VERSION_CONFLICT',
	CONTENT_UNAVAILABLE: 'CONTENT_UNAVAILABLE',
	DEPENDENCY_UNAVAILABLE: 'DEPENDENCY_UNAVAILABLE'
};

const QUEUES = ['content', 'comment', 'report', 'appeal'];
const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_MAX = 50;

function fail(code, message) {
	const error = new Error(message || code);
	error.code = code;
	return error;
}

function createModerationService({ repository, clock } = {}) {
	assertRepository(repository);
	const now = typeof clock === 'function' ? clock : () => Date.now();

	const requireActor = (actor) => {
		if (!actor || typeof actor.userId !== 'string' || actor.userId.trim() === '') {
			throw fail(ERROR_CODES.AUTH_REQUIRED, '请先登录');
		}
		return actor;
	};

	const requireReviewer = (actor) => {
		requireActor(actor);
		if (!canReview(actor)) {
			throw fail(ERROR_CODES.FORBIDDEN, '需要审核权限');
		}
		return actor;
	};

	const clampLimit = (limit) => {
		const value = Number(limit);
		if (!Number.isFinite(value) || value <= 0) return DEFAULT_PAGE_SIZE;
		return Math.min(Math.floor(value), PAGE_SIZE_MAX);
	};

	const requireRequestId = (requestId) => {
		if (typeof requestId !== 'string' || requestId.trim() === '') {
			throw fail(ERROR_CODES.INVALID_INPUT, '缺少 requestId');
		}
		return requestId;
	};

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

	/** 决定与留痕必须成对写入，记录目标版本、原因与操作者。 */
	const recordDecision = async ({ targetType, targetId, revisionId, action, reason, actorId, extra = {} }) => {
		const timestamp = now();
		const decision = await repository.appendDecision({
			targetType,
			targetId,
			revisionId: revisionId || null,
			action,
			reason: reason || '',
			actorId,
			createdAt: timestamp,
			...extra
		});
		await repository.appendAuditLog({
			action: `${targetType}.${action}`,
			targetType,
			targetId,
			revisionId: revisionId || null,
			actorId,
			reason: reason || '',
			createdAt: timestamp
		});
		return decision;
	};

	const loadContent = async (contentId) => {
		const entry = await repository.getContent(contentId);
		if (!entry) throw fail(ERROR_CODES.CONTENT_UNAVAILABLE, '该内容不存在');
		return entry;
	};

	// ---------------- 用户侧：举报与复核 ----------------

	async function submitReport(actor, input) {
		const user = requireActor(actor);
		const { targetType, targetId, reason, description, requestId } = input || {};

		if (!['content', 'comment', 'user'].includes(targetType)) {
			throw fail(ERROR_CODES.INVALID_INPUT, '举报对象类型不支持');
		}
		if (typeof targetId !== 'string' || targetId.trim() === '') {
			throw fail(ERROR_CODES.INVALID_INPUT, '缺少举报对象');
		}
		if (!isAllowedReportReason(reason)) {
			throw fail(ERROR_CODES.INVALID_INPUT, '请选择举报原因');
		}
		requireRequestId(requestId);

		return withRequestKey(user.userId, requestId, async () => {
			// 存在性检查：举报不存在的对象没有意义
			if (targetType === 'content') await loadContent(targetId);
			if (targetType === 'comment') {
				const comment = await repository.getComment(targetId);
				if (!comment) throw fail(ERROR_CODES.CONTENT_UNAVAILABLE, '该评论不存在');
			}

			// 举报只写记录，不改内容可见性；处理期间保持原有可见性
			const report = await repository.createReport({
				reporterId: user.userId,
				targetType,
				targetId,
				reason,
				description: typeof description === 'string' ? description.slice(0, 500) : '',
				status: 'submitted',
				createdAt: now()
			});
			await repository.appendAuditLog({
				action: 'report.submit',
				targetType,
				targetId,
				actorId: user.userId,
				reason,
				createdAt: now()
			});

			return {
				id: report._id,
				status: report.status
			};
		});
	}

	/** 本人相关案件：我提交的举报，以及对我的内容作出的决定（含下架原因）。 */
	async function listMyCases(actor, query = {}) {
		const user = requireActor(actor);
		const decisions = (await repository.listDecisions()) || [];
		const items = [];
		for (const decision of decisions) {
			// 直接针对内容的决定用 targetId；针对举报或复核的决定用记录里的受影响内容
			const contentId = decision.targetType === 'content' ? decision.targetId : decision.contentId;
			if (!contentId) continue;
			const entry = await repository.getContent(contentId);
			if (!entry || entry.root.authorId !== user.userId) continue;
			items.push({
				decisionId: decision._id,
				action: decision.action,
				reason: decision.reason,
				targetType: decision.targetType,
				revisionId: decision.revisionId,
				contentId,
				createdAt: decision.createdAt
			});
		}
		const reports = await repository.listReports({
			cursor: query.cursor,
			limit: clampLimit(query.limit)
		});
		const mineReports = reports.items.filter((row) => row.reporterId === user.userId).map((row) => ({
			reportId: row._id,
			targetType: row.targetType,
			targetId: row.targetId,
			reason: row.reason,
			status: row.status,
			createdAt: row.createdAt
		}));
		return {
			items: [...items, ...mineReports].sort((a, b) => b.createdAt - a.createdAt),
			nextCursor: null
		};
	}

	async function appeal(actor, input) {
		const user = requireActor(actor);
		const { decisionId, explanation, requestId } = input || {};
		requireRequestId(requestId);

		return withRequestKey(user.userId, requestId, async () => {
			const decisions = (await repository.listDecisions()) || [];
			const decision = decisions.find((row) => row._id === decisionId);
			if (!decision) throw fail(ERROR_CODES.INVALID_INPUT, '找不到对应的处理决定');

			// 只有决定所涉及内容的作者可以申请复核
			if (decision.targetType === 'content') {
				const entry = await repository.getContent(decision.targetId);
				if (!entry || entry.root.authorId !== user.userId) {
					throw fail(ERROR_CODES.FORBIDDEN, '只能对自己的内容申请复核');
				}
			}

			const existing = await repository.findAppealByDecision(decisionId);
			if (!canAppealDecision({
					decisionId,
					alreadyAppealed: Boolean(existing)
				})) {
				throw fail(ERROR_CODES.INVALID_INPUT, '该决定已申请过复核');
			}

			// 受理只是登记，内容可见性保持不变
			const record = await repository.createAppeal({
				decisionId,
				contentId: decision.targetId,
				appellantId: user.userId,
				explanation: typeof explanation === 'string' ? explanation.slice(0, 500) : '',
				status: 'submitted',
				createdAt: now()
			});
			await repository.appendAuditLog({
				action: 'appeal.submit',
				targetType: 'appeal',
				targetId: record._id,
				actorId: user.userId,
				reason: '',
				createdAt: now()
			});
			return {
				id: record._id,
				status: record.status
			};
		});
	}

	// ---------------- 管理侧 ----------------

	async function listQueue(actor, query = {}) {
		requireReviewer(actor);
		const queue = query.queue;
		if (!QUEUES.includes(queue)) {
			throw fail(ERROR_CODES.INVALID_INPUT, '不支持的审核队列');
		}
		const pageOptions = {
			cursor: query.cursor,
			limit: clampLimit(query.limit)
		};
		if (queue === 'content') {
			const page = await repository.listContentQueue(pageOptions);
			return {
				items: page.items.map((row) => ({
					targetId: row.targetId,
					contentId: row._id,
					kind: row.root.kind,
					authorId: row.root.authorId,
					title: row.revision ? row.revision.title : '',
					body: row.revision ? row.revision.body : '',
					mediaIds: row.revision ? row.revision.mediaIds : [],
					details: row.revision ? row.revision.details : {},
					version: row.root.version,
					createdAt: row.createdAt
				})),
				nextCursor: page.nextCursor
			};
		}
		if (queue === 'comment') {
			const page = await repository.listCommentQueue(pageOptions);
			return {
				items: page.items.map((row) => ({
					targetId: row.targetId,
					contentId: row.comment.contentId,
					authorId: row.comment.authorId,
					body: row.comment.body,
					parentId: row.comment.parentId,
					createdAt: row.createdAt
				})),
				nextCursor: page.nextCursor
			};
		}
		if (queue === 'report') {
			const page = await repository.listReports({
				...pageOptions,
				status: 'submitted'
			});
			return {
				items: page.items.map((row) => ({
					targetId: row._id,
					reportType: row.targetType,
					reportedId: row.targetId,
					reason: row.reason,
					description: row.description,
					reporterId: row.reporterId,
					createdAt: row.createdAt
				})),
				nextCursor: page.nextCursor
			};
		}
		const page = await repository.listAppeals({
			...pageOptions,
			status: 'submitted'
		});
		return {
			items: page.items.map((row) => ({
				targetId: row._id,
				decisionId: row.decisionId,
				contentId: row.contentId,
				appellantId: row.appellantId,
				explanation: row.explanation,
				createdAt: row.createdAt
			})),
			nextCursor: page.nextCursor
		};
	}

	/** 内容审核：只对当前待审版本生效。targetId 是版本 id。 */
	const decideContent = async (actor, input) => {
		const { targetId, expectedVersion, action } = input;

		const revision = await repository.getRevision(targetId);
		if (!revision) throw fail(ERROR_CODES.CONTENT_UNAVAILABLE, '待审版本不存在');
		const entry = await loadContent(revision.contentId);

		if (entry.root.version !== expectedVersion) {
			throw fail(ERROR_CODES.VERSION_CONFLICT, '内容已变化，请重新审核');
		}
		if (entry.root.pendingRevisionId !== targetId) {
			// 旧版本的审核结果不能发布用户后来修改的版本
			throw fail(ERROR_CODES.VERSION_CONFLICT, '待审版本已变化，请重新审核');
		}

		if (action === 'approve' || action === 'reject') {
			await repository.saveRevisionStatus(
				targetId,
				action === 'approve' ? REVISION_STATUS.APPROVED : REVISION_STATUS.REJECTED
			);
			const next = {
				...entry.root,
				pendingRevisionId: null,
				publishedRevisionId: action === 'approve' ? targetId : entry.root.publishedRevisionId,
				visibility: action === 'approve' ?
					VISIBILITY.PUBLISHED : entry.root.publishedRevisionId ?
					VISIBILITY.PUBLISHED :
					VISIBILITY.REJECTED,
				updatedAt: now()
			};
			const saved = await repository.saveContent(next, expectedVersion);
			if (!saved.ok) throw fail(ERROR_CODES.VERSION_CONFLICT, '内容已变化，请重新审核');
			return { outcome: action === 'approve' ? 'approved' : 'rejected', version: saved.current.version };
		}

		if (action === 'remove') {
			const saved = await repository.saveContent({
				...entry.root,
				visibility: VISIBILITY.REMOVED,
				pendingRevisionId: null,
				updatedAt: now()
			}, expectedVersion);
			if (!saved.ok) throw fail(ERROR_CODES.VERSION_CONFLICT, '内容已变化，请重新审核');
			return { outcome: 'removed', version: saved.current.version };
		}

		// restore：作者已删除的内容不能恢复；当前版本未通过也不能恢复
		const publicRevision = entry.published || entry.latest;
		if (!canRestore({
				deletedByAuthor: entry.root.deletedByAuthor === true,
				revisionApproved: Boolean(publicRevision && publicRevision.reviewStatus === REVISION_STATUS.APPROVED)
			})) {
			throw fail(
				ERROR_CODES.FORBIDDEN,
				entry.root.deletedByAuthor === true ?
				'作者已删除的内容不能恢复' :
				'当前版本未通过审核，不能恢复展示'
			);
		}
		const saved = await repository.saveContent({
			...entry.root,
			visibility: VISIBILITY.PUBLISHED,
			updatedAt: now()
		}, expectedVersion);
		if (!saved.ok) throw fail(ERROR_CODES.VERSION_CONFLICT, '内容已变化，请重新审核');
		return { outcome: 'restored', version: saved.current.version };
	};

	const decideComment = async (actor, input) => {
		const { targetId, action } = input;
		const comment = await repository.getComment(targetId);
		if (!comment) throw fail(ERROR_CODES.CONTENT_UNAVAILABLE, '该评论不存在');

		if (action === 'approve' || action === 'reject') {
			comment.reviewStatus = action === 'approve' ? REVISION_STATUS.APPROVED : REVISION_STATUS.REJECTED;
		} else {
			// 审核员删除走治理通道，与作者自删区分：这里标记为已删除并留痕
			comment.deleted = true;
		}
		await repository.saveComment(comment);
		return { outcome: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'removed' };
	};

	const decideReport = async (actor, input) => {
		const { targetId, action } = input;
		const report = await repository.getReport(targetId);
		if (!report) throw fail(ERROR_CODES.CONTENT_UNAVAILABLE, '该举报不存在');
		if (report.status !== 'submitted') {
			throw fail(ERROR_CODES.VERSION_CONFLICT, '该举报已处理');
		}

		if (action === 'reject') {
			// 举报不成立：内容保持原有可见性
			report.status = 'rejected';
			report.decidedAt = now();
			await repository.saveReport(report);
			return { outcome: 'rejected' };
		}

		// uphold：举报成立，对被举报内容执行下架
		const entry = await loadContent(report.targetId);
		const saved = await repository.saveContent({
			...entry.root,
			visibility: VISIBILITY.REMOVED,
			pendingRevisionId: null,
			updatedAt: now()
		}, entry.root.version);
		if (!saved.ok) throw fail(ERROR_CODES.VERSION_CONFLICT, '内容已变化，请重新处理');
		report.status = 'upheld';
		report.decidedAt = now();
		await repository.saveReport(report);
		return {
			outcome: 'upheld',
			version: saved.current.version,
			contentId: report.targetId
		};
	};

	const decideAppeal = async (actor, input) => {
		const { targetId, action } = input;
		const record = await repository.getAppeal(targetId);
		if (!record) throw fail(ERROR_CODES.CONTENT_UNAVAILABLE, '该复核申请不存在');
		if (record.status !== 'submitted') {
			throw fail(ERROR_CODES.VERSION_CONFLICT, '该复核已处理');
		}

		if (action === 'reject') {
			record.status = 'rejected';
			record.decidedAt = now();
			await repository.saveAppeal(record);
			return { outcome: 'rejected' };
		}

		// 复核通过：仍要检查作者是否已删除、当前版本是否通过
		const entry = await loadContent(record.contentId);
		const revision = entry.published || entry.latest;
		if (!canRestore({
				deletedByAuthor: entry.root.deletedByAuthor === true,
				revisionApproved: Boolean(revision && revision.reviewStatus === REVISION_STATUS.APPROVED)
			})) {
			throw fail(
				ERROR_CODES.FORBIDDEN,
				entry.root.deletedByAuthor === true ?
				'作者已删除的内容不能恢复' :
				'当前版本未通过审核，不能恢复展示'
			);
		}
		const saved = await repository.saveContent({
			...entry.root,
			visibility: VISIBILITY.PUBLISHED,
			updatedAt: now()
		}, entry.root.version);
		if (!saved.ok) throw fail(ERROR_CODES.VERSION_CONFLICT, '内容已变化，请重新处理');
		record.status = 'approved';
		record.decidedAt = now();
		await repository.saveAppeal(record);
		return { outcome: 'approved', version: saved.current.version };
	};

	async function decide(actor, input) {
		const user = requireReviewer(actor);
		const { targetType, targetId, action, reason, requestId } = input || {};

		if (!isAllowedAdminAction({
				targetType,
				action
			})) {
			throw fail(ERROR_CODES.INVALID_INPUT, '不支持的审核动作');
		}
		requireRequestId(requestId);

		if (targetType === 'media') {
			throw fail(ERROR_CODES.DEPENDENCY_UNAVAILABLE, '媒体审核在媒体任务中实现，当前不可用');
		}

		return withRequestKey(user.userId, requestId, async () => {
			let outcome;
			if (targetType === 'content') {
				outcome = await decideContent(user, input);
			} else if (targetType === 'comment') {
				outcome = await decideComment(user, input);
			} else if (targetType === 'report') {
				outcome = await decideReport(user, input);
			} else {
				outcome = await decideAppeal(user, input);
			}

			const decision = await recordDecision({
				targetType,
				targetId,
				revisionId: targetType === 'content' ? targetId : null,
				action,
				reason,
				actorId: user.userId,
				// 举报与复核的决定要记录受影响的内容，作者才能在本人案件里看到
				extra: outcome.contentId ? {
					contentId: outcome.contentId
				} : {}
			});

			return {
				decisionId: decision._id,
				outcome: outcome.outcome,
				version: outcome.version
			};
		});
	}

	async function restrictUser(actor, input) {
		const user = requireReviewer(actor);
		const { userId, scope, enabled, reason, requestId } = input || {};

		if (typeof userId !== 'string' || userId.trim() === '') {
			throw fail(ERROR_CODES.INVALID_INPUT, '缺少目标用户');
		}
		if (!isAllowedRestrictionScope(scope)) {
			throw fail(ERROR_CODES.INVALID_INPUT, '不支持的账号限制范围');
		}
		if (typeof enabled !== 'boolean') {
			throw fail(ERROR_CODES.INVALID_INPUT, '必须明确指定限制或解除');
		}
		// 限制与解除都必须写明原因
		if (typeof reason !== 'string' || reason.trim() === '') {
			throw fail(ERROR_CODES.INVALID_INPUT, '请填写原因');
		}
		requireRequestId(requestId);

		return withRequestKey(user.userId, requestId, async () => {
			await repository.setRestriction({
				userId,
				scope,
				enabled,
				reason: reason.trim(),
				actorId: user.userId,
				updatedAt: now()
			});
			await repository.appendAuditLog({
				action: enabled ? 'user.restrict' : 'user.unrestrict',
				targetType: 'user',
				targetId: userId,
				actorId: user.userId,
				reason: reason.trim(),
				createdAt: now()
			});
			return {
				userId,
				scope,
				enabled
			};
		});
	}

	async function listRestrictions(actor, query = {}) {
		requireReviewer(actor);
		const userId = query.userId;
		if (typeof userId !== 'string' || userId.trim() === '') {
			throw fail(ERROR_CODES.INVALID_INPUT, '缺少目标用户');
		}
		return { items: await repository.listRestrictions(userId) };
	}

	/** 判断某用户在某范围内是否被限制；供发布与私聊服务调用。 */
	async function isRestricted(actor, input) {
		const { userId, scope } = input || {};
		if (!isAllowedRestrictionScope(scope)) {
			throw fail(ERROR_CODES.INVALID_INPUT, '不支持的账号限制范围');
		}
		const row = await repository.getRestriction(userId, scope);
		return { restricted: Boolean(row && row.enabled !== false) };
	}

	async function updateConfig(actor, input) {
		const user = requireReviewer(actor);
		const { key, value, expectedVersion, requestId } = input || {};

		if (typeof key !== 'string' || key.trim() === '') {
			throw fail(ERROR_CODES.INVALID_INPUT, '缺少配置键');
		}
		// 平台完全免费，配置里不允许长出付费能力
		if (isForbiddenConfigKey(key)) {
			throw fail(ERROR_CODES.FORBIDDEN, '平台免费，不提供该配置项');
		}
		requireRequestId(requestId);

		return withRequestKey(user.userId, requestId, async () => {
			const current = await repository.getConfig(key);
			const currentVersion = current ? current.version : 0;
			if (expectedVersion !== undefined && expectedVersion !== null && expectedVersion !== currentVersion) {
				throw fail(ERROR_CODES.VERSION_CONFLICT, '配置已被修改，请刷新后重试');
			}
			const saved = await repository.saveConfig({
				key,
				value,
				version: currentVersion + 1,
				updatedBy: user.userId,
				updatedAt: now()
			});
			await repository.appendAuditLog({
				action: 'config.update',
				targetType: 'config',
				targetId: key,
				actorId: user.userId,
				reason: '',
				createdAt: now()
			});
			return {
				key: saved.key,
				version: saved.version
			};
		});
	}

	async function listConfig(actor) {
		requireReviewer(actor);
		const keys = ['categories', 'regions', 'mediaQuota', 'textLimits', 'reportReasons'];
		const items = [];
		for (const key of keys) {
			const row = await repository.getConfig(key);
			if (row) items.push({
				key: row.key,
				value: row.value,
				version: row.version
			});
		}
		return { items };
	}

	async function getMetrics(actor) {
		requireReviewer(actor);
		// 只有发布与审核相关计数，不含任何交易流水
		return repository.metrics();
	}

	/** 公开可见性工具，供举报处理前的展示判断复用。 */
	const isPubliclyVisible = (entry) =>
		canReadPublic({
			visibility: entry.root.visibility,
			revisionStatus: entry.published ? entry.published.reviewStatus : null
		});

	return {
		submitReport,
		listMyCases,
		appeal,
		listQueue,
		decide,
		restrictUser,
		listRestrictions,
		isRestricted,
		updateConfig,
		listConfig,
		getMetrics,
		isPubliclyVisible
	};
}

module.exports = {
	createModerationService,
	ERROR_CODES,
	QUEUES
};
