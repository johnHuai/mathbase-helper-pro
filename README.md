# MathBaseHelper Next 2.0.1

**Learn Mathematics. Prove Rigorously. Explore the Unknown.**

这是原 `mathbase-helper-pro` 插件的架构重构版本，保留插件包名与账号身份；显示名称改为 MathBaseHelper Next。面向高年级本科生、研究生及研究者，默认中文，公式使用 LaTeX。当前发行是技能工作流与受限本地适配器，不包含独立模型、云端数学服务器或完整数学百科。

## 开始使用

在宿主启用本插件，直接描述数学任务。总入口会依据目标选择工作流；明确指定模块时优先。示例：

- “解释控制收敛定理的条件，给一个反例，再安排后续练习。”→ MathTutor、MathPath。
- “证明这个命题，随后逐条审查证明义务。”→ ProofForge、ProofAudit。
- “审查我的 Lean 定理与原题是否一致，实际检查代码。”→ FormalMath；需已有 Lean 环境和文件。
- “精读这篇论文的主定理及证明，并保存到我指定的研究目录。”→ PaperLab、ResearchStudio；文献和目录须实际可访问。

`math.solve`、`math.prove`、`math.audit`、`math.learn`、`math.compute`、`math.visualize`、`math.paper`、`math.research`、`math.path`、`math.knowledge` 是可在自然语言中使用的入口名；本包没有注册同名按钮或 API。

## 当前能力

| 组件 | 状态 | 说明 |
| --- | --- | --- |
| 调度、教学、证明、审查 | Available | 任务路由、Proof Protocol v2、独立逻辑审查。 |
| 论文、猜想、学习路线、研究记录、写作、知识图谱 | Available | 工作流与数据结构；外部搜索和保存取决于宿主能力与授权。 |
| 计算、Lean、可视化 | Experimental | 随包适配器与流程；只有工具实际存在且运行成功才报告结果。 |
| 十二个专业领域包 | Experimental | 路由、先修与风险元数据；不是完整定理库。 |
| Obsidian、Zotero | Unsupported | 无内置连接；可与宿主中另行授权的连接器协作。 |
| 后台进展监控、MCP 数学服务、交互网站 | Planned | 当前未部署。 |

Proof Protocol v2 依次核对题意与条件、选择策略、构建证明、独立审查、按需工具验证。证据状态分为 Unverified、Draft Proof、Reviewed Proof、Computation Supported、Formally Checked；计算支持与形式化认证并非同一等级轴。有限数值检验不证明一般命题；`sorry`、额外公理与被弱化的形式命题不得作为完成证明。

## 本地工具

需要 Node.js 才能使用随包命令行适配器。它不自动安装依赖，也不执行任意用户 Python 字符串。先运行：

```sh
node runtime/math-tool.mjs capabilities
```

SymPy 操作读取受限 JSON 表达式树；支持 `factor`、`expand`、`simplify`、`diff`、`integrate`。请求示例在 [适配器文档](docs/adapters.md)。Lean 检查要求现有项目与项目内 `.lean` 文件；工具退出成功、命题对应和依赖审查需要分别报告。没有 Python 或已安装 Lean 工具链时相应状态为 `unavailable`。

## 数据与隐私

随包 `knowledge/learning-graph.json` 仅是八节点教学示例。研究记录模板和 schema 在 `templates/`、`schemas/`。用户研究数据必须保存在用户指定的目录或已授权知识库；插件不会自动读取 Vault、安装软件、上传私有文件或删除旧笔记。公开源码不含用户研究资料或密钥。

## 开发与扩展

- 调度与共同约束：`skills/mathbase-helper/SKILL.md`。
- 十二个工作流：`skills/<module>/SKILL.md`；按需加载，不把所有规则塞进一个提示词。
- 领域元数据：`domains/index.json` 和同名 JSON 包；新包遵守 `docs/domain-interface.md`。
- 工具接口：`adapters/registry.json` 与 `runtime/`；调用前探测，结构化报告版本、输入、状态、结果和错误。
- 质量门禁：`tests/` 与 `docs/verification.md`。运行 `node tests/validate.mjs`；还可运行 `node tests/runtime.test.mjs` 测试本地适配器边界。

本次重构删除了旧的十六个独立模式入口，改为十二个可组合工作流。旧版资料留在历史发行包中，当前插件不再路由到旧模式。版本与能力状态见 [变更记录](CHANGELOG.md)。

