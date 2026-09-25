const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { canSend } = require(path.join(
	__dirname,
	'../../apps/client/uni_modules/jirun-service/uniCloud/cloudfunctions/common/jirun-domain/contact-policy.js'
));

// contracts.md 第 6 节：同一账号对在对方未回复前只允许发起者一条已接受消息。
// 状态取值 none / pending / active；blocked 优先于一切。

test('未回复时发起人不能再发，对方可以回复', () => {
	const base = { state: 'pending', initiatorId: 'A', blocked: false };
	assert.equal(canSend({ ...base, actorId: 'A' }).allowed, false);
	assert.equal(canSend({ ...base, actorId: 'B' }).allowed, true);
});

test('未回复时发起人被拒的原因是可识别的等待状态', () => {
	const result = canSend({ state: 'pending', actorId: 'A', initiatorId: 'A', blocked: false });
	assert.equal(result.reason, 'WAITING_REPLY');
});

test('拉黑优先于已经开放的聊天', () => {
	assert.equal(canSend({ state: 'active', actorId: 'A', initiatorId: 'A', blocked: true }).allowed, false);
});

test('拉黑时回复方同样被拒绝，原因为 BLOCKED', () => {
	const result = canSend({ state: 'pending', actorId: 'B', initiatorId: 'A', blocked: true });
	assert.equal(result.allowed, false);
	assert.equal(result.reason, 'BLOCKED');
});

test('尚无联系记录时允许发出第一条', () => {
	assert.equal(canSend({ state: 'none', actorId: 'A', initiatorId: null, blocked: false }).allowed, true);
});

test('已激活的会话双方都可以继续发送', () => {
	assert.equal(canSend({ state: 'active', actorId: 'A', initiatorId: 'A', blocked: false }).allowed, true);
	assert.equal(canSend({ state: 'active', actorId: 'B', initiatorId: 'A', blocked: false }).allowed, true);
});

test('未知状态一律拒绝，不因未识别而放行', () => {
	const result = canSend({ state: 'weird', actorId: 'A', initiatorId: 'A', blocked: false });
	assert.equal(result.allowed, false);
	assert.equal(result.reason, 'INVALID_INPUT');
});

test('缺少当前用户标识时拒绝，不接受前端代替身份', () => {
	const result = canSend({ state: 'none', actorId: '', initiatorId: null, blocked: false });
	assert.equal(result.allowed, false);
	assert.equal(result.reason, 'AUTH_REQUIRED');
});

test('判断过程不修改传入参数', () => {
	const input = { state: 'pending', actorId: 'A', initiatorId: 'A', blocked: false };
	const snapshot = JSON.stringify(input);
	canSend(input);
	assert.equal(JSON.stringify(input), snapshot);
});
