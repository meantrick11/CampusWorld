'use strict';

/**
 * 内存内容仓储：实现 content-repository.js 规定的接口，用于在没有云空间的情况下
 * 真实运行内容服务的行为测试。
 *
 * 它不是「随便返回数据的 mock」：读出的对象是深拷贝（外部改动不会污染存储），
 * saveRoot 执行与数据库条件更新等价的版本比较，requestId 采用唯一键语义
 * （预留 → 完成），因此并发重复提交只能成功一次。
 */

const clone = (value) => (value === null || value === undefined ? value : structuredClone(value));

const REVISION_STATUS = {
	PENDING: 'pending',
	APPROVED: 'approved',
	REJECTED: 'rejected'
};

const VISIBILITY = {
	DRAFT: 'draft',
	PENDING: 'pending',
	PUBLISHED: 'published',
	REJECTED: 'rejected',
	REMOVED: 'removed',
	DELETED: 'deleted'
};

function createMemoryContentRepository() {
	const roots = new Map();
	const revisions = new Map();
	const requests = new Map(); // `${actorId}\n${requestId}` -> { state, result }
	const decisions = [];
	const auditLogs = [];
	const counters = new Map();

	const nextId = (prefix) => {
		const value = (counters.get(prefix) || 0) + 1;
		counters.set(prefix, value);
		return `${prefix}${value}`;
	};

	const requestKey = (actorId, requestId) => `${actorId}\n${requestId}`;

	const latestRevisionOf = (contentId) => {
		let best = null;
		for (const revision of revisions.values()) {
			if (revision.contentId !== contentId) continue;
			if (!best || revision.revision > best.revision) best = revision;
		}
		return best;
	};

	const sortKey = (root) => [root.createdAt, root._id];

	const encodeCursor = (root) => Buffer.from(JSON.stringify(sortKey(root))).toString('base64url');

	const decodeCursor = (cursor) => {
		if (!cursor) return null;
		try {
			const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
			return Array.isArray(parsed) && parsed.length === 2 ? parsed : null;
		} catch {
			return null;
		}
	};

	/** 最新优先，同刻按 id 倒序，保证游标稳定。 */
	const compareLatestFirst = (a, b) => {
		const [aTime, aId] = sortKey(a);
		const [bTime, bId] = sortKey(b);
		if (aTime !== bTime) return bTime - aTime;
		return aId < bId ? 1 : aId > bId ? -1 : 0;
	};

	const afterCursor = (root, cursorKey) => {
		if (!cursorKey) return true;
		const [time, id] = cursorKey;
		const [rootTime, rootId] = sortKey(root);
		if (rootTime !== time) return rootTime < time;
		return rootId < id;
	};

	/**
	 * 分页返回「已解析行」：每行含根内容及其相关版本。
	 * 服务端据此一次拿到构建 DTO 所需的全部字段；真实数据库实现可用一次
	 * 聚合查询完成，避免逐条补查版本。
	 */
	const paginate = (rows, cursor, limit) => {
		const cursorKey = decodeCursor(cursor);
		const filtered = cursorKey ? rows.filter((row) => afterCursor(row.root, cursorKey)) : rows;
		const size = Math.min(Math.max(Number(limit) || 20, 1), 50);
		const page = filtered.slice(0, size);
		const hasMore = filtered.length > size;
		return {
			items: page,
			nextCursor: hasMore && page.length ? encodeCursor(page[page.length - 1].root) : null
		};
	};

	const matchesKeyword = (revision, keyword) => {
		if (!keyword) return true;
		const needle = String(keyword).trim().toLowerCase();
		if (!needle) return true;
		const haystack = `${revision ? revision.title || '' : ''}\n${revision ? revision.body || '' : ''}`.toLowerCase();
		return haystack.includes(needle);
	};

	const matchesCategory = (revision, category) => {
		if (!category) return true;
		return Boolean(revision && revision.details && revision.details.category === category);
	};

	const matchesRegion = (revision, region) => {
		if (!region) return true;
		const details = (revision && revision.details) || {};
		return [details.fromRegion, details.toRegion, details.handoverRegion].includes(region);
	};

	return {
		nextId,

		async getById(id) {
			return clone(roots.get(id) || null);
		},

		async getRevision(revisionId) {
			return clone(revisions.get(revisionId) || null);
		},

		async getLatestRevision(contentId) {
			return clone(latestRevisionOf(contentId));
		},

		async getPublishedRevision(contentId) {
			const root = roots.get(contentId);
			if (!root || !root.publishedRevisionId) return null;
			return clone(revisions.get(root.publishedRevisionId) || null);
		},

		/**
		 * 新建内容：根内容与首个版本一次写入（等价于事务），
		 * 并把新版本 id 回填到根内容的待审或公开指针上，避免二次写入抬高版本号。
		 */
		async createContentWithRevision({ root, revision, linkAs = 'pending' }) {
			const rootRecord = clone(root);
			if (!rootRecord._id) rootRecord._id = nextId('c');
			if (roots.has(rootRecord._id)) throw new Error(`根内容已存在：${rootRecord._id}`);

			const revisionRecord = clone(revision);
			if (!revisionRecord._id) revisionRecord._id = nextId('r');
			if (revisions.has(revisionRecord._id)) throw new Error(`版本已存在：${revisionRecord._id}`);
			revisionRecord.contentId = rootRecord._id;

			if (linkAs === 'published') rootRecord.publishedRevisionId = revisionRecord._id;
			else rootRecord.pendingRevisionId = revisionRecord._id;

			roots.set(rootRecord._id, rootRecord);
			revisions.set(revisionRecord._id, revisionRecord);
			return { root: clone(rootRecord), revision: clone(revisionRecord) };
		},

		async createRevision(revision) {
			const record = clone(revision);
			if (!record._id) record._id = nextId('r');
			if (revisions.has(record._id)) throw new Error(`版本已存在：${record._id}`);
			revisions.set(record._id, record);
			return clone(record);
		},

		/** 审核决定写入版本的 reviewStatus；真实实现应为条件更新。 */
		async saveRevisionStatus(revisionId, reviewStatus) {
			const revision = revisions.get(revisionId);
			if (!revision) return null;
			revision.reviewStatus = reviewStatus;
			return clone(revision);
		},

		/** 与数据库条件更新等价：版本不符则拒绝，成功才递增版本号。 */
		async saveWithVersion(root, expectedVersion) {
			const current = roots.get(root._id);
			if (!current) return { ok: false, reason: 'NOT_FOUND', current: null };
			if (current.version !== expectedVersion) {
				return { ok: false, reason: 'VERSION_CONFLICT', current: clone(current) };
			}
			const next = clone(root);
			next.version = current.version + 1;
			roots.set(next._id, next);
			return { ok: true, current: clone(next) };
		},

		/** 公开列表：只返回已发布且版本通过、未结束的内容；游客可调用。 */
		async listPublic({ kind, keyword, category, region, cursor, limit } = {}) {
			const rows = [];
			for (const root of roots.values()) {
				if (root.visibility !== VISIBILITY.PUBLISHED) continue;
				const published = root.publishedRevisionId ? revisions.get(root.publishedRevisionId) : null;
				if (!published || published.reviewStatus !== REVISION_STATUS.APPROVED) continue;
				if (root.businessStatus === 'closed') continue;
				if (kind && root.kind !== kind) continue;
				if (!matchesKeyword(published, keyword)) continue;
				if (!matchesCategory(published, category)) continue;
				if (!matchesRegion(published, region)) continue;
				rows.push({ root, published, latest: latestRevisionOf(root._id) });
			}
			rows.sort((a, b) => compareLatestFirst(a.root, b.root));
			return paginate(rows, cursor, limit);
		},

		/** 本人列表：包含未公开与审核状态，只返回该作者的内容。 */
		async listMine({ authorId, kind, status, cursor, limit } = {}) {
			const rows = [];
			for (const root of roots.values()) {
				if (root.authorId !== authorId) continue;
				if (root.visibility === VISIBILITY.DELETED) continue;
				if (kind && root.kind !== kind) continue;
				if (status && root.businessStatus !== status) continue;
				rows.push({ root, published: root.publishedRevisionId ? revisions.get(root.publishedRevisionId) : null, latest: latestRevisionOf(root._id) });
			}
			rows.sort((a, b) => compareLatestFirst(a.root, b.root));
			return paginate(rows, cursor, limit);
		},

		/**
		 * 预留 requestId：等价于唯一索引插入。
		 * - 已有结果：{ ok: false, result }
		 * - 已预留但未完成（并发重复）：{ ok: false, inFlight: true }
		 * - 首次：{ ok: true }
		 */
		async reserveRequest(actorId, requestId) {
			const key = requestKey(actorId, requestId);
			const existing = requests.get(key);
			if (existing) {
				return existing.result
					? { ok: false, inFlight: false, result: clone(existing.result) }
					: { ok: false, inFlight: true, result: null };
			}
			requests.set(key, { state: 'reserved', result: null });
			return { ok: true, inFlight: false, result: null };
		},

		async completeRequest(actorId, requestId, result) {
			const key = requestKey(actorId, requestId);
			const existing = requests.get(key) || { state: 'reserved', result: null };
			existing.state = 'completed';
			existing.result = clone(result);
			requests.set(key, existing);
			return clone(existing.result);
		},

		/** 预留后失败时释放，避免永久占用 requestId。 */
		async releaseRequest(actorId, requestId) {
			requests.delete(requestKey(actorId, requestId));
		},

		async appendDecision(decision) {
			const record = clone(decision);
			if (!record._id) record._id = nextId('d');
			decisions.push(record);
			return clone(record);
		},

		async appendAuditLog(log) {
			const record = clone(log);
			if (!record._id) record._id = nextId('l');
			auditLogs.push(record);
			return clone(record);
		},

		// ---- 以下为测试辅助，不属于业务接口 ----

		/** 建立一条已审核通过的公开内容，供越权与版本冲突用例使用。 */
		async seedPublished({
			id,
			authorId,
			kind = 'idle',
			title = '九成新台灯',
			body = '闲置转让',
			mediaIds = [],
			details = { category: '生活用品', remainingQuantity: 1, priceType: 'free', handoverRegion: '五号宿舍楼下' },
			businessStatus = 'available',
			revision = 1,
			createdAt = 1
		} = {}) {
			const contentId = id || nextId('c');
			const revisionId = `${contentId}-r${revision}`;
			const created = await this.createContentWithRevision({
				root: {
					_id: contentId,
					authorId,
					kind,
					publishedRevisionId: revisionId,
					pendingRevisionId: null,
					visibility: VISIBILITY.PUBLISHED,
					businessStatus,
					version: 1,
					deletedByAuthor: false,
					createdAt,
					updatedAt: createdAt
				},
				revision: {
					_id: revisionId,
					revision,
					title,
					body,
					mediaIds,
					details,
					reviewStatus: REVISION_STATUS.APPROVED,
					createdAt
				}
			});
			return created.root;
		},

		countRoots() {
			return roots.size;
		},

		countRevisions() {
			return revisions.size;
		},

		listDecisions() {
			return clone(decisions);
		},

		listAuditLogs() {
			return clone(auditLogs);
		},

		snapshot() {
			return {
				roots: [...roots.values()].map(clone),
				revisions: [...revisions.values()].map(clone)
			};
		}
	};
}

module.exports = { createMemoryContentRepository, VISIBILITY, REVISION_STATUS };
