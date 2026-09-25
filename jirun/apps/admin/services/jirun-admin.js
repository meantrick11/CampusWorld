/**
 * 治理后台适配器（管理端）。
 *
 * 与用户端一致：有云端时调 jirun-admin，无云端时用本地样例让页面可以渲染，
 * 并标记 localSample 由页面显示「本地样例」标识。写操作在无云端时一律明确失败。
 *
 * 注意：管理端的登录依赖云端（uni-id），因此没有服务空间时无法进入后台，
 * 只能通过直接访问页面路由查看布局。这一点在 docs/setup.md 中说明。
 */

const CLOUD_OBJECT = 'jirun-admin';

/** 预览产物里带 uni-cloud 运行时但没有服务空间，用构建期常量区分。 */
const IS_PREVIEW_BUILD = typeof __JIRUN_PREVIEW__ !== 'undefined' && __JIRUN_PREVIEW__ === true;

const ERROR_TEXT = {
	AUTH_REQUIRED: '请先登录',
	FORBIDDEN: '没有操作权限，需要审核权限',
	INVALID_INPUT: '提交的内容不符合要求',
	VERSION_CONFLICT: '数据已被修改，请刷新后重试',
	CONTENT_UNAVAILABLE: '该内容暂不可查看',
	DEPENDENCY_UNAVAILABLE: '服务暂时不可用，请稍后重试'
};

function hasCloud() {
	if (IS_PREVIEW_BUILD) return false;
	return typeof uniCloud !== 'undefined' && typeof uniCloud.importObject === 'function';
}

function toError(code, message) {
	const error = new Error(message || ERROR_TEXT[code] || '操作失败，请稍后重试');
	error.code = code;
	return error;
}

let instance = null;

async function call(method, params) {
	if (!instance) instance = uniCloud.importObject(CLOUD_OBJECT, { customUI: true });
	let response;
	try {
		response = await instance[method](params);
	} catch (error) {
		throw toError('DEPENDENCY_UNAVAILABLE', '网络或服务不可用，请重试');
	}
	if (response && response.errCode) {
		const code = typeof response.errCode === 'string' ? response.errCode : 'DEPENDENCY_UNAVAILABLE';
		throw toError(code, response.errMsg);
	}
	return {
		data: response ? response.data : null,
		localSample: false
	};
}

// ---------------- 本地样例 ----------------

const now = 1758730000000;

const sampleQueue = {
	content: [{
			targetId: 'c-r2',
			contentId: 'sample-mine2',
			kind: 'delivery',
			authorId: 'u-me',
			title: '代取快递到三号宿舍楼',
			body: '下午可取。',
			mediaIds: [],
			details: {
				category: '快递代取',
				size: '小件',
				pieces: 1,
				fromRegion: '菜鸟驿站',
				toRegion: '三号宿舍楼',
				timeNote: '今天 18:00 前',
				rewardType: 'free'
			},
			version: 1,
			createdAt: now
		},
		{
			targetId: 'c-r9',
			contentId: 'sample-wall9',
			kind: 'wall',
			authorId: 'u-club',
			title: '',
			body: '今晚操场有社团招新，欢迎来摊位看看。',
			mediaIds: ['m1', 'm2'],
			details: {
				mediaForm: 'image',
				topic: '社团'
			},
			version: 1,
			createdAt: now - 1000
		}
	],
	comment: [{
		targetId: 'cm-p1',
		contentId: 'sample-wall1',
		authorId: 'u-lin',
		body: '几点开始？想去看看。',
		parentId: null,
		createdAt: now - 2000
	}],
	report: [{
			targetId: 'rp1',
			reportType: 'content',
			reportedId: 'sample-wall2',
			reason: 'false_info',
			description: '信息与事实不符',
			reporterId: 'u-wang',
			createdAt: now - 3000
		},
		{
			targetId: 'rp2',
			reportType: 'comment',
			reportedId: 'cm-p1',
			reason: 'harassment',
			description: '',
			reporterId: 'u-he',
			createdAt: now - 4000
		}
	],
	appeal: [{
		targetId: 'ap1',
		decisionId: 'd-sample-1',
		contentId: 'sample-mine3',
		appellantId: 'u-me',
		explanation: '内容没有违规，希望复核',
		createdAt: now - 5000
	}]
};

const sampleMetrics = {
	contents: 12,
	pendingContents: 2,
	publishedContents: 9,
	openReports: 2,
	openAppeals: 1,
	activeRestrictions: 1,
	decisions: 4
};

const sampleRestrictions = [{
	userId: 'u-abc',
	scope: 'publish',
	enabled: true,
	reason: '多次发布违规内容',
	actorId: 'reviewer',
	updatedAt: now - 6000
}];

const sampleConfig = [{
		key: 'categories',
		value: {
			delivery: ['快递代取', '文件送达'],
			idle: ['生活用品', '书籍教材'],
			wanted: ['书籍教材', '交通工具']
		},
		version: 2
	},
	{
		key: 'regions',
		value: ['菜鸟驿站', '三号宿舍楼', '五号宿舍楼下', '二号教学楼'],
		version: 1
	},
	{
		key: 'mediaQuota',
		value: {
			imageMax: 9,
			videoMax: 1
		},
		version: 1
	}
];

// ---------------- 对外接口 ----------------

export async function listQueue({ queue, cursor, limit } = {}) {
	if (hasCloud()) return call('listQueue', { queue, cursor, limit });
	return {
		data: { items: sampleQueue[queue] || [], nextCursor: null },
		localSample: true
	};
}

export async function decide(params = {}) {
	if (hasCloud()) {
		return call('decide', {
			...params,
			requestId: params.requestId || `decide-${Date.now()}-${Math.floor(Math.random() * 100000)}`
		});
	}
	throw toError('DEPENDENCY_UNAVAILABLE', '未连接云端，审核决定无法提交；本地样例仅供浏览');
}

export async function getMetrics() {
	if (hasCloud()) return call('getMetrics', {});
	return { data: sampleMetrics, localSample: true };
}

export async function listRestrictions({ userId } = {}) {
	if (hasCloud()) return call('listRestrictions', { userId });
	return { data: { items: sampleRestrictions }, localSample: true };
}

export async function restrictUser(params = {}) {
	if (hasCloud()) {
		return call('restrictUser', {
			...params,
			requestId: params.requestId || `restrict-${Date.now()}-${Math.floor(Math.random() * 100000)}`
		});
	}
	throw toError('DEPENDENCY_UNAVAILABLE', '未连接云端，账号限制无法提交；本地样例仅供浏览');
}

export async function listConfig() {
	if (hasCloud()) return call('listConfig', {});
	return { data: { items: sampleConfig }, localSample: true };
}

export async function updateConfig(params = {}) {
	if (hasCloud()) {
		return call('updateConfig', {
			...params,
			requestId: params.requestId || `config-${Date.now()}-${Math.floor(Math.random() * 100000)}`
		});
	}
	throw toError('DEPENDENCY_UNAVAILABLE', '未连接云端，配置修改无法提交；本地样例仅供浏览');
}

export { ERROR_TEXT };
