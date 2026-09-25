# 本地环境与启动说明

本文件说明如何在本机打开、运行与验证本项目。凡未在本机真实执行过的步骤，
均标注「待核实」，不写成已通过。

## 1. 工程结构

```text
CampusWorld/                     仓库根
  暨快跑文档v0.1.0/1.0.0/        SPEC_ROOT：需求与实施计划来源（只读，不修改）
  jirun/                         APP_ROOT：应用工程
    package.json                 根命令（doctor / test / check:pages）
    scripts/                     环境自检与静态校验脚本
    apps/client/                 用户端：uni-starter（HBuilderX 工程）
    apps/admin/                  管理端：uni-admin（HBuilderX 工程）
    tests/unit/                  规则与业务行为测试（node:test）
    tests/support/               内存仓储与 fixture
    tests/cloud/                 真实云端用例与操作记录
    docs/                        本目录
    evidence/                    不含密钥与隐私的检查结果
    .local/                      本地凭据（被 .gitignore 忽略，需手工创建）
```

两个工程是独立的 HBuilderX 工程，不是 npm workspace。`apps/admin` 与
`apps/client` 关联**同一个** uniCloud 服务空间。

## 2. 根命令

```bash
cd jirun
npm run doctor        # 环境自检，只输出「已配置／缺失」，不打印凭据
npm test              # 运行 tests/unit 下全部 *.test.cjs
npm test -- <关键字>   # 只运行文件名含关键字的用例
npm run check:pages   # 静态校验页面注册、tabBar 图标、uni_modules 引用与后台菜单
```

当前真实执行结果：

| 命令 | 结果 |
|---|---|
| `npm run check:pages` | 通过：未发现悬空引用 |
| `npm run doctor` | 退出码 1，5 项缺失（AppID、服务空间、uni-im、HBuilderX、微信开发者工具） |

`doctor` 退出码非 0 表示存在缺失项，但缺失项不阻塞本地规则与页面开发。

## 3. 需要人工完成的准备步骤

以下步骤需要项目负责人操作，执行前请先确认工具已安装。

### 3.1 安装工具（当前本机缺失）

1. 安装 **HBuilderX**（uni-app 官方 IDE，用于编译小程序、上传云函数与 schema）。
   下载入口：<https://www.dcloud.io/hbuilderx.html>。请选择正式版而非 Alpha 版。
2. 安装 **微信开发者工具**，并在其设置中开启「服务端口」，供 HBuilderX 调用。
   下载入口：<https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html>。

两个工具的安装路径未在仓库中硬编码；`doctor` 只检测常见路径与 PATH。

### 3.2 配置云与账号（当前本机缺失）

1. 使用 DCloud 账号在 <https://unicloud.dcloud.net.cn> 创建**开发**服务空间。
   建议开发与生产使用两个独立空间。
2. 在 HBuilderX 中分别右键 `apps/client` 与 `apps/admin` → 关联云服务空间，
   两者选择同一个开发空间。
3. 在 <https://mp.weixin.qq.com> 注册小程序并取得 AppID 与项目成员权限。
4. 把 AppID 填入 `apps/client/manifest.json` 的 `appid` 与 `mp-weixin.appid`
   字段（当前为空字符串）。
5. 微信登录所需的服务端凭据填入云端配置（uni-config-center）或本机
   `.local/` 目录。**不要把密钥提交到仓库，也不要发到聊天里。**

### 3.3 安装 uni-im（当前缺失）

`uni-im` 只在 DCloud 插件市场分发，未随官方 GitHub 仓库提供。请在 HBuilderX
中打开插件市场搜索 `uni-im` 安装到 `apps/client`，安装后由 `doctor` 检出。
私聊功能（T08）依赖该模块。

## 4. 打开与运行

### 4.1 用户端

1. HBuilderX → 文件 → 打开目录 → 选择 `jirun/apps/client`。
2. 菜单「运行」→「运行到小程序模拟器」→「微信开发者工具」。
3. 首次运行需在 HBuilderX 设置中填写微信开发者工具的安装路径。

预期产物目录（uni-app 标准输出，**本机尚未真实验证**）：

| 场景 | 产物目录 |
|---|---|
| 开发运行（微信小程序） | `apps/client/unpackage/dist/dev/mp-weixin` |
| 发行构建（微信小程序） | `apps/client/unpackage/dist/build/mp-weixin` |

产物目录被 `.gitignore` 忽略，不进入版本库。

### 4.2 管理端

1. HBuilderX → 打开目录 → 选择 `jirun/apps/admin`。
2. 管理端是网页应用，运行方式为「运行到浏览器」（H5）。
3. 首次打开需先在 `uniCloud-aliyun/database` 右键上传全部 schema，并初始化
   管理员账号（uni-id-pages 提供的注册管理员入口）。

预期产物目录（**本机尚未真实验证**）：`apps/admin/unpackage/dist/build/web`。

### 4.3 云函数与 schema 部署顺序

1. 上传 `uni_modules` 中的公共模块（uni-id-common、uni-config-center 等）。
2. 上传数据库 schema 与索引。
3. 上传业务云对象（当前尚未创建，见 T04 起的任务）。
4. 上传管理端页面后运行前端。

准确的上传顺序与插件要求以 HBuilderX 实际界面为准；本机无 HBuilderX，
上述顺序来自官方文档描述，**尚未真实验证**。

## 5. 在电脑浏览器里看界面（无需 HBuilderX）

如果只是想在电脑上查看界面效果与做视觉验证，可以不装 HBuilderX：
`apps/client-preview` 是一个只承载 npm 工具链的预览工程，把 `apps/client`
编译成 H5。它**不修改 `apps/client` 内任何文件**，产物也只用于查看。

```bash
cd jirun

# 首次需要先安装预览工具链（约 450 个包）
cd apps/client-preview && npm install && cd ..

npm run preview:build   # 编译到 jirun/dist/h5
npm run preview:serve   # 启动本地服务，默认 http://127.0.0.1:5180/
```

已实际验证的结果：编译成功，产物 1.2 MB、42 个 chunk，页面在浏览器中挂载并
渲染出「广场」与底部三个 tab。

必须知道的限制：

- 这是**预览，不是交付产物**。它不受支持用于发布；微信小程序与云函数上传
  仍然只能由 HBuilderX 完成。
- 预览里没有 uniCloud。`preview/uniCloud-preview-shim.js` 注入了一个占位，
  任何真实云端调用都会抛「需要真实服务空间」，不会返回假数据。因此预览能验证
  布局与交互，**不能验证登录、发布、聊天等需要云端的功能**。
- 它依赖三处针对 uni-app CLI 的适配，原因与依据都写在
  `apps/client-preview/vite.config.js` 的注释里，并在
  `docs/decisions.md` D-10 记录：CLI 的 JS 条件编译只覆盖 `mp-weixin`、
  平台插件集按「工作目录的 package.json 依赖名」加载、预览案缺少 uniCloud。

### 5.1 管理端预览

同一套工具链也能构建管理端，通过 `UNI_INPUT_DIR` 指向 `apps/admin`：

```bash
cd jirun
npm run preview:build:admin   # 编译到 jirun/dist/h5-admin
npm run preview:serve:admin   # 启动本地服务，默认 http://127.0.0.1:5181/
```

两点与用户端不同，必须知道：

1. **资源路径带 `/admin/` 前缀**。uni-admin 的 `manifest.json` 把
   `h5.router.base` 设为 `/admin/`，预览服务已按该前缀提供文件，与真实部署一致。
2. **管理端登录依赖云端，预览进不去后台**。uni-admin 先要账号密码登录
   （走 uni-id 云函数），没有服务空间就无法完成，因此预览会停在登录页。
   治理页面可以通过**整页加载带 hash 的地址**直接打开，例如
   `http://127.0.0.1:5181/#/pages/jirun/overview`，
   其余页面同理替换为 `content`／`reports`／`appeals`／`users`／`config`。
   注意：初次加载后再用路由跳转会被登录守卫拦回登录页，需要重新整页加载。
   这只影响预览浏览，不代表后台权限实现有问题——权限判定在服务端。

管理端预览同样**不能**验证登录、审核落库与菜单数据（菜单来自云端集合）。

## 6. 当前未验证事项

以下事项本机尚无条件执行，未获得任何真实结果：

- 微信小程序编译与真机预览。
- HBuilderX 对 `uni_modules/<name>/uniCloud/` 目录的打包行为。
- uniCloud 服务空间绑定、云函数上传与 schema 生效。
- 微信登录、私有媒体访问控制、uni-im 消息限额（T03 的三项结论）。
