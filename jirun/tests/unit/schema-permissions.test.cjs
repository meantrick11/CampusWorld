const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { findPermissionViolations, isBusinessCollection } = require(path.join(
	__dirname,
	'../../scripts/lib/schema-permissions.cjs'
));

// 这条检查守护的是「客户端不能绕过云对象直接读写业务集合」。
// 之前它只扫描应用根目录的 database，漏掉了 uni_modules 内的自有集合，
// 却仍然打印「已禁止客户端直接读写」——报告通过但实际没检查。
// 因此这里用合成 schema 直接验证判定逻辑，不依赖真实文件。

const DENY_ALL = { permission: { read: false, create: false, update: false, delete: false } };

test('四项权限全部为 false 时通过', () => {
	assert.deepEqual(findPermissionViolations(DENY_ALL, 'jr_contents'), []);
});

test('任一项权限被放开都报错', () => {
	for (const action of ['read', 'create', 'update', 'delete']) {
		const schema = { permission: { ...DENY_ALL.permission, [action]: true } };
		const problems = findPermissionViolations(schema, 'jr_contents');
		assert.equal(problems.length, 1, `${action} 放开时应报错`);
		assert.ok(problems[0].includes(action));
	}
});

test('权限写成表达式字符串同样报错', () => {
	const schema = { permission: { ...DENY_ALL.permission, read: 'doc._id == auth.uid' } };
	const problems = findPermissionViolations(schema, 'jr_contents');
	assert.equal(problems.length, 1);
});

test('缺少 permission 声明视为未确认，必须报错', () => {
	const problems = findPermissionViolations({ bsonType: 'object' }, 'jr_contents');
	assert.equal(problems.length, 1);
	assert.ok(problems[0].includes('缺少 permission'));
});

test('权限项缺失也算未确认', () => {
	const problems = findPermissionViolations({ permission: { read: false } }, 'jr_contents');
	assert.equal(problems.length, 3);
});

test('非对象输入不抛异常但报错', () => {
	assert.equal(findPermissionViolations(null, 'jr_contents').length, 1);
	assert.equal(findPermissionViolations('x', 'jr_contents').length, 1);
});

test('只有 jr_ 前缀属于本项目业务集合', () => {
	assert.equal(isBusinessCollection('jr_contents.schema.json'), true);
	assert.equal(isBusinessCollection('opendb-news-articles.schema.json'), false);
	assert.equal(isBusinessCollection('uni-id-users.schema.json'), false);
});
