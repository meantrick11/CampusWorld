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
| T04 内容服务 | 进行中 | 服务、仓储契约、schema 与索引已完成，99 项测试通过；云对象待写 | 完成 jirun-content／jirun-admin 云对象 |
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

## T04 记录（进行中，2026-09-25）

**已完成部分**

- 新建 `jirun-domain/content-repository.js`：仓储契约与 `assertRepository`，
  列出必须由实现保证的语义（版本比较写入、新建原子性、requestId 唯一性、
  列表返回已解析行、游标稳定）。
- 新建 `jirun-domain/content-service.js`：`createContentService({repository, clock})`
  实现 `submitContent`、`editContent`、`updateStatus`、`deleteContent`、
  `getPublic`、`listPublic`、`listMine`、`decideContent`。
- 新建 `tests/support/memory-content-repository.cjs`：内存仓储，带真实的版本比较、
  唯一 requestId 预留语义与稳定游标，不是返回固定数据的 mock。
- 新建 `tests/unit/content-service.test.cjs`：39 项测试。
- 新建 4 个 schema 与 4 个索引文件：`jr_contents`、`jr_content_revisions`、
  `jr_decisions`、`jr_audit_logs`。全部 `permission` 四项为 false，
  客户端不能直接读写，只能经云对象。
- 扩展 `scripts/check-pages.cjs`：新增「业务集合必须禁止客户端直接读写」检查，
  并校验 schema 与索引文件可解析、索引定义结构完整。

**执行命令与真实结果**

| 命令 | 退出码 | 实际结果 |
|---|---|---|
| `npm test -- content-service`（实现前） | 1 | 1 个文件、0 通过、1 失败，原因为 `MODULE_NOT_FOUND` |
| `npm test -- content-service` | 0 | 39 项通过、0 失败 |
| `npm test`（全部） | 0 | 99 项通过、0 失败 |
| `npm run check:pages` | 0 | 注册页面与菜单无悬空引用；解析 schema 77 个、索引文件 40 个；`jr_*` 集合已禁止客户端直接读写 |

**实现过程中发现并修正的问题**

1. 首版 `submitContent` 在建根内容后再写一次以回填待审指针，导致版本号从 1
   变成 2，与「新内容版本号为 1」不符。改为把根内容与首个版本一次原子写入，
   由仓储把新版本 id 回填到待审指针上。
2. 首版 `updateStatus` 把空字符串状态当成「保持原状态」，等于静默接受非法输入。
   改为区分「未传状态」（允许，用于只调整剩余数量）与「显式传空或非字符串」
   （拒绝 `INVALID_INPUT`）。
3. `editContent` 首版把未提交的字段当成清空，导致只改标题的局部编辑会因
   `details` 缺失而校验失败。改为未提交字段沿用当前最新版本。
4. 校验脚本首版用严格 `JSON.parse` 读取 schema，结果模板自带的 24 个
   `uni-stat-*.schema.json` 全部报错——**uniCloud 的 schema 文件允许注释与尾逗号**，
   不是严格 JSON。改用脚本内已有的宽容解析后通过。

**设计决定**

- 闲置数量归零时业务状态自动置为 `closed`（而不是 `sold`／`gifted`），
  既满足「数量归零退出有效列表」，又符合「未明确已售或已赠时使用 closed」，
  且公开列表只需过滤 `businessStatus !== 'closed'`，无需联表。
- 编辑已公开内容时 `visibility` 保持 `published`，只更新 `pendingRevisionId`，
  因此旧公开版本在新版本通过前继续可读，待审正文不会泄漏。
- 审核的 `targetId` 是版本 id，必须等于当前 `pendingRevisionId`，
  否则以 `VERSION_CONFLICT` 拒绝，避免用旧版本审核结果发布后来修改的版本。
- `requestId` 采用「预留 → 完成」：业务失败会释放预留；同键并发请求收到可重试的
  `DEPENDENCY_UNAVAILABLE`，因此响应丢失后重试既不会产生第二条内容，
  也不会被误判为参数错误。

**尚未完成**

- 云对象（`jirun-content`、`jirun-admin`）与统一返回、身份判定已写好并有测试；
  但 `jirun-content/repository.js` 是**有意的未实现缺口**（见 `docs/decisions.md`
  D-09）。原因：本机无服务空间，条件更新、并发唯一键与游标复合查询无法做任何
  真实调用，计划明确禁止杜撰框架接口；一段貌似正确的数据库代码被直接部署的风险
  大于一个明确标注的缺口。模板中已核实的 API 用法与实现注意事项已写在该文件头部。
- 真实云端用例未执行：见 `jirun/tests/cloud/content-cases.md` 的 C-01～C-29。
- 因此 T04 只到「本地可验证」，不能标记为「真实联调通过」。

**云对象部分（2026-09-25 追加）**

- 新建 `jirun-domain/cloud-response.js`（统一返回与错误白名单）与
  `jirun-domain/actor-policy.js`（身份与审核权限判定），
  新增 `tests/unit/cloud-boundary.test.cjs` 11 项测试。
- 新建云对象 `jirun-content`、`jirun-admin` 及各自 `package.json`，
  依赖声明格式照抄模板中 `uni-stat-receiver` 的写法。
- 新建 `jr_request_keys` schema 与唯一索引（`actorKey + requestId`）。
- 新建 `tests/cloud/content-cases.md`，列出 29 条真实云端用例。
- 全量测试 117 项通过。

**校验脚本自身的缺陷（重要）**

给脚本加「业务集合必须禁止客户端直接读写」检查时，首版只扫描
`apps/*/uniCloud-aliyun/database`，而本项目自有集合位于
`uni_modules/jirun-service/uniCloud/database`——**检查实际没有跑到这些文件上，
却仍打印出「jr_* 集合已禁止客户端直接读写」**，属于「报告通过但未检查」。
修正为按路径模式发现任意位置（含 uni_modules 内）的 schema 与索引文件，
schema 总数由 77 变为 104，并显式列出被检查的 5 个集合名。

为证明判定逻辑真的有效，把权限判定抽到 `scripts/lib/schema-permissions.cjs`，
用合成的违规 schema 写了 7 项测试（放开任一权限、权限缺失、非对象输入等）。
没有去改真实 schema 来做验证——那本身就是一次放开权限的危险操作。

## 本地 H5 预览通道（2026-09-25）

**背景**：项目负责人希望能直接在电脑上看到界面效果。

**新增路径**

- `jirun/apps/client-preview/`：只承载 npm 工具链的预览工程（package.json、
  index.html、vite.config.js），把 `apps/client` 编译为 H5。不修改
  `apps/client` 任何文件。
- `jirun/preview/uniCloud-preview-shim.js`：仅预览用的 uniCloud 占位，
  真实调用一律报错，不返回假数据。
- `jirun/scripts/build-preview.cjs`、`jirun/scripts/serve-preview.cjs`：
  构建入口与本地静态服务。
- `jirun/package.json` 新增 `preview:build`、`preview:serve`。

**执行命令与真实结果**

| 命令 | 退出码 | 实际结果 |
|---|---|---|
| `npm run preview:build` | 0 | 编译成功，产物 1.2 MB、42 个 chunk，含 `pages-messages-index`、`pages-mine-index` 与 `plaza` |
| `npm run preview:serve` | — | 本地服务 `http://127.0.0.1:5180/` 返回 200 |
| 浏览器加载 | — | 页面挂载成功，渲染出「广场」页与底部三个 tab（DOM 实测） |
| `npm test` | 0 | 117 项通过，预览工作未影响既有测试 |
| `npm run check:pages` | 0 | 未发现问题 |

**排查中从插件源码核实的四处行为**（详见 `docs/decisions.md` D-10）

1. H5 入口必须与 vite root 同目录，插件把 `/main` 映射到 `UNI_INPUT_DIR/main.js`。
2. **平台插件集按「工作目录的 package.json 依赖名」加载**。以 `apps/client`
   为工作目录时它不含任何 `@dcloudio/*` 依赖，H5 插件集不会注册——构建会打印
   `Build complete` 却不含任何页面（实测产物仅 87 KB、无 `pages/`）。
   这是最关键的一处，排查花了多轮。
3. JS 条件编译在 CLI 下只覆盖 `mp-weixin`，H5 需要自己用官方 `preJs` 补上
   （影响 20 个文件）。
4. 未关联服务空间时 H5 无 uniCloud，会导致 `appInit.js` 顶层调用抛错、页面不挂载。

**未完成**

- **交互未证实**：执行环境的内置浏览器没有可见画面，真实点击与截图均被拒绝，
  只能读取 DOM 结构。因此「tab 切换可用」尚未验证，需人工在浏览器确认。
- 预览不能验证任何依赖云端的功能（登录、发布、私聊、审核）。
- 预览产物不是交付物，正式构建与云函数上传仍以 HBuilderX 为准。

## T06 记录（用户端主流程，2026-09-25）

**新增文件**

- `services/content.js`：页面唯一的取数入口。有云端时调 `jirun-content` 云对象；
  无云端时走本地样例并返回 `localSample: true`，由页面显示「本地样例数据」标识。
  写操作在无云端时一律明确失败，不假装成功。
- `services/local-sample-data.js`：本地样例（四类内容 + 本人发布含审核状态）。
  形状与云端 ContentDTO 一致；media 只有 id 没有 URL，因此界面统一走占位。
- `utils/format.js`（相对时间、金额分转元、昵称与头像占位）、
  `utils/status.js`（状态文案与色调、板块与分类、可见性说明）、
  `utils/form-validate.js`（客户端表单校验，仅便利，服务端为准）。
- `components/StatusBadge.vue`、`AuthorBar.vue`、`AsyncState.vue`、`ContentCard.vue`。
- 页面：`pages/search/index`、`pages/content/detail`、`pages/publish/select`、
  `pages/publish/edit`、`pages/publish/result`、`pages/mine/publications`；
  重写 `pages/plaza/index` 与 `pages/mine/index`。`pages.json` 注册页面由 23 增至 29。
- `styles/tokens.scss` 增加 `jr-safe-bottom`／`jr-safe-top` 安全区 mixin 与省略号 mixin。

**执行命令与真实结果**

| 命令 | 退出码 | 实际结果 |
|---|---|---|
| `npm run check:pages` | 0 | 注册页面 29 个，未发现悬空引用 |
| `npm run preview:build` | 0 | 编译成功 |
| `npm test` | 0 | 117 项通过，未影响既有测试 |
| 浏览器实测（广场） | — | 四板块内容、样例标识、互动栏、发布按钮全部渲染，无报错 |
| 浏览器实测（闲置详情） | — | 标题「闲置详情」；图片占位、价格 ¥15、剩余 1 件、交接区域、在售标签、底部「联系发布者」 |
| 浏览器实测（发布表单） | — | 标题「发布信息」；7 个输入框 + 1 个多行输入；取送字段齐全；字数计数 0/60 与 0/3000 |
| 浏览器实测（我的发布） | — | 三条内容分别显示「未通过／待处理／已公开」，且与「进行中／在售」分开显示；菜单按板块差异化 |

**实现中的取舍**

- 金额在界面按「元」输入，提交前转整数分；非金额类型不带金额字段。
- 发布页在 `onLoad` 生成一个稳定 `requestId`，避免重复提交产生多条内容。
- 提交失败时把表单存为本机草稿并明确告知，不静默丢弃。
- 「联系发布者」与校园墙互动栏点击后**明确提示该功能待后续任务实现**，
  而不是静默无响应，也不是伪造成功。
- 客户端校验只做必填、长度与整数三类，避免与服务端规则各写一套产生分歧；
  长度取自 `config/limits.json`，与服务端 `LIMITS` 由测试保证一致。

**未完成**

- **媒体上传未实现**：`MediaUploader` 与私有访问凭据属于 T05，依赖 T03 的真实
  存储验证。发布页与详情页的图片／视频均为统一占位，并在界面上说明原因。
  视频能力保留，未删除。
- **真机检查未执行**：计划要求的「发布赠送 → 待审 → 管理通过 → 广场可见 →
  数量归零退出列表」等脚本需要真实云端与微信开发者工具，属 T11。
- **交互未验证**：执行环境的内置浏览器没有可见画面，无法真实点击；
  上述页面仅验证了渲染与数据，未验证点击行为。
- 互动六项（T07）、私聊（T08）、审核后台（T09）、资料与通知（T10）未开始。

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
