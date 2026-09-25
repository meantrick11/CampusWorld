'use strict';

/**
 * 内存互动仓储：实现 social-repository.js 规定的接口。
 *
 * 与内容仓储同样讲究真实性：
 * - 点赞与关注用唯一键语义（重复插入抛错），因此并发重复操作只能成功一次；
 * - 取消操作在关系不存在时返回 deleted: 0，重试不会重复减数；
 * - 读出的对象是深拷贝；
 * - 评论列表由仓储负责过滤与分组，分页只针对主评论。
 */

const clone = (value) => (value === null || value === undefined ? value : structuredClone(value));

const APPROVED = 'approved';
const PENDING = 'pending';
const REJECTED = 'rejected';
const PUBLISHED = 'published';
const DELETED = 'deleted';
const REMOVED = 'removed';

function createMemorySocialRepository() {
	const reactions = new Map(); // `${actorId}\n${contentId}\n${type}` -> row
	const follows = new Map(); // `${actorId}\n${targetUserId}` -> row
	const comments = new Map(); // commentId -> row
	const contents = new Map(); // contentId -> { root, published }
	const requests = new Map();
	const counters = new Map();

	const nextId = (prefix) => {
		const value = (counters.get(prefix) || 0) + 1;
		counters.set(prefix, value);
		return `${prefix}${value}`;
	};

	const reactionKey = (actorId, contentId, type) => `${actorId}\n${contentId}\n${type}`;
	const followKey = (actorId, targetUserId) => `${actorId}\n${targetUserId}`;
	const requestKey = (actorId, requestId) => `${actorId}\n${requestId}`;

	const sortNewestFirst = (a, b) => {
		if (a.createdAt !== b.createdAt) return b.createdAt - a.createdAt;
		return a._id < b._id ? 1 : -1;
	};
	const sortOldestFirst = (a, b) => {
		if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
		return a._id < b._id ? -1 : 1;
	};

	const afterCursor = (row, cursorKey, newestFirst) => {
		if (!cursorKey) return true;
		const [time, id] = cursorKey;
		if (row.createdAt !== time) return newestFirst ? row.createdAt < time : row.createdAt > time;
		return newestFirst ? row._id < id : row._id > id;
	};

	const paginate = (rows, cursor, limit, { newestFirst = true } = {}) => {
		const size = Math.min(Math.max(Number(limit) || 20, 1), 50);
		const cursorKey = cursor ? JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) : null;
		const sorted = rows.slice().sort(newestFirst ? sortNewestFirst : sortOldestFirst);
		const filtered = cursorKey ? sorted.filter((row) => afterCursor(row, cursorKey, newestFirst)) : sorted;
		const page = filtered.slice(0, size);
		const hasMore = filtered.length > size;
		const nextCursor = hasMore && page.length ?
			Buffer.from(JSON.stringify([page[page.length - 1].createdAt, page[page.length - 1]._id])).toString(
				'base64url') :
			null;
		return { items: page, nextCursor };
	};

	/** 评论对读者可见的条件：通过审核、未删除、且所属内容仍公开。 */
	const isVisibleComment = (comment) => {
		if (comment.reviewStatus !== APPROVED) return false;
		if (comment.deleted === true) return false;
		const content = contents.get(comment.contentId);
		if (!content) return false;
		return content.root.visibility === PUBLISHED;
	};

	return {
		async getContent(contentId) {
			const entry = contents.get(contentId) || null;
			return entry ? { root: clone(entry.root), published: clone(entry.published) } : null;
		},

		async getReaction(actorId, contentId, type) {
			return clone(reactions.get(reactionKey(actorId, contentId, type)) || null);
		},

		/** 唯一键插入：重复即抛错，模拟唯一索引冲突。 */
		async insertReaction(row) {
			const key = reactionKey(row.actorId, row.contentId, row.type);
			if (reactions.has(key)) {
				const error = new Error('唯一键冲突：该关系已存在');
				error.code = 'DUPLICATE_KEY';
				throw error;
			}
			const record = { _id: nextId('re'), ...clone(row) };
			reactions.set(key, record);
			return clone(record);
		},

		/** 取消幂等：不存在时返回 0，重试不会重复减数。 */
		async deleteReaction(actorId, contentId, type) {
			const key = reactionKey(actorId, contentId, type);
			if (!reactions.has(key)) return { deleted: 0 };
			reactions.delete(key);
			return { deleted: 1 };
		},

		async countReactions(contentId, type) {
			let total = 0;
			for (const row of reactions.values()) {
				if (row.contentId === contentId && row.type === type) total += 1;
			}
			return total;
		},

		/** 收藏/点赞列表：只按调用者本人查询，返回已解析的内容行。 */
		async listReactionsByActor(actorId, type, { cursor, limit } = {}) {
			const rows = [];
			for (const row of reactions.values()) {
				if (row.actorId !== actorId || row.type !== type) continue;
				const content = contents.get(row.contentId);
				if (!content) continue;
				if (content.root.visibility !== PUBLISHED) continue;
				rows.push({
					_id: row._id,
					createdAt: row.createdAt,
					reaction: clone(row),
					content: {
						root: clone(content.root),
						published: clone(content.published)
					}
				});
			}
			return paginate(rows, cursor, limit);
		},

		async getFollow(actorId, targetUserId) {
			return clone(follows.get(followKey(actorId, targetUserId)) || null);
		},

		async insertFollow(row) {
			const key = followKey(row.actorId, row.targetUserId);
			if (follows.has(key)) {
				const error = new Error('唯一键冲突：已关注');
				error.code = 'DUPLICATE_KEY';
				throw error;
			}
			const record = { _id: nextId('fo'), ...clone(row) };
			follows.set(key, record);
			return clone(record);
		},

		async deleteFollow(actorId, targetUserId) {
			const key = followKey(actorId, targetUserId);
			if (!follows.has(key)) return { deleted: 0 };
			follows.delete(key);
			return { deleted: 1 };
		},

		async countFollowers(targetUserId) {
			let total = 0;
			for (const row of follows.values()) {
				if (row.targetUserId === targetUserId) total += 1;
			}
			return total;
		},

		async listFollowing(actorId, { cursor, limit } = {}) {
			const rows = [];
			for (const row of follows.values()) {
				if (row.actorId !== actorId) continue;
				rows.push({
					_id: row._id,
					createdAt: row.createdAt,
					follow: clone(row)
				});
			}
			return paginate(rows, cursor, limit);
		},

		async getComment(commentId) {
			return clone(comments.get(commentId) || null);
		},

		async createComment(row) {
			const record = { _id: row._id || nextId('cm'), ...clone(row) };
			comments.set(record._id, record);
			return clone(record);
		},

		/** 分页只针对主评论，回复随主评论一起返回。 */
		async listCommentThread(contentId, { cursor, limit } = {}) {
			const topLevel = [];
			for (const comment of comments.values()) {
				if (comment.contentId !== contentId) continue;
				if (!isVisibleComment(comment)) continue;
				if (comment.parentId) continue;
				topLevel.push(comment);
			}
			const page = paginate(topLevel, cursor, limit, { newestFirst: false });
			const items = page.items.map((comment) => {
				const replies = [];
				for (const candidate of comments.values()) {
					if (candidate.parentId !== comment._id) continue;
					if (!isVisibleComment(candidate)) continue;
					replies.push(clone(candidate));
				}
				replies.sort(sortOldestFirst);
				return { comment: clone(comment), replies };
			});
			return { items, nextCursor: page.nextCursor };
		},

		async markCommentDeleted(commentId) {
			const comment = comments.get(commentId);
			if (!comment) return null;
			comment.deleted = true;
			return clone(comment);
		},

		async countComments(contentId) {
			let total = 0;
			for (const comment of comments.values()) {
				if (comment.contentId !== contentId) continue;
				if (!isVisibleComment(comment)) continue;
				total += 1;
			}
			return total;
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
			const key = requestKey(actorId, requestId);
			requests.set(key, { state: 'completed', result: clone(result) });
			return clone(result);
		},

		async releaseRequest(actorId, requestId) {
			requests.delete(requestKey(actorId, requestId));
		},

		// ---- 测试辅助，不属于业务接口 ----

		/** 建立一条公开的校园墙内容，用于互动用例。 */
		async seedWall({
			id,
			authorId,
			title = '',
			body = '今晚操场有社团招新。',
			mediaIds = [],
			details = { mediaForm: 'text' },
			visibility = PUBLISHED,
			revisionStatus = APPROVED,
			createdAt = 1
		} = {}) {
			const contentId = id || nextId('c');
			contents.set(contentId, {
				root: {
					_id: contentId,
					authorId,
					kind: 'wall',
					visibility,
					businessStatus: null,
					publishedRevisionId: `${contentId}-r1`,
					pendingRevisionId: null,
					version: 1,
					createdAt,
					updatedAt: createdAt
				},
				published: {
					_id: `${contentId}-r1`,
					contentId,
					revision: 1,
					title,
					body,
					mediaIds,
					details,
					reviewStatus: revisionStatus,
					createdAt
				}
			});
			return contentId;
		},

		/** 直接写入一条评论，便于构造审核状态组合。 */
		async seedComment({ id, contentId, authorId, body = '同意', parentId = null, reviewStatus = APPROVED, deleted = false, createdAt = 1 }) {
			return this.createComment({
				_id: id,
				contentId,
				authorId,
				body,
				parentId,
				reviewStatus,
				deleted,
				createdAt
			});
		},

		countReactionRows() {
			return reactions.size;
		},

		countFollowRows() {
			return follows.size;
		},

		async seedFollow({ actorId, targetUserId, createdAt = 1 }) {
			return this.insertFollow({ actorId, targetUserId, createdAt });
		}
	};
}

module.exports = {
	createMemorySocialRepository,
	REVIEW_STATUS: { APPROVED, PENDING, REJECTED },
	VISIBILITY: { PUBLISHED, DELETED, REMOVED }
};
