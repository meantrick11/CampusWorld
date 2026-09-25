'use strict';

/**
 * 内存治理仓储：实现 moderation-repository.js 规定的接口。
 *
 * 与其它内存仓储一致：深拷贝隔离、版本比较写入、唯一键与幂等语义、
 * 决定与留痕成对可查。
 */

const clone = (value) => (value === null || value === undefined ? value : structuredClone(value));

function createMemoryModerationRepository() {
	const contents = new Map(); // contentId -> { root, published, latest }
	const comments = new Map(); // commentId -> row
	const reports = new Map();
	const appeals = new Map();
	const restrictions = new Map(); // `${userId}\n${scope}` -> row
	const configs = new Map();
	const decisions = [];
	const auditLogs = [];
	const requests = new Map();
	const counters = new Map();

	const nextId = (prefix) => {
		const value = (counters.get(prefix) || 0) + 1;
		counters.set(prefix, value);
		return `${prefix}${value}`;
	};

	const requestKey = (actorId, requestId) => `${actorId}\n${requestId}`;
	const restrictionKey = (userId, scope) => `${userId}\n${scope}`;

	const sortNewestFirst = (a, b) => {
		if (a.createdAt !== b.createdAt) return b.createdAt - a.createdAt;
		return a._id < b._id ? 1 : -1;
	};

	const paginate = (rows, cursor, limit) => {
		const size = Math.min(Math.max(Number(limit) || 20, 1), 50);
		const sorted = rows.slice().sort(sortNewestFirst);
		const start = cursor ? Number(cursor) : 0;
		const page = sorted.slice(start, start + size);
		const nextStart = start + size;
		return {
			items: page.map(clone),
			nextCursor: nextStart < sorted.length ? String(nextStart) : null
		};
	};

	return {
		async getContent(contentId) {
			const entry = contents.get(contentId);
			return entry ? clone(entry) : null;
		},

		async getRevision(revisionId) {
			for (const entry of contents.values()) {
				if (entry.published && entry.published._id === revisionId) return clone(entry.published);
				if (entry.latest && entry.latest._id === revisionId) return clone(entry.latest);
			}
			return null;
		},

		async saveRevisionStatus(revisionId, reviewStatus) {
			for (const entry of contents.values()) {
				for (const key of ['published', 'latest']) {
					const revision = entry[key];
					if (revision && revision._id === revisionId) {
						revision.reviewStatus = reviewStatus;
						return clone(revision);
					}
				}
			}
			return null;
		},

		/** 与数据库条件更新等价。 */
		async saveContent(root, expectedVersion) {
			const entry = contents.get(root._id);
			if (!entry) return { ok: false, reason: 'NOT_FOUND', current: null };
			if (entry.root.version !== expectedVersion) {
				return { ok: false, reason: 'VERSION_CONFLICT', current: clone(entry.root) };
			}
			const next = { ...clone(root), version: entry.root.version + 1 };
			contents.set(next._id, { ...entry, root: next });
			return { ok: true, current: clone(next) };
		},

		async getComment(commentId) {
			return clone(comments.get(commentId) || null);
		},

		async saveComment(comment) {
			const record = clone(comment);
			comments.set(record._id, record);
			return clone(record);
		},

		async createReport(row) {
			const record = { _id: row._id || nextId('rp'), ...clone(row) };
			reports.set(record._id, record);
			return clone(record);
		},

		async getReport(id) {
			return clone(reports.get(id) || null);
		},

		async saveReport(row) {
			reports.set(row._id, clone(row));
			return clone(row);
		},

		async listReports({ status, cursor, limit } = {}) {
			const rows = [...reports.values()].filter((row) => (status ? row.status === status : true));
			return paginate(rows, cursor, limit);
		},

		/** 待审内容：有 pendingRevisionId 的根内容，连同待审版本一起返回。 */
		async listContentQueue({ cursor, limit } = {}) {
			const rows = [];
			for (const entry of contents.values()) {
				if (!entry.root.pendingRevisionId) continue;
				rows.push({
					_id: entry.root._id,
					createdAt: entry.root.updatedAt || entry.root.createdAt,
					root: clone(entry.root),
					revision: clone(entry.latest),
					// 审核目标就是当前待审版本
					targetId: entry.root.pendingRevisionId
				});
			}
			return paginate(rows, cursor, limit);
		},

		/** 待审评论：reviewStatus 为 pending 且未删除的评论。 */
		async listCommentQueue({ cursor, limit } = {}) {
			const rows = [];
			for (const comment of comments.values()) {
				if (comment.reviewStatus !== 'pending' || comment.deleted === true) continue;
				rows.push({
					_id: comment._id,
					createdAt: comment.createdAt,
					comment: clone(comment),
					targetId: comment._id
				});
			}
			return paginate(rows, cursor, limit);
		},

		async createAppeal(row) {
			const record = { _id: row._id || nextId('ap'), ...clone(row) };
			appeals.set(record._id, record);
			return clone(record);
		},

		async getAppeal(id) {
			return clone(appeals.get(id) || null);
		},

		async saveAppeal(row) {
			appeals.set(row._id, clone(row));
			return clone(row);
		},

		async listAppeals({ status, cursor, limit } = {}) {
			const rows = [...appeals.values()].filter((row) => (status ? row.status === status : true));
			return paginate(rows, cursor, limit);
		},

		async findAppealByDecision(decisionId) {
			for (const row of appeals.values()) {
				if (row.decisionId === decisionId) return clone(row);
			}
			return null;
		},

		async getRestriction(userId, scope) {
			return clone(restrictions.get(restrictionKey(userId, scope)) || null);
		},

		async listRestrictions(userId) {
			const rows = [];
			for (const row of restrictions.values()) {
				if (row.userId === userId) rows.push(clone(row));
			}
			return rows;
		},

		async setRestriction(row) {
			const key = restrictionKey(row.userId, row.scope);
			if (row.enabled === false) {
				restrictions.delete(key);
				return clone(row);
			}
			const record = { ...clone(row), _id: row._id || nextId('rs') };
			restrictions.set(key, record);
			return clone(record);
		},

		async getConfig(key) {
			return clone(configs.get(key) || null);
		},

		async saveConfig(row) {
			configs.set(row.key, clone(row));
			return clone(row);
		},

		async appendDecision(decision) {
			const record = { _id: decision._id || nextId('d'), ...clone(decision) };
			decisions.push(record);
			return clone(record);
		},

		async appendAuditLog(log) {
			const record = { _id: log._id || nextId('l'), ...clone(log) };
			auditLogs.push(record);
			return clone(record);
		},

		async listDecisions({ contentId } = {}) {
			return clone(decisions.filter((row) => (contentId ? row.contentId === contentId : true)));
		},

		async reserveRequest(actorId, requestId) {
			const key = requestKey(actorId, requestId);
			const existing = requests.get(key);
			if (existing) {
				return existing.result ?
					{ ok: false, inFlight: false, result: clone(existing.result) } :
					{ ok: false, inFlight: true, result: null };
			}
			requests.set(key, { state: 'reserved', result: null });
			return { ok: true, inFlight: false, result: null };
		},

		async completeRequest(actorId, requestId, result) {
			requests.set(requestKey(actorId, requestId), { state: 'completed', result: clone(result) });
			return clone(result);
		},

		async releaseRequest(actorId, requestId) {
			requests.delete(requestKey(actorId, requestId));
		},

		/** 概览用的计数：不含任何交易流水。 */
		async metrics() {
			const pendingContents = [...contents.values()].filter((entry) => entry.root.pendingRevisionId).length;
			const publishedContents = [...contents.values()].filter((entry) => entry.root.visibility ===
				'published').length;
			const openReports = [...reports.values()].filter((row) => row.status === 'submitted').length;
			const openAppeals = [...appeals.values()].filter((row) => row.status === 'submitted').length;
			const activeRestrictions = restrictions.size;
			return {
				contents: contents.size,
				pendingContents,
				publishedContents,
				openReports,
				openAppeals,
				activeRestrictions,
				decisions: decisions.length
			};
		},

		// ---- 测试辅助 ----

		async seedContent({
			id,
			authorId,
			kind = 'wall',
			visibility = 'published',
			revisionStatus = 'approved',
			deletedByAuthor = false,
			businessStatus = null,
			createdAt = 1,
			pendingRevisionId = null
		} = {}) {
			const contentId = id || nextId('c');
			const revisionId = `${contentId}-r1`;
			contents.set(contentId, {
				root: {
					_id: contentId,
					authorId,
					kind,
					visibility,
					businessStatus,
					publishedRevisionId: revisionId,
					pendingRevisionId,
					version: 1,
					deletedByAuthor,
					createdAt,
					updatedAt: createdAt
				},
				published: {
					_id: revisionId,
					contentId,
					revision: 1,
					title: '示例标题',
					body: '示例正文',
					mediaIds: [],
					details: {},
					reviewStatus: revisionStatus,
					createdAt
				},
				latest: null
			});
			return contentId;
		},

		async seedPendingRevision({
			contentId,
			revisionId,
			revisionStatus = 'pending'
		} = {}) {
			const entry = contents.get(contentId);
			entry.root.pendingRevisionId = revisionId;
			entry.latest = {
				_id: revisionId,
				contentId,
				revision: 2,
				title: '修改后的标题',
				body: '修改后的正文',
				mediaIds: [],
				details: {},
				reviewStatus: revisionStatus,
				createdAt: 2
			};
			return revisionId;
		},

		async seedComment({
			id,
			contentId,
			authorId,
			reviewStatus = 'pending',
			createdAt = 1
		} = {}) {
			return this.saveComment({
				_id: id,
				contentId,
				authorId,
				body: '示例评论',
				parentId: null,
				reviewStatus,
				deleted: false,
				createdAt
			});
		},

		async seedReport({
			id,
			reporterId,
			targetType = 'content',
			targetId,
			reason = 'spam',
			status = 'submitted',
			createdAt = 1
		} = {}) {
			return this.createReport({
				_id: id,
				reporterId,
				targetType,
				targetId,
				reason,
				description: '',
				status,
				createdAt
			});
		},

		async seedConfig({ key, value = {}, version = 1 } = {}) {
			return this.saveConfig({ key, value, version, updatedAt: 1 });
		},

		countRestrictions() {
			return restrictions.size;
		},

		listAuditLogs() {
			return clone(auditLogs);
		}
	};
}

module.exports = { createMemoryModerationRepository };
