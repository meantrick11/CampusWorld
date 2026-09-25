'use strict';

/**
 * uniCloud 仓储实现。
 *
 * ⚠️ 当前状态：**未实现**，这是有意留出的缺口，不是遗漏。
 *
 * 原因：本机没有 uniCloud 服务空间，无法验证聚合查询、条件更新返回值、
 * 游标查询等行为。计划明确要求「不杜撰框架接口」「不得将本地任意目录引用当作
 * 已经被云部署打包」，因此不在这里写一段看起来能跑、实际未经任何真实调用的
 * 数据库代码——那种代码比一个明确的缺口更危险，因为可能被直接部署并信任。
 *
 * ## 需要实现的方法（契约见 jirun-domain/content-repository.js）
 *
 *   getById(id)                        按 id 取根内容，不存在返回 null
 *   getRevision(revisionId)            按 id 取版本
 *   getLatestRevision(contentId)       取该内容版本号最大的版本
 *   getPublishedRevision(contentId)    取当前公开版本
 *   createContentWithRevision({root, revision, linkAs})
 *                                      原子写入根内容与首个版本，并把新版本 id
 *                                      回填到 pendingRevisionId 或 publishedRevisionId
 *   createRevision(revision)           编辑时新增版本
 *   saveRevisionStatus(id, status)     写入版本的 reviewStatus
 *   saveWithVersion(root, expectedVersion)
 *                                      条件更新：where({_id, version: expectedVersion})
 *                                      .update(...)；updated 为 0 时返回
 *                                      { ok:false, reason:'VERSION_CONFLICT' }
 *   listPublic(query)                  返回 { items: [{root, published, latest}], nextCursor }
 *   listMine(query)                    同上，按 authorId 过滤
 *   reserveRequest / completeRequest / releaseRequest
 *                                      jr_request_keys 上的唯一键语义
 *   appendDecision / appendAuditLog     追加留痕
 *
 * ## 实现时可用的、已在本仓库模板代码中核实的 API
 *
 * - 条件更新：db.collection(name).where(condition).update(params)，返回 { updated }
 *   （见 uniCloud-aliyun/cloudfunctions/common/uni-stat/stat/mod/base.js:187）
 * - 查询：where(cond).orderBy(key, 'desc').limit(n).get() 返回 { data: [...] }
 *   （见 uni-sms-co/index.obj.js:83 与 base.js:316-327）
 * - 条件构造：db.command.in(...) / db.command.gt(...) / db.command.inc(...)
 *   （见 uni-sms-co/index.obj.js:128-151）
 * - 新增：db.collection(name).add(obj)（支持数组批量，见 index.obj.js:93/203）
 * - 指定文档写入：db.collection(name).doc(id).set(obj)（见 index.obj.js:310）
 *
 * ## 实现时必须自行验证的事项
 *
 * 1. listPublic 的分页与过滤：关键词、分类、区域字段位于版本表而非根表。
 *    建议先按根表条件分页，再按本页 id 批量取版本（db.command.in），
 *    然后过滤；若数据量增长，改为在根表上维护公开版本快照或使用聚合查询。
 *    注意后过滤会让「本页条数」少于 limit，需要用 nextCursor 继续翻页。
 * 2. 游标条件中的 createdAt/_id 复合比较需用 db.command.or 组合，
 *    请对照实际 SDK 版本确认写法与字符串 _id 的比较行为。
 * 3. reserveRequest 依赖 jr_request_keys 的唯一索引；并发冲突会抛错，
 *    需捕获后回查已存在的结果，而不是直接失败。
 * 4. 审核通过需要同时写版本状态与根内容指针，应放在事务中，
 *    或确认条件更新失败时可安全重试。
 */

function createUniCloudContentRepository() {
	const error = new Error(
		'云端仓储尚未实现：需在真实的 uniCloud 开发空间中按官方文档实现并验证，参见本文件头部说明'
	);
	error.code = 'DEPENDENCY_UNAVAILABLE';
	throw error;
}

module.exports = { createUniCloudContentRepository };
