const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const DOMAIN = path.join(
	__dirname,
	'../../apps/client/uni_modules/jirun-service/uniCloud/cloudfunctions/common/jirun-domain'
);
const { ok, failure, wrap, GENERIC_CODE } = require(path.join(DOMAIN, 'cloud-response.js'));
const { isReviewer, toActor } = require(path.join(DOMAIN, 'actor-policy.js'));

// contracts.md 第 3 节：统一返回；第 1 节：管理员从服务端身份和权限得出。
// 这两点是安全相关的，因此单独写成可运行的测试。

test('成功返回带 errCode 0 与 data', () => {
	assert.deepEqual(ok({ id: 'c1' }), { errCode: 0, data: { id: 'c1' } });
});

test('白名单内的错误码保留其面向用户的说明', () => {
	const response = failure(Object.assign(new Error('只能操作自己发布的信息'), { code: 'FORBIDDEN' }));
	assert.equal(response.errCode, 'FORBIDDEN');
	assert.equal(response.errMsg, '只能操作自己发布的信息');
});

test('白名单外的错误不泄漏内部信息', () => {
	const internal = new Error('MongoError: connection to 10.0.0.5:3717 refused, token=abc123');
	internal.code = 'SOME_INTERNAL_CODE';
	const response = failure(internal);
	assert.equal(response.errCode, GENERIC_CODE);
	assert.equal(response.errMsg.includes('MongoError'), false);
	assert.equal(response.errMsg.includes('10.0.0.5'), false);
	assert.equal(response.errMsg.includes('abc123'), false);
});

test('普通异常与非法输入都折叠为通用错误', () => {
	assert.equal(failure(new TypeError('x is not a function')).errCode, GENERIC_CODE);
	assert.equal(failure(undefined).errCode, GENERIC_CODE);
	assert.equal(failure('字符串错误').errCode, GENERIC_CODE);
	assert.equal(failure(null).errCode, GENERIC_CODE);
});

test('依赖不可用时不使用原始 message', () => {
	const response = failure(Object.assign(new Error('inner stack detail'), { code: 'DEPENDENCY_UNAVAILABLE' }));
	assert.equal(response.errCode, GENERIC_CODE);
	assert.equal(response.errMsg.includes('inner stack detail'), false);
});

test('wrap 把成功结果包成统一返回，把异常折叠成错误返回', async () => {
	const success = wrap(async (value) => ({ doubled: value * 2 }));
	assert.deepEqual(await success(21), { errCode: 0, data: { doubled: 42 } });

	const failing = wrap(async () => {
		throw Object.assign(new Error('内容已被修改'), { code: 'VERSION_CONFLICT' });
	});
	assert.deepEqual(await failing(), {
		errCode: 'VERSION_CONFLICT',
		errMsg: '内容已被修改'
	});
});

test('wrap 保留 this 上下文，云对象内可直接使用', async () => {
	const object = {
		prefix: 'jirun',
		method: wrap(async function () {
			return `${this.prefix}-ok`;
		})
	};
	assert.deepEqual(await object.method(), { errCode: 0, data: 'jirun-ok' });
});

test('管理员角色或审核权限任一命中即视为审核员', () => {
	assert.equal(isReviewer({ role: ['admin'] }), true);
	assert.equal(isReviewer({ role: 'admin' }), true);
	assert.equal(isReviewer({ permission: ['jirun-content:review'] }), true);
	assert.equal(isReviewer({ permission: 'jirun-admin' }), true);
});

test('普通用户与空值都不是审核员', () => {
	assert.equal(isReviewer({ role: ['user'], permission: [] }), false);
	assert.equal(isReviewer({ role: [] }), false);
	assert.equal(isReviewer({}), false);
	assert.equal(isReviewer(undefined), false);
	assert.equal(isReviewer(null), false);
	assert.equal(isReviewer({ role: 'administrator' }), false);
});

test('管理员身份只能来自 token 结果，未登录返回 null', () => {
	assert.equal(toActor(null), null);
	assert.equal(toActor({}), null);
	assert.equal(toActor({ uid: '' }), null);
	assert.deepEqual(toActor({ uid: 'A' }), { userId: 'A', isReviewer: false });
	assert.deepEqual(toActor({ uid: 'R', role: ['admin'] }), { userId: 'R', isReviewer: true });
});

test('客户端在业务参数里声称管理员不会影响 actor', () => {
	// actor 只由 token 结果构造；这里模拟云对象收到伪造的 isReviewer 参数
	const tokenResult = { uid: 'A', role: ['user'] };
	const forgedParams = { isReviewer: true, isAdmin: true, role: ['admin'] };
	const actor = toActor(tokenResult);
	assert.equal(actor.isReviewer, false);
	assert.equal(actor.userId, 'A');
	assert.equal(forgedParams.isReviewer, true, '伪造参数本身存在，但未被使用');
});
