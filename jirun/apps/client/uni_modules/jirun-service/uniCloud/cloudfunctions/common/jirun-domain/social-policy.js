'use strict';

/**
 * 校园墙互动的权限规则（contracts.md 第 2 节、计划 T07）。
 *
 * 纯函数，可在 Node 下直接测试。actorId 只能由服务端 token 校验结果提供，
 * 这些函数不接受任何客户端声称的身份。
 *
 * 六项互动：点赞、评论、回复、收藏、关注、分享。
 * 其中分享不改变服务端状态，因此没有写规则，只在重新访问时按可见性校验。
 */

const { canReadPublic } = require('./content-policy.js');

const REACTION_TYPES = ['like', 'favorite'];

const isNonEmptyString = (value) => typeof value === 'string' && value.trim() !== '';

/**
 * 评论删除权限：本人可删自己的评论；帖子作者不能删别人的评论。
 * 审核员走治理通道（T09），但必须是服务端给出的布尔真值，
 * 字符串 'true' 之类不算授权。
 */
function canDeleteComment(input) {
	const { actorId, commentAuthorId, isReviewer } = input || {};
	if (!isNonEmptyString(actorId)) return false;
	if (isReviewer === true) return true;
	return isNonEmptyString(commentAuthorId) && actorId === commentAuthorId;
}

/** 收藏仅本人可见：他人即使拿到标识也不返回。 */
function canViewFavorites(input) {
	const { actorId, ownerId } = input || {};
	if (!isNonEmptyString(actorId) || !isNonEmptyString(ownerId)) return false;
	return actorId === ownerId;
}

/** 不能关注自己；关注也不解锁私聊（私聊另有额度规则）。 */
function canFollow(input) {
	const { actorId, targetUserId } = input || {};
	if (!isNonEmptyString(actorId) || !isNonEmptyString(targetUserId)) return false;
	return actorId !== targetUserId;
}

function isAllowedReactionType(type) {
	return REACTION_TYPES.includes(type);
}

/**
 * 互动只作用于公开可见的校园墙内容。
 * 待审、下架、删除的内容不能被点赞或收藏，结束状态也不影响互动。
 */
function canReact(input) {
	const { actorId, content } = input || {};
	if (!isNonEmptyString(actorId)) return false;
	if (!content || typeof content !== 'object') return false;
	if (content.kind !== 'wall') return false;
	return canReadPublic({
		visibility: content.visibility,
		revisionStatus: content.revisionStatus
	});
}

/**
 * 只允许一层回复：可以回复主评论，不能回复回复。
 * parentId 为空表示主评论。
 */
function isReplyingToTopLevel(input) {
	const { parentId, parentComment } = input || {};
	if (parentId === undefined || parentId === null || parentId === '') return true;
	if (!parentComment || typeof parentComment !== 'object') return false;
	const grandParent = parentComment.parentId;
	return grandParent === undefined || grandParent === null || grandParent === '';
}

module.exports = {
	canDeleteComment,
	canViewFavorites,
	canFollow,
	isAllowedReactionType,
	canReact,
	isReplyingToTopLevel,
	REACTION_TYPES
};
