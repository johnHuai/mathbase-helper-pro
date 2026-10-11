# 能力状态 · 2.0.2

“Available”表示技能工作流、接口和检查规则已交付，不保证模型每次回答正确；每个具体结论仍需检查。

| 能力 | 状态 | 实际边界 |
| --- | --- | --- |
| Math Orchestrator、MathTutor、ProofForge、ProofAudit | Available | 技能路由与证明工作流；独立审查是逻辑复核，不是独立模型或机器认证。 |
| MathPath、KnowledgeGraph | Available | 可依据随包示例图及用户资料生成路线；随包图谱仅是小规模样例。 |
| MathWrite、ConjectureLab、PaperLab、ResearchStudio | Available | 内容工作流；外部检索、资料保存依宿主工具与授权，不含后台服务。 |
| MathCompute、FormalMath、MathVisual | Experimental | 本地受限适配器与模板；可用性逐环境检测。无 Python、SymPy、Lean、绘图库时不可运行对应操作。 |
| 12 个领域包 | Experimental | 分类、先修与风险元数据；不代表完备专业定理知识库。 |
| Obsidian、Zotero | Unsupported | 无内置授权连接；仅通过宿主已经连接且用户指定的数据源协作。 |
| 自动后台追踪、交互网站、MCP 数学服务器 | Planned | 未实现，不应暗示已部署。 |

工具执行状态由 `runtime/math-tool.mjs` 真实返回。文献与外部应用通过宿主能力使用，不因本插件声明了适配器就视为已连接。
