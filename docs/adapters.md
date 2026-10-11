# 工具适配器

`node runtime/math-tool.mjs capabilities` 检测当前 Python、SymPy 与已安装 Lean 工具链；每次执行还会重新检查。输出为 JSON，包含时间、动作、状态、版本或原因。运行结果只针对当前环境。

SymPy 从标准输入读取 JSON AST，不读取任意 Python 代码或文本公式：

```json
{"operation":"factor","expression":{"type":"add","args":[{"type":"pow","base":{"type":"symbol","name":"x"},"exponent":2},{"type":"integer","value":-1}]}}
```

可用 `node runtime/math-tool.mjs sympy < request.json`。AST 节点仅接受 `integer`、`rational`、`symbol`、`add`、`mul`、`pow`；整数、指数、节点数和输入大小有限制。结果附工具版本和精确表达式，仍应与数学命题的假设核对。

Lean：`node runtime/math-tool.mjs lean --file path/to/Main.lean --project path/to/project`。文件必须在项目内且不超过 64 KiB；适配器不安装 Lean 或 Mathlib，不允许命令拼接。Lean 源码可包含可执行元程序，只运行自己信任的项目文件；当前适配器只有超时限制，没有完整进程隔离或内存限额。输出 `checker_passed` 表示当前文件通过编译且未检测到明显占位或新增公理/常量；自然语言命题对应、宏和传递依赖仍需人工核查后才可称 Formally Checked。当前版本的占位扫描是保守文本检查，不是完整 Lean 语法审计。

其他适配器状态见 `adapters/registry.json`。宿主提供的检索、文献或知识库工具要分别验证连接、授权与调用结果。
