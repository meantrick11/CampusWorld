# 暨快跑 1.0.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> 适配说明：本计划交给 Claude Code 执行。技能在执行环境可用时使用；没有相应技能则直接逐项执行，不把安装技能或创建子代理作为前置条件。本次只编写计划，不执行开发。

**Goal:** 实现平台完全免费的校园取送、二手、校园墙信息发布与联系小程序，并提供内容治理后台。

**Architecture:** 普通 uni-app Vue 3 用户端与 uni-admin 网页管理端共用 uniCloud 开发空间。复用 uni-id 账号和 uni-im 聊天基础，将业务规则放在可独立测试的公共模块，并通过云对象执行权限、状态与数据变更。

**Tech Stack:** uni-app Vue 3、JavaScript、uni-ui、uni-starter（经兼容验证后决定是否采用）、uniCloud、uni-id-pages、uni-admin、uni-im；测试使用 Node 内置测试工具。

**Spec:** [页面设计](../docs/frontend-design-v1.0.0.md)、[技术方案](../docs/technology-plan-v1.0.0.md)、[业务验收](../docs/requirements-v1.0.0.md)、[实施契约](contracts.md)及 [1.0.0 全部业务文档](../README.md)。

## Global Constraints

- “平台完全免费”，用户之间允许自行协商费用；不开发支付、钱包、充值、提现、抽成、会员或付费推广。
- “微信小程序优先，后续兼顾 H5”；H5 完整上线不属于本次小程序发布必过项。
- 三板块齐全，校园墙保留文字、图片、视频和点赞、评论、回复、收藏、关注、分享。
- “对方未回复前总共只能发送一条消息”，服务端按账号对限制，不能由前端绕过。
- 昵称和头像“各自开始七天冷却”，首次登录不消耗各自的初始修改机会。
- “帖子作者不能删除别人的评论”，内容下架与账号限制分开；用户可申请复核。
- 草稿、未通过、下架或删除内容及私聊不可被公开接口、分享或媒体链接泄漏。
- 不把模板导入、单元测试或 mock 演示当作真实云端联调和真机验收。
- 原文档中的未决项按 [contracts.md](contracts.md) 的开发默认值执行并显式记录；外部条件缺失只阻塞相关验证。
- 不改写 0.1.0 历史文档，不覆盖已有代码，不自动购买资源或发布生产版本。

---

## 1. 路径与工程边界

默认 `APP_ROOT=工作区/jirun`，`SPEC_ROOT=工作区/1.0.0`。本计划代码路径均相对 APP_ROOT。HBuilderX 以 `apps/client/` 和 `apps/admin/` 分别打开项目。

```text
jirun/
  package.json                       根验证命令，不强迫模板使用 npm workspace
  .gitignore                         构建物、本地凭据、个人工具配置
  apps/
    client/
      App.vue  manifest.json  pages.json
      config/product-defaults.js
      styles/tokens.scss
      components/                    项目 UI 组件
      pages/                         广场、详情、发布、消息、我的
      services/                      云对象与 UI 之间的适配器
      uni_modules/
        uni-id-pages/                官方模块，锁定版本
        uni-im/                      官方模块，锁定版本
        jirun-service/
          uniCloud/
            cloudfunctions/
              common/jirun-domain/  可独立测试的业务函数、服务与仓储接口
              jirun-profile/         个人资料云对象
              jirun-content/         内容云对象
              jirun-media/           媒体云对象
              jirun-social/          互动云对象
              jirun-contact/         联系权限云对象
              jirun-notice/          站内通知云对象
              jirun-moderation/      举报与复核云对象
              jirun-admin/           管理操作云对象
            database/                自有集合 schema 和索引
    admin/
      pages/jirun/                   在 uni-admin 上新增业务页面
  tests/
    unit/                            真实业务行为测试，不测组件文件是否存在
    support/                         内存仓储、时钟与 fixture
    cloud/                           真实开发空间用例及操作说明
  scripts/
    doctor.cjs
    run-tests.cjs
    verify-evidence.cjs
  docs/
    setup.md  architecture.md  api-contracts.md
    compatibility.md  licenses.md  release-runbook.md
    decisions.md
  evidence/                          不含密钥和用户隐私的检查结果
  .local/                            已忽略的本地配置
```

`jirun-service` 为项目自有模块。执行 T01 时验证所选版本支持该 uni_modules 云目录及公共模块依赖方式；若官方模板要求不同位置，移动到其规定目录，并在 `docs/architecture.md` 建立准确路径映射。只有一个云端业务源，管理端连接同一空间，不复制两份云函数分别维护。

普通业务规则采用 CommonJS 公共模块，方便 Node 测试和云端调用；页面通过 service 适配器消费 DTO，不直接导入服务端代码。每个云对象单独包含其实际需要的依赖声明。不得将本地任意目录引用当作已经被云部署打包。

## 2. 执行顺序与完成关口

| 任务 | 依赖 | 独立交付物 |
|---|---|---|
| T01 工程与工具链 | 无 | 可定位、可构建的两个工程及版本清单 |
| T02 规则与数据契约 | T01 | 可执行的状态、权限、字段规则测试 |
| T03 真实接入样板 | T01、T02 | 微信登录、私有媒体、聊天扩展点真实验证 |
| T04 内容服务 | T02；真实部署依赖 T03 | 四类发布与查询、状态维护接口 |
| T05 媒体与审核管道 | T03、T04 | 图文视频上传、待审与授权访问 |
| T06 用户端主流程 | T04、T05 | 列表、搜索、详情、发布、我的发布 |
| T07 校园墙互动 | T04、T06 | 六项互动与评论权限 |
| T08 私聊与拉黑 | T03、T06 | 持久化限额和真实聊天 |
| T09 管理与治理 | T04、T05、T07、T08 | 后台审核、举报、复核、账号限制 |
| T10 我的与通知 | T07、T08、T09 | 资料、收藏关注、通知及设置 |
| T11 全量回归 | T01～T10 | 自动测试、真实云与微信真机证据 |
| T12 试运行交付 | T11 | 可复现部署、恢复与发布操作手册 |

外部权限缺失时，T04～T10 可以做纯业务逻辑、mock UI 和测试，但依赖真实云端的子步骤保持未完成；不能绕过 T03 的聊天、存储可行性结论后把整体实现标为完成。

## 3. 验证命令与证据约定

T01 建立根目录脚本：

```json
{
  "private": true,
  "scripts": {
    "doctor": "node scripts/doctor.cjs",
    "test": "node scripts/run-tests.cjs",
    "verify:evidence": "node scripts/verify-evidence.cjs"
  }
}
```

`scripts/run-tests.cjs` 使用实际文件列表，避免依赖 Windows shell 通配符：

```js
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'tests/unit');
const filter = process.argv[2] || '';
const files = fs.readdirSync(dir)
  .filter(name => name.endsWith('.test.cjs') && name.includes(filter))
  .sort().map(name => path.join(dir, name));
if (!files.length) throw new Error('没有匹配测试，不能视为通过');
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status === null ? 1 : result.status);
```

`doctor.cjs` 检查所选模板的 Node 兼容、工程路径、manifest 中 AppID 配置状态及本地工具可用性，只输出“已配置／缺失”，不输出凭据。T01 之前不要求不存在的命令能够执行。

微信构建优先按官方模板流程：HBuilderX 打开 `apps/client` → 运行到微信开发者工具；发布构建使用发行到微信小程序，记录实际产物路径。若采用官方 CLI 模板，先读取其真实 scripts，再把经执行成功的命令写入 `docs/setup.md`，不杜撰 HBuilderX 命令行参数。管理端也记录实际构建流程及产物。工具无法自动操作时，列出负责人所需执行的准确界面步骤。

每个任务末尾更新进度，已有 Git 仓库时只提交该任务相关文件，提交建议见各任务。单元测试和 mock 证据分别存放；真实验证记录环境、锁定版本、步骤、实际结果、时间及脱敏截图／日志。

## T01：工程骨架、模板取舍和工具链

**Files:** 新建根 `package.json/.gitignore`、`scripts/doctor.cjs`、`scripts/run-tests.cjs`、`apps/client/`、`apps/admin/`、`docs/setup.md`、`docs/compatibility.md`、`docs/licenses.md`。

**Interfaces:** 输入现有工作区及官方模板；输出两个工程路径、工具版本、根测试命令及真实构建方式，供所有后续任务使用。

- [ ] 检查当前目录、AGENTS／CLAUDE 指令、已有 Git 与代码；记录 APP_ROOT、SPEC_ROOT，保存已有变更情况。
- [ ] 从官方入口取得普通 Vue 3 uni-starter 与 uni-admin，记录来源、版本／提交及许可。优先保留模板目录结构，禁止下载来源不明的校园商城成品。
- [ ] 验证 uni-starter 能否使用当前 Vue 3 与 uni-id-pages／uni-im。若模板裁剪明显复杂，采用普通 uni-app Vue 3 工程导入所需模块，并记录原因。
- [ ] 移除不适用的支付、积分营销、广告、App 下载入口，保留项目实际需要的登录与设置；检查依赖没有因删页面而断开。
- [ ] 建立三个底部入口和样板空页面，设置产品名称与主题色；此时展示明确“开发样板”。
- [ ] 按第 3 节建立测试脚本。将 `.local/`、实际构建目录与云端私有配置路径加入忽略；版本锁文件和必要模块源码正常保存。
- [ ] 运行 `npm run doctor`，真实运行一次微信开发者工具及管理端。成功与缺失分别记录，不要求没有凭据时伪造登录成功。
- [ ] 在 `docs/setup.md` 写明打开、依赖安装、运行、产物路径和需要人工完成的步骤。

**Acceptance:** 两个工程可被对应工具识别；至少有真实构建结果或明确工具阻碍；没有把普通 H5 预览冒充小程序编译。确认云公共模块可被部署打包。提交建议：`chore: establish verified uni-app and admin projects`。

## T02：规则模块、数据契约与测试基础

**Files:** 新建公共模块 `package.json/content-policy.js/contact-policy.js/profile-policy.js/validation.js`；`tests/unit/content-policy.test.cjs`、`contact-policy.test.cjs`、`profile-policy.test.cjs`；`docs/api-contracts.md`；`apps/client/config/product-defaults.js`。

**Interfaces:** 提供 `canReadPublic({visibility, revisionStatus}) -> boolean`、`canSend({state, actorId, initiatorId, blocked}) -> {allowed,reason}`、`canEditField({now,lastChangedAt}) -> boolean`、`validateContent(input) -> {valid,errors}`。输入字段及边界使用 contracts.md，不混用订单状态。

- [ ] 写入 contracts.md 的状态枚举、DTO、自有 API 和开发默认值；列清仍需确认的生产事项。
- [ ] 先写以下测试，确认模块缺失或逻辑未实现时失败：

```js
// tests/unit/contact-policy.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const { canSend } = require('../../apps/client/uni_modules/jirun-service/uniCloud/cloudfunctions/common/jirun-domain/contact-policy.js');
test('未回复时发起人不能再发，对方可以回复', () => {
  const base = { state: 'pending', initiatorId: 'A', blocked: false };
  assert.equal(canSend({ ...base, actorId: 'A' }).allowed, false);
  assert.equal(canSend({ ...base, actorId: 'B' }).allowed, true);
});
test('拉黑优先于已经开放的聊天', () => {
  assert.equal(canSend({ state: 'active', actorId: 'A', initiatorId: 'A', blocked: true }).allowed, false);
});
```

- [ ] 运行 `npm test -- contact-policy` 记录预期失败，再实现纯函数：blocked 一律拒绝；none 允许第一条；pending 仅允许非 initiator 回复；active 允许；未知状态拒绝。
- [ ] 增加内容公开组合测试：published + approved 为真；pending／removed／deleted 或非 approved 为假。通过测试后实现 `canReadPublic`。
- [ ] 增加资料测试：未修改允许；第 7 天前 1 毫秒拒绝；满 7 天允许；昵称和头像使用不同时间字段，不能相互影响。
- [ ] 为四类信息写字段边界测试：负数数量、非整数金额、缺失路线、空校园墙、图片与视频混排、长度及容量超限均拒绝；有效赠送不需要金额。
- [ ] 运行 `npm test`，将行为与原 SC 场景关联到 `docs/api-contracts.md`。

**Acceptance:** 所有规则测试真实通过；新参数明确为开发默认值；没有框架 SDK 或数据库才能运行的纯规则测试。提交建议：`feat: define tested information platform rules`。

## T03：微信登录、媒体与 IM 接入验证

**Files:** 修改客户端 `App.vue/manifest.json/pages.json` 及实际 uni-id 配置；新建 `services/auth.js`、公共模块 `auth-adapter.js`、`tests/cloud/connection-checklist.md`、`evidence/T03.md`、`docs/architecture.md`；按锁定插件要求新增构建配置。

**Interfaces:** `auth.js` 提供 `ensureLogin({returnTo})` 和 `getSession()`；`auth-adapter.js` 提供 `requireUser(context) -> {userId,permissions}`；存储适配器确定 prepareUpload/getAccess 的 descriptor；记录 uni-im 全部发送入口对应的服务端扩展点。

- [ ] 将 AppID、云空间、工具与账号缺失项一次列出；真实密钥由负责人填写到本地忽略配置或云端，前端只持有允许公开的标识。
- [ ] 使用官方登录调用与 token 校验，测试游客详情 → 登录 → 返回原详情；确认伪造 userId 无法变更身份。
- [ ] 用实际开发空间上传合成图片／视频，验证未登录者不能读取待审媒体；记录访问凭据的有效期、撤销和缓存行为。
- [ ] 导入 uni-im，按官方要求初始化及处理微信扩展组件静态化；用两个真实测试账号双向发送。
- [ ] 找到可覆盖所有消息写入的服务端扩展点，通过直接请求／修改客户端验证不能绕过限制。记录实际函数文件、签名和版本，不将计划自有 API 当作 SDK API。
- [ ] 检查数据库事务／条件更新和消息写入能否协调；设计额度预留、消息提交及失败核对方式。
- [ ] 保存真机、云端调用与访问拒绝证据；无法完成时准确标识“未验证”，继续 T02 和后续可独立任务。

**Acceptance:** 三个可行性结论都有证据：真实登录身份可信、待审媒体不可公开读取、IM 存在可验证的服务端限额实现路径。失败时提交最小替代方案，不擅自将视频或私聊限制删除。提交建议：`feat: verify WeChat cloud and messaging integration`。

## T04：发布、查询与信息状态服务

**Files:** 新建公共模块 `content-service.js/content-repository.js`；云对象 `jirun-content/index.obj.js/package.json`、`jirun-admin/index.obj.js/package.json` 的最小审核方法；数据库 `jr_contents.schema.json/jr_content_revisions.schema.json/jr_decisions.schema.json/jr_audit_logs.schema.json` 及索引；`tests/support/memory-content-repository.cjs`、`tests/unit/content-service.test.cjs`、`tests/cloud/content-cases.md`。

**Interfaces:** 云对象实现 contracts.md 的全部 jirun-content 方法；`createContentService({repository,clock})` 提供同名方法，额外首参数为服务端 `actor`，便于独立测试；repository 提供 getById/createRevision/saveWithVersion/listPublic/listMine/findRequestResult/saveRequestResult，并在真实实现保证版本比较和去重写入正确协调。

- [ ] 先写以下越权测试。测试 fixture `seedPublished({id,authorId})` 在内存仓储建立合法根内容与审核通过版本：

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { createContentService } = require('../../apps/client/uni_modules/jirun-service/uniCloud/cloudfunctions/common/jirun-domain/content-service.js');
const { createMemoryContentRepository } = require('../support/memory-content-repository.cjs');
test('他人不能将信息标记完成', async () => {
  const repository = createMemoryContentRepository();
  repository.seedPublished({ id: 'c1', authorId: 'A' });
  const service = createContentService({ repository, clock: () => 1000 });
  await assert.rejects(
    service.updateStatus({ userId: 'B' }, { id: 'c1', expectedVersion: 1, status: 'completed', requestId: 'r1' }),
    error => error.code === 'FORBIDDEN'
  );
});
```

- [ ] 运行 `npm test -- content-service` 确认失败；实现四类数据校验、所有者检查和版本冲突错误；云对象将内部错误转换为统一返回。
- [ ] 实现提交为 pending、编辑创建新版本、公开查询只取已发布版本；使用稳定游标及查询上限，过滤下架／删除。
- [ ] 为授权审核员先实现 jirun-admin.decide 的 content approve/reject 最小分支，校验版本并写决定与日志，供后续真实发布验证使用；T09 再扩展管理页面、举报和复核。普通作者无批准权限，不能在测试方便的名义下添加任意人可用的批准入口。
- [ ] 采用唯一键或事务落实同一用户 requestId 幂等；加入重复提交不生成两条内容的测试。
- [ ] 数量归零退出有效闲置列表，状态变化与资金无关；失效状态、非法状态跳转及旧 expectedVersion 均测试。
- [ ] 禁止客户端直接写集合；使用普通用户 token 尝试越权写入和读取未公开版本，保存真实云拒绝结果。

**Acceptance:** 四类信息接口可调用；重复、越权、版本冲突与不可见内容按契约处理。提交建议：`feat: implement moderated information lifecycle`。

## T05：图片视频上传与待审媒体

**Files:** 新建 `jirun-media/index.obj.js/package.json`；公共模块 `media-policy.js/media-service.js/storage-adapter.js`；`database/jr_media.schema.json`；客户端 `services/media.js/components/MediaUploader.vue/components/MediaViewer.vue`；`tests/unit/media-policy.test.cjs`、`tests/cloud/media-cases.md`。

**Interfaces:** 实现 prepareUpload/completeUpload/getAccess；`mayAccessMedia({isOwner,isReviewer,contentVisible,mediaApproved}) -> boolean`；上传组件发出合格 mediaIds，不直接保存永久公开 URL。

- [ ] 先测试访问策略：非作者／非审核员、内容不可见时拒绝；合法审核员可审待审文件；公开内容只有 approved 媒体可读。

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { mayAccessMedia } = require('../../apps/client/uni_modules/jirun-service/uniCloud/cloudfunctions/common/jirun-domain/media-policy.js');
test('被下架内容的媒体不再给游客签发访问凭据', () => {
  assert.equal(mayAccessMedia({ isOwner: false, isReviewer: false, contentVisible: false, mediaApproved: true }), false);
});
```

- [ ] 运行 `npm test -- media-policy` 后实现策略及实际存储适配；getAccess 的权限在服务端取值，不接受客户端传入 isReviewer。
- [ ] 服务端核对上传所有者、大小、类型和实际媒体元数据；虚报 mime／size 不得直接通过。视频时长无法被可信校验时保持待审并记录阻碍。
- [ ] 实现图集与视频上传、预览、失败重试、进度、取消以及媒体结果和内容引用关联；媒体已上传但过滤未完成时不公开。
- [ ] 视频纳入人工审核队列；图文适用自动过滤接口时记录调用结果，失败不当作通过。人工审核可以作为开发及首版配置，但真实开放需要负责人落实人员。
- [ ] 扩展 T04 最小审核方法支持 media approve/reject；发布内容前校验其全部媒体已通过。头像按公开资料引用与审核状态控制访问，不能错误要求每个头像都关联一条帖子。
- [ ] 验证下架后停止签发 URL、已有凭据到期及缓存处理；把实际可实现的撤销窗口记入 evidence，不承诺已下载文件可追回。
- [ ] 列出孤立测试上传清理命令的范围，先预览；不自动删除生产媒体。

**Acceptance:** 小程序真实视频上传和播放有结果，待审媒体权限测试通过；只有图文可用时不得勾选任务完成。提交建议：`feat: add protected image and video publishing`。

## T06：广场、详情、发布与作者管理页面

**Files:** 新建客户端 `styles/tokens.scss`、`components/ContentCard.vue/AuthorBar.vue/StatusBadge.vue/AsyncState.vue`；`pages/plaza/index.vue`、`pages/search/index.vue`、`pages/content/detail.vue`、`pages/publish/select.vue`、`pages/publish/edit.vue`、`pages/publish/result.vue`、`pages/mine/publications.vue`；`services/content.js`；修改 `pages.json`。

**Interfaces:** `services/content.js` 包装 jirun-content 自有 API；组件使用 ContentDTO。路由统一使用 id，不能在分享参数中放完整正文或私密信息。

- [ ] 根据页面设计实现主题、三入口导航、广场板块与独立发布按钮；取送单列、闲置双列、求购单列、校园墙内容流。
- [ ] 实现四类动态发布表单，使用 MediaUploader；明确“提交待处理”和“已公开”的差别。
- [ ] 实现详情、公开作者信息、登录后返回、联系入口占位适配；禁止出现购买／支付按钮。
- [ ] 实现搜索、分页、刷新及每板块滚动位置保存；查询条件变化重置游标，旧请求结果不覆盖新筛选。
- [ ] 我的发布显示审核与业务状态，提供编辑、数量、完成、关闭、删除；删除前说明会影响公开展示。
- [ ] 对照以下脚本真机检查，记录到 `evidence/T06.md`：发布一条赠送 → 待审 → 管理通过 → 广场可见 → 修改数量为零 → 不在有效列表；取送详情仅展示区域；校园墙视频封面点击播放；无网络显示重试且草稿不丢失。
- [ ] 检查软键盘、安全区、底栏遮挡、长文本、空数据及不可见分享页；UI 使用实际服务错误码显示相应状态。

**Acceptance:** 四类信息可以完整走发布、审核结果、公开浏览、作者维护流程；无假成功 toast 或只写 localStorage 的业务动作。纯布局不写镜像实现的测试，已有规则测试运行 `npm test`。提交建议：`feat: build campus information publishing pages`。

## T07：校园墙六项互动

**Files:** 新建 `jirun-social/index.obj.js/package.json`；公共模块 `social-policy.js/social-service.js`；数据库 `jr_reactions/jr_follows/jr_comments` 对应 schema 和唯一索引；`components/WallActions.vue/CommentList.vue`、`pages/user/profile.vue`；`tests/unit/social-policy.test.cjs`、`tests/cloud/social-cases.md`。

**Interfaces:** 实现全部 jirun-social 方法；`canDeleteComment({actorId,commentAuthorId}) -> boolean`；setReaction/setFollow 接收明确 enabled 值，避免重复 toggle 导致状态反转。

- [ ] 先写评论权限测试，再实现策略：

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { canDeleteComment } = require('../../apps/client/uni_modules/jirun-service/uniCloud/cloudfunctions/common/jirun-domain/social-policy.js');
test('帖子作者不能代删其他人的评论', () => {
  assert.equal(canDeleteComment({ actorId: 'post-author', commentAuthorId: 'reader' }), false);
  assert.equal(canDeleteComment({ actorId: 'reader', commentAuthorId: 'reader' }), true);
});
```

- [ ] 运行 `npm test -- social-policy`；实现点赞、收藏和关注唯一关系，计数以服务端结果为准，禁止客户端上传计数值。
- [ ] 实现文字评论、回复及审核；只展示通过审核的评论，普通作者不能使用管理员删除通道。
- [ ] 加入云端并发用例：同用户同时启用点赞 5 次，最终只有一条关系、计数加一；取消重试不重复减数。
- [ ] 实现收藏仅本人可见、公开主页已公开内容与关注入口；不把关注或公开回复当作私聊解锁。
- [ ] 实现微信分享原内容入口，重新访问时服务端验证可见性；校园墙不生成站内转发帖。

**Acceptance:** 点赞、评论、回复、收藏、关注、分享全部可用；收藏越权和评论删除越权均拒绝。提交建议：`feat: add wall interactions with ownership checks`。

## T08：真实私聊、额度和拉黑

**Files:** 新建 `jirun-contact/index.obj.js/package.json`；公共模块 `contact-service.js/contact-repository.js/im-adapter.js`；数据库 `jr_contact_pairs/jr_message_requests/jr_blocks` schema 及唯一索引；客户端 `services/contact.js`、`pages/messages/index.vue`、`pages/messages/chat.vue`；`tests/unit/contact-service.test.cjs`、`tests/cloud/chat-concurrency.md`。

**Interfaces:** 实现 getContactState/setBlock/listBlocked；业务服务 `send({actorId,peerId,requestId,text,contentId}) -> {messageId,state}` 仅供服务端 IM 适配与测试使用，不伪装为官方 SDK 方法；消息实际发送遵循 T03 记录的扩展点。

- [ ] 为服务建立内存仓储与可控制失败的 IM 适配器，先写：同 requestId 两次返回同 messageId；第一条失败可重试；响应丢失后重试不产生第二条；pending 状态发起者第二条被拒绝。
- [ ] 运行 `npm test -- contact-service` 观察失败；实现稳定账号对、原子额度占用、消息写入结果协调和必要的失败核对。
- [ ] 所有 uni-im 消息写入口调用服务端规则，读取消息校验会话成员；删除会话、换内容和撤回不得删除账号对的申请记录。
- [ ] 接入 uni-im 会话 UI，来源卡片按实时权限取数据；已下架内容只显示不可见状态，不能用旧快照继续泄漏正文。
- [ ] 输入区实现等待回复、正常、拉黑、失败重试与断网提示；仅服务端确认接受后清除输入，客户端不能自行恢复额度。
- [ ] 用真实账号 A／B／C 测试：A 同时从两个设备向 B 发 10 条不同 requestId，只有 1 条成功；B 回复后 A 能继续；C 不能读 A/B 会话；B 拉黑 A 后直调接口也拒绝；解除仍不重置历史限额。
- [ ] 模拟云端写入后客户端超时及消息服务失败，检查无重复消息、无永久吞额度；保存脱敏云记录。

**Acceptance:** 纯规则测试、并发持久化与真实 IM 绕过测试均通过；没有只在页面禁用输入。无法证明原子及失败协调时保持未完成。提交建议：`feat: enforce server-side first-contact messaging limits`。

## T09：内容管理、举报与复核

**Files:** 新建 `jirun-moderation/index.obj.js` 及依赖，扩展 T04 已建立的 `jirun-admin/index.obj.js`；公共模块 `moderation-policy.js/moderation-service.js`；新建 `jr_reports/jr_appeals/jr_config` schema 并沿用 `jr_decisions/jr_audit_logs`；管理端 `pages/jirun/content.vue/reports.vue/appeals.vue/users.vue/config.vue/overview.vue`；用户端 `pages/report/create.vue`、`pages/report/history.vue`；`tests/unit/moderation-policy.test.cjs`、`tests/cloud/moderation-cases.md`。

**Interfaces:** 实现契约中全部 jirun-moderation/jirun-admin 方法；`canRestore({deletedByAuthor,revisionApproved}) -> boolean`；管理员权限由服务端校验，所有决定记录目标版本、原因与操作者。

- [ ] 测试举报提交不改变公开状态，审核下架才改变；复核通过也不能恢复作者已删除内容：

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { canRestore } = require('../../apps/client/uni_modules/jirun-service/uniCloud/cloudfunctions/common/jirun-domain/moderation-policy.js');
test('复核不能恢复作者已经删除的内容', () => {
  assert.equal(canRestore({ deletedByAuthor: true, revisionApproved: true }), false);
});
```

- [ ] 运行 `npm test -- moderation-policy` 后实现决定、下架、复核与版本检查；旧版本审核结果不能发布用户后来修改的版本。
- [ ] 实现后台图文视频审核预览，普通用户调用后台云对象必须拒绝；管理员不默认拥有浏览全部私聊的界面。
- [ ] 实现举报、历史状态、下架原因通知和复核申请；复核受理不立即恢复展示。
- [ ] 实现人工账号发布／私聊限制与解除，须原因和日志；自动配送超时处罚不出现。
- [ ] 实现分类、区域、容量配置与基础概览；配置修改使用版本检查，不存在收费开关。
- [ ] 真实验证普通用户伪造管理员角色、跨用户查询举报、重复审核、删除后复核及媒体下架权限；对应该拒绝的请求保存拒绝结果。

**Acceptance:** 管理端可完成发布审核 → 举报 → 下架 → 复核闭环；作者获知原因；数据与媒体权限一致。提交建议：`feat: implement auditable moderation and appeals`。

## T10：个人资料、我的、通知与设置

**Files:** 新建 `jirun-profile/index.obj.js`、`jirun-notice/index.obj.js` 及依赖；数据库 `jr_profiles/jr_notices/jr_feedback`；客户端 `pages/mine/index.vue/profile.vue/favorites.vue/following.vue/settings.vue/about.vue/blocked.vue/feedback.vue`、`pages/messages/notices.vue`；管理端 `pages/jirun/feedback.vue`；公共模块 `profile-service.js/notice-service.js`；`tests/unit/profile-service.test.cjs`、`tests/cloud/profile-notice-cases.md`。

**Interfaces:** 实现全部 jirun-profile/jirun-notice 方法和契约中的 submitFeedback/listFeedback/resolveFeedback；在 api-contracts.md 同步签名；头像采用已归属且通过审核的媒体。反馈仅本人提交、授权管理员处理，不暴露到公开信息查询。

- [ ] 先测试昵称修改不占用头像初始机会；并发两次修改同字段只允许一次；客户端伪造时间不能绕过七天冷却。
- [ ] 运行 `npm test -- profile-service`；服务端使用独立时间字段与条件更新，客户端展示准确的下次可修改时间。
- [ ] 建立我的入口、个人资料、校园墙收藏关注、黑名单、规则、反馈与退出登录；无钱包及会员。
- [ ] 增加后台反馈列表与标记处理，使用 listFeedback/resolveFeedback，处理说明不公开给其他用户；反馈提交有长度限制和重复请求去重。
- [ ] 建立评论回复及审核决定的站内通知，通知记录先保存，推送失败不丢记录；重复业务事件只生成一条通知。
- [ ] 私聊未读沿用经过验证的 IM 行为，不另造一套冲突计数；系统通知不解锁陌生私聊。
- [ ] 退出账号后清除本地 token、私聊与个人缓存；切换账号不会看到上一用户通知和草稿。反馈内容默认私密，只授权管理员可看。
- [ ] 关于页和规则页使用已落实的项目资料；上线所需负责人渠道或正式隐私说明缺失时明确记录发布阻碍，不填虚构联系方式。

**Acceptance:** 我的各入口可实际使用；资料冷却与通知归属由云端执行；反馈可以在后台处理。提交建议：`feat: complete profile notifications and user settings`。

## T11：全量验收与缺陷修复

**Files:** 新建 `tests/cloud/acceptance-matrix.md`、`evidence/acceptance.json`、`scripts/verify-evidence.cjs`；按实际失败修复对应代码；更新 `docs/setup.md`。

**Interfaces:** acceptance.json 记录每个 SC 的 `id/status/environment/observedAt/evidence`；status 为 `pass/fail/blocked/not_run`。验证脚本只是核对证据清单，不执行远端测试，也不证明结果真实性。

- [ ] 运行 `npm run doctor` 与 `npm test`，保存真实输出，不将失败测试删掉以获取通过结果。
- [ ] 按下表执行原需求全部 SC 场景，逐项填写实际结果。
- [ ] 微信真机验证登录、键盘、安全区、媒体、分享、断线及切换账号。管理端用普通与管理员身份分别验证权限。
- [ ] 用直调云对象、直接集合访问及原 IM 入口做越权和限额检查，避免只验证正常 UI。
- [ ] 修复每项实际缺陷后重跑受影响用例；代码无变化且已通过的无关检查不反复执行。
- [ ] 记录 H5 编译／公开详情冒烟结果为兼容证据，不把 H5 完整登录和上线强行纳入当前交付。
- [ ] 实现 verify-evidence.cjs：校验 SC-01～13 各出现一次；每个 pass 有环境、时间和存在的证据文件；存在 fail/blocked/not_run 时报告未就绪并非零退出；不读取或打印私有配置。

| 验收 | 实现任务 | 必须观察的结果 |
|---|---|---|
| SC-01 有偿取送免费发布 | T04、T06 | 无平台付款步骤，过滤后公开 |
| SC-02 面议／赠送闲置 | T02、T04、T06 | 金额字段逻辑正确，无平台支付 |
| SC-03 跨入口私聊限额 | T03、T08 | 真实云端拒绝第二条申请 |
| SC-04 回复后继续聊 | T08 | B 回复后 A 可发，无资金接口 |
| SC-05 联系不锁库存 | T04、T06、T08 | 多人联系不改变数量 |
| SC-06 数量归零 | T04、T06 | 退出有效列表，无退款结算 |
| SC-07 取送标记完成 | T04、T06 | 仅更新状态，无代审放款 |
| SC-08 举报与复核 | T09 | 受理与下架分离，原因与复核可用 |
| SC-09 游客分享 | T06、T09 | 公开可看，非公开拒绝，互动需登录 |
| SC-10 资料独立冷却 | T02、T10 | 两项初始机会与冷却互不影响 |
| SC-11 视频失败 | T05、T06 | 不产生公开空帖，可重试 |
| SC-12 删除／编辑及评论权限 | T04、T07、T09 | 不绕过审核，作者不能删别人评论 |
| SC-13 全部免费边界 | T01、T06、T09、T10 | 前后台无收费及平台资金能力 |

附加必须通过：真实云并发一条申请、消息故障恢复、下架媒体访问控制、审核版本冲突、跨账号数据隔离。纯函数通过不能替代这些集成用例。

**Acceptance:** 小程序要求全通过或准确报告阻碍；执行 `npm run verify:evidence`，只有全量真实验收通过才能报告试运行技术就绪。提交建议：`test: verify complete mini-program acceptance scenarios`。

## T12：部署、备份与交付

**Files:** 新建 `docs/release-runbook.md`、`docs/operations.md`、`evidence/release-readiness.md`；更新 `docs/setup.md` 与交接进度。

**Interfaces:** 输入锁定版本、验证结果及负责人配置；输出可复现的部署、回滚、恢复和发布操作，不输出密钥。

- [ ] 记录开发与生产空间区分、部署顺序：账号及公共依赖 → Schema／索引 → 业务云对象 → 管理端 → 小程序构建；以实际插件部署要求调整并留下最终准确步骤。
- [ ] 列出微信 AppID、服务空间、网络域名、登录配置、IM／通知配置、管理员创建的填入位置，示例只使用字段名，不填写假凭据。
- [ ] 在开发空间导出合成数据与测试媒体，演练恢复到隔离测试位置；记录恢复命令／界面步骤和核对结果，不覆盖现有数据。
- [ ] 记录生产部署前的数据兼容和回滚方法：保存上一版本代码和配置；Schema 变更评估可逆性，不承诺删除字段可直接回滚。
- [ ] 汇总媒体存储与流量实测、审核处理能力和预算提醒设置；负责人未确定预算或人员时标记发布阻碍。
- [ ] 完成 README：启动方法、微信工程产物位置、后台访问方式、测试账号准备、测试结果、已知限制与外部待办。
- [ ] 仅在负责人明确授权和外部条件齐备后进行生产资源操作及微信提交审核／发布；本计划不自动授予购买或公开发布权限。

**Acceptance:** 其他开发者按文档能复现开发环境与验证；尚未正式发布时准确说明“待发布”，不能把打包成功当作审核已通过。提交建议：`docs: deliver deployment recovery and release runbook`。

## 4. 完成定义与交接要求

每个任务结束提供：实际变更路径、命令与退出结果、业务验收记录、未完成项和下一步。不要只说“代码已写好”。所有框架适配偏差写入 `docs/decisions.md`，不得静默把云端能力改为纯本地 mock。

最终交付必须包含应用源码、锁定依赖、云对象、Schema／索引、管理后台、部署说明、测试与真实证据。未拥有微信 AppID 或云空间不妨碍完成大量本地开发，但此时整体状态只能是“待真实联调”，不是“可正式上线”。
