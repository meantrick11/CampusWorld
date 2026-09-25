# 实现侧接口契约

本文件是**实现侧**契约：记录当前代码里真实存在的函数签名、状态取值与默认值，
以及它们与验收场景（SC）的对应关系。

业务意图的权威来源是
`暨快跑文档v0.1.0/1.0.0/implementation/contracts.md`。若两者冲突，以该文件为准
并先查明原因，不静默改动已确认的要求。本文件不声明任何待定业务已获用户确认。

## 1. 统一返回与错误码

云对象统一返回 `{ errCode, data }` 或 `{ errCode, errMsg }`，时间均为服务端生成的
Unix 毫秒。写请求携带 `requestId` 去重，编辑同时携带 `expectedVersion`。

| 错误码 | 含义 |
|---|---|
| `AUTH_REQUIRED` | 未登录或身份不可信 |
| `FORBIDDEN` | 已登录但无权限 |
| `INVALID_INPUT` | 参数不合法或状态未识别 |
| `VERSION_CONFLICT` | `expectedVersion` 与当前版本不一致 |
| `CONTENT_UNAVAILABLE` | 内容不可见或已下架 |
| `MEDIA_NOT_READY` | 媒体未通过审核或未上传完成 |
| `WAITING_REPLY` | 对方未回复，发起者额度已用尽 |
| `BLOCKED` | 任一方已拉黑 |
| `RATE_LIMITED` | 频率限制 |
| `DEPENDENCY_UNAVAILABLE` | 依赖服务不可用，可重试 |

重试只适用于网络与依赖失败，业务拒绝不循环重试。

## 2. 状态枚举

### 内容可见性 `jirun-content.visibility`

`draft`（草稿）→ `pending`（待审）→ `published`（公开）→ `rejected`（驳回）／
`removed`（下架）／`deleted`（作者删除）

### 版本审核状态 `revisionStatus`

`pending` / `approved` / `rejected`

### 业务状态 `businessStatus`（与资金无关）

| 类型 | 允许取值 |
|---|---|
| 取送 delivery | `seeking` / `contacted` / `completed` / `closed` |
| 闲置 idle | `available` / `sold` / `gifted` / `closed` |
| 求购 wanted | `seeking` / `fulfilled` / `closed` |
| 校园墙 wall | `null` |

闲置数量归零时退出有效列表；未明确已售或已赠时使用 `closed`，不自动伪造成交。

### 联系状态 `contactState`

`none` / `pending` / `active`

- `none`：尚无联系记录，允许发出第一条。
- `pending`：已有发起者，对方未回复。发起者不能再发，对方可回复。
- `active`：对方已回复，双方可继续发送。

拉黑状态与联系状态相互独立：解除拉黑恢复原状态，不重建额度，也不清空历史。

## 3. DTO

```js
// ProfileDTO
{ userId, nickname, avatarMediaId, nicknameNextChangeAt, avatarNextChangeAt }

// 公开资料：省略冷却时间与内部账号字段
{ userId, nickname, avatarMediaId }

// ContentDTO
{ id, kind, author, title, body, media, details, businessStatus, createdAt }
// media 只提供允许对外展示的信息，不包含存储句柄
```

公开接口不返回整个用户对象、内部审核意见或任何云凭据。

## 4. 自有云对象 API

以下签名沿用 `contracts.md` 第 5 节，当前**尚未实现**（T04 起逐个建立）。
函数调用的当前用户由服务端 token 校验得出，不接受 `authorId` /
`currentUserId` / `isAdmin` 作为授权依据。

| 云对象 | 方法 |
|---|---|
| jirun-profile | `getMine()`、`updateProfile({field,value,requestId})`、`getPublicProfile({userId})` |
| jirun-content | `submitContent`、`editContent`、`listPublic`、`getPublic`、`listMine`、`updateStatus`、`deleteContent` |
| jirun-media | `prepareUpload`、`completeUpload`、`getAccess` |
| jirun-social | `setReaction`、`setFollow`、`submitComment`、`listComments`、`deleteOwnComment`、`listFavorites`、`listFollowing` |
| jirun-contact | `getContactState`、`setBlock`、`listBlocked` |
| jirun-notice | `listMine`、`markRead` |
| jirun-moderation | `submitReport`、`listMyCases`、`appeal`、`submitFeedback` |
| jirun-admin | `listQueue`、`decide`、`restrictUser`、`updateConfig`、`getMetrics`、`listFeedback`、`resolveFeedback` |

分页统一返回 `{ items, nextCursor }`，到末尾 `nextCursor` 为 `null`。

`uploadDescriptor` / `accessDescriptor` 的具体字段由选定存储供应商在 T03 锁定，
业务页面不得自行拼接存储域名。

## 5. 已实现且可独立测试的纯规则

位置：`apps/client/uni_modules/jirun-service/uniCloud/cloudfunctions/common/jirun-domain/`

| 文件 | 导出 | 签名 |
|---|---|---|
| `contact-policy.js` | `canSend` | `({state, actorId, initiatorId, blocked}) -> {allowed, reason}` |
| `content-policy.js` | `canReadPublic` | `({visibility, revisionStatus}) -> boolean` |
| `profile-policy.js` | `canEditField`、`COOLDOWN_MS` | `({now, lastChangedAt}) -> boolean` |
| `validation.js` | `validateContent`、`LIMITS`、`CODES` 等 | `({kind,title,body,mediaIds,mediaTypes,details}) -> {valid, errors}` |

这些函数是纯函数：不访问数据库、不读取系统时间、不修改传入参数。服务端与页面
都调用同一份实现，但最终判定只在服务端执行。

### 判定细则

`canSend` 的判定顺序：先校验 `actorId`（缺失即 `AUTH_REQUIRED`），再判断
`blocked`（`BLOCKED` 优先于一切），最后按状态判定（未知状态一律拒绝）。

`canReadPublic` 要求 `visibility === 'published'` **且**
`revisionStatus === 'approved'` 同时成立，避免有新待审版本时泄漏待审正文。

`canEditField` 中 `now` 必须由服务端传入；已有修改记录但缺少可信时间时默认拒绝，
不使用本机时间兜底。昵称与头像各传入自己的时间字段，因此互不影响。

`validateContent` 的长度按 Unicode 码点计算；`amountFen` 等金额必须是整型分值，
只有 `amount` 价格类型要求携带，`negotiable` 与 `free` 不接受金额。

## 6. 开发默认值

集中在两处，两者由测试保证一致：

- `apps/client/config/limits.json`：数值上限。
- `apps/client/config/product-defaults.js`：导航、游客范围、搜索、过滤、编辑、
  拉黑、举报、账号限制等产品默认值。

服务端以 `jirun-domain/validation.js` 的 `LIMITS` 为最终依据。当前取值：

| 项目 | 值 |
|---|---|
| 标题 | 60 码点 |
| 正文 | 3000 码点 |
| 评论与私聊 | 1000 码点 |
| 图片 | 最多 9 张，每张 5 MiB |
| 校园墙视频 | 1 段、60 秒、50 MiB，与图集互斥，可与正文共存 |
| 分页 | 默认 20，上限 50 |
| 资料冷却 | 7 天，昵称与头像独立 |
| 私聊额度 | 对方未回复前 1 条 |

## 6.1 云对象返回与身份（已实现，未在真实云端验证）

云对象 `jirun-content`、`jirun-admin` 只做三件事：解析服务端身份、调用已测试的
业务服务、套用统一返回。统一返回由 `jirun-domain/cloud-response.js` 实现并有测试：

| 情况 | 返回 |
|---|---|
| 成功 | `{ errCode: 0, data }` |
| 错误码在客户端可见白名单内 | `{ errCode, errMsg }`，errMsg 使用该错误自身的说明 |
| 其余异常（含数据库报错） | `{ errCode: 'DEPENDENCY_UNAVAILABLE', errMsg: '服务暂时不可用，请稍后重试' }` |

关键安全规则：**白名单外的错误不返回原始 message**，避免把内部栈、数据库地址或
凭据带出；原始错误只写服务端日志。

身份规则由 `jirun-domain/actor-policy.js` 实现并有测试：

- `actor` 只能由 `uni-id-common.checkToken` 的结果构造，未登录为 `null`。
- 审核权限来自 token 的 `role`（含 `admin`）或 `permission`（含
  `jirun-content:review` / `jirun-admin`）。
- 客户端传入的 `userId`、`isAdmin`、`role`、`isReviewer` **不参与判定**。

## 6.2 幂等键集合 `jr_request_keys`

`requestId` 去重依赖一个自有集合，而不是靠内存状态：

| 字段 | 说明 |
|---|---|
| `actorKey` | 服务端 token 得出的用户 ID |
| `requestId` | 客户端生成的请求 ID |
| `state` | `reserved` / `completed` |
| `result` | 完成后的结果，重复提交时原样返回 |
| `createdAt` | 预留时间 |

索引：`actorKey + requestId` 唯一（`MgoIsUnique: true`）。并发重复提交由唯一索引
拒绝，调用方捕获冲突后回查已有结果，而不是直接失败。业务失败时删除该行释放键，
因此失败不会永久占用 `requestId`。

## 7. 与验收场景的对应

| SC | 场景 | 当前覆盖情况 |
|---|---|---|
| SC-01 | 有偿取送免费发布 | 规则已测（`rewardType` 三值，无平台支付步骤）；发布链路待 T04／T06 |
| SC-02 | 面议／赠送闲置 | 规则已测（`priceType` 非 `amount` 不携带金额） |
| SC-03 | 跨入口私聊限额 | 规则已测（`pending` 时发起者被拒）；服务端并发与 IM 接入待 T03／T08 |
| SC-04 | 回复后继续聊 | 规则已测（`active` 双方可发） |
| SC-05 | 联系不锁库存 | 规则层面联系与数量无耦合；待 T04 用例确认 |
| SC-06 | 数量归零 | 规则已测（`remainingQuantity` 允许 0，负数与非整数拒绝）；列表过滤待 T04 |
| SC-07 | 取送标记完成 | 待 T04（`updateStatus` 白名单） |
| SC-08 | 举报与复核 | 待 T09 |
| SC-09 | 游客分享 | 规则已测（`canReadPublic` 组合判定）；路由与分享待 T06／T09 |
| SC-10 | 资料独立冷却 | 规则已测（`canEditField` 独立字段，7 天边界） |
| SC-11 | 视频失败不产生空帖 | 数值上限已测；失败重试链路待 T05／T06 |
| SC-12 | 删除／编辑及评论权限 | `canReadPublic` 已测；`canDeleteComment` 待 T07 |
| SC-13 | 全部免费边界 | `product-defaults.test.cjs` 断言无付费字段；前后台页面待 T06／T09／T10 |

「规则已测」只代表纯函数行为正确，**不代表**已经通过云端联调或真机验收。

## 8. 仍需确认的生产事项

以下事项不能用开发默认值顶替，需项目负责人确认后才能对外试运行：

- 云供应商、服务空间、费用预算与费用提醒。
- 实际审核人员与图文自动过滤接口的可用性。
- 反馈渠道、用户协议与隐私文案、生产数据保留期限。
- 搜索索引与查询成本、图片与视频的真实容量预算。
- 非微信平台的兼容范围，以及 H5 公开详情的冒烟结论。
- 非常规商品分类的具体允许范围。
- 编辑期间旧公开版本的展示策略、结束内容的联系入口规则。
- 举报处理期间与紧急下架的具体流程。
- 账号限制的处罚期限与申诉流程。
