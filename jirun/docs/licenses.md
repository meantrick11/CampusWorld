# 许可证与来源记录

核验日期：2026-09-25。仅记录本机实际读取到的内容，不推测未声明的授权。

## 1. 应用工程

| 组件 | 来源 | 许可 | 证据 |
|---|---|---|---|
| uni-starter（用户端） | <https://github.com/dcloudio/uni-starter> | Apache License 2.0 | 仓库根 `apps/client/LICENSE` 首行为 `Apache License Version 2.0` |
| uni-admin（管理端） | <https://github.com/dcloudio/uni-admin> | MIT | 仓库根 `apps/admin/LICENSE` 声明 `MIT License, Copyright (c) 2020 DCloud` |

## 2. 明确声明许可证文件的模块

在 `uni_modules` 内只有以下模块自带许可证文件：

| 模块 | 位置 | 许可 |
|---|---|---|
| qiun-data-charts | `apps/admin/uni_modules/qiun-data-charts/license.md` | Apache License 2.0 |
| Sansnn-uQRCode | `apps/client/uni_modules/Sansnn-uQRCode/license.md` | Apache License 2.0 |

## 3. 未声明 license 字段的模块

其余 `uni_modules` 模块（含 uni-id-pages、uni-id-common、uni-ui、
uni-config-center 等）的 `package.json` **未声明 `license` 字段**，仅通过
`dcloudext.sale` 声明源码与常规授权标价为 `0.00`。这表示从 DCloud 插件
市场免费获取，但不等同于仓库内存在明确的开源许可文本。

**上线前需要落实**：由项目负责人确认这些模块的授权范围与商用条件，
并补充到本文件。在此之前不得假定其授权等同 MIT 或 Apache-2.0。

## 4. 禁止引入的来源

按计划要求，禁止下载来源不明的校园商城成品或同类成品模板。本项目只使用
DCloud 官方 GitHub 仓库与官方插件市场分发的模块。

## 5. 依赖与许可复核时机

- 每次升级 `uni_modules` 版本时重新核对本文件。
- 正式发布前复核一次，并记录复核人。
