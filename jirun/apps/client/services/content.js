/**
 * 内容服务适配器：页面只通过这里访问数据，不直接调用云对象。
 *
 * 两种数据来源，界面上必须可区分：
 * 1. 云端：uniCloud.importObject('jirun-content')，返回 contracts.md 约定的
 *    { errCode, data } 或 { errCode, errMsg }。
 * 2. 本地样例：未连接 uniCloud 时（例如 H5 预览、未关联服务空间）使用本地样例，
 *    并在返回结果上标记 localSample: true，由页面显示「本地样例数据」标识。
 *
 * 绝不把本地样例伪装成云端结果：两者都会带上来源标记，调用方必须尊重它。
 */

import { sampleContents, sampleMine } from './local-sample-data.js';

const CLOUD_OBJECT = 'jirun-content';

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

/**
 * 是否运行在本地预览构建里。
 * 预览产物里带 uni-app 的 uni-cloud 客户端运行时，uniCloud 对象存在但没有关联
 * 服务空间，调用必然失败。因此由构建期常量区分，而不是看 uniCloud 是否存在。
 * typeof 保证在未定义该常量的构建（HBuilderX）里也不会抛错。
 */
const IS_PREVIEW_BUILD = typeof __JIRUN_PREVIEW__ !== 'undefined' && __JIRUN_PREVIEW__ === true;

/**
 * 云端是否可用。
 * 预览构建固定为不可用，直接走本地样例；正式构建下 uniCloud 存在即视为可用，
 * 若未绑定服务空间，调用会失败并提示可重试。
 */
export function hasCloud() {
	if (IS_PREVIEW_BUILD) return false;
	return typeof uniCloud !== 'undefined' && typeof uniCloud.importObject === 'function';
}

let objectInstance = null;

function contentObject() {
	if (!objectInstance) {
		// customUI: true —— 不弹框架自带的错误提示，由页面按错误码展示
		objectInstance = uniCloud.importObject(CLOUD_OBJECT, { customUI: true });
	}
	return objectInstance;
}

function toError(code, message) {
	const error = new Error(message || ERROR_TEXT[code] || '操作失败，请稍后重试');
	error.code = code;
	return error;
}

async function callCloud(method, params) {
	let response;
	try {
		response = await contentObject()[method](params);
	} catch (error) {
		// 网络或云函数不可达：可重试
		throw toError('DEPENDENCY_UNAVAILABLE', '网络或服务不可用，请重试');
	}
	if (response && response.errCode) {
		const code = typeof response.errCode === 'string' ? response.errCode : 'DEPENDENCY_UNAVAILABLE';
		throw toError(code, response.errMsg);
	}
	return { data: response ? response.data : null, localSample: false };
}

// ---------------- 本地样例分支 ----------------

const newestFirst = (a, b) => b.createdAt - a.createdAt;

const matchesKeyword = (item, keyword) => {
	if (!keyword) return true;
	const needle = String(keyword).trim().toLowerCase();
	if (!needle) return true;
	return `${item.title}\n${item.body}`.toLowerCase().includes(needle);
};

const matchesCategory = (item, category) => !category || (item.details && item.details.category === category);

const matchesRegion = (item, region) => {
	if (!region) return true;
	const details = item.details || {};
	return [details.fromRegion, details.toRegion, details.handoverRegion].includes(region);
};

function pageOf(items, cursor, limit) {
	const size = Math.min(Math.max(Number(limit) || 20, 1), 50);
	const start = cursor ? Number(cursor) : 0;
	const slice = items.slice(start, start + size);
	const nextStart = start + size;
	return {
		items: slice,
		nextCursor: nextStart < items.length ? String(nextStart) : null
	};
}

function localListPublic({ kind, keyword, category, region, cursor, limit }) {
	const items = sampleContents
		.filter((item) => (kind ? item.kind === kind : true))
		.filter((item) => item.businessStatus !== 'closed')
		.filter((item) => matchesKeyword(item, keyword))
		.filter((item) => matchesCategory(item, category))
		.filter((item) => matchesRegion(item, region))
		.sort(newestFirst);
	return pageOf(items, cursor, limit);
}

function localListMine({ kind, status, cursor, limit }) {
	const items = sampleMine
		.filter((item) => (kind ? item.kind === kind : true))
		.filter((item) => (status ? item.businessStatus === status : true))
		.sort(newestFirst);
	return pageOf(items, cursor, limit);
}

function localFindById(id) {
	return [...sampleContents, ...sampleMine].find((item) => item.id === id) || null;
}

// ---------------- 对外接口 ----------------

export async function listPublic(query = {}) {
	if (!hasCloud()) {
		return { ...localListPublic(query), localSample: true };
	}
	return callCloud('listPublic', query);
}

export async function getPublic({ id }) {
	if (!hasCloud()) {
		const item = localFindById(id);
		if (!item) throw toError('CONTENT_UNAVAILABLE');
		return { data: item, localSample: true };
	}
	return callCloud('getPublic', { id });
}

export async function listMine(query = {}) {
	if (!hasCloud()) {
		return { ...localListMine(query), localSample: true };
	}
	return callCloud('listMine', query);
}

/** 写操作在无云端时一律明确失败，绝不假装成功。 */
async function requireCloud(method, params) {
	if (!hasCloud()) {
		throw toError('DEPENDENCY_UNAVAILABLE', '未连接云端，无法提交；本地样例仅供浏览');
	}
	return callCloud(method, params);
}

export function submitContent(payload) {
	return requireCloud('submitContent', payload);
}

export function editContent(payload) {
	return requireCloud('editContent', payload);
}

export function updateStatus(payload) {
	return requireCloud('updateStatus', payload);
}

export function deleteContent(payload) {
	return requireCloud('deleteContent', payload);
}
