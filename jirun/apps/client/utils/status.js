/**
 * 状态文案与色调的统一来源。
 * 业务状态取自 contracts.md 第 4 节；审核与可见性取自 visibility / reviewStatus 枚举。
 * 页面不要自行拼写状态文案，避免同一状态在不同页面显示成不同说法。
 */

/** 供需状态：只描述信息有效性，不含任何资金含义。 */
export const BUSINESS_STATUS_TEXT = {
	seeking: '进行中',
	contacted: '已联系',
	completed: '已完成',
	closed: '已关闭',
	available: '在售',
	sold: '已售出',
	gifted: '已赠出',
	fulfilled: '已求得'
};

/** 审核与可见性。 */
export const REVIEW_STATUS_TEXT = {
	draft: '草稿',
	pending: '待处理',
	published: '已公开',
	approved: '已公开',
	rejected: '未通过',
	removed: '已下架',
	deleted: '已删除'
};

export const REVIEW_TONE = {
	pending: 'warn',
	draft: 'plain',
	published: 'success',
	approved: 'success',
	rejected: 'danger',
	removed: 'danger',
	deleted: 'plain'
};

/** 提交后的状态说明：明确区分「已提交待处理」和「已公开」。 */
export const VISIBILITY_EXPLAIN = {
	pending: '已提交，等待审核。审核通过后才会出现在广场。',
	published: '已公开，其他人现在可以在广场看到这条信息。',
	rejected: '未通过审核。可以修改后重新提交。',
	draft: '已保存为草稿，尚未提交审核。',
	removed: '已下架，不会出现在广场。'
};

/** 供筛选器使用的板块定义。 */
export const BOARD_LIST = [{
		key: 'all',
		name: '全部',
		desc: ''
	},
	{
		key: 'delivery',
		name: '取送',
		desc: '代取快递、代送物品'
	},
	{
		key: 'idle',
		name: '闲置',
		desc: '转让、赠送闲置物品'
	},
	{
		key: 'wanted',
		name: '求购',
		desc: '发布求购需求'
	},
	{
		key: 'wall',
		name: '校园墙',
		desc: '图文视频与互动'
	}
];

/**
 * 各板块可选的分类。校园墙没有分类，只用话题。
 * 这里是开发默认值，具体分类由管理端配置（T09）后统一下发。
 */
export const CATEGORY_MAP = {
	delivery: ['快递代取', '文件送达', '物品代送', '其他'],
	idle: ['生活用品', '书籍教材', '交通工具', '电子设备', '其他'],
	wanted: ['书籍教材', '交通工具', '电子设备', '生活用品', '其他'],
	wall: []
};

export function boardName(key) {
	const board = BOARD_LIST.find((item) => item.key === key);
	return board ? board.name : '';
}
