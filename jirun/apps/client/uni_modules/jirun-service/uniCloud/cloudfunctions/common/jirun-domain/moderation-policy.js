'use strict';

/**
 * 内容治理权限规则（contracts.md 第 2、5 节，计划 T09）。
 *
 * 纯函数，可在 Node 下直接测试。安全要求：
 * - 管理员身份只能来自服务端 token，客户端声称的 isAdmin 一律无效。
 * - 审核动作按目标类型走白名单，不允许出现「什么都能做」的通用动作。
 * - 本版本不提供管理员浏览全部私聊的能力，这是产品边界而非配置缺失。
 */

/** 各目标类型允许的审核动作。 */
const ALLOWED_ACTIONS = {
	content: ['approve', 'reject', 'remove', 'restore'],
	comment: ['approve', 'reject', 'remove'],
	media: ['approve', 'reject'],
	// 举报的处置：成立（下架目标）或不成立
	report: ['uphold', 'reject'],
	// 复核的处置：通过或不通过；通过也不等于立即恢复展示
	appeal: ['approve', 'reject']
};

/** 账号限制范围只有发布与私聊，不提供「限制登录」这类越界能力。 */
const RESTRICTION_SCOPES = ['publish', 'chat'];

/** 举报原因取值；内容由管理端配置展示文案。 */
const REPORT_REASONS = ['spam', 'fraud', 'harassment', 'illegal', 'false_info', 'other'];

const TARGET_TYPES = Object.keys(ALLOWED_ACTIONS);

/**
 * 复核能否恢复展示。
 * 作者已删除的内容不能借复核复活；当前版本未通过审核的也不能恢复。
 */
function canRestore(input) {
	const { deletedByAuthor, revisionApproved } = input || {};
	if (deletedByAuthor === true) return false;
	return revisionApproved === true;
}

/** 审核权限：必须是服务端给出的布尔真值，字符串不算。 */
function canReview(actorLike) {
	if (!actorLike || typeof actorLike !== 'object') return false;
	return actorLike.isReviewer === true;
}

/**
 * 是否允许浏览他人私聊。
 * 1.0.0 明确不提供该界面，因此对包括管理员在内的一切身份都返回 false。
 */
function canReadPrivateChats() {
	return false;
}

function isAllowedAdminAction(input) {
	const { targetType, action } = input || {};
	if (!TARGET_TYPES.includes(targetType)) return false;
	return ALLOWED_ACTIONS[targetType].includes(action);
}

function isAllowedRestrictionScope(scope) {
	return RESTRICTION_SCOPES.includes(scope);
}

function isAllowedReportReason(reason) {
	return REPORT_REASONS.includes(reason);
}

/**
 * 能否对某个决定申请复核：必须指向已产生的决定，且尚未申请过。
 * 复核是申请，不代表会自动恢复展示。
 */
function canAppealDecision(input) {
	const { decisionId, alreadyAppealed } = input || {};
	if (typeof decisionId !== 'string' || decisionId.trim() === '') return false;
	return alreadyAppealed !== true;
}

/**
 * 配置键里不允许出现付费相关能力。
 * 平台完全免费，因此支付、钱包、充值、提现、会员、抽成、打赏、积分充值
 * 这类开关不允许通过配置长出来——这是范围问题，不是配置没填。
 */
const FORBIDDEN_CONFIG_PATTERN =
	/(pay|payment|wallet|balance|recharge|withdraw|membership|vip|commission|donate|donation|topup|deposit)/i;

function isForbiddenConfigKey(key) {
	return typeof key === 'string' && FORBIDDEN_CONFIG_PATTERN.test(key);
}

module.exports = {
	canRestore,
	canReview,
	canReadPrivateChats,
	isAllowedAdminAction,
	isAllowedRestrictionScope,
	isAllowedReportReason,
	canAppealDecision,
	isForbiddenConfigKey,
	ALLOWED_ACTIONS,
	RESTRICTION_SCOPES,
	REPORT_REASONS,
	TARGET_TYPES
};
