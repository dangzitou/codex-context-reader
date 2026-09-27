# Codex Context Reader

A read-only [Model Context Protocol](https://modelcontextprotocol.io/) server that lets ChatGPT or Codex inspect a user-selected local project without pasting an entire repository into the conversation.

It returns only a project overview, search matches, and bounded file excerpts. This reduces unrelated context and token use. Actual usage depends on the model and request.

> **ChatGPT web requirement.** In a desktop browser, check **Plugins → Add → Create MCP app**. If this option is available, you can create a private Tunnel connection. OpenAI also documents a Developer mode setting under **Settings → Security and login**; the visible entry point may differ by account and UI version. [OpenAI Developer mode](https://developers.openai.com/api/docs/guides/developer-mode)

[中文](#中文) · [Install](#install-and-chatgpt-web-setup) · [Security](#security) · [Contributing](CONTRIBUTING.md)

## Install and ChatGPT web setup

### Recommended: give this prompt to a local Codex agent

Paste this into a **local Codex agent** on the computer that contains the project. It installs, tests, and prepares the private Tunnel. Account settings and the hidden key stay with you.

```text
Set up https://github.com/dangzitou/codex-context-reader on this computer for read-only use with Codex and, if available, regular ChatGPT web. Make the smallest necessary changes.

1. Detect macOS, Linux, or Windows. Inspect the target before changing it. Clone or update the repository at ~/plugins/project-context-reader on macOS/Linux, or %USERPROFILE%\plugins\project-context-reader on Windows. Do not overwrite unrelated files.
2. Ensure Node.js 18+, Git, and ripgrep are available. Run npm test and npm run install:plugin. Verify codex plugin list shows project-context-reader@personal as installed and enabled.
3. Tell me to open chatgpt.com in a desktop browser and check Plugins → Add → Create MCP app. If unavailable, check the documented Developer mode setting under Settings → Security and login. If neither entry is available, stop the ChatGPT-Tunnel setup; the local Codex plugin can still be used.
4. Once I confirm MCP app creation is available: download tunnel-client only from the official OpenAI release or Platform Tunnel page, verify SHA-256 against the official checksum, and keep it in a user-owned local directory. Do not put it in this repository.
5. If I provide a tunnel_id, run npm run chat:tunnel -- --configure --tunnel-id <tunnel_id>. Otherwise tell me to create a Tunnel in Platform. Never create, request, print, store, or paste an API key into chat, files, Git, shell history, or logs.
6. Tell me the one remaining command to run in my own terminal: npm run chat:tunnel -- --prompt-key. Do not start the Tunnel unless I have entered the runtime key locally through that hidden prompt.
7. Once the client is ready, tell me to create an MCP app in ChatGPT Plugins: name it Project Context Reader, select Tunnel and its tunnel_id, choose No Authentication for this server, then create and connect it. Verify the green Connected state and test tool calls in a regular Chat using a nonsensitive sample project.

Do not expose the local project to the public internet. Do not modify any selected project.
```

### What you must do yourself

| Step | Why it stays with you |
| --- | --- |
| Open [chatgpt.com](https://chatgpt.com) in a desktop browser and check **Plugins → Add → Create MCP app** | ChatGPT must offer custom MCP app creation. |
| Create a Tunnel in [Platform settings](https://platform.openai.com/settings/organization/security/tunnels) | It belongs to your OpenAI organization and ChatGPT workspace. |
| Create a runtime API key and enter it in a local terminal | It is a credential; the launcher hides the input and does not save it. |
| In ChatGPT Plugins, create the Tunnel connection | This changes your ChatGPT account settings. |

If **Create MCP app** is unavailable, check the [documented Developer mode setting](https://developers.openai.com/api/docs/guides/developer-mode) under **Settings → Security and login**. If neither entry appears, use the direct local Codex route below; restarting the Tunnel cannot add a missing ChatGPT feature.

### Start the private Tunnel

After the agent has installed the repository, MCP app creation is available, and you have a `tunnel_id`, configure the profile once:

```sh
cd "$HOME/plugins/project-context-reader"
npm run chat:tunnel -- --configure --tunnel-id "your-tunnel-id"
```

Windows PowerShell:

```powershell
Set-Location "$env:USERPROFILE\plugins\project-context-reader"
npm run chat:tunnel -- --configure --tunnel-id "your-tunnel-id"
```

Start it whenever you use ChatGPT web:

```sh
npm run chat:tunnel -- --prompt-key
```

The key input is hidden and stays only in the launched process environment. `doctor --explain` runs before the Tunnel starts. Keep this terminal open and wait until it reports `ready`.

### Add the connection in ChatGPT web

1. At [chatgpt.com](https://chatgpt.com), open **Plugins → Add → Create MCP app**.
2. Set the name to **Project Context Reader**. Under **Connection**, choose **Tunnel** and select or paste your `tunnel_id`; the `project-context-reader` label should appear beneath it.
3. Set **Authentication** to **No Authentication**: this local MCP server has no OAuth flow. The runtime API key authenticates `tunnel-client` separately. A description and icon are optional.
4. Acknowledge the risk notice, choose **Create**, review the discovered tools, and connect the app. This confirmation dialog should appear:

![ChatGPT connection confirmation for Project Context Reader](docs/images/chatgpt-connect.jpg)

5. Confirm that the app page shows a green **Connected** status:

![Project Context Reader connected in ChatGPT](docs/images/chatgpt-connected.jpg)

6. Click **Try in chat**, add the app to a regular Chat if prompted, and test with a nonsensitive local repository:

```text
Use Project Context Reader to read /Users/yourname/plugins/project-context-reader. Call select_project, project_overview, search_code, and read_file, then summarize what you found with file paths. Do not modify files.
```

Replace `yourname` with your username (on Windows, use the full `C:\Users\...` path). Test only if this copy of the repository contains no private data. Check the Chat tool-call details for successful `select_project`, `project_overview`, `search_code`, and `read_file` results. A green Connected badge proves the connection, not that a project was read. The project ID expires after 30 minutes; select the project again when it does. Keep `tunnel-client` running while using Chat.

OpenAI documents Secure MCP Tunnel as an outbound connection for private MCP servers; it does not require an inbound public port. [Tunnel guide](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)

## Direct local use

For Codex Local, Codex CLI, or a local project chat, install the plugin and use `@Project Context Reader`. This is the route to use when ChatGPT web cannot create an MCP app.

### Manual installation

macOS/Linux:

```sh
mkdir -p "$HOME/plugins"
git clone https://github.com/dangzitou/codex-context-reader.git "$HOME/plugins/project-context-reader"
cd "$HOME/plugins/project-context-reader"
npm run install:plugin
```

Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\plugins" | Out-Null
git clone https://github.com/dangzitou/codex-context-reader.git "$env:USERPROFILE\plugins\project-context-reader"
Set-Location "$env:USERPROFILE\plugins\project-context-reader"
npm run install:plugin
```

Requirements: Node.js 18+, Git, and [`ripgrep`](https://github.com/BurntSushi/ripgrep). Git context is optional.

## What it reads

| Tool | Purpose |
| --- | --- |
| `select_project` | Select an absolute local directory after user approval. Returns a random project ID. |
| `project_overview` | Read root structure, branch, working-tree status, and recent commits. |
| `search_code` | Search literal text in the selected project. |
| `read_file` | Return up to 400 lines from a selected-project file. |
| `git_context` | Read Git status, diff summary, and recent commits. |

## Security

- Reads stay within the chosen directory after resolving symlinks.
- Project IDs are random, memory-only, and expire after 30 minutes or when the server stops.
- `read_file` blocks `.git`, dependencies, output directories, `.env*`, certificates, and common key files. `search_code` currently does not exclude every certificate/key extension: use only nonsensitive repositories until this is fixed.
- The server does not modify project files or run project code.
- Tool results become ChatGPT context. Use only with repositories your organization permits you to share.
- Secure MCP Tunnel is outbound-only. It does not open an inbound port or publish the project on the internet.

## Development

```sh
npm test
```

The tests exercise MCP initialization, project selection, token-scoped reads, traversal rejection, and Tunnel-launcher argument generation.

## License

[MIT](LICENSE) © Deng Zitao

---

<a id="中文"></a>

# 中文

Codex Context Reader 是一个只读 [MCP](https://modelcontextprotocol.io/) 服务，让 ChatGPT 或 Codex 在用户确认后按需读取本地项目，不必把整个仓库粘贴到对话里。

它只返回项目概览、搜索结果和有限文件片段，减少无关上下文和 token 消耗。实际消耗取决于模型和提问。

> **ChatGPT 网页版要求。** 用桌面浏览器打开 **插件 → 添加 → 创建 MCP 应用**。能看到此入口即可创建私有 Tunnel 连接。OpenAI 文档还写有 **设置 → 账户安全与登录 → Developer mode**，实际入口可能因账号或界面版本不同。[OpenAI Developer mode 文档](https://developers.openai.com/api/docs/guides/developer-mode)

[安装](#安装与-chatgpt-网页端配置) · [安全](#安全与数据边界) · [贡献](CONTRIBUTING.md)

## 安装与 ChatGPT 网页端配置

### 推荐：把下面提示词交给本机 Codex Agent

将下面整段发送给保存项目的电脑上的 **本机 Codex Agent**。它会完成安装、测试和私有 Tunnel 准备；账户设置和隐藏输入密钥由你完成。

```text
请在这台电脑上配置 https://github.com/dangzitou/codex-context-reader，用于 Codex 和在可用时用于普通 ChatGPT 网页端的只读访问。请谨慎执行，只做必要改动。

1. 判断当前系统是 macOS、Linux 还是 Windows；修改前检查目标目录。macOS/Linux 使用 ~/plugins/project-context-reader，Windows 使用 %USERPROFILE%\plugins\project-context-reader。不要覆盖无关文件。
2. 确保 Node.js 18+、Git 和 ripgrep 可用。运行 npm test 与 npm run install:plugin，并确认 codex plugin list 显示 project-context-reader@personal 已安装且已启用。
3. 提示我用桌面浏览器打开 chatgpt.com，检查 插件 → 添加 → 创建 MCP 应用。若没有，再检查文档所述的 设置 → 账户安全与登录 → Developer mode。两个入口都没有时停止 ChatGPT-Tunnel 配置；本地 Codex 插件仍可使用。
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

若没有 **创建 MCP 应用**，再检查 [OpenAI 文档中的 Developer mode 设置](https://developers.openai.com/api/docs/guides/developer-mode)：**设置 → 账户安全与登录**。两个入口都没有时，先用下面的本地 Codex 方式；重启 Tunnel 无法让缺失的 ChatGPT 功能出现。

### 启动私有 Tunnel

Agent 完成安装、确认可创建 MCP 应用且你获得 `tunnel_id` 后，首次配置 profile：

```sh
cd "$HOME/plugins/project-context-reader"
npm run chat:tunnel -- --configure --tunnel-id "你的-tunnel-id"
```

Windows PowerShell：

```powershell
Set-Location "$env:USERPROFILE\plugins\project-context-reader"
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
使用 Project Context Reader 读取 /Users/你的用户名/plugins/project-context-reader。依次调用 select_project、project_overview、search_code 和 read_file，结合文件路径总结所见；不要修改文件。
```

把示例中的用户名换成自己的；Windows 使用完整的 `C:\Users\...` 路径。先确认这份仓库副本不含私有数据。在 Chat 的工具调用详情中确认 `select_project`、`project_overview`、`search_code` 和 `read_file` 都成功返回结果。绿色“已连接”只证明连接建立，不证明已经读取项目。项目 ID 30 分钟后失效，届时重新选择项目；使用期间保持 `tunnel-client` 运行。

OpenAI 的 Secure MCP Tunnel 是私有 MCP 的出站连接，不需要开放入站公网端口。[Tunnel 官方文档](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)

## 本地直接使用

Codex Local、Codex CLI 或本地项目聊天可直接安装插件并使用 `@Project Context Reader`。ChatGPT 网页端不能创建 MCP 应用时，使用这条路径。

### 手动安装

macOS/Linux：

```sh
mkdir -p "$HOME/plugins"
git clone https://github.com/dangzitou/codex-context-reader.git "$HOME/plugins/project-context-reader"
cd "$HOME/plugins/project-context-reader"
npm run install:plugin
```

Windows PowerShell：

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\plugins" | Out-Null
git clone https://github.com/dangzitou/codex-context-reader.git "$env:USERPROFILE\plugins\project-context-reader"
Set-Location "$env:USERPROFILE\plugins\project-context-reader"
npm run install:plugin
```

依赖：Node.js 18+、Git 和 [`ripgrep`](https://github.com/BurntSushi/ripgrep)；Git 上下文为可选能力。

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
