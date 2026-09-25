'use strict';

/**
 * 内容治理的 uniCloud 仓储实现。
 *
 * ⚠️ 当前状态：**未实现**，与 jirun-content／jirun-social 的仓储同样的有意留白
 * （见 docs/decisions.md D-09）。
 *
 * 原因：本机没有 uniCloud 服务空间，条件更新、唯一索引冲突与队列分页查询都无法
 * 做任何一次真实调用。计划明确要求「不杜撰框架接口」，因此不写看起来能跑、
 * 实际未经调用的数据库代码。
 *
 * ## 需要实现的方法（契约见 jirun-domain/moderation-repository.js）
 *
 *   内容与版本：getContent / getRevision / saveRevisionStatus / saveContent
 *   评论：      getComment / saveComment
 *   举报：      createReport / getReport / saveReport / listReports
 *   待审队列：  listContentQueue / listCommentQueue
 *   复核：      createAppeal / getAppeal / saveAppeal / listAppeals / findAppealByDecision
 *   账号限制：  getRestriction / listRestrictions / setRestriction
 *   配置：      getConfig / saveConfig
 *   留痕：      appendDecision / appendAuditLog / listDecisions
 *   幂等：      reserveRequest / completeRequest / releaseRequest（共用 jr_request_keys）
 *   概览：      metrics
 *
 * ## 实现时可用、已在本仓库模板代码中核实的 API
 *
 * - 条件更新 db.collection(name).where({_id, version}).update(obj) 返回 { updated }
 * - 查询 where(cond).orderBy(key,'asc'|'desc').limit(n).get() 返回 { data: [...] }
 * - 条件构造 db.command.in / gt / lt / neq / or / and
 * - 新增 db.collection(name).add(obj)；指定文档写入 .doc(id).set(obj)
 *   （出处：common/uni-stat/stat/mod/base.js、uni-sms-co/index.obj.js）
 *
 * ## 实现时必须自行验证的事项
 *
 * 1. 队列分页用 createdAt + _id 的复合游标，需确认 db.command.or 的写法与
 *    字符串 _id 的比较行为。
 * 2. findAppealByDecision 依赖 jr_appeals 的 decisionId 唯一索引；
 *    并发重复申请必须被索引拒绝，而不是产生两条。
 * 3. saveContent 必须是与数据库条件更新等价的操作；审核通过与举报下架
 *    都涉及「内容指针 + 版本状态」两处写入，应放入事务或确认可安全重试。
 * 4. metrics 只统计发布与审核相关计数，不得引入交易、订单或金额统计。
 */

function createUniCloudModerationRepository() {
	const error = new Error(
		'云端治理仓储尚未实现：需在真实的 uniCloud 开发空间中按官方文档实现并验证，参见本文件头部说明'
	);
	error.code = 'DEPENDENCY_UNAVAILABLE';
	throw error;
}

module.exports = { createUniCloudModerationRepository };
