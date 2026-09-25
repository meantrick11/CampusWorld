'use strict';

/**
 * 校园墙互动的 uniCloud 仓储实现。
 *
 * ⚠️ 当前状态：**未实现**，与 jirun-content/repository.js 同样的有意留白
 * （见 docs/decisions.md D-09）。
 *
 * 原因：本机没有 uniCloud 服务空间，聚合查询、唯一索引冲突处理与游标查询
 * 都无法做任何一次真实调用。计划明确要求「不杜撰框架接口」，因此不写一段
 * 看起来能跑、实际未经调用的数据库代码。
 *
 * ## 需要实现的方法（契约见 jirun-domain/social-repository.js）
 *
 *   getContent(contentId)                        读取内容与公开版本，用于可见性判定
 *   getReaction / insertReaction / deleteReaction / countReactions
 *                                                jr_reactions，唯一键 (actorId, contentId, type)
 *   listReactionsByActor(actorId, type, {cursor, limit})
 *                                                收藏与点赞列表，需联接内容与公开版本
 *   getFollow / insertFollow / deleteFollow / countFollowers / listFollowing
 *                                                jr_follows，唯一键 (actorId, targetUserId)
 *   getComment / createComment / listCommentThread / markCommentDeleted / countComments
 *                                                jr_comments，分页只针对主评论
 *   reserveRequest / completeRequest / releaseRequest
 *                                                与内容服务共用 jr_request_keys
 *
 * ## 实现时可用、已在本仓库模板代码中核实的 API
 *
 * - 条件更新 db.collection(name).where(cond).update(obj) 返回 { updated }
 * - 查询 where(cond).orderBy(key,'desc').limit(n).get() 返回 { data: [...] }
 * - 条件构造 db.command.in / gt / lt / or / and
 * - 新增 db.collection(name).add(obj)；指定文档写入 .doc(id).set(obj)
 *   （出处同上：common/uni-stat/stat/mod/base.js、uni-sms-co/index.obj.js）
 *
 * ## 实现时必须自行验证的事项
 *
 * 1. insertReaction / insertFollow 依赖唯一索引，并发重复会抛错；
 *    必须捕获冲突并视为「关系已存在」，而不是让请求失败。
 * 2. deleteReaction / deleteFollow 要返回 deleted 计数，且关系不存在时返回 0，
 *    使取消操作可安全重试。
 * 3. countReactions / countComments / countFollowers 必须从集合统计，
 *    绝不接受调用方传入的计数值。
 * 4. listCommentThread 先按主评论分页，再用 db.command.in 批量取回复，
 *    最后按 reviewStatus=approved 且 deleted!=true 过滤。
 * 5. 选择「回复随主评论返回」还是分开查询时，注意后过滤会使本页条数少于 limit，
 *    需要靠 nextCursor 继续翻页。
 */

function createUniCloudSocialRepository() {
	const error = new Error(
		'云端互动仓储尚未实现：需在真实的 uniCloud 开发空间中按官方文档实现并验证，参见本文件头部说明'
	);
	error.code = 'DEPENDENCY_UNAVAILABLE';
	throw error;
}

module.exports = { createUniCloudSocialRepository };
