# 内容服务 · 真实云端用例

状态：**尚未执行**。本文件列出必须在真实 uniCloud 开发空间与真实微信小程序中
执行的用例。在项目负责人提供 AppID 与服务空间之前，下面每一条都保持未完成，
不得用内存仓储的单元测试结果代替。

## 0. 前置条件

| 条件 | 用途 | 当前状态 |
|---|---|---|
| HBuilderX | 上传云函数与 schema、编译小程序 | 未安装 |
| uniCloud 开发服务空间 | 云对象、数据库、存储 | 未配置 |
| 微信小程序 AppID 与项目成员权限 | 真机登录与预览 | 未配置 |
| 云仓实现 | `jirun-content/repository.js` 仍为未实现缺口 | 未完成 |
| 两个普通测试账号 + 一个管理员账号 | 越权与审核验证 | 未准备 |

## 1. 部署顺序

1. 上传 `uni_modules/uni-id-common`、`uni_modules/uni-config-center` 等公共模块。
2. 上传 `jirun-domain` 公共模块（`uniCloud-aliyun/cloudfunctions/common/jirun-domain`）。
3. 上传 5 个集合的 schema 与索引：`jr_contents`、`jr_content_revisions`、
   `jr_decisions`、`jr_audit_logs`、`jr_request_keys`。
4. 实现并上传 `jirun-content/repository.js`。
5. 上传云对象 `jirun-content`、`jirun-admin`。

准确顺序以 HBuilderX 实际界面要求为准；本机无 HBuilderX，上述步骤**未验证**。

## 2. 越权与隔离用例

| 编号 | 用例 | 期望结果 |
|---|---|---|
| C-01 | 用账号 A 的 token 调用 `jirun-content.listMine` | 只返回 A 的内容，不含 B 的 |
| C-02 | 用账号 B 的 token 调用 `jirun-content.updateStatus` 改 A 的内容 | `FORBIDDEN` |
| C-03 | 用账号 B 的 token 调用 `jirun-content.deleteContent` 删 A 的内容 | `FORBIDDEN` |
| C-04 | 未登录直接调用 `jirun-content.submitContent` | `AUTH_REQUIRED` |
| C-05 | 用普通账号 token 调用 `jirun-admin.decide` | `FORBIDDEN` |
| C-06 | 请求体中伪造 `authorId`、`currentUserId`、`isAdmin: true`、`role: ['admin']` 后调用 `jirun-content.updateStatus` 与 `jirun-admin.decide` | 身份仍以 token 为准，结果与不伪造时一致；伪造无效 |
| C-07 | 客户端用 `uniCloud.database()` 直接查询 `jr_contents` | 被集合权限拒绝 |
| C-08 | 客户端直接写 `jr_contents`（add／update／remove） | 被集合权限拒绝 |

C-07、C-08 是集合权限的实际验证。若两者任一能成功，说明 schema 权限未生效，
必须立即停止上线并排查。

## 3. 可见性用例

| 编号 | 用例 | 期望结果 |
|---|---|---|
| C-09 | 账号 A 提交内容后，游客调用 `getPublic` 与 `listPublic` | 均不可见（`CONTENT_UNAVAILABLE`／列表为空） |
| C-10 | 账号 A 自己调用 `getPublic` 看自己的待审内容 | 可见，且 `visibility` 为 `pending` |
| C-11 | 管理员审核通过后，游客再次查询 | 可见，返回的是通过的版本 |
| C-12 | 已公开内容被 A 编辑后（新版本待审），游客查询 | 仍返回**旧**公开版本，新正文不泄漏 |
| C-13 | A 将内容删除后，游客用原 id 查询 | `CONTENT_UNAVAILABLE` |
| C-14 | A 将内容删除后，游客用删除前的分享链接访问 | `CONTENT_UNAVAILABLE`，不返回缓存正文 |

## 4. 幂等与并发用例

| 编号 | 用例 | 期望结果 |
|---|---|---|
| C-15 | 用同一 `requestId` 连续调用 `submitContent` 两次 | 只生成一条内容，两次返回相同的 `id` 与 `version` |
| C-16 | 从两台设备用同一 `requestId` 同时调用 `submitContent` | 只生成一条内容；另一侧得到可重试的 `DEPENDENCY_UNAVAILABLE` |
| C-17 | 业务失败（如越权）后复用同一 `requestId` 正常调用 | 不被上次失败占用，能正常成功 |
| C-18 | `jr_request_keys` 的唯一索引是否存在 | 存在（`actorKey` + `requestId`），否则 C-16 会生成两条内容 |

## 5. 版本冲突与审核用例

| 编号 | 用例 | 期望结果 |
|---|---|---|
| C-19 | 用旧的 `expectedVersion` 调用 `updateStatus` | `VERSION_CONFLICT` |
| C-20 | A 修改内容后，管理员用修改前的版本 id 审核 | `VERSION_CONFLICT`，不发布新版本 |
| C-21 | 管理员用同一 `expectedVersion` 重复审核 | 第二次 `VERSION_CONFLICT`，不重复写决定 |
| C-22 | 审核通过后检查 `jr_decisions` 与 `jr_audit_logs` | 各有一条记录，含目标版本、原因与操作者 |
| C-23 | 普通作者调用 `jirun-admin.decide` 审批自己的内容 | `FORBIDDEN` |

## 6. 状态与数量用例

| 编号 | 用例 | 期望结果 |
|---|---|---|
| C-24 | A 将闲置数量改为 0 | 业务状态为 `closed`，退出公开列表，不是 `sold`／`gifted` |
| C-25 | A 将闲置数量从 2 改为 1 | 仍在公开列表 |
| C-26 | A 对校园墙调用 `updateStatus` | `INVALID_INPUT`（校园墙无业务状态） |
| C-27 | A 将取送从 `completed` 改回 `seeking` | `INVALID_INPUT` |
| C-28 | 任意状态变更后检查返回体与数据库 | 无任何金额、订单、结算字段 |
| C-29 | A 将数量的 `amountFen` 提交为小数或负数 | `INVALID_INPUT`，不写入 |

## 7. 记录方式

每条用例记录：环境（空间名与小程序版本）、锁定版本、操作步骤、实际结果、
时间、脱敏截图或日志路径。记录中**不得**包含密钥、完整用户聊天或身份资料。

执行结果填入 `evidence/` 下的证据文件，并在 `implementation/progress.md`
更新对应 SC 的状态。未执行前，本节所有条目保持「未执行」。
