'use strict';

/**
 * 云对象统一返回。
 *
 * 约定（contracts.md 第 3 节）：
 *   成功 { errCode: 0, data: {...} }
 *   失败 { errCode: 'CODE', errMsg: '用户可见的说明' }
 *
 * 安全要求：绝不把内部栈、数据库细节或凭据回传客户端。因此只有错误码在
 * 白名单内时，才使用该错误自身的说明；其余一律折叠为通用的依赖不可用，
 * 并把原始错误留在服务端日志（由调用方记录），不进入响应体。
 */

const CLIENT_FACING_CODES = {
	AUTH_REQUIRED: '请先登录',
	FORBIDDEN: '没有操作权限',
	INVALID_INPUT: '提交的内容不符合要求',
	VERSION_CONFLICT: '内容已被修改，请刷新后重试',
	CONTENT_UNAVAILABLE: '该内容暂不可查看',
	MEDIA_NOT_READY: '媒体尚未准备好，请稍后重试',
	WAITING_REPLY: '对方尚未回复，暂时无法继续发送',
	BLOCKED: '当前无法向对方发送消息',
	RATE_LIMITED: '操作过于频繁，请稍后再试',
	DEPENDENCY_UNAVAILABLE: '服务暂时不可用，请稍后重试'
};

const GENERIC_CODE = 'DEPENDENCY_UNAVAILABLE';

const ok = (data) => ({ errCode: 0, data });

/**
 * 把抛出的错误转换为客户端可见的返回。
 * 白名单外的错误不泄漏原始 message。
 */
function failure(error) {
	const code =
		error && typeof error.code === 'string' && Object.prototype.hasOwnProperty.call(CLIENT_FACING_CODES, error.code)
			? error.code
			: GENERIC_CODE;

	const fallback = CLIENT_FACING_CODES[code];
	const message =
		code !== GENERIC_CODE && error && typeof error.message === 'string' && error.message.trim() !== ''
			? error.message
			: fallback;

	return { errCode: code, errMsg: message };
}

/** 包装一个返回原始数据的处理函数，自动套用统一返回格式。 */
function wrap(handler) {
	return async function wrapped(...args) {
		try {
			return ok(await handler.apply(this, args));
		} catch (error) {
			return failure(error);
		}
	};
}

module.exports = {
	ok,
	failure,
	wrap,
	CLIENT_FACING_CODES,
	GENERIC_CODE
};
