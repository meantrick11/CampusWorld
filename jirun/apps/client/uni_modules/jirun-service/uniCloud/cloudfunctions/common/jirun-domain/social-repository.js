'use strict';

/**
 * 校园墙互动的仓储契约。
 *
 * social-service.js 只依赖下面这些方法，因此业务规则可以在 Node 下用内存仓储
 * 真实运行；云端实现只需满足同一契约。
 *
 * ## 必须由实现保证的语义
 *
 * 1. **唯一关系**：`insertReaction` 依赖 (actorId, contentId, type) 唯一索引，
 *    重复插入必须失败而不是产生第二行；`insertFollow` 依赖 (actorId, targetUserId) 唯一。
 *    这样「同一用户并发点赞 5 次」最终只有一条关系，计数只加一。
 * 2. **计数由服务端统计**：`countReactions` / `countComments` / `countFollowers`
 *    从数据本身算，不接受任何客户端传入的计数值。
 * 3. **删除幂等**：`deleteReaction` / `deleteFollow` 在关系不存在时返回 `deleted: 0`
 *    而不是报错，因此取消操作重试不会重复减数。
 * 4. **只返回可见评论**：`listCommentThread` 必须过滤掉未通过审核、已删除与已下架的评论，
 *    且由实现保证分页只对主评论进行，回复随主评论一起返回。
 * 5. **requestId 唯一性**：与内容服务同一套「预留 → 完成」协议，
 *    真实实现可共用 `jr_request_keys` 集合。
 */

const REQUIRED_METHODS = [
	'getContent',
	'getReaction',
	'insertReaction',
	'deleteReaction',
	'countReactions',
	'listReactionsByActor',
	'getFollow',
	'insertFollow',
	'deleteFollow',
	'countFollowers',
	'listFollowing',
	'getComment',
	'createComment',
	'listCommentThread',
	'markCommentDeleted',
	'countComments',
	'reserveRequest',
	'completeRequest',
	'releaseRequest'
];

function assertRepository(repository) {
	if (!repository || typeof repository !== 'object') {
		throw new TypeError('createSocialService 需要传入仓储实现');
	}
	const missing = REQUIRED_METHODS.filter((name) => typeof repository[name] !== 'function');
	if (missing.length) {
		throw new TypeError(`仓储缺少契约要求的方法：${missing.join('、')}`);
	}
	return repository;
}

module.exports = { assertRepository, REQUIRED_METHODS };
