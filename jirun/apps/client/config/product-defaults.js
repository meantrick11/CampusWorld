import limits from './limits.json';

/**
 * 产品开发默认值（contracts.md 第 2 节）。
 *
 * 这些是**开发默认值**，不是已获业务确认的生产参数。服务端保存对应规则并作为
 * 最终判断依据；本文件只用于界面提示、默认值与文案，不能作为权限或限额的唯一实现。
 *
 * 平台完全免费：本文件不包含支付、钱包、充值、提现、抽成、会员或付费推广相关的
 * 任何开关。若将来有人添加此类字段，需要先变更产品范围而不是只改配置。
 */

export const LIMITS = limits;

export default {
	// 导航与视觉：广场／消息／我的，首页默认校园墙
	navigation: {
		tabs: ['plaza', 'messages', 'mine'],
		defaultHomeBoard: 'wall',
		primaryColor: '#147D64',
		pageBackground: '#F6F8F7'
	},

	// 游客可浏览公开列表、详情与公开主页；发布、互动、私聊、举报须登录
	guest: {
		canBrowsePublic: true,
		canPublish: false,
		canInteract: false,
		canChat: false,
		canReport: false
	},

	// 搜索：当前板块标题与正文基础关键词，最新优先
	search: {
		scope: 'currentBoard',
		order: 'latestFirst',
		pageSize: 20,
		pageSizeMax: 50
	},

	// 文本上限，按 Unicode 码点计算
	text: {
		titleMax: LIMITS.titleMax,
		bodyMax: LIMITS.bodyMax,
		commentMax: LIMITS.commentMax,
		chatMax: LIMITS.chatMax,
		lengthUnit: 'codePoint'
	},

	// 图片：最多 9 张，每张上传文件最多 5 MiB
	image: {
		maxCount: LIMITS.imageMax,
		maxSizeBytes: LIMITS.imageSizeMaxBytes,
		mimeAllow: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
	},

	// 校园墙视频：单帖 1 段、60 秒、50 MiB；图集与视频互斥；正文可同时存在
	// 视频为保留能力，不得因进度压力删除
	wallVideo: {
		maxCount: LIMITS.videoMax,
		maxDurationMs: LIMITS.videoDurationMaxMs,
		maxSizeBytes: LIMITS.videoSizeMaxBytes,
		mimeAllow: ['video/mp4', 'video/quicktime'],
		exclusiveWithImages: true,
		textAlongsideAllowed: true
	},

	// 私聊首版仅文字与系统生成的来源内容卡片
	chat: {
		textOnly: true,
		sourceCard: true,
		media: false,
		video: false
	},

	// 过滤：所有新内容默认待处理；视频先人工审核
	filtering: {
		newContentDefault: 'pending',
		videoRequiresManualReview: true,
		autoFilterOnGraphText: 'optional',
		failedFilterIsNotPass: true
	},

	// 编辑：创建新版本，旧公开版本在新版本通过前保持原样；已下架内容不恢复
	editing: {
		createsNewRevision: true,
		keepCurrentPublishedUntilNewApproved: true,
		removedContentNotRestored: false
	},

	// 结束信息：不从该详情新建联系申请，已有会话仍按权限继续
	closure: {
		blockNewContactRequest: true,
		autoExpire: false
	},

	// 评论：文字、一层回复；本人可删自己的评论，作者不能删别人的评论
	comment: {
		replyDepth: 1,
		authorCanDeleteOthersComment: false,
		ownerCanDeleteOwnComment: true
	},

	// 收藏：校园墙收藏仅本人可见
	favorite: {
		board: 'wall',
		visibleToOwnerOnly: true
	},

	// 拉黑：任一方拉黑即阻止双方新私信与通知打扰，不自动屏蔽公开内容；解除不重置额度
	block: {
		blocksNewMessagesBothWays: true,
		blocksNotifications: true,
		hidesPublicContent: false,
		resetQuotaOnUnblock: false
	},

	// 举报处理期间保持此前可见性，直到审核决定；紧急人工下架可单独执行并留痕
	report: {
		keepVisibilityWhilePending: true,
		emergencyTakeDownAllowed: true,
		requiresAuditLog: true
	},

	// 账号限制：先实现人工限制发布／私聊及解除，均记录原因；不自动累计封号
	restriction: {
		manualOnly: true,
		scopes: ['publish', 'chat'],
		requiresReason: true,
		autoBan: false
	},

	// 非常规商品：未明确允许的虚拟、票券与持续售卖类型默认不开
	unusualCategory: {
		virtualGoods: false,
		tickets: false,
		continuousSale: false,
		configurableByAdmin: true
	},

	// 资料冷却：昵称与头像各自七天，首次不消耗机会
	profile: {
		cooldownMs: 7 * 24 * 60 * 60 * 1000,
		nicknameAndAvatarIndependent: true,
		firstChangeConsumesChance: false
	},

	// 私聊额度：对方未回复前，发起者共一条；回复后进入可继续状态
	contact: {
		firstMessageLimit: 1,
		serverEnforced: true
	}
};
