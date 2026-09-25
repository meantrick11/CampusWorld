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
