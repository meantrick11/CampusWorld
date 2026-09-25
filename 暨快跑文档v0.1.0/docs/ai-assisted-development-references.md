# AI 辅助开发：一手资料摘记

核验日期：2026-09-24。以下区分厂商工程建议与安全开发框架，不将它们称为统一的“AI 编程世界标准”。

1. **生成代码仍需人工判断。** GitHub 明确指出，Agent 可能生成看似合理但语义、语法或开发意图不正确的代码；代码审查模型也可能漏报或误报。生成结果应经审查和测试，AI 审查用于补充人工审查。适用限制：这是 Copilot 的责任使用说明，不能据此量化所有模型的错误率。[GitHub 官方说明](https://docs.github.com/en/copilot/responsible-use/agents)

2. **上下文应重相关性与密度。** Anthropic 将上下文视为有限资源，建议寻找足够精简且高信号的信息集合，并随任务进展管理进入上下文的信息。实践推论：提供需求、真实入口、接口约束和测试命令，比堆积无关文档更有价值。限制：这是工程指导，不代表所有任务都应缩短输入。[上下文工程](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

3. **Agent 必须接受环境反馈。** Anthropic 建议执行过程中利用工具返回、代码运行等事实评估进展，设置人工检查点或停止条件；自主执行存在误差累积风险。实践推论：分段交付应附实际运行结果，不能只看“已完成”的自述。限制：具体拆分粒度需按任务决定。[构建有效 Agent](https://www.anthropic.com/engineering/building-effective-agents)

4. **先用简单流程，再按证据增加复杂度。** 同一文章建议从简单方案出发，只有复杂度确实改善结果时才增加编排；明确成功标准、反馈闭环与人工监督有助于发挥 Agent 价值。限制：这不是强制要求每次编码都启用多 Agent、复杂 Skills 或长篇规格。[构建有效 Agent](https://www.anthropic.com/engineering/building-effective-agents)

5. **需求、审查、测试结果应可追溯。** NIST SSDF 1.1 的 PO.1 要求识别并维护安全需求；PW.7 覆盖代码审查/分析；PW.8.2 要求确定测试范围、设计并执行测试、记录结果和发现的问题。限制：SSDF 是安全软件开发框架，既非 AI 专用流程，也不保证业务正确性；文中规格—实现—测试对应表是方法论延伸。[NIST 出版页面](https://csrc.nist.gov/pubs/sp/800/218/final) · [原文 PDF](https://nvlpubs.nist.gov/nistpubs/specialpublications/nist.sp.800-218.pdf)
