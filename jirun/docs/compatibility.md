# 框架与工具链版本清单

核验日期：2026-09-25。所有条目均由本机实际执行命令得出，未凭记忆填写。

## 1. 基础工程

| 工程 | 来源 | 分支 | 版本 | 提交 | manifest vueVersion | 许可 |
|---|---|---|---|---|---|---|
| `apps/client` | <https://github.com/dcloudio/uni-starter> | `v2` | 2.2.17 | `f32b26cda8b1e55822d1bd42264a9abdaf93fc2f` | 3 | Apache-2.0 |
| `apps/admin` | <https://github.com/dcloudio/uni-admin> | `master` | 3.0.0 | `d4545b087e9b585c06f14f5f22d5452d75bb9a41` | 3 | MIT |

核验方式：`git clone --branch <分支> --depth 1` 后读取 `package.json`、
`manifest.json` 与 `LICENSE`；克隆时带入的嵌套 `.git` 已移除，使两个工程
纳入同一仓库统一版本管理。

选型说明：

- 选用 `uni-starter` 的 `v2` 分支而非 `v1`，因为只有 `v2` 的
  `manifest.json` 声明 `"vueVersion": "3"`，符合计划的 Vue 3 要求。
- 选用 `uni-admin` 的 `master` 分支而非 `dev`，因为 `dev` 分支为
  2.4.1 且声明 `"vueVersion": "2"`，与计划冲突。
- 两个工程均为 **HBuilderX 工程**，`package.json` 不含 npm 依赖声明，
  由 HBuilderX 内置编译器构建；根 `package.json` 只承载验证命令。

## 2. 模板自带的关键依赖

以下版本来自 `apps/client/uni_modules/<name>/package.json`。

| 模块 | 版本 | 供应商标价 | 用途 |
|---|---|---|---|
| uni-id-pages | 1.1.27 | 0.00 | 账号、登录、个人资料 |
| uni-id-common | 1.0.19 | 0.00 | 账号公共逻辑（云函数公共模块） |
| uni-ui | 1.4.27 | 0.00 | 基础 UI 组件库 |
| uni-config-center | 0.0.3 | 0.00 | 云端配置中心 |

`uni_modules` 内的模块由 DCloud 插件市场分发，`package.json` 未声明
`license` 字段，仅声明标价为 0.00 元。完整许可证清单见
[licenses.md](licenses.md)。

## 3. 本机工具链

| 工具 | 状态 | 版本 |
|---|---|---|
| git | 可用 | 2.52.0.windows.1 |
| Node.js（bash 环境） | 可用 | v22.16.0 |
| npm | 可用 | 10.9.2 |
| HBuilderX | **未安装** | — |
| 微信开发者工具 | **未安装** | — |
| uni-im | **未获取** | 仅 DCloud 插件市场分发，官方 GitHub 仓库未包含 |

## 4. 未验证事项

计划要求「验证 uni-starter 能否使用当前 Vue 3 与 uni-id-pages／uni-im」
以及「确认云公共模块可被部署打包」。这两项需要 HBuilderX 与云空间，
本机均不具备，因此：

- `uni_modules/<模块>/uniCloud/` 目录的打包与部署行为**未验证**。
- 微信小程序编译产物路径**未验证**（`setup.md` 中标注为预期路径）。
- uni-im 的兼容性与服务端扩展点**未验证**（T03 内容）。

不得将上述未验证项记为已通过。
