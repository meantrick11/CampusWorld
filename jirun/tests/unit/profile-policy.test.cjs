const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { canEditField, COOLDOWN_MS } = require(path.join(
	__dirname,
	'../../apps/client/uni_modules/jirun-service/uniCloud/cloudfunctions/common/jirun-domain/profile-policy.js'
));

// contracts.md 第 2 节与计划 T02：昵称和头像各自开始七天冷却，
// 首次登录不消耗各自的初始修改机会。昵称与头像使用不同时间字段。

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

test('冷却期固定为七天', () => {
	assert.equal(COOLDOWN_MS, 7 * DAY);
});

test('从未修改过时允许修改，首次不消耗机会', () => {
	assert.equal(canEditField({ now: NOW, lastChangedAt: null }), true);
	assert.equal(canEditField({ now: NOW, lastChangedAt: undefined }), true);
	assert.equal(canEditField({ now: NOW, lastChangedAt: 0 }), true);
	assert.equal(canEditField({ now: NOW }), true);
});

test('差 1 毫秒未满七天时拒绝', () => {
	assert.equal(canEditField({ now: NOW, lastChangedAt: NOW - COOLDOWN_MS + 1 }), false);
});

test('刚好满七天时允许', () => {
	assert.equal(canEditField({ now: NOW, lastChangedAt: NOW - COOLDOWN_MS }), true);
});

test('超过七天允许，且不影响其他字段', () => {
	assert.equal(canEditField({ now: NOW, lastChangedAt: NOW - 8 * DAY }), true);
});

test('昵称与头像各自使用自己的时间字段，互不影响', () => {
	// 服务端应分别传入 nicknameLastChangedAt 与 avatarLastChangedAt
	const profile = {
		nicknameLastChangedAt: NOW - 1 * DAY,
		avatarLastChangedAt: NOW - 8 * DAY
	};
	assert.equal(canEditField({ now: NOW, lastChangedAt: profile.nicknameLastChangedAt }), false);
	assert.equal(canEditField({ now: NOW, lastChangedAt: profile.avatarLastChangedAt }), true);
});

test('已有修改记录但缺少服务端时间时默认拒绝，不使用本机时间兜底', () => {
	assert.equal(canEditField({ lastChangedAt: NOW - 1 * DAY }), false);
	assert.equal(canEditField({ now: NaN, lastChangedAt: NOW - 1 * DAY }), false);
});

test('判断过程不修改传入参数', () => {
	const input = { now: NOW, lastChangedAt: NOW - 1 * DAY };
	const snapshot = JSON.stringify(input);
	canEditField(input);
	assert.equal(JSON.stringify(input), snapshot);
});
