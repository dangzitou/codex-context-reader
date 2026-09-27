# Codex Context Reader

把 Plus/Pro 的普通 Chat 用于只读项目分析，把 Codex 额度留给改代码和跑测试。Codex Context Reader 是一个只读 [MCP](https://modelcontextprotocol.io/) 服务，通过私有 Tunnel 让 ChatGPT 网页聊天按需读取用户选定的项目。

它只返回项目概览、搜索结果和有限文件片段，减少无关上下文和 token 消耗。实际消耗取决于模型和提问。

> **ChatGPT 网页版要求。** 用桌面浏览器打开 **插件 → 添加 → 创建 MCP 应用**。能看到此入口即可创建私有 Tunnel 连接。OpenAI 文档还写有 **设置 → 账户安全与登录 → Developer mode**，实际入口可能因账号或界面版本不同。[OpenAI Developer mode 文档](https://developers.openai.com/api/docs/guides/developer-mode)

[English](README.md) · [安装](#安装与-chatgpt-网页端配置) · [安全](#安全与数据边界) · [贡献](CONTRIBUTING.md)

## 安装与 ChatGPT 网页端配置

### 可选：让本机编程助手准备连接

将下面整段发送给保存项目的电脑上的编程助手。它会完成安装、测试和私有 Tunnel 准备；账户设置和隐藏输入密钥由你完成。

```text
请在这台电脑上配置 https://github.com/dangzitou/codex-context-reader，让普通 ChatGPT 网页聊天通过 Secure MCP Tunnel 只读访问项目。请谨慎执行，只做必要改动。

1. 判断当前系统是 macOS、Linux 还是 Windows；修改前检查目标目录。macOS/Linux 使用 ~/codex-context-reader，Windows 使用 %USERPROFILE%\codex-context-reader。不要覆盖无关文件。
2. 确保 Node.js 18+、Git 和 ripgrep 可用。运行 npm test。
3. 提示我用桌面浏览器打开 chatgpt.com，检查 插件 → 添加 → 创建 MCP 应用。若没有，再检查文档所述的 设置 → 账户安全与登录 → Developer mode。两个入口都没有时停止 ChatGPT-Tunnel 配置。
4. 我确认可以创建 MCP 应用后：从 OpenAI 官方发布页或 Platform Tunnel 页面下载 tunnel-client，用官方 SHA-256 清单校验，并放在用户拥有的本地目录；不要放进本仓库。
5. 如果我提供 tunnel_id，运行 npm run chat:tunnel -- --configure --tunnel-id <tunnel_id>；如果没有，告诉我先在 Platform 创建 Tunnel。绝不创建、索取、打印、保存或把 API key 粘贴到聊天、文件、Git、Shell 历史或日志中。
6. 告诉我唯一需要在我自己终端运行的命令：npm run chat:tunnel -- --prompt-key。除非我已在本机通过隐藏输入方式输入 runtime key，否则不要启动 Tunnel。
7. 客户端 ready 后，告诉我在 ChatGPT 插件中创建 MCP 应用：名称填 Project Context Reader，连接选隧道和对应 tunnel_id，此服务的身份验证选无需身份验证；创建并连接后检查绿色“已连接”，再用无敏感信息的测试项目在普通 Chat 中实际调用工具。

不要把本地项目暴露到公网，也不要修改任何供读取的项目文件。
```

### 必须由你自己完成的步骤

| 操作 | 原因 |
| --- | --- |
| 用桌面浏览器打开 [chatgpt.com](https://chatgpt.com)，检查 **插件 → 添加 → 创建 MCP 应用** | ChatGPT 账号需要提供自定义 MCP 应用创建入口。 |
| 在 [Platform Tunnel 设置](https://platform.openai.com/settings/organization/security/tunnels) 创建 Tunnel | 它属于你的 OpenAI 组织和 ChatGPT workspace。 |
| 创建 runtime API key，并在本机终端输入 | 它是凭据；启动器隐藏输入且不会保存。 |
| 在 ChatGPT Plugins 中创建 Tunnel 连接 | 这会修改你的 ChatGPT 账户设置。 |

若没有 **创建 MCP 应用**，再检查 [OpenAI 文档中的 Developer mode 设置](https://developers.openai.com/api/docs/guides/developer-mode)：**设置 → 账户安全与登录**。两个入口都没有时，当前账号无法使用这套 ChatGPT 网页端连接方式；重启 Tunnel 无法让缺失的功能出现。

### 安装并测试服务

依赖：Node.js 18+、Git 和 [`ripgrep`](https://github.com/BurntSushi/ripgrep)；Git 上下文为可选能力。还需按 [OpenAI Tunnel 官方文档](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)安装 `tunnel-client`，校验官方 SHA-256，并将其加入 `PATH`（或在两条启动命令中都用 `--client` 指定可执行文件的绝对路径）。

macOS/Linux：

```sh
git clone https://github.com/dangzitou/codex-context-reader.git "$HOME/codex-context-reader"
cd "$HOME/codex-context-reader"
npm test
```

Windows PowerShell：

```powershell
git clone https://github.com/dangzitou/codex-context-reader.git "$env:USERPROFILE\codex-context-reader"
Set-Location "$env:USERPROFILE\codex-context-reader"
npm test
```

如果仓库已经克隆，直接进入现有目录即可。

### 启动私有 Tunnel

安装服务、确认可创建 MCP 应用且获得 `tunnel_id` 后，首次配置 profile：

```sh
cd "$HOME/codex-context-reader"
npm run chat:tunnel -- --configure --tunnel-id "你的-tunnel-id"
```

Windows PowerShell：

```powershell
Set-Location "$env:USERPROFILE\codex-context-reader"
npm run chat:tunnel -- --configure --tunnel-id "你的-tunnel-id"
```

每次在 ChatGPT 网页端使用时，运行：

```sh
npm run chat:tunnel -- --prompt-key
```

该命令会隐藏输入 key，key 只存在于启动后的进程环境中。启动前会执行 `doctor --explain`；保持终端打开，看到 `ready` 后再使用 Chat。

### 在 ChatGPT 网页端添加连接

1. 在 [chatgpt.com](https://chatgpt.com) 打开 **插件 → 添加 → 创建 MCP 应用**。
2. 名称填 **Project Context Reader**；**连接**选 **隧道**，选择或粘贴 `tunnel_id`，下方应出现 `project-context-reader` 标签。
3. **身份验证**选 **无需身份验证**：本地 MCP 服务没有 OAuth 流程，runtime API key 只用于 `tunnel-client` 连接 OpenAI。描述和图标可留空。
4. 勾选风险提示，点击 **创建**，核对发现的工具，然后连接应用。会看到以下连接确认窗口：

![ChatGPT 连接 Project Context Reader 的确认窗口](docs/images/chatgpt-connect.jpg)

5. 确认应用页显示绿色 **已连接**：

![Project Context Reader 在 ChatGPT 中显示已连接](docs/images/chatgpt-connected.jpg)

6. 点击 **在聊天中试用**；若有提示，在普通 Chat 中加入该应用。先用无敏感信息的本地项目测试：

```text
使用 Project Context Reader 读取 /Users/你的用户名/codex-context-reader。依次调用 select_project、project_overview、search_code 和 read_file，结合文件路径总结所见；不要修改文件。
```

把示例中的用户名换成自己的；Windows 使用完整的 `C:\Users\...` 路径。先确认这份仓库副本不含私有数据。在 Chat 的工具调用详情中确认 `select_project`、`project_overview`、`search_code` 和 `read_file` 都成功返回结果。绿色“已连接”只证明连接建立，不证明已经读取项目。项目 ID 30 分钟后失效，届时重新选择项目；使用期间保持 `tunnel-client` 运行。

OpenAI 的 Secure MCP Tunnel 是私有 MCP 的出站连接，不需要开放入站公网端口。[Tunnel 官方文档](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)

## 读取范围

| 工具 | 用途 |
| --- | --- |
| `select_project` | 在用户确认后选择绝对路径，返回随机项目 ID。 |
| `project_overview` | 读取根目录结构、分支、工作区状态和近期提交。 |
| `search_code` | 在选定项目中搜索文本。 |
| `read_file` | 最多读取选定项目文件的 400 行。 |
| `git_context` | 读取 Git 状态、差异摘要和近期提交。 |

## 安全与数据边界

- 解析符号链接后，读取仍被限制在已选择目录内。
- 项目 ID 随机生成，仅保存在内存中；30 分钟后或服务停止时失效。
- `read_file` 会拦截 `.git`、依赖目录、输出目录、`.env*`、证书和常见密钥文件；`search_code` 目前没有排除所有证书/密钥扩展名，修复前只使用无敏感信息的仓库。
- 服务不修改项目文件，也不执行项目代码。
- 工具结果会成为 ChatGPT 上下文，只能用于组织允许对外提供的仓库。
- Secure MCP Tunnel 为纯出站连接，不开放入站端口，也不会把项目发布到公网。

## 开发

```sh
npm test
```

测试覆盖 MCP 初始化、项目选择、项目 ID 限定读取、路径穿越拒绝和 Tunnel 启动参数生成。

## 许可证

[MIT](LICENSE) © Deng Zitao
