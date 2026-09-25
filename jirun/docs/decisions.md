# 决策记录

记录执行过程中实际发生的框架适配偏差与取舍。计划要求「所有框架适配偏差写入
`docs/decisions.md`，不得静默把云端能力改为纯本地 mock」。以下每条都注明
状态：**已决定**（无需外部条件即可执行）或**待验证**（需要 HBuilderX／云空间）。

---

## D-01 业务云函数只放在用户端模块，管理端不复制

**状态：已决定（结构约束）**

**背景**：计划要求「只有一个云端业务源，管理端连接同一空间，不复制两份云
函数分别维护」。两个模板各自自带一份 `uniCloud-aliyun`，框架函数与 schema
存在重复。

**决定**：所有业务云对象与 `jr_` 前缀 schema 只写在
`apps/client/uni_modules/jirun-service/uniCloud/`；`apps/admin/uniCloud-aliyun`
保持官方模板内容，不新增业务函数。

**未完成部分**：两份框架重复项尚未合并。合并行为需要 HBuilderX 才能验证，
本机不具备。**不擅自合并**，避免破坏官方模板。

**复核时机**：具备 HBuilderX 与开发空间后，验证 `uni_modules/<模块>/uniCloud/`
是否被自动纳入打包，再决定是否合并框架重复项。

---

## D-02 保留 uni-stat 内核，仅移除其支付统计页面与菜单

**状态：已决定**

**背景**：计划要求移除不适用的支付与积分营销入口。

**实际情况**：`uniCloud-aliyun/cloudfunctions/common/uni-stat/stat/mod/index.js`
第 21 行硬依赖 `./uni-pay`（`uniPay: require('./uni-pay')`）；多个
`uni-stat-*.schema.json` 互相引用 `opendb-app-list`／`opendb-app-versions`。
删除这些内部模块会导致 uni-stat 无法加载。

**决定**：保留 uni-stat 内核与 `uni-stat-pay-result` 集合，移除**可达入口**：
支付统计页面、对应菜单、`uni-pay-orders` schema、`js_sdk` 校验器。统计内核
属于框架自带分析能力，不构成支付能力，且没有任何页面或接口能创建支付订单。

**影响**：仓库内仍存在 `uni-stat` 内部的支付统计计算代码与
`uni-stat-pay-result` 集合定义，但不可从界面或自有接口触达。

---

## D-03 不修改官方模块内的积分字段描述

**状态：已决定**

**背景**：`uni_modules/uni-id-pages/uniCloud/database/uni-id-users.schema.json`
第 344 行的 `score` 字段描述中提到 `uni-id-scores` 表，而该表 schema 已按计划
移除。

**决定**：不修改官方模块内的文件。理由：`uni_modules` 由插件市场升级时会被
覆盖，修改会在升级后丢失并造成困惑。

**影响**：`uni-id-users` 保留官方 `score` 字段，但授予积分的
`uni-sign-in` 模块已移除，正常使用下不会产生积分。

---

## D-04 tabBar 图标暂用模板自带图标

**状态：已决定（临时）**

**背景**：三个底部入口已改为「广场／消息／我的」，但只有一张合适的图标。

**决定**：广场用 `static/tabbar/list*.png`，消息临时用 `static/tabbar/grid*.png`，
我的用 `static/tabbar/me*.png`。图标与文案不完全匹配，属占位。

**待办**：T06 视觉阶段替换为正式图标。`npm run check:pages` 会校验图标文件
存在，替换时若只改路径不改文件会直接报错。

---

## D-05 保留模板自带的示例内容集合

**状态：已决定（临时）**

**背景**：`opendb-news-articles` 等示例内容集合与 `opendb-search-hot` 等被
uni-stat 的内容统计和搜索热词功能引用。

**决定**：本轮不删除。它们不属于计划点名的支付、积分营销、广告或 App 下载
入口；删除需要先确认 uni-stat 与 uni-config-center 的引用关系，本机无法验证。

**待办**：真实内容集合（`jr_contents` 等）落地并完成编译验证后，评估清理。

---

## D-06 用静态校验替代无法执行的编译验证

**状态：已决定**

**背景**：T01 的验收要求「两个工程可被对应工具识别」与「检查依赖没有因删页面
而断开」，但本机没有 HBuilderX 与微信开发者工具。

**决定**：新增 `scripts/check-pages.cjs`，以可复现的方式校验：

1. `pages.json` 注册的每个页面文件真实存在；
2. tabBar 指向的页面已注册且图标文件存在；
3. 源码中引用的每个 `uni_modules/<名称>` 目录真实存在；
4. 管理端 `opendb-admin-menus` 种子数据的每条菜单都指向已注册页面。

**局限**：这是静态检查，**不能替代真实编译**。它发现不了语法错误、
scss 编译错误与平台特有 API 问题。不得把该脚本通过当作编译通过。

---

## D-07 未获取 uni-im，私聊相关任务保持未完成

**状态：受阻（外部条件）**

**背景**：`uni-im` 只在 DCloud 插件市场分发。npm 上的 `uni-im` 包经核实属于
第三方作者（`zhaotoday/uni-im`），与本项目所需模块无关；`dcloudio` 组织下
没有该仓库。

**决定**：不引入来源不明的替代包。T08 私聊与 T03 的 IM 扩展点验证在
`uni-im` 安装前保持未完成，不用本地模拟冒充通过。

**负责人需执行**：在 HBuilderX 插件市场安装 `uni-im` 到 `apps/client`。

---

## D-08 微信 AppID 与服务空间缺失，真实联调未开始

**状态：受阻（外部条件）**

**背景**：`npm run doctor` 真实执行结果为：AppID 全部为空、服务空间未绑定。

**决定**：按计划「缺失时继续可完成的规则、页面和测试」，T04～T10 的纯业务
逻辑与测试可以推进，但涉及真实云端与真机的子步骤保持未完成，整体状态只能
是「待真实联调」。

**负责人需执行**：注册小程序取得 AppID、创建 uniCloud 开发服务空间、
在 HBuilderX 中关联空间，并把服务端凭据填入云端配置或本机 `.local/`。

---

## D-09 云端仓储留有明确的未实现缺口，不写未经真实调用的数据库代码

**状态：已决定（有意留白）**

**背景**：T04 需要云对象 `jirun-content`／`jirun-admin` 在真实 uniCloud 空间中
可用。云对象本身是薄适配层（token → actor → 已测试的服务 → 统一返回），风险低；
但仓储实现涉及条件更新、并发唯一键、游标复合查询、聚合等行为，本机没有服务空间，
无法做任何一次真实调用。

**决定**：云对象按契约写好，`jirun-content/repository.js`
**只导出会明确报错的工厂**，不写一段看起来能跑、实际未经调用的数据库代码。
理由：计划要求「不杜撰框架接口」；一段貌似正确的数据库代码可能被直接部署并信任，
比一个明确标注的缺口危险得多。

**已在本仓库模板代码中核实的 API**（实现时可直接用，不是猜的）：

- 条件更新 `db.collection(name).where(cond).update(obj)` 返回 `{ updated }`
  —— `common/uni-stat/stat/mod/base.js:187` 与 `statResult.js:1358`
- 查询 `.orderBy(key, 'desc').limit(n).get()` 返回 `{ data: [...] }`
  —— `uni-sms-co/index.obj.js:83`、`base.js:316-327`
- 条件构造 `db.command.in/gt/inc/exists` —— `uni-sms-co/index.obj.js:128-151`
- 新增 `db.collection(name).add(obj)`（支持数组批量）—— `index.obj.js:93/203`
- 指定文档写入 `.doc(id).set(obj)` —— `index.obj.js:310`
- 云对象 `_before`／`_after` 钩子与 `this.getClientInfo()`／`this.getUniIdToken()`
  —— `uni-sms-co/index.obj.js:30-53`
- token 校验 `uniID.createInstance({clientInfo}).checkToken(token)` 返回含 `uid`
  —— `uni-stat-receiver/index.obj.js:14-21`

**实现时必须自行验证的事项**（已写在 `repository.js` 头部）：

1. `listPublic` 的关键词、分类、区域字段位于版本表而非根表。建议先按根表条件分页，
   再批量取本页版本后过滤；后过滤会使本页条数少于 limit，需要靠 nextCursor 续翻。
   数据量增长后应改为在根表维护公开版本快照或使用聚合查询。
2. 游标中 `createdAt` 与 `_id` 的复合比较需用 `db.command.or` 组合，
   请对照实际 SDK 版本确认写法与字符串 `_id` 的比较行为。
3. `reserveRequest` 依赖 `jr_request_keys` 的唯一索引；并发冲突会抛错，
   必须捕获后回查已存在结果，而不是直接失败。
4. 审核通过需同时写版本状态与根内容指针，应放入事务，或确认条件更新失败时可安全重试。

**影响**：在真实服务空间调用 `jirun-content`／`jirun-admin` 会返回
`DEPENDENCY_UNAVAILABLE` 与一句明确的说明，不会静默返回错误结果。

**复核时机**：项目负责人提供开发服务空间后，按 `tests/cloud/content-cases.md`
的 C-01～C-29 逐条执行并记录。
