const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const DOMAIN = path.join(
	__dirname,
	'../../apps/client/uni_modules/jirun-service/uniCloud/cloudfunctions/common/jirun-domain'
);
const { createModerationService } = require(path.join(DOMAIN, 'moderation-service.js'));
const { createMemoryModerationRepository } = require('../support/memory-moderation-repository.cjs');

// contracts.md 第 2、5 节与计划 T09：举报不改变公开状态；下架才改变；
// 复核通过也不能恢复作者已删除内容；管理员权限由服务端校验。

const AUTHOR = { userId: 'author' };
const REPORTER = { userId: 'reporter' };
const REVIEWER = { userId: 'reviewer', isReviewer: true };

function setup() {
	const repository = createMemoryModerationRepository();
	const service = createModerationService({ repository, clock: () => 1000 });
	return { repository, service };
}

// ---------------- 管理员权限 ----------------

test('普通用户不能访问审核队列', async () => {
	const { service } = setup();
	await assert.rejects(
		service.listQueue(AUTHOR, { queue: 'content' }),
		(error) => error.code === 'FORBIDDEN'
	);
});

test('客户端伪造管理员身份无效，字符串不算授权', async () => {
	const { service } = setup();
	await assert.rejects(
		service.listQueue({ userId: 'x', isReviewer: 'true', isAdmin: true }, { queue: 'content' }),
		(error) => error.code === 'FORBIDDEN'
	);
});

test('未登录访问审核队列返回需要登录', async () => {
	const { service } = setup();
	await assert.rejects(
		service.listQueue(null, { queue: 'content' }),
		(error) => error.code === 'AUTH_REQUIRED'
	);
});

test('不存在的队列类型被拒绝', async () => {
	const { service } = setup();
	await assert.rejects(
		service.listQueue(REVIEWER, { queue: 'chat' }),
		(error) => error.code === 'INVALID_INPUT'
	);
});

test('媒体审核在当前阶段明确不可用，而不是假装通过', async () => {
	const { service } = setup();
	await assert.rejects(
		service.decide(REVIEWER, {
			targetType: 'media',
			targetId: 'm1',
			action: 'approve',
			requestId: 'r1'
		}),
		(error) => error.code === 'DEPENDENCY_UNAVAILABLE'
	);
});

// ---------------- 举报 ----------------

test('提交举报不改变内容的公开状态', async () => {
	const { repository, service } = setup();
	await repository.seedContent({
		id: 'c1',
		authorId: 'author'
	});

	const result = await service.submitReport(REPORTER, {
		targetType: 'content',
		targetId: 'c1',
		reason: 'spam',
		description: '重复发布',
		requestId: 'r1'
	});
	assert.equal(result.status, 'submitted');

	const entry = await repository.getContent('c1');
	assert.equal(entry.root.visibility, 'published', '举报处理期间保持原有可见性');
});

test('举报不存在的对象被拒绝', async () => {
	const { service } = setup();
	await assert.rejects(
		service.submitReport(REPORTER, {
			targetType: 'content',
			targetId: 'missing',
			reason: 'spam',
			requestId: 'r1'
		}),
		(error) => error.code === 'CONTENT_UNAVAILABLE'
	);
});

test('举报原因必须是约定取值', async () => {
	const { repository, service } = setup();
	await repository.seedContent({
		id: 'c1',
		authorId: 'author'
	});
	await assert.rejects(
		service.submitReport(REPORTER, {
			targetType: 'content',
			targetId: 'c1',
			reason: '我不喜欢',
			requestId: 'r1'
		}),
		(error) => error.code === 'INVALID_INPUT'
	);
});

test('未登录不能举报', async () => {
	const { service } = setup();
	await assert.rejects(
		service.submitReport(null, {
			targetType: 'content',
			targetId: 'c1',
			reason: 'spam',
			requestId: 'r1'
		}),
		(error) => error.code === 'AUTH_REQUIRED'
	);
});

test('举报成立才下架内容，并记录原因与操作者', async () => {
	const { repository, service } = setup();
	await repository.seedContent({
		id: 'c1',
		authorId: 'author'
	});
	const report = await service.submitReport(REPORTER, {
		targetType: 'content',
		targetId: 'c1',
		reason: 'illegal',
		requestId: 'r1'
	});

	const decision = await service.decide(REVIEWER, {
		targetType: 'report',
		targetId: report.id,
		action: 'uphold',
		reason: '确认违规',
		requestId: 'd1'
	});
	assert.equal(decision.outcome, 'upheld');

	const entry = await repository.getContent('c1');
	assert.equal(entry.root.visibility, 'removed');

	const logs = repository.listAuditLogs();
	const upholdLog = logs.find((row) => row.action === 'report.uphold');
	assert.ok(upholdLog, '举报成立必须留痕');
	assert.equal(upholdLog.actorId, 'reviewer');
	assert.equal(upholdLog.reason, '确认违规');
});

test('举报不成立时内容保持公开', async () => {
	const { repository, service } = setup();
	await repository.seedContent({
		id: 'c1',
		authorId: 'author'
	});
	const report = await service.submitReport(REPORTER, {
		targetType: 'content',
		targetId: 'c1',
		reason: 'spam',
		requestId: 'r1'
	});
	await service.decide(REVIEWER, {
		targetType: 'report',
		targetId: report.id,
		action: 'reject',
		reason: '不成立',
		requestId: 'd1'
	});
	const entry = await repository.getContent('c1');
	assert.equal(entry.root.visibility, 'published');
});

test('重复处理同一举报被拒绝', async () => {
	const { repository, service } = setup();
	await repository.seedContent({
		id: 'c1',
		authorId: 'author'
	});
	const report = await service.submitReport(REPORTER, {
		targetType: 'content',
		targetId: 'c1',
		reason: 'spam',
		requestId: 'r1'
	});
	await service.decide(REVIEWER, {
		targetType: 'report',
		targetId: report.id,
		action: 'reject',
		reason: '不成立',
		requestId: 'd1'
	});
	await assert.rejects(
		service.decide(REVIEWER, {
			targetType: 'report',
			targetId: report.id,
			action: 'reject',
			reason: '再处理一次',
			requestId: 'd2'
		}),
		(error) => error.code === 'VERSION_CONFLICT'
	);
});

test('同一 requestId 重复举报只产生一条记录', async () => {
	const { repository, service } = setup();
	await repository.seedContent({
		id: 'c1',
		authorId: 'author'
	});
	const input = {
		targetType: 'content',
		targetId: 'c1',
		reason: 'spam',
		requestId: 'same'
	};
	const first = await service.submitReport(REPORTER, input);
	const second = await service.submitReport(REPORTER, input);
	assert.deepEqual(second, first);

	const queue = await service.listQueue(REVIEWER, { queue: 'report' });
	assert.equal(queue.items.length, 1);
});

// ---------------- 内容审核决定 ----------------

test('审核针对具体版本，旧版本不能发布用户后来修改的版本', async () => {
	const { repository, service } = setup();
	await repository.seedContent({
		id: 'c1',
		authorId: 'author',
		visibility: 'pending',
		revisionStatus: 'pending'
	});
	await repository.seedPendingRevision({
		contentId: 'c1',
		revisionId: 'c1-r1',
		revisionStatus: 'pending'
	});

	// 用另一个版本 id 去审核：不是当前待审版本
	await assert.rejects(
		service.decide(REVIEWER, {
			targetType: 'content',
			targetId: 'c1-r0',
			expectedVersion: 1,
			action: 'approve',
			requestId: 'd1'
		}),
		(error) => error.code === 'CONTENT_UNAVAILABLE'
	);
});

test('过期版本号审核被拒绝', async () => {
	const { repository, service } = setup();
	await repository.seedContent({
		id: 'c1',
		authorId: 'author',
		visibility: 'pending',
		revisionStatus: 'pending'
	});
	await repository.seedPendingRevision({
		contentId: 'c1',
		revisionId: 'c1-r1'
	});
	await assert.rejects(
		service.decide(REVIEWER, {
			targetType: 'content',
			targetId: 'c1-r1',
			expectedVersion: 9,
			action: 'approve',
			requestId: 'd1'
		}),
		(error) => error.code === 'VERSION_CONFLICT'
	);
});

test('审核通过后内容公开', async () => {
	const { repository, service } = setup();
	await repository.seedContent({
		id: 'c1',
		authorId: 'author',
		visibility: 'pending',
		revisionStatus: 'pending'
	});
	await repository.seedPendingRevision({
		contentId: 'c1',
		revisionId: 'c1-r1'
	});

	const decision = await service.decide(REVIEWER, {
		targetType: 'content',
		targetId: 'c1-r1',
		expectedVersion: 1,
		action: 'approve',
		requestId: 'd1'
	});
	assert.equal(decision.outcome, 'approved');

	const entry = await repository.getContent('c1');
	assert.equal(entry.root.visibility, 'published');
	assert.equal(entry.root.pendingRevisionId, null);
});

test('审核动作必须在目标类型的白名单内', async () => {
	const { service } = setup();
	await assert.rejects(
		service.decide(REVIEWER, {
			targetType: 'content',
			targetId: 'c1-r1',
			expectedVersion: 1,
			action: 'uphold',
			requestId: 'd1'
		}),
		(error) => error.code === 'INVALID_INPUT'
	);
});

// ---------------- 复核 ----------------

test('复核通过也不能恢复作者已删除的内容', async () => {
	const { repository, service } = setup();
	await repository.seedContent({
		id: 'c1',
		authorId: 'author',
		visibility: 'deleted',
		deletedByAuthor: true
	});
	// 先有一条决定可供复核
	const decision = await repository.appendDecision({
		targetType: 'content',
		targetId: 'c1',
		revisionId: 'c1-r1',
		action: 'remove',
		reason: '违规',
		actorId: 'reviewer',
		createdAt: 1
	});

	const record = await service.appeal(AUTHOR, {
		decisionId: decision._id,
		explanation: '不是我删的',
		requestId: 'a1'
	});
	assert.equal(record.status, 'submitted');

	await assert.rejects(
		service.decide(REVIEWER, {
			targetType: 'appeal',
			targetId: record.id,
			action: 'approve',
			requestId: 'd1'
		}),
		(error) => error.code === 'FORBIDDEN'
	);

	const entry = await repository.getContent('c1');
	assert.equal(entry.root.visibility, 'deleted', '作者已删除的内容不应被恢复');
});

test('复核受理不立即恢复展示', async () => {
	const { repository, service } = setup();
	await repository.seedContent({
		id: 'c1',
		authorId: 'author',
		visibility: 'removed',
		revisionStatus: 'approved'
	});
	const decision = await repository.appendDecision({
		targetType: 'content',
		targetId: 'c1',
		revisionId: 'c1-r1',
		action: 'remove',
		reason: '违规',
		actorId: 'reviewer',
		createdAt: 1
	});

	await service.appeal(AUTHOR, {
		decisionId: decision._id,
		explanation: '希望复核',
		requestId: 'a1'
	});

	const entry = await repository.getContent('c1');
	assert.equal(entry.root.visibility, 'removed', '仅受理复核不改变可见性');
});

test('复核通过且作者未删除时恢复公开', async () => {
	const { repository, service } = setup();
	await repository.seedContent({
		id: 'c1',
		authorId: 'author',
		visibility: 'removed',
		revisionStatus: 'approved'
	});
	const decision = await repository.appendDecision({
		targetType: 'content',
		targetId: 'c1',
		revisionId: 'c1-r1',
		action: 'remove',
		reason: '违规',
		actorId: 'reviewer',
		createdAt: 1
	});
	const record = await service.appeal(AUTHOR, {
		decisionId: decision._id,
		explanation: '希望复核',
		requestId: 'a1'
	});

	const outcome = await service.decide(REVIEWER, {
		targetType: 'appeal',
		targetId: record.id,
		action: 'approve',
		requestId: 'd1'
	});
	assert.equal(outcome.outcome, 'approved');
	const entry = await repository.getContent('c1');
	assert.equal(entry.root.visibility, 'published');
});

test('他人不能对自己的内容之外的决定申请复核', async () => {
	const { repository, service } = setup();
	await repository.seedContent({
		id: 'c1',
		authorId: 'author',
		visibility: 'removed'
	});
	const decision = await repository.appendDecision({
		targetType: 'content',
		targetId: 'c1',
		revisionId: 'c1-r1',
		action: 'remove',
		reason: '违规',
		actorId: 'reviewer',
		createdAt: 1
	});
	await assert.rejects(
		service.appeal(REPORTER, {
			decisionId: decision._id,
			explanation: '我来申请',
			requestId: 'a1'
		}),
		(error) => error.code === 'FORBIDDEN'
	);
});

test('同一决定不能重复申请复核', async () => {
	const { repository, service } = setup();
	await repository.seedContent({
		id: 'c1',
		authorId: 'author',
		visibility: 'removed'
	});
	const decision = await repository.appendDecision({
		targetType: 'content',
		targetId: 'c1',
		revisionId: 'c1-r1',
		action: 'remove',
		reason: '违规',
		actorId: 'reviewer',
		createdAt: 1
	});
	await service.appeal(AUTHOR, {
		decisionId: decision._id,
		explanation: '第一次',
		requestId: 'a1'
	});
	await assert.rejects(
		service.appeal(AUTHOR, {
			decisionId: decision._id,
			explanation: '第二次',
			requestId: 'a2'
		}),
		(error) => error.code === 'INVALID_INPUT'
	);
});

test('作者可以在本人案件里看到下架原因', async () => {
	const { repository, service } = setup();
	await repository.seedContent({
		id: 'c1',
		authorId: 'author'
	});
	const report = await service.submitReport(REPORTER, {
		targetType: 'content',
		targetId: 'c1',
		reason: 'illegal',
		requestId: 'r1'
	});
	await service.decide(REVIEWER, {
		targetType: 'report',
		targetId: report.id,
		action: 'uphold',
		reason: '内容包含违规信息',
		requestId: 'd1'
	});

	const cases = await service.listMyCases(AUTHOR, {});
	const mine = cases.items.find((row) => row.contentId === 'c1');
	assert.ok(mine, '作者应能看到与自己内容相关的决定');
	assert.equal(mine.reason, '内容包含违规信息');
});

// ---------------- 账号限制 ----------------

test('限制与解除都必须写明原因', async () => {
	const { service } = setup();
	await assert.rejects(
		service.restrictUser(REVIEWER, {
			userId: 'author',
			scope: 'publish',
			enabled: true,
			reason: '   ',
			requestId: 'l1'
		}),
		(error) => error.code === 'INVALID_INPUT'
	);
});

test('账号限制只允许发布与私聊两个范围', async () => {
	const { service } = setup();
	await assert.rejects(
		service.restrictUser(REVIEWER, {
			userId: 'author',
			scope: 'login',
			enabled: true,
			reason: '测试',
			requestId: 'l1'
		}),
		(error) => error.code === 'INVALID_INPUT'
	);
});

test('限制后 isRestricted 为真，解除后为假', async () => {
	const { repository, service } = setup();
	await service.restrictUser(REVIEWER, {
		userId: 'author',
		scope: 'publish',
		enabled: true,
		reason: '多次发布违规内容',
		requestId: 'l1'
	});
	assert.equal((await service.isRestricted(REVIEWER, {
		userId: 'author',
		scope: 'publish'
	})).restricted, true);

	await service.restrictUser(REVIEWER, {
		userId: 'author',
		scope: 'publish',
		enabled: false,
		reason: '已申诉通过',
		requestId: 'l2'
	});
	assert.equal((await service.isRestricted(REVIEWER, {
		userId: 'author',
		scope: 'publish'
	})).restricted, false);
	assert.equal(repository.countRestrictions(), 0);
});

test('限制与解除都留痕，且不含自动封号', async () => {
	const { repository, service } = setup();
	await service.restrictUser(REVIEWER, {
		userId: 'author',
		scope: 'chat',
		enabled: true,
		reason: '骚扰他人',
		requestId: 'l1'
	});
	await service.restrictUser(REVIEWER, {
		userId: 'author',
		scope: 'chat',
		enabled: false,
		reason: '已处理',
		requestId: 'l2'
	});
	const actions = repository.listAuditLogs().map((row) => row.action);
	assert.ok(actions.includes('user.restrict'));
	assert.ok(actions.includes('user.unrestrict'));
	// 计划要求不出现自动配送超时处罚之类的自动机制
	assert.equal(actions.some((action) => action.includes('auto')), false);
});

test('普通用户不能限制他人', async () => {
	const { service } = setup();
	await assert.rejects(
		service.restrictUser(AUTHOR, {
			userId: 'reporter',
			scope: 'publish',
			enabled: true,
			reason: '我想限制他',
			requestId: 'l1'
		}),
		(error) => error.code === 'FORBIDDEN'
	);
});

// ---------------- 配置与概览 ----------------

test('配置里不允许出现付费能力开关', async () => {
	const { service } = setup();
	await assert.rejects(
		service.updateConfig(REVIEWER, {
			key: 'paymentEnabled',
			value: true,
			requestId: 'c1'
		}),
		(error) => error.code === 'FORBIDDEN'
	);
});

test('配置修改使用版本检查', async () => {
	const { repository, service } = setup();
	await repository.seedConfig({
		key: 'categories',
		value: {
			idle: ['生活用品']
		},
		version: 1
	});

	const saved = await service.updateConfig(REVIEWER, {
		key: 'categories',
		value: {
			idle: ['生活用品', '书籍教材']
		},
		expectedVersion: 1,
		requestId: 'c1'
	});
	assert.equal(saved.version, 2);

	await assert.rejects(
		service.updateConfig(REVIEWER, {
			key: 'categories',
			value: {},
			expectedVersion: 1,
			requestId: 'c2'
		}),
		(error) => error.code === 'VERSION_CONFLICT'
	);
});

test('概览只统计内容与审核积压，不含交易流水', async () => {
	const { repository, service } = setup();
	await repository.seedContent({
		id: 'c1',
		authorId: 'author',
		visibility: 'pending',
		revisionStatus: 'pending'
	});
	await repository.seedPendingRevision({
		contentId: 'c1',
		revisionId: 'c1-r1'
	});

	const metrics = await service.getMetrics(REVIEWER);
	assert.equal(metrics.pendingContents, 1);
	const keys = Object.keys(metrics).join(',');
	for (const forbidden of ['pay', 'order', 'revenue', 'settlement', 'wallet']) {
		assert.equal(keys.includes(forbidden), false, `概览不应含 ${forbidden}`);
	}
});

test('普通用户不能读取概览', async () => {
	const { service } = setup();
	await assert.rejects(
		service.getMetrics(AUTHOR),
		(error) => error.code === 'FORBIDDEN'
	);
});

// ---------------- 队列 ----------------

test('待审队列返回内容、评论、举报与复核四类', async () => {
	const { repository, service } = setup();
	await repository.seedContent({
		id: 'c1',
		authorId: 'author',
		visibility: 'pending',
		revisionStatus: 'pending'
	});
	await repository.seedPendingRevision({
		contentId: 'c1',
		revisionId: 'c1-r1'
	});
	await repository.seedComment({
		id: 'cm1',
		contentId: 'c1',
		authorId: 'reporter',
		reviewStatus: 'pending'
	});
	await repository.seedReport({
		id: 'rp1',
		reporterId: 'reporter',
		targetId: 'c1'
	});

	assert.equal((await service.listQueue(REVIEWER, {
		queue: 'content'
	})).items.length, 1);
	assert.equal((await service.listQueue(REVIEWER, {
		queue: 'comment'
	})).items.length, 1);
	assert.equal((await service.listQueue(REVIEWER, {
		queue: 'report'
	})).items.length, 1);
	assert.equal((await service.listQueue(REVIEWER, {
		queue: 'appeal'
	})).items.length, 0);
});

test('评论审核通过后可见，删除后不可见', async () => {
	const { repository, service } = setup();
	await repository.seedComment({
		id: 'cm1',
		contentId: 'c1',
		authorId: 'reporter',
		reviewStatus: 'pending'
	});

	await service.decide(REVIEWER, {
		targetType: 'comment',
		targetId: 'cm1',
		action: 'approve',
		requestId: 'd1'
	});
	assert.equal((await repository.getComment('cm1')).reviewStatus, 'approved');

	await service.decide(REVIEWER, {
		targetType: 'comment',
		targetId: 'cm1',
		action: 'remove',
		reason: '违规评论',
		requestId: 'd2'
	});
	assert.equal((await repository.getComment('cm1')).deleted, true);
});
