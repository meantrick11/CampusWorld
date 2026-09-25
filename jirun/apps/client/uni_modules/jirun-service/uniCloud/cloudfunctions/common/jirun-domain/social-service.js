'use strict';

/**
 * 校园墙互动服务：点赞、评论、回复、收藏、关注、分享。
 *
 * 纯业务逻辑，只依赖仓储契约与注入的时钟，可在 Node 下真实运行测试。
 *
 * 关键约束：
 * - 计数一律由服务端从数据统计，客户端传入的任何计数值都被忽略。
 * - 关系的建立与取消都是幂等的：重复「启用」不会产生第二条关系，
 *   重复「取消」不会重复减数（取消使用明确的 enabled 值，不做 toggle）。
 * - 互动只作用于公开可见的校园墙内容。
 * - 只有本人能读取自己的收藏与关注列表；本人才能删除自己的评论。
 * - 关注或公开回复都不解锁私聊；私聊额度由联系服务单独判定。
 * - 分享不改变服务端状态：重新访问时仍按内容可见性校验。
 */

const { assertRepository } = require('./social-repository.js');
const {
	canDeleteComment,
	canViewFavorites,
	canFollow,
	isAllowedReactionType,
	canReact,
	isReplyingToTopLevel
} = require('./social-policy.js');
const { validateComment } = require('./validation.js');

const ERROR_CODES = {
	AUTH_REQUIRED: 'AUTH_REQUIRED',
	FORBIDDEN: 'FORBIDDEN',
	INVALID_INPUT: 'INVALID_INPUT',
	CONTENT_UNAVAILABLE: 'CONTENT_UNAVAILABLE',
	DEPENDENCY_UNAVAILABLE: 'DEPENDENCY_UNAVAILABLE'
};

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_MAX = 50;

function fail(code, message) {
	const error = new Error(message || code);
	error.code = code;
	return error;
}

function createSocialService({ repository, clock } = {}) {
	assertRepository(repository);
	const now = typeof clock === 'function' ? clock : () => Date.now();

	const requireActor = (actor) => {
		if (!actor || typeof actor.userId !== 'string' || actor.userId.trim() === '') {
			throw fail(ERROR_CODES.AUTH_REQUIRED, '请先登录');
		}
		return actor;
	};

	const clampLimit = (limit) => {
		const value = Number(limit);
		if (!Number.isFinite(value) || value <= 0) return DEFAULT_PAGE_SIZE;
		return Math.min(Math.floor(value), PAGE_SIZE_MAX);
	};

	/** 读取内容并校验互动条件；内容必须存在且公开可见。 */
	const loadReactableContent = async (contentId) => {
		if (typeof contentId !== 'string' || contentId.trim() === '') {
			throw fail(ERROR_CODES.INVALID_INPUT, '缺少内容标识');
		}
		const row = await repository.getContent(contentId);
		if (!row) throw fail(ERROR_CODES.CONTENT_UNAVAILABLE, '该内容暂不可查看');
		const content = {
			kind: row.root.kind,
			visibility: row.root.visibility,
			revisionStatus: row.published ? row.published.reviewStatus : null
		};
		// 非校园墙不给互动：二手与取送不提供收藏与点赞
		if (content.kind !== 'wall') {
			throw fail(ERROR_CODES.INVALID_INPUT, '该板块不支持这项互动');
		}
		if (!canReact({ actorId: 'checked', content })) {
			throw fail(ERROR_CODES.CONTENT_UNAVAILABLE, '该内容暂不可查看');
		}
		return row;
	};

	const commentDTO = (comment, actor) => ({
		id: comment._id,
		author: { userId: comment.authorId },
		body: comment.body,
		parentId: comment.parentId || null,
		createdAt: comment.createdAt,
		canDelete: canDeleteComment({
			actorId: actor && actor.userId,
			commentAuthorId: comment.authorId,
			isReviewer: actor ? actor.isReviewer === true : false
		})
	});

	// ---------------- 点赞与收藏 ----------------

	async function setReaction(actor, input) {
		const user = requireActor(actor);
		const { contentId, type, enabled } = input || {};

		if (!isAllowedReactionType(type)) {
			throw fail(ERROR_CODES.INVALID_INPUT, '不支持的反应类型');
		}
		if (typeof enabled !== 'boolean') {
			throw fail(ERROR_CODES.INVALID_INPUT, '必须明确指定启用或取消');
		}
		await loadReactableContent(contentId);

		const existing = await repository.getReaction(user.userId, contentId, type);

		if (enabled) {
			if (!existing) {
				try {
					await repository.insertReaction({
						actorId: user.userId,
						contentId,
						type,
						createdAt: now()
					});
				} catch (error) {
					// 唯一键冲突表示并发下已被另一次调用建立，视为成功
					if (error.code !== 'DUPLICATE_KEY') throw error;
				}
			}
		} else if (existing) {
			await repository.deleteReaction(user.userId, contentId, type);
		}

		// 计数以服务端统计为准，不接受客户端传入的任何计数值
		return {
			enabled: Boolean(enabled),
			count: await repository.countReactions(contentId, type)
		};
	}

	async function listFavorites(actor, query = {}) {
		const user = requireActor(actor);
		// 只按调用者本人查询，因此不存在越权读他人收藏的入口
		if (!canViewFavorites({ actorId: user.userId, ownerId: user.userId })) {
			throw fail(ERROR_CODES.FORBIDDEN, '只能查看自己的收藏');
		}
		const page = await repository.listReactionsByActor(user.userId, 'favorite', {
			cursor: query.cursor,
			limit: clampLimit(query.limit)
		});
		return {
			items: page.items.map((row) => ({
				id: row.content.root._id,
				kind: row.content.root.kind,
				author: { userId: row.content.root.authorId },
				title: row.content.published ? row.content.published.title : '',
				body: row.content.published ? row.content.published.body : '',
				details: row.content.published ? row.content.published.details : {},
				businessStatus: row.content.root.businessStatus,
				createdAt: row.content.root.createdAt,
				favoritedAt: row.createdAt
			})),
			nextCursor: page.nextCursor
		};
	}

	// ---------------- 关注 ----------------

	async function setFollow(actor, input) {
		const user = requireActor(actor);
		const { userId, enabled } = input || {};

		if (typeof userId !== 'string' || userId.trim() === '') {
			throw fail(ERROR_CODES.INVALID_INPUT, '缺少目标用户');
		}
		if (typeof enabled !== 'boolean') {
			throw fail(ERROR_CODES.INVALID_INPUT, '必须明确指定关注或取消');
		}
		if (!canFollow({ actorId: user.userId, targetUserId: userId })) {
			throw fail(ERROR_CODES.INVALID_INPUT, '不能关注自己');
		}

		const existing = await repository.getFollow(user.userId, userId);
		if (enabled) {
			if (!existing) {
				try {
					await repository.insertFollow({
						actorId: user.userId,
						targetUserId: userId,
						createdAt: now()
					});
				} catch (error) {
					if (error.code !== 'DUPLICATE_KEY') throw error;
				}
			}
		} else if (existing) {
			await repository.deleteFollow(user.userId, userId);
		}

		return {
			enabled: Boolean(enabled),
			followers: await repository.countFollowers(userId)
		};
	}

	async function listFollowing(actor, query = {}) {
		const user = requireActor(actor);
		const page = await repository.listFollowing(user.userId, {
			cursor: query.cursor,
			limit: clampLimit(query.limit)
		});
		return {
			items: page.items.map((row) => ({
				userId: row.follow.targetUserId,
				followedAt: row.createdAt
			})),
			nextCursor: page.nextCursor
		};
	}

	async function getProfileState(actor, input) {
		const userId = input && input.userId;
		if (typeof userId !== 'string' || userId.trim() === '') {
			throw fail(ERROR_CODES.INVALID_INPUT, '缺少目标用户');
		}
		const viewerId = actor && actor.userId;
		const follow = viewerId ? await repository.getFollow(viewerId, userId) : null;
		return {
			userId,
			following: Boolean(follow),
			followers: await repository.countFollowers(userId)
		};
	}

	// ---------------- 评论与回复 ----------------

	async function submitComment(actor, input) {
		const user = requireActor(actor);
		const { contentId, parentId, body, requestId } = input || {};

		if (typeof requestId !== 'string' || requestId.trim() === '') {
			throw fail(ERROR_CODES.INVALID_INPUT, '缺少 requestId');
		}

		const claim = await repository.reserveRequest(user.userId, requestId);
		if (!claim.ok) {
			if (claim.result) return claim.result;
			throw fail(ERROR_CODES.DEPENDENCY_UNAVAILABLE, '相同请求正在处理，请稍后重试');
		}

		try {
			await loadReactableContent(contentId);

			const checked = validateComment({
				body
			});
			if (!checked.valid) {
				throw fail(ERROR_CODES.INVALID_INPUT, checked.reason);
			}

			let parentComment = null;
			if (parentId !== undefined && parentId !== null && parentId !== '') {
				parentComment = await repository.getComment(parentId);
				if (!parentComment || parentComment.contentId !== contentId || parentComment.deleted === true) {
					throw fail(ERROR_CODES.CONTENT_UNAVAILABLE, '被回复的评论不存在');
				}
			}
			if (!isReplyingToTopLevel({
					parentId,
					parentComment
				})) {
				throw fail(ERROR_CODES.INVALID_INPUT, '只支持一层回复');
			}

			const created = await repository.createComment({
				contentId,
				authorId: user.userId,
				body: checked.value,
				parentId: parentComment ? parentComment._id : null,
				// 新评论先进入待审，不直接公开
				reviewStatus: 'pending',
				deleted: false,
				createdAt: now()
			});

			const result = {
				id: created._id,
				reviewStatus: created.reviewStatus
			};
			await repository.completeRequest(user.userId, requestId, result);
			return result;
		} catch (error) {
			await repository.releaseRequest(user.userId, requestId);
			throw error;
		}
	}

	async function listComments(actor, query = {}) {
		const contentId = query.contentId;
		if (typeof contentId !== 'string' || contentId.trim() === '') {
			throw fail(ERROR_CODES.INVALID_INPUT, '缺少内容标识');
		}
		const page = await repository.listCommentThread(contentId, {
			cursor: query.cursor,
			limit: clampLimit(query.limit)
		});
		return {
			items: page.items.map((row) => ({
				...commentDTO(row.comment, actor),
				replies: row.replies.map((reply) => commentDTO(reply, actor))
			})),
			nextCursor: page.nextCursor
		};
	}

	async function deleteOwnComment(actor, input) {
		const user = requireActor(actor);
		const { id, requestId } = input || {};
		if (typeof id !== 'string' || id.trim() === '') {
			throw fail(ERROR_CODES.INVALID_INPUT, '缺少评论标识');
		}
		if (typeof requestId !== 'string' || requestId.trim() === '') {
			throw fail(ERROR_CODES.INVALID_INPUT, '缺少 requestId');
		}

		const claim = await repository.reserveRequest(user.userId, requestId);
		if (!claim.ok) {
			if (claim.result) return claim.result;
			throw fail(ERROR_CODES.DEPENDENCY_UNAVAILABLE, '相同请求正在处理，请稍后重试');
		}

		try {
			const comment = await repository.getComment(id);
			if (!comment || comment.deleted === true) {
				throw fail(ERROR_CODES.CONTENT_UNAVAILABLE, '该评论不存在');
			}
			// 帖主不能删别人的评论；审核员走治理通道（T09）并单独留痕
			if (!canDeleteComment({
					actorId: user.userId,
					commentAuthorId: comment.authorId,
					isReviewer: user.isReviewer === true
				})) {
				throw fail(ERROR_CODES.FORBIDDEN, '只能删除自己的评论');
			}

			await repository.markCommentDeleted(id);
			const result = {
				id,
				deleted: true
			};
			await repository.completeRequest(user.userId, requestId, result);
			return result;
		} catch (error) {
			await repository.releaseRequest(user.userId, requestId);
			throw error;
		}
	}

	// ---------------- 聚合状态 ----------------

	/** 批量返回互动计数与本人状态，供广场与详情一次取齐。 */
	async function getInteractionSummary(actor, input) {
		const contentIds = (input && input.contentIds) || [];
		if (!Array.isArray(contentIds) || !contentIds.length) {
			throw fail(ERROR_CODES.INVALID_INPUT, '缺少内容标识列表');
		}
		const viewerId = actor && actor.userId;
		const summary = {};
		for (const contentId of contentIds) {
			const [likes, favorites, comments, liked, favorited] = await Promise.all([
				repository.countReactions(contentId, 'like'),
				repository.countReactions(contentId, 'favorite'),
				repository.countComments(contentId),
				viewerId ? repository.getReaction(viewerId, contentId, 'like') : null,
				viewerId ? repository.getReaction(viewerId, contentId, 'favorite') : null
			]);
			summary[contentId] = {
				likes,
				favorites,
				comments,
				liked: Boolean(liked),
				favorited: Boolean(favorited)
			};
		}
		return summary;
	}

	return {
		setReaction,
		setFollow,
		submitComment,
		listComments,
		deleteOwnComment,
		listFavorites,
		listFollowing,
		getProfileState,
		getInteractionSummary
	};
}

module.exports = {
	createSocialService,
	ERROR_CODES
};
