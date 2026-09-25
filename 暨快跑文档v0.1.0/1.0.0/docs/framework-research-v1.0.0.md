# 暨快跑 1.0.0：可复用框架与技术选型研究

研究日期：2026-09-25。仅使用官方文档与项目维护者仓库。本文是选型建议，不代表已经完成集成或性能验证；开工时应锁定依赖版本并验证微信真机与 H5。

## 1. 结论与选择条件

**建议：普通 uni-app Vue3 + JavaScript + uniCloud + uni-id-pages + uni-admin，有限复用 uni-im；微信小程序优先，后续适配 H5。** 用户已明确没有技术偏好，以尽快上线为主，因此主推路线 A，Java 路线保留为备选。uni-app 官方仓库说明其支持 Web 和微信小程序，并将普通 Vue3 与 uni-app x 区分为不同分支，因此选型时应明确使用普通 Vue3 生态。[官方仓库](https://github.com/dcloudio/uni-app)

| 路线 | 建议适用情况 | 可复用的基础能力 | 项目仍需实现 |
| --- | --- | --- | --- |
| A：uni-app Vue3 + uniCloud + uni-id-pages + uni-admin + uni-im | 从零开始、熟悉 Vue/JS、希望减少首版基础设施工作 | 登录与账户、管理后台权限、会话与聊天基础 | 三类信息业务、校园身份规则、互动、审核复核、一条陌生私聊限制 |
| B：uni-app Vue3 + Spring Boot + RuoYi-Vue-Plus 或 RuoYi-Vue | 熟悉 Java，已有后台或部署环境，希望自行管理业务数据 | 后台登录权限、菜单字典、日志、CRUD 生成；Plus 还提供文件与 WebSocket 基础能力 | 小程序账户接入、用户端页面、校园业务、完整私聊消息模型与治理 |

表中的基础能力依据分别为 [uni-id](https://doc.dcloud.net.cn/uniCloud/uni-id/summary.html)、[uni-admin](https://doc.dcloud.net.cn/uniCloud/admin)、[uni-im](https://doc.dcloud.net.cn/uniCloud/uni-im)、[RuoYi-Vue-Plus](https://github.com/dromara/RuoYi-Vue-Plus)、[RuoYi-Vue](https://gitee.com/y_project/RuoYi-Vue)。适用条件与剩余开发范围为针对本项目的工程判断。

**建议不要为了首版速度同时维护两套业务后端。** 路线 A 统一采用 uni-id 账户；路线 B 将校园业务放在 Java 单体应用内，以业务模块组织，不因框架支持而引入微服务、多租户和复杂工作流。若已有 Java 项目，应优先评估复用该项目。

## 2. 路线 A：云端一体，复用程度高

- **事实：** uni-id 提供账户管理、token、角色权限；uni-id-pages 包含登录、注册、头像等页面，并配套云对象。uni-admin 复用同一账户体系。[uni-id 文档](https://doc.dcloud.net.cn/uniCloud/uni-id/summary.html)
- **事实：** uni-admin 提供管理员入口、用户/角色/权限管理、动态菜单和数据表管理代码生成工具。[uni-admin 文档](https://doc.dcloud.net.cn/uniCloud/admin)
- **事实：** uni-im 提供前后端聊天系统，基于 uniCloud 与 uni-push。接入现有 Vue3 + uni-id 项目时可沿用账户；微信小程序的扩展插件需要按文档处理动态组件静态化。[uni-im 文档](https://doc.dcloud.net.cn/uniCloud/uni-im)
- **建议：** 用户端基础组件优先使用 uni-ui，信息卡片、筛选条、发布表单和公益提示自行封装；uni-ui 官方定位为 uni-app 跨端组件库。[uni-ui 官方仓库](https://github.com/dcloudio/uni-ui)

建议工程划分：用户端应用、uni-admin 管理端、共享云函数/云对象及数据库规则。框架承担账户与基础设施；业务代码负责信息生命周期、可见性、举报、复核和私聊授权。

**快速基座：** uni-starter 官方提供移动用户端模板，集成 uni-id-pages、个人中心、设置和登录拦截等，可在 HBuilderX 新建项目时选择；官方也允许在独立项目直接导入 uni-id-pages。[uni-starter 文档](https://doc.dcloud.net.cn/uniCloud/uni-starter)、[uni-id 接入方式](https://doc.dcloud.net.cn/uniCloud/uni-id/summary.html)

**建议：** 先用 uni-starter 普通 Vue3 模板验证微信登录与 H5 构建；按项目需要保留账户和设置部分，移除积分营销、广告、App 下载引导等不适用入口。若模板附带功能裁剪成本高，就使用普通 Vue3 空项目导入 uni-id-pages 和 uni-ui。模板并不是三类校园业务的现成成品，仍需适配页面与权限。

## 3. 路线 B：Java 后端，适合已有积累

**事实：** RuoYi-Vue 提供 Spring Boot 后端、Vue 管理端、权限与日志等管理能力及 CRUD 生成；官方同时维护多种后端分支和 Vue 前端选择。[官方仓库](https://gitee.com/y_project/RuoYi-Vue)

**事实：** RuoYi-Vue-Plus 是独立改造路线，官方说明与原框架不兼容，集成 Sa-Token、MyBatis-Plus、文件存储、WebSocket 等能力；这些基础能力并不等于现成的校园信息与聊天产品。[官方仓库](https://github.com/dromara/RuoYi-Vue-Plus)

**建议：** 已熟悉 Spring Security/若依原版就复用 RuoYi-Vue；新建且熟悉 Sa-Token/MyBatis-Plus 可选 Plus。选择一套框架并锁定稳定分支，不混用两者插件和权限代码。客户端普通学生与后台管理员分开建模，不能直接把后台系统用户表当作完整校园用户体系。

建议组合：uni-app Vue3 + uni-ui；Java 单体 API；MySQL；按所选框架需要配置缓存；对象存储承载图片视频；管理端沿用对应 Vue3 后台。发布、评论、举报等可以借助代码生成建立基础列表，但审核状态机和权限不能由通用 CRUD 替代。

**聊天选择需明确：** 可以自建消息表、会话表与实时通道；也可以接入 uni-im。后者即使主后端使用 Java，其 IM 服务仍需运行在 uniCloud，并完成身份映射与服务间通信，不是把 uni-im 服务源码搬进 Spring Boot。[uni-im 部署说明](https://doc.dcloud.net.cn/uniCloud/uni-im)

## 4. 不能直接交给前端或模板的业务

以下均为本项目的实现建议：

1. **陌生私聊一条限制：** 在服务端消息入口检查是否已获回复、是否拉黑、是否被禁言；首条发送与额度占用应原子完成，重试使用幂等键。更换信息入口、重复点击或并发请求不能绕过限制。需要进一步明确“回复后永久解锁”还是其他规则，不能仅根据前端按钮状态判断。
2. **发布审核：** 图文、视频、评论分别记录审核状态；未通过或未完成审核的媒体不进入公开列表；审核回调与人工复核均需鉴权、幂等及操作记录。
3. **下架与投诉：** 用户下架、管理员下架、举报待处理、复核结论分别存储；列表、详情和分享入口统一执行可见性规则。
4. **互动计数：** 点赞、收藏、关注建立唯一关系与重复请求处理；计数不能信任客户端上传值。
5. **公益边界：** 信息中允许填写用户协商价格/报酬，页面说明平台不收取任何费用；不引入平台支付、抽成、结算与交易订单表。

**事实与限制：** uni-sec-check 提供文字、图片检测封装，目前文档列出的 provider 是微信；只能在云函数/云对象内使用，微信 V2 对用户 openid 和近期小程序访问有要求，图片存在异步结果。因此不能默认 H5、视频也已被同一个插件完整覆盖。[内容安全模块文档](https://doc.dcloud.net.cn/uniCloud/uni-sec-check.html)

**建议：** 微信首版对接适用的内容安全能力，保留人工审核与举报复核。视频首版可进入私有待审区，由授权管理员通过临时凭证查看并人工审核后发布；访问控制必须覆盖文件链接，不能只在列表隐藏。若审核量较大，则接入支持视频的商业内容审核 API，补充异步结果、失败重试与人工复核。H5 上线前验证对应供应商支持，不将“上传成功”等同于“审核通过”。

## 5. 许可证与实际运行费用

| 组件 | 本次核实结果 | 采用时的处理 |
| --- | --- | --- |
| uni-app | 官方仓库列有 Apache-2.0 及其他许可文件，且普通 Vue3 与 x 分支不同 | 按实际锁定分支和发行产物核对许可，不将全部 DCloud 产品概括成同一种许可证。[官方仓库](https://github.com/dcloudio/uni-app) |
| uni-ui | 官方 LICENSE 为 Apache 2.0 | 保留相应许可与声明。[LICENSE](https://raw.githubusercontent.com/dcloudio/uni-ui/master/LICENSE) |
| uni-admin | 官方明确 MIT | 保留版权及许可声明。[官方说明](https://doc.dcloud.net.cn/uniCloud/admin) |
| uni-id / uni-id-pages | 官方称相关组成开源；本次未取得每个下载模块的完整许可证文本 | 开工下载时逐项登记 LICENSE；不推定整套都是 MIT。[官方说明](https://doc.dcloud.net.cn/uniCloud/uni-id/summary.html) |
| uni-im | 使用自定义源码许可，限定在 DCloud 产品体系内使用源码 | 不把其源码迁出 uni-app/uniCloud；与 Java 通过接口集成。[插件许可协议](https://ext.dcloud.net.cn/plugin?name=uni-im) |
| RuoYi-Vue-Plus | 本次核实 5.X 分支为 MIT | 保留版权及许可；依赖另行遵守各自许可。[LICENSE](https://github.com/dromara/RuoYi-Vue-Plus/blob/5.X/LICENSE) |
| RuoYi-Vue | 官方仓库标示 MIT | 按选定分支保留许可。[官方仓库](https://gitee.com/y_project/RuoYi-Vue) |

**事实：** uniCloud 有免费空间和付费套餐/按量计费，免费资源存在额度与续期等条件；不能保证生产项目永久免费。[计费文档](https://doc.dcloud.net.cn/uniCloud/price)

**建议：** “平台对用户免费”与“运营方基础设施零成本”分开表述。无论哪条路线，都需预留服务器/云函数、数据库、对象存储、视频流量、备份、可能的短信与审核费用。先设资源上限、媒体大小/时长限制和账单告警，再试运营；不以尚未测量的访问量给出固定月费或开发工期承诺。

## 6. H5-only 备选与落地验证

**事实：** Vant 是移动 Web 的 Vue 组件库，采用 MIT；微信原生组件是另一个 Vant Weapp 项目。[Vant 官方仓库](https://github.com/youzan/vant)

**建议：** 仅做 H5 时可选 Vue3 + Vant + Java 后端，但当前已明确微信小程序优先，首版不另做一套 Vant H5，优先复用 uni-app 页面并处理平台差异。

正式开发前用一条纵向流程验证所选路线：微信登录 → 上传图片 → 审核 → 发布 → 第二个用户发起一条私聊 → 连续发送被服务端拒绝 → 对方回复 → 后台举报复核。随后补测视频异步审核、重复请求、掉线重连、拉黑/下架和 H5 登录差异。

当前已按“无技术偏好、尽快上线”确定主推路线 A。落地仍需明确每月运营预算、首批视频量与人工审核人手，以确定视频审核方式和资源额度；这些不阻碍先验证上述基础流程。
