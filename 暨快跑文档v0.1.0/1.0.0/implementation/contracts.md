# 实施契约与开发默认值

日期：2026-09-25。本文是可执行计划的配套设计，不声明待定业务已获用户逐项确认。与业务文档冲突时先查明来源，不静默改变已确认要求。

## 1. 固定边界

平台完全免费；微信小程序优先、后续兼顾 H5；三个板块齐全。校园墙保留图文视频和六项互动。无平台资金流、库存锁定或订单履约。资料冷却、私聊限制、作者评论权限与内容治理遵守共用规则。

客户端不得直接写业务集合；敏感读写由云对象鉴权。公开读取只返回允许公开的字段，严禁把整个用户对象、内部审核意见或云凭据返回客户端。管理员从服务端身份和权限得出，不接受客户端声称的管理员角色。

## 2. 开发默认值与上线确认

将以下参数集中到 `apps/client/config/product-defaults.js`；服务端在公共模块中保存对应规则，服务端是最终判断依据。增加一致性测试，不能只在客户端限制。

| 项目 | 开发默认值 | 上线前处理 |
|---|---|---|
| 导航与视觉 | 广场／消息／我的；首页默认校园墙；沿用页面设计色值 | 可先实现，试用后调整 |
| 游客 | 可浏览公开列表、详情和公开主页；发布、互动、私聊、举报须登录 | 确认非分享入口游客范围 |
| 搜索 | 当前板块标题／正文基础关键词查询；最新优先；分页 20 条，上限 50 | 测试实际索引和查询成本 |
| 文本 | 标题最多 60 字符、正文 3000、评论及私聊 1000 | 长度算法统一为 Unicode 码点；规则可配置 |
| 图片 | 最多 9 张，每张上传文件最多 5 MiB | 真机验证并核定容量预算 |
| 校园墙视频 | 单帖 1 段、60 秒、50 MiB；图集与视频互斥；正文可同时存在 | 需要确认混排及容量；保留视频功能 |
| 私聊媒体 | 首版仅文字和系统生成的来源内容卡片 | 确认媒体范围；不自动增加视频聊天 |
| 过滤 | 所有新内容默认待处理；视频先人工审核；适用图文接口另接入 | 必须落实人员与适用审核能力，未通过不公开 |
| 编辑 | 创建新版本；旧公开版本在新版本通过前保持原样；已下架内容不恢复 | 确认编辑期间展示策略 |
| 结束信息 | 不从该详情新建联系申请；已有会话仍按权限继续 | 确认结束内容的联系入口规则 |
| 时效 | 首版手动结束，不启用未明确的自动过期 | 明确时效规则后才开启自动任务 |
| 评论 | 文字、一层回复 UI；保存实际被回复评论；本人可删自己的评论 | 确认本人删除权限；作者不能删别人评论 |
| 收藏 | 校园墙收藏仅本人可见；不新增二手收藏／公开留言 | 确认可见性；二手附加互动不纳入默认实现 |
| 拉黑 | 任一方拉黑即阻止双方新私信及通知打扰；不自动屏蔽公开内容 | 确认评论及浏览的作用范围；解除不重置额度 |
| 举报处理期间 | 保持此前可见性，直到审核决定；紧急人工下架可单独执行并留痕 | 确认紧急处理与复核规则 |
| 账号限制 | 先实现人工限制发布／私聊及解除，均记录原因；不自动累计封号 | 确认处罚期限与申诉流程 |
| 非常规商品 | 提供可配置分类开关；未明确允许的虚拟、票券、持续售卖类型默认不开 | 由负责人确定具体范围，不声明永久禁止 |

云供应商、服务空间、费用预算、实际审核人员、反馈渠道、用户协议与隐私文案、生产数据保留期限不能凭空默认。这些缺失时继续本地开发，但真实对外试运行保持未就绪。测试空间使用合成数据；不在未确定保留政策时运行删除真实记录的定时任务。

## 3. 统一返回与鉴权

下面是项目自有接口约定，不是 uniCloud 或 uni-im 的官方接口签名。执行者在各云对象内实现适配；SDK 方法与扩展点必须查实际锁定版本。

```js
// 时间均为服务端生成的 Unix 毫秒；金额为整数分，仅用于信息展示。
// 所有写请求携带 requestId，编辑同时携带 expectedVersion 防止覆盖。
// 成功
{ errCode: 0, data: { id: 'content-id', version: 1 } }
// 业务失败
{ errCode: 'CONTENT_UNAVAILABLE', errMsg: '该内容暂不可查看' }
```

错误码：`AUTH_REQUIRED`、`FORBIDDEN`、`INVALID_INPUT`、`VERSION_CONFLICT`、`CONTENT_UNAVAILABLE`、`MEDIA_NOT_READY`、`WAITING_REPLY`、`BLOCKED`、`RATE_LIMITED`、`DEPENDENCY_UNAVAILABLE`。重试只适用于网络／依赖失败，不能把业务拒绝循环重试。客户端统一展示文案，不显示内部栈与凭据。

## 4. 内容与媒体模型

集合使用项目自有 `jr_` 前缀；不修改框架账号或 IM 核心集合语义。

```js
// jr_contents：稳定标识与可见性指针
{
  _id, authorId,
  kind: 'delivery', // delivery | idle | wanted | wall
  publishedRevisionId: null,
  pendingRevisionId: null,
  visibility: 'draft', // draft | pending | published | rejected | removed | deleted
  businessStatus: 'seeking',
  version: 1,
  createdAt, updatedAt
}
// jr_content_revisions：保存每次审核的具体版本
{
  _id, contentId, revision: 1, title, body, mediaIds: [],
  details: {},
  reviewStatus: 'pending', // pending | approved | rejected
  createdAt
}
// jr_media：存储句柄只在服务端解析，不等于公开 URL
{
  _id, ownerId, storageKey, usage: 'content', // content | avatar
  mime, sizeBytes, durationMs: null,
  status: 'uploading', // uploading | uploaded | pending | approved | rejected | deleted
  createdAt
}
```

`details` 根据类型验证：取送为物品类别、大小、件数、起终区域、时间说明、报酬类型；闲置为分类、剩余数量、价格类型和交接区域；求购为分类、尚需数量和预算；校园墙为媒体形式和可选话题。价格类型为 `amount/negotiable/free`，只有 `amount` 携带非负整数 `amountFen`。取送时间说明先用文本，不凭空实现自动超时处罚。

允许的 `businessStatus`：取送 `seeking/contacted/completed/closed`；闲置 `available/sold/gifted/closed`；求购 `seeking/fulfilled/closed`；校园墙 `null`。闲置数量归零时退出有效列表；未明确已售或已赠时使用 `closed`，不自动伪造成交。完成及关闭为信息状态，不产生任何资金动作。

公开查询只返回 `publishedRevisionId` 指向且已通过的版本，并检查根内容未下架／删除。有新待审版本时不得泄漏待审正文。需求状态变更使用服务端白名单；`completed/closed` 不能绕过内容下架限制。

媒体 URL 由服务端校验内容、作者或审核权限后发放短效访问凭据。公开内容下架后停止发放，并处理已有 CDN 缓存／凭据有效期；已经下载到他人设备的文件无法承诺追回。先验证供应商访问控制，不能将永久公开链接当作私有待审存储。

头像媒体单独判断：只有已通过审核且被用户当前公开资料引用的头像可公开展示；待审或旧头像只按作者、审核员及保留策略访问。审核员可对媒体作出通过／拒绝决定；内容版本只有在所引用媒体全部通过且文本审核通过时才能发布，不允许先公开帖子再补审媒体。

## 5. 项目自有云对象 API

函数调用的当前用户由服务端 token 校验获得，不接受 `authorId/currentUserId/isAdmin` 作为授权依据。ID 为字符串；分页返回 `items` 和 `nextCursor`，到末尾为 `null`。写请求结果按调用者与 `requestId` 去重。

| 云对象 | 方法与参数 | 返回 data |
|---|---|---|
| jirun-profile | getMine() | ProfileDTO |
| jirun-profile | updateProfile({ field, value, requestId }) | ProfileDTO；field 为 nickname/avatar |
| jirun-profile | getPublicProfile({ userId }) | 公开资料，不包含身份凭据 |
| jirun-content | submitContent({ kind, title, body, mediaIds, details, requestId }) | { id, version, visibility } |
| jirun-content | editContent({ id, expectedVersion, title, body, mediaIds, details, requestId }) | { id, version, visibility } |
| jirun-content | listPublic({ kind, keyword, category, region, cursor, limit }) | { items, nextCursor } |
| jirun-content | getPublic({ id }) | ContentDTO 或不可见错误 |
| jirun-content | listMine({ kind, status, cursor, limit }) | { items, nextCursor }，含本人审核状态 |
| jirun-content | updateStatus({ id, expectedVersion, status, remainingQuantity, requestId }) | { id, version, businessStatus } |
| jirun-content | deleteContent({ id, expectedVersion, requestId }) | { id, visibility: 'deleted' } |
| jirun-media | prepareUpload({ usage, mime, sizeBytes, requestId }) | { mediaId, uploadDescriptor } |
| jirun-media | completeUpload({ mediaId, requestId }) | { mediaId, status }；服务端核对实际文件 |
| jirun-media | getAccess({ mediaId }) | { accessDescriptor, expiresAt } |
| jirun-social | setReaction({ contentId, type, enabled, requestId }) | { enabled, count }；type 为 like/favorite |
| jirun-social | setFollow({ userId, enabled, requestId }) | { enabled } |
| jirun-social | submitComment({ contentId, parentId, body, requestId }) | { id, reviewStatus } |
| jirun-social | listComments({ contentId, cursor, limit }) | { items, nextCursor } |
| jirun-social | deleteOwnComment({ id, requestId }) | { id, deleted: true } |
| jirun-social | listFavorites({ cursor, limit }) | { items, nextCursor }，仅本人 |
| jirun-social | listFollowing({ cursor, limit }) | { items, nextCursor } |
| jirun-contact | getContactState({ peerId, contentId }) | { state, canSend, reason } |
| jirun-contact | setBlock({ peerId, enabled, requestId }) | { enabled } |
| jirun-contact | listBlocked({ cursor, limit }) | { items, nextCursor } |
| jirun-notice | listMine({ cursor, limit }) | { items, nextCursor, unreadCount } |
| jirun-notice | markRead({ ids, requestId }) | { updated }，仅本人通知 |
| jirun-moderation | submitReport({ targetType, targetId, reason, description, requestId }) | { id, status } |
| jirun-moderation | listMyCases({ cursor, limit }) | { items, nextCursor }，仅本人相关案件 |
| jirun-moderation | appeal({ decisionId, explanation, requestId }) | { id, status } |
| jirun-moderation | submitFeedback({ body, requestId }) | { id, status }，仅登录用户 |
| jirun-admin | listQueue({ queue, cursor, limit }) | { items, nextCursor } |
| jirun-admin | decide({ targetType, targetId, expectedVersion, action, reason, requestId }) | { decisionId, outcome } |
| jirun-admin | restrictUser({ userId, scope, enabled, reason, requestId }) | { userId, scope, enabled } |
| jirun-admin | updateConfig({ key, value, expectedVersion, requestId }) | { key, version } |
| jirun-admin | getMetrics() | 发布、审核积压与失败统计，无交易流水 |
| jirun-admin | listFeedback({ cursor, limit }) | { items, nextCursor }，仅授权管理员 |
| jirun-admin | resolveFeedback({ id, note, requestId }) | { id, status }，记录处理人和时间 |

`ProfileDTO` 包括 `userId/nickname/avatarMediaId/nicknameNextChangeAt/avatarNextChangeAt`；公开资料省略冷却和内部账号字段。`ContentDTO` 包括 `id/kind/author/title/body/media/details/businessStatus/createdAt`，媒体只提供允许的展示信息。审核队列 `queue` 为 `content/comment/report/appeal`。审核 action 使用明确白名单 `approve/reject/remove/restore/uphold`，按目标类型校验；恢复仍须检查作者是否删除和当前版本是否通过。

`uploadDescriptor/accessDescriptor` 的具体字段由选定供应商适配器在 T03 写入接口文档并锁定，不能在业务页面直接拼接存储域名。聊天消息发送采用实际 uni-im SDK 与服务端扩展，项目不发明 `uniIm.sendXXX` 方法。

## 6. 私聊服务端不变量

1. 同一账号对建立稳定 pairKey，与帖子、商品、会话的展示入口无关。
2. 首个有效发送者为 initiator；对方未回复前只允许该发起者一条已接受的消息。对方第一次成功回复后进入 `active`。
3. 同一 requestId 重试返回原结果；不同 requestId 并发发送只能有一条占用成功。持久化成功但响应丢失时不得造成第二条消息。
4. 额度预留与实际 IM 消息写入必须协调：明确预留、提交、失败回收及超时核对；不能仅“先减额度再调用 SDK”而永久吞掉失败额度。
5. 拉黑检查优先；解除拉黑恢复原关系，不重建额度。已读、点赞、评论、系统通知不改变 contactState。
6. 服务端必须覆盖所有 IM 发送入口；仅在自定义前端入口加检查不足以通过验收。

纯函数接口为 `canSend({ state, actorId, initiatorId, blocked }) -> { allowed, reason }`；状态为 `none/pending/active`。这些是业务逻辑接口，不替代并发持久化及框架接入测试。

## 7. 外部条件清单

| 条件 | 用途 | 缺失时怎么做 |
|---|---|---|
| 微信小程序 AppID 与项目成员权限 | 真机登录、开发工具预览 | 做页面与规则，真实登录未通过 |
| uniCloud 开发服务空间及访问权限 | 云对象、数据库、存储、IM | 使用仅开发模式 mock；记录真实部署阻碍 |
| 微信登录所需服务端凭据 | 登录换取用户身份 | 项目负责人填云端配置；不把 secret 发到聊天 |
| HBuilderX、微信开发者工具、测试手机 | 构建、模拟器、真机 | 列出安装及手工步骤，不假报构建通过 |
| 两个普通测试账号与独立管理员 | 私聊、越权与审核验证 | 先用单元测试；真实权限结果保持未通过 |
| 审核负责人、预算、生产配置 | 对外试运行 | 不阻塞本地开发；阻塞正式开放 |

工具、服务商 API 和插件版本以执行时核验结果为准。已有文档中的官方链接是核验入口，不是可绕过实际构建验证的承诺。
