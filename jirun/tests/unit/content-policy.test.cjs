const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { canReadPublic } = require(path.join(
	__dirname,
	'../../apps/client/uni_modules/jirun-service/uniCloud/cloudfunctions/common/jirun-domain/content-policy.js'
));

// contracts.md 第 4 节：公开查询只返回 publishedRevisionId 指向且已通过的版本，
// 并检查根内容未下架／删除；有新待审版本时不得泄漏待审正文。

test('已发布且版本通过的内容公开可读', () => {
	assert.equal(canReadPublic({ visibility: 'published', revisionStatus: 'approved' }), true);
});

test('草稿、待审、驳回、下架与删除都不可公开读取', () => {
	for (const visibility of ['draft', 'pending', 'rejected', 'removed', 'deleted']) {
		assert.equal(canReadPublic({ visibility, revisionStatus: 'approved' }), false, visibility);
	}
});

test('已发布但版本未通过审核时不可读，避免泄漏待审正文', () => {
	for (const revisionStatus of ['pending', 'rejected', 'draft']) {
		assert.equal(canReadPublic({ visibility: 'published', revisionStatus }), false, revisionStatus);
	}
});

test('缺少参数或取值非法时默认拒绝', () => {
	assert.equal(canReadPublic({}), false);
	assert.equal(canReadPublic(), false);
	assert.equal(canReadPublic({ visibility: 'published' }), false);
	assert.equal(canReadPublic({ revisionStatus: 'approved' }), false);
});

test('判断过程不修改传入参数', () => {
	const input = { visibility: 'published', revisionStatus: 'approved' };
	const snapshot = JSON.stringify(input);
	canReadPublic(input);
	assert.equal(JSON.stringify(input), snapshot);
});
