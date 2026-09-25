/**
 * 本地样例数据：仅在未连接 uniCloud 时使用。
 *
 * 用途：在没有服务空间的机器上浏览与验证页面布局、状态展示与交互分支。
 * 它**不是**云端返回的数据，也不代表业务规则已在云端生效；界面上会显示
 * 「本地样例数据」标识。接入真实服务空间后这些数据不再被使用。
 *
 * 数据形状刻意与云端 ContentDTO 一致：
 *   { id, kind, author, title, body, media, details, businessStatus, createdAt }
 * 其中 media 只有 id，没有 URL —— 与云端一致（真实访问凭据由媒体服务签发），
 * 因此界面在无凭据时展示统一占位（设计文档要求「无图时使用统一占位」）。
 */

const author = (userId, nickname) => ({ userId, nickname });

const sampleContents = [
	{
		id: 'sample-d1',
		kind: 'delivery',
		author: author('u-lin', '林同学'),
		title: '代取快递到三号宿舍楼',
		body: '下午四点后有空，快件在菜鸟驿站，小件。',
		media: [],
		details: {
			category: '快递代取',
			size: '小件',
			pieces: 1,
			fromRegion: '菜鸟驿站',
			toRegion: '三号宿舍楼',
			timeNote: '今天 18:00 前',
			rewardType: 'negotiable'
		},
		businessStatus: 'seeking',
		createdAt: 1758700000000
	},
	{
		id: 'sample-d2',
		kind: 'delivery',
		author: author('u-chen', '陈同学'),
		title: '帮忙把文件送到行政楼',
		body: '一份纸质材料，需要送到行政楼一楼收发室。',
		media: [],
		details: {
			category: '文件送达',
			size: '小件',
			pieces: 1,
			fromRegion: '图书馆',
			toRegion: '行政楼',
			timeNote: '工作时间内均可',
			rewardType: 'amount',
			rewardFen: 500
		},
		businessStatus: 'contacted',
		createdAt: 1758690000000
	},
	{
		id: 'sample-i1',
		kind: 'idle',
		author: author('u-wang', '王同学'),
		title: '九成新台灯，宿舍可自取',
		body: '换了护眼灯，这盏闲置，暖光可调，线完好。',
		media: [{ id: 'm-i1-a' }, { id: 'm-i1-b' }],
		details: {
			category: '生活用品',
			remainingQuantity: 1,
			priceType: 'amount',
			amountFen: 1500,
			handoverRegion: '五号宿舍楼下'
		},
		businessStatus: 'available',
		createdAt: 1758720000000
	},
	{
		id: 'sample-i2',
		kind: 'idle',
		author: author('u-zhao', '赵同学'),
		title: '专业课本免费赠送',
		body: '课程已结束，书还很新，有需要的同学直接来拿。',
		media: [{ id: 'm-i2-a' }],
		details: {
			category: '书籍教材',
			remainingQuantity: 3,
			priceType: 'free',
			handoverRegion: '二号教学楼'
		},
		businessStatus: 'available',
		createdAt: 1758710000000
	},
	{
		id: 'sample-i3',
		kind: 'idle',
		author: author('u-sun', '孙同学'),
		title: '自行车转让，价格面议',
		body: '骑了两年，刹车和链条刚保养过，可以试骑。',
		media: [],
		details: {
			category: '交通工具',
			remainingQuantity: 1,
			priceType: 'negotiable',
			handoverRegion: '东区车棚'
		},
		businessStatus: 'available',
		createdAt: 1758680000000
	},
	{
		id: 'sample-w1',
		kind: 'wanted',
		author: author('u-liu', '刘同学'),
		title: '求购二手自行车一辆',
		body: '希望车况能正常骑行，预算有限，价格可谈。',
		media: [],
		details: {
			category: '交通工具',
			neededQuantity: 1,
			budgetType: 'negotiable'
		},
		businessStatus: 'seeking',
		createdAt: 1758705000000
	},
	{
		id: 'sample-w2',
		kind: 'wanted',
		author: author('u-he', '何同学'),
		title: '求购考研英语真题册',
		body: '近五年的真题即可，有笔记也没关系。',
		media: [],
		details: {
			category: '书籍教材',
			neededQuantity: 1,
			budgetType: 'amount',
			budgetFen: 2000
		},
		businessStatus: 'seeking',
		createdAt: 1758660000000
	},
	{
		id: 'sample-wall1',
		kind: 'wall',
		author: author('u-club', '摄影社'),
		title: '',
		body: '今晚操场有社团招新，欢迎来摊位看看，现场可以体验设备。',
		media: [{ id: 'm-wall1-a' }, { id: 'm-wall1-b' }, { id: 'm-wall1-c' }],
		details: { mediaForm: 'image', topic: '社团' },
		businessStatus: null,
		createdAt: 1758725000000
	},
	{
		id: 'sample-wall2',
		kind: 'wall',
		author: author('u-qian', '钱同学'),
		title: '',
		body: '图书馆三楼捡到一副耳机，已放到一楼服务台，失主可以去认领。',
		media: [],
		details: { mediaForm: 'text' },
		businessStatus: null,
		createdAt: 1758715000000
	},
	{
		id: 'sample-wall3',
		kind: 'wall',
		author: author('u-music', '音乐社'),
		title: '',
		body: '冬季音乐会排练花絮，欢迎大家来看正式演出。',
		media: [{ id: 'm-wall3-v' }],
		details: { mediaForm: 'video', topic: '文艺' },
		businessStatus: null,
		createdAt: 1758665000000
	}
];

/** 本人发布的样例，含审核状态，用于「我的发布」页。 */
const sampleMine = [
	{
		id: 'sample-mine1',
		kind: 'idle',
		author: author('u-me', '我'),
		title: '转手九成新台灯',
		body: '闲置转让，可在宿舍楼下自取。',
		media: [],
		details: {
			category: '生活用品',
			remainingQuantity: 2,
			priceType: 'free',
			handoverRegion: '五号宿舍楼下'
		},
		businessStatus: 'available',
		createdAt: 1758728000000,
		visibility: 'published',
		reviewStatus: 'approved',
		version: 3
	},
	{
		id: 'sample-mine2',
		kind: 'delivery',
		author: author('u-me', '我'),
		title: '代取快递到三号宿舍楼',
		body: '下午可取。',
		media: [],
		details: {
			category: '快递代取',
			size: '小件',
			pieces: 1,
			fromRegion: '菜鸟驿站',
			toRegion: '三号宿舍楼',
			timeNote: '今天 18:00 前',
			rewardType: 'free'
		},
		businessStatus: 'seeking',
		createdAt: 1758729000000,
		visibility: 'pending',
		reviewStatus: 'pending',
		version: 1
	},
	{
		id: 'sample-mine3',
		kind: 'wanted',
		author: author('u-me', '我'),
		title: '求购二手自行车',
		body: '希望车况正常。',
		media: [],
		details: { category: '交通工具', neededQuantity: 1, budgetType: 'negotiable' },
		businessStatus: 'seeking',
		createdAt: 1758730000000,
		visibility: 'rejected',
		reviewStatus: 'rejected',
		version: 1
	}
];

/**
 * 本地样例评论（均已通过审核）。
 * 只用于查看评论列表与回复的排版；新提交的评论在样例里同样先进入待审、不公开，
 * 与真实规则保持一致。
 */
const sampleComments = {
	'sample-wall1': [{
			id: 'sample-cm1',
			contentId: 'sample-wall1',
			authorId: 'u-lin',
			body: '几点开始？想去看看。',
			parentId: null,
			reviewStatus: 'approved',
			deleted: false,
			createdAt: 1758726000000
		},
		{
			id: 'sample-cm2',
			contentId: 'sample-wall1',
			authorId: 'u-club',
			body: '晚上七点开始，在操场东侧。',
			parentId: 'sample-cm1',
			reviewStatus: 'approved',
			deleted: false,
			createdAt: 1758727000000
		},
		{
			id: 'sample-cm3',
			contentId: 'sample-wall1',
			authorId: 'u-wang',
			body: '设备可以现场体验吗？',
			parentId: null,
			reviewStatus: 'approved',
			deleted: false,
			createdAt: 1758728000000
		}
	],
	'sample-wall2': [{
		id: 'sample-cm4',
		contentId: 'sample-wall2',
		authorId: 'u-sun',
		body: '谢谢，我去服务台看看。',
		parentId: null,
		reviewStatus: 'approved',
		deleted: false,
		createdAt: 1758720000000
	}],
	'sample-wall3': []
};

export { sampleContents, sampleMine, sampleComments };
