/**
 * 云对象调用的公共部分：云端可用性判定、错误码文案、统一返回解析。
 * content.js 与 social.js 共用，避免两处各写一套。
 */

/**
 * 是否运行在本地预览构建里。
 * 预览产物带 uni-app 的 uni-cloud 客户端运行时，uniCloud 对象存在但没有关联
 * 服务空间，调用必然失败，因此用构建期常量区分而不是看 uniCloud 是否存在。
 * typeof 保证在未定义该常量的正式构建（HBuilderX）里也不会抛错。
 */
export const IS_PREVIEW_BUILD = typeof __JIRUN_PREVIEW__ !== 'undefined' && __JIRUN_PREVIEW__ === true;

/** 与 jirun-domain/cloud-response.js 的客户端可见错误码保持一致。 */
export const ERROR_TEXT = {
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

export function hasCloud() {
	if (IS_PREVIEW_BUILD) return false;
	return typeof uniCloud !== 'undefined' && typeof uniCloud.importObject === 'function';
}

export function toError(code, message) {
	const error = new Error(message || ERROR_TEXT[code] || '操作失败，请稍后重试');
	error.code = code;
	return error;
}

const instances = new Map();

function cloudObject(name) {
	if (!instances.has(name)) {
		// customUI: true —— 不弹框架自带提示，由页面按错误码展示
		instances.set(name, uniCloud.importObject(name, { customUI: true }));
	}
	return instances.get(name);
}

/**
 * 调用云对象并解开统一返回。
 * 网络或云函数不可达会转成可重试的 DEPENDENCY_UNAVAILABLE；
 * 业务错误码原样抛出，由页面决定展示与是否允许重试。
 */
export async function callCloud(objectName, method, params) {
	let response;
	try {
		response = await cloudObject(objectName)[method](params);
	} catch (error) {
		throw toError('DEPENDENCY_UNAVAILABLE', '网络或服务不可用，请重试');
	}
	if (response && response.errCode) {
		const code = typeof response.errCode === 'string' ? response.errCode : 'DEPENDENCY_UNAVAILABLE';
		throw toError(code, response.errMsg);
	}
	return { data: response ? response.data : null, localSample: false };
}
