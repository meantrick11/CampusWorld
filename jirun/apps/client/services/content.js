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
import { hasCloud, callCloud, toError, ERROR_TEXT } from './cloud-call.js';

const CLOUD_OBJECT = 'jirun-content';

export { ERROR_TEXT };

const call = (method, params) => callCloud(CLOUD_OBJECT, method, params);

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
	return call('listPublic', query);
}

export async function getPublic({ id }) {
	if (!hasCloud()) {
		const item = localFindById(id);
		if (!item) throw toError('CONTENT_UNAVAILABLE');
		return { data: item, localSample: true };
	}
	return call('getPublic', { id });
}

export async function listMine(query = {}) {
	if (!hasCloud()) {
		return { ...localListMine(query), localSample: true };
	}
	return call('listMine', query);
}

/** 写操作在无云端时一律明确失败，绝不假装成功。 */
async function requireCloud(method, params) {
	if (!hasCloud()) {
		throw toError('DEPENDENCY_UNAVAILABLE', '未连接云端，无法提交；本地样例仅供浏览');
	}
	return call(method, params);
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
