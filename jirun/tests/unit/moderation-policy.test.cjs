const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const DOMAIN = path.join(
	__dirname,
	'../../apps/client/uni_modules/jirun-service/uniCloud/cloudfunctions/common/jirun-domain'
);
const {
	canRestore,
	canReview,
	canReadPrivateChats,
	isAllowedAdminAction,
	isAllowedRestrictionScope,
	isAllowedReportReason,
	canAppealDecision,
	isForbiddenConfigKey
} = require(path.join(DOMAIN, 'moderation-policy.js'));

// contracts.md 第 2、5 节与计划 T09：复核不能恢复作者已删除的内容；
// 管理员权限由服务端校验；管理员不默认拥有浏览全部私聊的界面。

test('复核不能恢复作者已经删除的内容', () => {
	assert.equal(canRestore({
		deletedByAuthor: true,
		revisionApproved: true
	}), false);
});

test('复核恢复要求当前版本已通过，且不是作者本人删除', () => {
	assert.equal(canRestore({
		deletedByAuthor: false,
		revisionApproved: true
	}), true);
	assert.equal(canRestore({
		deletedByAuthor: false,
		revisionApproved: false
	}), false);
	assert.equal(canRestore({
		deletedByAuthor: true,
		revisionApproved: false
	}), false);
	assert.equal(canRestore(), false);
	assert.equal(canRestore({}), false);
});

test('只有服务端给出的布尔 isReviewer 才算审核权限', () => {
	assert.equal(canReview({
		isReviewer: true
	}), true);
	assert.equal(canReview({
		isReviewer: false
	}), false);
	assert.equal(canReview({
		isReviewer: 'true'
	}), false);
	assert.equal(canReview({
		isAdmin: true
	}), false);
	assert.equal(canReview(null), false);
	assert.equal(canReview(), false);
});

test('本版本不提供管理员浏览全部私聊的能力', () => {
	// 即使持有审核权限也不允许；这是产品边界，不是权限没配好
	assert.equal(canReadPrivateChats({
		isReviewer: true
	}), false);
	assert.equal(canReadPrivateChats({
		isReviewer: true,
		isAdmin: true
	}), false);
	assert.equal(canReadPrivateChats(null), false);
});

test('审核动作必须落在目标类型允许的白名单内', () => {
	assert.equal(isAllowedAdminAction({
		targetType: 'content',
		action: 'approve'
	}), true);
	assert.equal(isAllowedAdminAction({
		targetType: 'content',
		action: 'uphold'
	}), false);
	assert.equal(isAllowedAdminAction({
		targetType: 'report',
		action: 'uphold'
	}), true);
	assert.equal(isAllowedAdminAction({
		targetType: 'appeal',
		action: 'approve'
	}), true);
	assert.equal(isAllowedAdminAction({
		targetType: 'media',
		action: 'reject'
	}), true);
	assert.equal(isAllowedAdminAction({
		targetType: 'unknown',
		action: 'approve'
	}), false);
	assert.equal(isAllowedAdminAction({
		targetType: 'content',
		action: 'deleteForever'
	}), false);
	assert.equal(isAllowedAdminAction({}), false);
});

test('账号限制只允许发布与私聊两个范围', () => {
	assert.equal(isAllowedRestrictionScope('publish'), true);
	assert.equal(isAllowedRestrictionScope('chat'), true);
	assert.equal(isAllowedRestrictionScope('login'), false);
	assert.equal(isAllowedRestrictionScope('all'), false);
	assert.equal(isAllowedRestrictionScope(''), false);
	assert.equal(isAllowedRestrictionScope(), false);
});

test('举报原因只接受约定的取值', () => {
	for (const reason of ['spam', 'fraud', 'harassment', 'illegal', 'false_info', 'other']) {
		assert.equal(isAllowedReportReason(reason), true, reason);
	}
	assert.equal(isAllowedReportReason('随便写'), false);
	assert.equal(isAllowedReportReason(''), false);
	assert.equal(isAllowedReportReason(), false);
});

test('只能对已产生决定的案件申请复核，且不能重复申请', () => {
	assert.equal(canAppealDecision({
		decisionId: 'd1',
		alreadyAppealed: false
	}), true);
	assert.equal(canAppealDecision({
		decisionId: 'd1',
		alreadyAppealed: true
	}), false);
	assert.equal(canAppealDecision({
		alreadyAppealed: false
	}), false);
	assert.equal(canAppealDecision(), false);
});

test('配置键不允许出现付费能力开关', () => {
	for (const key of ['paymentEnabled', 'wallet', 'rechargeSwitch', 'membershipLevels',
			'commissionRate', 'donateUrl', 'withdrawLimit', 'vipOnly', 'balanceVisible'
		]) {
		assert.equal(isForbiddenConfigKey(key), true, key);
	}
});

test('正常配置键不受影响', () => {
	for (const key of ['categories', 'regions', 'mediaQuota', 'textLimits', 'reportReasons']) {
		assert.equal(isForbiddenConfigKey(key), false, key);
	}
	assert.equal(isForbiddenConfigKey(''), false);
	assert.equal(isForbiddenConfigKey(), false);
});
