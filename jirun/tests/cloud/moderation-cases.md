# 内容治理 · 真实云端用例

状态：**尚未执行**。在项目负责人提供 AppID 与服务空间之前，下面每一条都保持未完成。

## 0. 前置条件

| 条件 | 当前状态 |
|---|---|
| HBuilderX | 未安装 |
| uniCloud 开发服务空间 | 未配置 |
| 微信小程序 AppID | 未配置 |
| `jirun-moderation/repository.js` | 仍为未实现缺口（见 docs/decisions.md D-09） |
| 两个普通账号 + 一个管理员账号 | 未准备 |

## 1. 部署顺序

1. 上传 `jirun-domain` 公共模块。
2. 上传 3 个集合的 schema 与索引：`jr_reports`、`jr_appeals`、
   `jr_config`（`decisionId` 与 `key` 的唯一索引必须生效）。
3. 实现并上传 `jirun-moderation/repository.js`。
4. 上传云对象 `jirun-moderation` 与 `jirun-admin`。
5. 上传 `opendb-admin-menus` 种子数据，确认侧边栏出现「内容治理」目录与 6 项子菜单。

## 2. 权限与越权

| 编号 | 用例 | 期望结果 |
|---|---|---|
| M-01 | 普通账号调用 `jirun-admin.listQueue` | `FORBIDDEN` |
| M-02 | 请求体中伪造 `isReviewer: true`、`isAdmin: true`、`role: ['admin']` 后调用 `jirun-admin.decide` | 仍 `FORBIDDEN`；字符串 `'true'` 同样无效 |
| M-03 | 普通账号调用 `jirun-admin.restrictUser` | `FORBIDDEN` |
| M-04 | 普通账号调用 `jirun-admin.getMetrics` | `FORBIDDEN` |
| M-05 | 账号 B 调用 `jirun-moderation.listMyCases` | 只返回 B 相关的举报与决定，不含 A 的 |
| M-06 | 账号 B 对 A 的内容决定申请复核 | `FORBIDDEN` |
| M-07 | 检查是否存在管理员浏览他人私聊的接口 | 不存在；`canReadPrivateChats` 恒为 false |
| M-08 | 客户端直接读 `jr_reports`、`jr_appeals`、`jr_config` | 被集合权限拒绝 |

## 3. 举报与下架分离

| 编号 | 用例 | 期望结果 |
|---|---|---|
| M-09 | 账号 A 举报内容后立即查看该内容 | 仍公开可见（处理期间保持原有可见性） |
| M-10 | 管理员判定举报不成立 | 内容保持公开，举报状态为 `rejected` |
| M-11 | 管理员判定举报成立 | 内容被下架，举报状态为 `upheld` |
| M-12 | 对同一举报再次作出决定 | `VERSION_CONFLICT`，不重复处理 |
| M-13 | 同一 `requestId` 重复提交举报 | 只产生一条举报记录 |
| M-14 | 举报不存在的内容 | `CONTENT_UNAVAILABLE` |
| M-15 | 检查被举报内容的作者能看到下架原因 | 在本人案件里能看到决定原因与操作者 |

## 4. 审核版本

| 编号 | 用例 | 期望结果 |
|---|---|---|
| M-16 | 作者修改内容后，管理员用修改前的版本 id 审核 | `VERSION_CONFLICT`，不发布新版本 |
| M-17 | 用旧 `expectedVersion` 审核 | `VERSION_CONFLICT` |
| M-18 | 审核通过后检查内容与版本指针 | 版本状态为 approved，公开指针指向该版本，待审指针清空 |
| M-19 | 对内容使用不属于它的动作（如 `content` + `uphold`） | `INVALID_INPUT` |
| M-20 | 对媒体调用 `decide` | `DEPENDENCY_UNAVAILABLE`，明确不可用而非假装通过 |

## 5. 复核

| 编号 | 用例 | 期望结果 |
|---|---|---|
| M-21 | 作者申请复核后立即查看内容 | 可见性不变（受理不代表恢复） |
| M-22 | 作者删除内容后申请复核并判定通过 | `FORBIDDEN`，内容保持删除 |
| M-23 | 内容下架、作者未删除，复核通过 | 恢复公开 |
| M-24 | 同一决定重复申请复核 | `INVALID_INPUT`；`decisionId` 唯一索引生效 |
| M-25 | 复核不通过 | 内容保持下架，复核状态为 `rejected` |

## 6. 账号限制

| 编号 | 用例 | 期望结果 |
|---|---|---|
| M-26 | 限制某账号发布并填写原因 | 该账号发布被拒；审计日志有 `user.restrict` |
| M-27 | 解除限制 | 该账号恢复可发布；审计日志有 `user.unrestrict` |
| M-28 | 限制时不填原因 | `INVALID_INPUT` |
| M-29 | 使用 `scope: 'login'` | `INVALID_INPUT`，只允许 publish／chat |
| M-30 | 检查是否存在自动封号或超时处罚 | 不存在；审计日志中没有自动触发类动作 |
| M-31 | 被限制私聊的账号尝试发起私聊 | 被拒绝，且不消耗额度 |

## 7. 配置与概览

| 编号 | 用例 | 期望结果 |
|---|---|---|
| M-32 | 修改配置 `categories` | 版本号递增，审计日志有 `config.update` |
| M-33 | 用旧 `expectedVersion` 修改配置 | `VERSION_CONFLICT` |
| M-34 | 尝试写入 `paymentEnabled`／`wallet`／`membershipLevels` 等配置 | `FORBIDDEN`，平台免费 |
| M-35 | 调用 `getMetrics` | 只返回发布与审核积压计数；响应中不含金额、订单或结算字段 |

## 8. 记录方式

每条用例记录：环境、操作步骤、实际结果、时间、脱敏截图或日志路径。
记录中不得包含密钥、完整用户聊天或身份资料。执行结果填入 `evidence/`，
并在 `implementation/progress.md` 更新对应 SC 状态（SC-08 举报与复核、SC-13 免费边界）。
