# 架构与路径映射

记录日期：2026-09-25。本文件的作用是把计划中的目录约定映射到**实际存在的
路径**，避免把「计划里的路径」当成「已经验证过的部署结构」。

## 1. 总体结构

```text
apps/client（uni-starter，微信小程序优先）
      │
      │  uniCloud.importObject('jirun-content') 等调用
      ▼
uniCloud 开发服务空间（唯一）
  ├── 云对象：业务读写入口，服务端校验身份与权限
  ├── 数据库：jr_ 前缀自有集合 + 官方 opendb-*/uni-id-* 集合
  └── 存储：媒体文件的私有存储与短效访问凭据
      ▲
      │  同一空间，管理端登录管理员账号
apps/admin（uni-admin，H5 网页）
```

客户端不直接写业务集合；敏感读写全部经云对象。管理端与用户端连接同一
服务空间，管理端只新增业务页面，不复制业务云函数。

## 2. 云端的实际存放位置

计划给出的目标位置是 `apps/client/uni_modules/jirun-service/uniCloud/`。
当前**尚未创建**该模块，实际存在的云端目录如下：

| 类别 | 实际路径 | 说明 |
|---|---|---|
| 用户端云函数 | `apps/client/uniCloud-aliyun/cloudfunctions/` | 模板自带：`common/`、`uni-sms-co`、`uni-stat-cron`、`uni-stat-receiver`、`uni-analyse-searchhot` |
| 用户端数据库 | `apps/client/uniCloud-aliyun/database/` | 模板自带 schema 与 init_data |
| 管理端云函数 | `apps/admin/uniCloud-aliyun/cloudfunctions/` | 模板自带，多一个 `ext-storage-co`（外部存储管理） |
| 管理端数据库 | `apps/admin/uniCloud-aliyun/database/` | 模板自带，schema 更全（含 `.index.json`） |
| 模块内云资源 | `apps/*/uni_modules/<模块>/uniCloud/` | 例如 uni-id-pages、uni-captcha、uni-feedback 各自携带 |

### 待落定的路径决策

计划要求「只有一个云端业务源」。当前两个工程各有一份模板自带的
`uniCloud-aliyun`，其中框架函数与 schema 存在重复。**尚未合并**，原因：

- 合并需要确认 HBuilderX 对两个工程 `uniCloud-aliyun` 的打包与上传行为，
  以及 `uni_modules/<模块>/uniCloud/` 是否会被自动纳入打包。
- 本机没有 HBuilderX 与云空间，无法验证，擅自合并可能破坏官方模板。

因此本项目采用如下约束（记入 [decisions.md](decisions.md) D-01）：

1. 所有**业务**云对象与 `jr_` 前缀自有 schema 只写在
   `apps/client/uni_modules/jirun-service/uniCloud/` 下，不复制到 `apps/admin`。
2. `apps/admin/uniCloud-aliyun` 只作为关联同一服务空间的入口与官方模板
   自带内容，不新增业务函数。
3. 合并两份框架重复项的时间点：具备 HBuilderX 与开发空间之后，并在
   `docs/decisions.md` 更新结论。

## 3. 计划的业务模块与职责

以下为 T04 起要创建的云对象，路径按上述约束固定为
`apps/client/uni_modules/jirun-service/uniCloud/cloudfunctions/`。

| 云对象 | 职责 |
|---|---|
| `common/jirun-domain` | 可独立测试的纯业务规则、服务与仓储接口 |
| `jirun-profile` | 个人资料与冷却规则 |
| `jirun-content` | 取送／闲置／求购／校园墙的发布、编辑、查询、状态维护 |
| `jirun-media` | 上传准备、完成核对、私有访问凭据 |
| `jirun-social` | 点赞、评论、回复、收藏、关注、分享 |
| `jirun-contact` | 联系状态、私聊限额、拉黑 |
| `jirun-notice` | 站内通知 |
| `jirun-moderation` | 举报、复核、反馈 |
| `jirun-admin` | 审核队列、决定、账号限制、配置、概览 |

业务规则放在 `common/jirun-domain` 的 CommonJS 模块中，因此可以在 Node 下
直接运行 `npm test`，不依赖 HBuilderX。页面通过 `services/` 适配器消费
DTO，不直接导入服务端代码。

## 4. 客户端页面路径

当前已注册的用户端页面（T01 建立的骨架）：

| 页面 | 路径 | 状态 |
|---|---|---|
| 广场（首页 tab） | `pages/plaza/index` | 开发样板占位 |
| 消息（tab） | `pages/messages/index` | 开发样板占位 |
| 我的（tab） | `pages/mine/index` | 开发样板占位 |
| 用户协议 | `pages/uni-agree/uni-agree` | 模板自带，保留 |
| 设置 | `pages/ucenter/settings/settings` | 模板自带，保留 |
| 意见反馈 | `uni_modules/uni-feedback/pages/opendb-feedback/opendb-feedback` | 模板自带，T10 决定是否替换 |
| 登录与资料 | `uni_modules/uni-id-pages/pages/**` | 官方模块，保留 |

计划 T06 将把广场、搜索、详情、发布、我的发布等页面补全到
`pages/plaza`、`pages/search`、`pages/content`、`pages/publish`、`pages/mine`。

## 5. 管理端页面路径

管理端在 uni-admin 基础上新增业务页面，计划位置为 `apps/admin/pages/jirun/`：
`content.vue`、`reports.vue`、`appeals.vue`、`users.vue`、`config.vue`、
`overview.vue`、`feedback.vue`。这些页面通过
`uniCloud-aliyun/database/opendb-admin-menus.init_data.json`
（以及 `pages/system/menu/originalMenuList.json`）注册菜单。

菜单种子数据在两个工程各有一份，修改时必须同步；`npm run check:pages`
会校验管理端菜单是否都指向已注册页面。
