# 执行进度与证据

更新时间：2026-09-25。当前状态：T01、T02 本地完成、待真实联调；T03 受阻。

## 执行环境

| 项目 | 当前记录 |
|---|---|
| SPEC_ROOT | `暨快跑文档v0.1.0/1.0.0/` |
| APP_ROOT | `jirun/`（已创建） |
| Git 状态 | 仓库已初始化（`main` 分支），远端 `https://github.com/meantrick11/CampusWorld`。模板来源与提交见 `jirun/docs/compatibility.md` |
| 框架版本 | 用户端 uni-starter v2.2.17（提交 `f32b26c`），管理端 uni-admin 3.0.0（提交 `d4545b0`），两者 manifest `vueVersion` 均为 3 |
| 开发服务空间 | 尚未配置（`doctor` 检出缺失） |
| 微信 AppID | 尚未配置，`manifest.json` 中为空字符串 |
| 真机与测试账号 | 尚未准备 |
| HBuilderX | 未安装 |
| 微信开发者工具 | 未安装 |
| uni-im | 未获取，仅 DCloud 插件市场分发 |

## 任务状态

| 任务 | 状态 | 实际变更／证据 | 下一步 |
|---|---|---|---|
| T01 工程与工具链 | 本地完成待联调 | 见下节 T01 记录 | 安装 HBuilderX 与微信开发者工具后补真实构建 |
| T02 规则与数据契约 | 本地完成待联调 | 60 项规则测试真实通过；见下节 T02 记录 | T03 外部条件就绪后进入真实接入 |
| T03 真实接入样板 | 受阻 | 无 AppID、无服务空间、无 uni-im | 取得外部条件后核验登录、媒体与聊天 |
| T04 内容服务 | 未开始 | 无 | 建立四类信息服务 |
| T05 媒体与审核管道 | 未开始 | 无 | 验证访问控制与视频 |
| T06 用户端主流程 | 未开始 | 无 | 实现发布浏览管理 |
| T07 校园墙互动 | 未开始 | 无 | 六项互动与权限 |
| T08 私聊与拉黑 | 受阻 | 依赖 uni-im | 安装 uni-im 后实现 |
| T09 管理与治理 | 未开始 | 无 | 审核举报复核闭环 |
| T10 我的与通知 | 未开始 | 无 | 资料冷却及通知 |
| T11 全量回归 | 未开始 | 无 | SC-01～13 和附加集成测试 |
| T12 试运行交付 | 未开始 | 无 | 部署、恢复与交付说明 |

状态定义沿用：未开始、进行中、本地完成待联调、受阻、已验证完成。

## T01 记录（2026-09-25）

**实际变更路径**

- 仓库根：`.gitignore`、`.gitattributes`
- `jirun/`：`package.json`、`.gitignore`
- `jirun/scripts/`：`doctor.cjs`、`run-tests.cjs`、`check-pages.cjs`
- `jirun/apps/client`：uni-starter v2 全量（移除嵌套 `.git`）
- `jirun/apps/admin`：uni-admin master 全量（移除嵌套 `.git`）
- 用户端新增：`pages/plaza/index.vue`、`pages/messages/index.vue`、
  `pages/mine/index.vue`、`styles/tokens.scss`
- 用户端修改：`pages.json`、`manifest.json`、`uni.scss`、
  `uni-starter.config.js`、`App.vue`、`common/appInit.js`、
  `lang/zh-Hans.js`、`lang/en.js`、`pages/ucenter/settings/settings.vue`
- 管理端修改：`pages.json`、
  `uniCloud-aliyun/database/opendb-admin-menus.init_data.json`、
  `pages/system/menu/originalMenuList.json`
- 文档新增：`jirun/docs/setup.md`、`compatibility.md`、`licenses.md`、
  `architecture.md`、`decisions.md`

**移除的能力**（按 Global Constraints）

支付（uni-pay-orders schema、uni-stat 支付统计页面与菜单）、积分营销
（uni-sign-in 模块、uni-id-scores schema、语言包签到与积分键）、广告
（opendb-banner schema、激励视频广告回调云函数）、App 下载入口
（uni-upgrade-center 与 uni-upgrade-center-app、uni-portal、应用管理页面、
下载分享页、配置中的下载链接与应用市场评分）。详单见提交
`chore: strip paid, points, ads and app-download features from templates`。

**执行命令与真实结果**

| 命令 | 退出码 | 实际结果 |
|---|---|---|
| `git init -b main` + `git remote add origin` | 0 | 仓库建立，远端已关联 |
| `git clone --depth 1 --branch v2 .../uni-starter` | 0 | 取得 v2.2.17，提交 `f32b26c` |
| `git clone --depth 1 --branch master .../uni-admin` | 0 | 取得 3.0.0，提交 `d4545b0` |
| `npm run check:pages` | 0 | 用户端 23 个注册页面、管理端 58 个，管理端 37 条菜单全部指向已注册页面，未发现悬空引用 |
| `npm run doctor` | 1 | 8 项已配置；5 项缺失：AppID、服务空间、uni-im、HBuilderX、微信开发者工具 |
| 语言包语法校验（eval 对象字面量） | 0 | `zh-Hans.js` 与 `en.js` 各 21 个顶层键，语法有效 |
| 违禁入口扫描（grep） | 0 | 页面、组件、配置中无支付／充值／提现／钱包／会员／积分／广告入口；仅剩官方模块内一句字段描述 |

**提交记录**

1. `docs: add 1.0.0 specification and implementation handoff package`
2. `chore: import official uni-starter and uni-admin vue3 templates`
3. `chore: add workspace toolchain and static consistency checks`
4. `chore: strip paid, points, ads and app-download features from templates`

**未完成项与阻碍**

- 微信小程序编译与真机预览：本机无 HBuilderX 与微信开发者工具，**未执行**。
  因此产物路径在 `docs/setup.md` 中标注为预期值而非实测值。
- 云公共模块打包与部署：需 HBuilderX 与开发空间，**未验证**。
- uni-im：需在 HBuilderX 插件市场安装，**未获取**。
- 删除的模板能力仅通过静态校验确认无悬空引用，**未经过编译验证**。

**下一步可执行动作**：T02 建立 `common/jirun-domain` 规则模块与测试
（不依赖云端，可真实运行）。

## T02 记录（2026-09-25）

**实际变更路径**

- 新建模块：`jirun/apps/client/uni_modules/jirun-service/package.json`（uni_module 描述）
- 新建公共模块：`.../jirun-service/uniCloud/cloudfunctions/common/jirun-domain/`
  下的 `package.json`、`index.js`、`contact-policy.js`、`content-policy.js`、
  `profile-policy.js`、`validation.js`
- 新建测试：`jirun/tests/unit/` 下的 `contact-policy.test.cjs`、
  `content-policy.test.cjs`、`profile-policy.test.cjs`、`validation.test.cjs`、
  `product-defaults.test.cjs`
- 新建配置：`jirun/apps/client/config/limits.json`、
  `jirun/apps/client/config/product-defaults.js`
- 新建文档：`jirun/docs/api-contracts.md`

**执行命令与真实结果**

先写测试并确认失败（红阶段），再实现并通过（绿阶段）。

| 命令 | 退出码 | 实际结果 |
|---|---|---|
| `npm test`（实现前） | 1 | 4 个测试文件、0 通过、4 失败，失败原因均为 `MODULE_NOT_FOUND` |
| `npm test -- contact-policy` | 0 | 9 项通过、0 失败 |
| `npm test -- content-policy` | 0 | 5 项通过、0 失败 |
| `npm test -- profile-policy` | 0 | 8 项通过、0 失败 |
| `npm test -- validation` | 0 | 34 项通过、0 失败 |
| `npm test`（全部） | 0 | 60 项通过、0 失败 |

**覆盖的关键规则**

- 私聊：未回复前发起者被拒（原因为 `WAITING_REPLY`）、对方可回复、拉黑优先于
  已开放会话、未知状态拒绝、缺少身份拒绝、判定不修改入参。对应 SC-03、SC-04。
- 可见性：仅 `published` 且版本 `approved` 才可公开读取；下架、删除、待审版本
  一律不可读。对应 SC-09、SC-12。
- 资料冷却：7 天边界（差 1 毫秒拒绝、满 7 天允许）、首次不消耗机会、
  昵称与头像使用各自时间字段互不影响、缺少服务端时间默认拒绝。对应 SC-10。
- 字段边界：负数与非整数数量、非整数金额、缺失起终区域、空校园墙、
  图片与视频混排、媒体数量超限、标题与正文按 Unicode 码点计长；
  赠送与面议不携带金额、金额类型必须携带非负整数金额。对应 SC-01、SC-02、
  SC-06、SC-11。
- 一致性：客户端 `limits.json` 与服务端 `LIMITS` 逐项相等，且无服务端未实现的
  额外上限；断言默认值中不存在付费能力字段。对应 SC-13。

**未完成项与阻碍**

- 本任务只覆盖纯规则，未涉及数据库、存储与 IM；云端并发与真实 IM 绕过验证
  属于 T03 与 T08，当前**未执行**。
- 规则测试的通过不代表 SC 场景已通过：上表「对应」指规则层面已覆盖，
  SC 的完整验收仍需 T11 的真实环境证据。

**下一步可执行动作**：T04 建立 `content-service.js` 与内存仓储测试
（依赖 T02 已完成，不依赖 T03 的真实云端条件）。

## 每次执行后追加

每次记录日期、任务编号、变更路径、验证命令、退出码与实际结果、证据路径、
未解决问题，以及下一条可以执行的动作。记录中不得包含密钥、完整用户聊天或
身份资料。

## 上线条件

- [ ] T01～T12 的技术验收有真实结果。
- [ ] 微信主体、AppID、项目成员及实际发布条件已核实。
- [ ] 开发／生产空间区分清晰，预算和费用提醒已确定。
- [ ] 审核负责人、处理方式及反馈渠道已落实。
- [ ] 开发默认值已复核，隐私说明与记录保留方案已确定。
- [ ] 备份恢复在隔离环境有验证记录。
- [ ] 负责人明确授权正式部署和发布。

这些复选框当前全部未完成。
