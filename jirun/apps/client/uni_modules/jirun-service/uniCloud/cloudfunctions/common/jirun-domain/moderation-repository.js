'use strict';

/**
 * 内容治理的仓储契约（举报、复核、账号限制、配置、留痕）。
 *
 * moderation-service.js 只依赖下面这些方法，因此治理规则可以在 Node 下用内存仓储
 * 真实运行；云端实现只需满足同一契约。
 *
 * ## 必须由实现保证的语义
 *
 * 1. **内容写入带版本比较**：`saveContent(root, expectedVersion)` 与内容服务一致，
 *    版本不符必须拒绝。审核结果只对 `targetId` 指向的那个版本生效，
 *    防止用旧版本的审核结果发布用户后来修改的版本。
 * 2. **举报不改可见性**：受理举报只写举报记录，不动内容；只有 `decide` 的
 *    remove／uphold 才改变公开状态。
 * 3. **决定与留痕成对写入**：`appendDecision` 与 `appendAuditLog` 每次决定都要写，
 *    记录目标版本、原因与操作者。
 * 4. **复核唯一性**：`findAppealByDecision(decisionId)` 用于拒绝重复申请。
 * 5. **requestId 唯一性**：与内容服务同一套「预留 → 完成」协议。
 */

const REQUIRED_METHODS = [
	'getContent',
	'getRevision',
	'saveRevisionStatus',
	'saveContent',
	'getComment',
	'saveComment',
	'createReport',
	'getReport',
	'saveReport',
	'listReports',
	'listContentQueue',
	'listCommentQueue',
	'createAppeal',
	'getAppeal',
	'saveAppeal',
	'listAppeals',
	'findAppealByDecision',
	'getRestriction',
	'listRestrictions',
	'setRestriction',
	'getConfig',
	'saveConfig',
	'appendDecision',
	'appendAuditLog',
	'listDecisions',
	'reserveRequest',
	'completeRequest',
	'releaseRequest',
	'metrics'
];

function assertRepository(repository) {
	if (!repository || typeof repository !== 'object') {
		throw new TypeError('createModerationService 需要传入仓储实现');
	}
	const missing = REQUIRED_METHODS.filter((name) => typeof repository[name] !== 'function');
	if (missing.length) {
		throw new TypeError(`仓储缺少契约要求的方法：${missing.join('、')}`);
	}
	return repository;
}

module.exports = { assertRepository, REQUIRED_METHODS };
