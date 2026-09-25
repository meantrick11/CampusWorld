/**
 * 举报与复核适配器（用户端）。
 *
 * 有云端时调 jirun-moderation；无云端时用本地样例，写操作一律明确失败。
 * 举报只登记，不改内容可见性——因此样例里也不做任何"举报成功就下架"的假动作。
 */

import { hasCloud, callCloud, toError } from './cloud-call.js';

const CLOUD_OBJECT = 'jirun-moderation';

/** 举报原因取值与文案；与服务端白名单一致。 */
export const REPORT_REASONS = [{
		value: 'spam',
		label: '重复或垃圾信息'
	},
	{
		value: 'fraud',
		label: '疑似诈骗'
	},
	{
		value: 'harassment',
		label: '骚扰或攻击他人'
	},
	{
		value: 'illegal',
		label: '违法违规内容'
	},
	{
		value: 'false_info',
		label: '信息不实'
	},
	{
		value: 'other',
		label: '其他'
	}
];

/** 本地样例：一条待处理的下架决定与一条被驳回的举报。 */
const sampleCases = [{
		decisionId: 'sample-decision-1',
		action: 'remove',
		reason: '内容包含违规信息',
		contentId: 'sample-mine3',
		createdAt: 1758731000000,
		targetType: 'content'
	}
];

const sampleReports = [{
	reportId: 'sample-report-1',
	targetType: 'content',
	targetId: 'sample-wall2',
	reason: 'false_info',
	status: 'submitted',
	createdAt: 1758722000000
}];

export function reasonLabel(reason) {
	const found = REPORT_REASONS.find((item) => item.value === reason);
	return found ? found.label : reason;
}

export async function submitReport({ targetType, targetId, reason, description }) {
	if (hasCloud()) {
		return callCloud(CLOUD_OBJECT, 'submitReport', {
			targetType,
			targetId,
			reason,
			description,
			requestId: `report-${Date.now()}-${Math.floor(Math.random() * 100000)}`
		});
	}
	// 预览环境不写云端：明确失败，避免让人以为举报真的提交了
	throw toError('DEPENDENCY_UNAVAILABLE', '未连接云端，举报无法提交；本地样例仅供浏览');
}

export async function listMyCases({ cursor, limit } = {}) {
	if (hasCloud()) return callCloud(CLOUD_OBJECT, 'listMyCases', { cursor, limit });
	return {
		data: {
			items: [...sampleCases, ...sampleReports].sort((a, b) => b.createdAt - a.createdAt),
			nextCursor: null
		},
		localSample: true
	};
}

export async function appeal({ decisionId, explanation }) {
	if (hasCloud()) {
		return callCloud(CLOUD_OBJECT, 'appeal', {
			decisionId,
			explanation,
			requestId: `appeal-${Date.now()}-${Math.floor(Math.random() * 100000)}`
		});
	}
	throw toError('DEPENDENCY_UNAVAILABLE', '未连接云端，复核申请无法提交；本地样例仅供浏览');
}
