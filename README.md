# Codex Context Reader

A read-only [Model Context Protocol](https://modelcontextprotocol.io/) server that lets ChatGPT or Codex inspect a user-selected local project without pasting an entire repository into the conversation.

It returns only a project overview, search matches, and bounded file excerpts. This reduces unrelated context and token use. Actual usage depends on the model and request.

> **ChatGPT web requirement.** This server can be used in a regular ChatGPT chat only when that account visibly offers ChatGPT **Developer mode**. OpenAI documents read/fetch MCP support for Pro in Developer mode, but the beta control is not a self-service entitlement for every account. Full MCP actions are for Business, Enterprise, and Edu. This project is read-only. [Official availability](https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt)

[中文](#中文) · [Install](#install-and-chatgpt-web-setup) · [Security](#security) · [Contributing](CONTRIBUTING.md)

## Install and ChatGPT web setup

### Recommended: give this prompt to a local Codex agent

Paste this into a **local Codex agent** on the computer that contains the project. It installs, tests, and prepares the private Tunnel. Account settings and the hidden key stay with you.

```text
Set up https://github.com/dangzitou/codex-context-reader on this computer for read-only use with Codex and, if available, regular ChatGPT web. Make the smallest necessary changes.

1. Detect macOS, Linux, or Windows. Inspect the target before changing it. Clone or update the repository at ~/plugins/project-context-reader on macOS/Linux, or %USERPROFILE%\plugins\project-context-reader on Windows. Do not overwrite unrelated files.
2. Ensure Node.js 18+, Git, and ripgrep are available. Run npm test and npm run install:plugin. Verify codex plugin list shows project-context-reader@personal as installed and enabled.
3. Tell me to open chatgpt.com in a desktop browser. Before any Tunnel work, ask me to check Settings → Apps → Advanced Settings for Developer mode. If that toggle is absent, explain that this account/client does not currently expose the required ChatGPT feature and stop the ChatGPT-Tunnel setup; the local Codex plugin can still be used.
4. Only after I confirm Developer mode is available: download tunnel-client only from the official OpenAI release or Platform Tunnel page, verify SHA-256 against the official checksum, and keep it in a user-owned local directory. Do not put it in this repository.
5. If I provide a tunnel_id, run npm run chat:tunnel -- --configure --tunnel-id <tunnel_id>. Otherwise tell me to create a Tunnel in Platform. Never create, request, print, store, or paste an API key into chat, files, Git, shell history, or logs.
6. Tell me the one remaining command to run in my own terminal: npm run chat:tunnel -- --prompt-key. Do not start the Tunnel unless I have entered the runtime key locally through that hidden prompt.
7. Once the client is ready, tell me to use ChatGPT Plugins → + → Tunnel, choose the tunnel, review the discovered read-only tools, and create the connection. Then show a short read-only planning prompt.

Do not expose the local project to the public internet. Do not modify any selected project.
```

### What you must do yourself

| Step | Why it stays with you |
| --- | --- |
| Open [chatgpt.com](https://chatgpt.com) in a desktop browser and check **Settings → Apps → Advanced Settings → Developer mode** | The ChatGPT desktop/mobile client may not expose this beta setting. |
| Create a Tunnel in [Platform settings](https://platform.openai.com/settings/organization/security/tunnels) | It belongs to your OpenAI organization and ChatGPT workspace. |
| Create a runtime API key and enter it in a local terminal | It is a credential; the launcher hides the input and does not save it. |
| In ChatGPT Plugins, create the Tunnel connection | This changes your ChatGPT account settings. |

If **Developer mode** is not visible on ChatGPT web, do not keep retrying the Tunnel: there is no local setting or Tunnel command that can make it appear, and the account cannot currently attach this custom MCP in ChatGPT. You can still use the direct local Codex route below. OpenAI’s product UI is in beta and may change.

### Start the private Tunnel

After the agent has installed the repository, Developer mode is available, and you have a `tunnel_id`, configure the profile once:

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

1. At [chatgpt.com](https://chatgpt.com), open **Settings → Apps → Advanced Settings** and enable **Developer mode**.
2. Open **Plugins**, choose **+**, choose **Tunnel**, and select or paste your `tunnel_id`.
3. Review the discovered tools and create the connection.
4. Start a regular chat, add the connection from the tools menu, and send:

```text
Use Project Context Reader to read /Users/alex/work/payments-service. First inspect the project and key code, then propose an implementation plan. Do not modify files.
```

ChatGPT selects the directory through `select_project`, returns a short-lived project ID, and uses it for subsequent reads. To switch projects, provide another absolute path in the same chat.

OpenAI documents Secure MCP Tunnel as an outbound connection for private MCP servers; it does not require an inbound public port. [Tunnel guide](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)

## Direct local use

For Codex Local, Codex CLI, or a local project chat, install the plugin and use `@Project Context Reader`. This is the route to use when ChatGPT web does not show Developer mode.

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
- `.git`, dependencies, output directories, `.env*`, certificates, and common key files are blocked.
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

> **ChatGPT 网页版要求。** 普通 ChatGPT 对话只有在账号实际展示 ChatGPT **Developer mode** 时才能使用本服务。OpenAI 文档说明 Pro 可在 Developer mode 中连接 read/fetch MCP，但该 beta 控制并非每个账号都有可自行开启的入口；完整 MCP 操作仅面向 Business、Enterprise 和 Edu。本项目只读。[官方可用性说明](https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt)

[安装](#安装与-chatgpt-网页端配置) · [安全](#安全与数据边界) · [贡献](CONTRIBUTING.md)

## 安装与 ChatGPT 网页端配置

### 推荐：把下面提示词交给本机 Codex Agent

将下面整段发送给保存项目的电脑上的 **本机 Codex Agent**。它会完成安装、测试和私有 Tunnel 准备；账户设置和隐藏输入密钥由你完成。

```text
请在这台电脑上配置 https://github.com/dangzitou/codex-context-reader，用于 Codex 和在可用时用于普通 ChatGPT 网页端的只读访问。请谨慎执行，只做必要改动。

1. 判断当前系统是 macOS、Linux 还是 Windows；修改前检查目标目录。macOS/Linux 使用 ~/plugins/project-context-reader，Windows 使用 %USERPROFILE%\plugins\project-context-reader。不要覆盖无关文件。
2. 确保 Node.js 18+、Git 和 ripgrep 可用。运行 npm test 与 npm run install:plugin，并确认 codex plugin list 显示 project-context-reader@personal 已安装且已启用。
3. 先提示我在桌面浏览器打开 chatgpt.com，并检查 设置 → Apps → Advanced Settings 是否有 Developer mode。若没有，说明此账号或客户端当前未开放所需 ChatGPT 功能，停止 ChatGPT-Tunnel 配置；本地 Codex 插件仍可使用。
4. 仅在我确认 Developer mode 可用后：从 OpenAI 官方发布页或 Platform Tunnel 页面下载 tunnel-client，用官方 SHA-256 清单校验，并放在用户拥有的本地目录；不要放进本仓库。
5. 如果我提供 tunnel_id，运行 npm run chat:tunnel -- --configure --tunnel-id <tunnel_id>；如果没有，告诉我先在 Platform 创建 Tunnel。绝不创建、索取、打印、保存或把 API key 粘贴到聊天、文件、Git、Shell 历史或日志中。
6. 告诉我唯一需要在我自己终端运行的命令：npm run chat:tunnel -- --prompt-key。除非我已在本机通过隐藏输入方式输入 runtime key，否则不要启动 Tunnel。
7. 客户端 ready 后，告诉我在 ChatGPT Plugins → + → Tunnel 中选择 Tunnel，核对发现的只读工具并创建连接；再给出一句简短的只读规划提示词。

不要把本地项目暴露到公网，也不要修改任何供读取的项目文件。
```

### 必须由你自己完成的步骤

| 操作 | 原因 |
| --- | --- |
| 在桌面浏览器打开 [chatgpt.com](https://chatgpt.com)，检查 **设置 → Apps → Advanced Settings → Developer mode** | ChatGPT 桌面端或移动端可能不展示这个 beta 设置。 |
| 在 [Platform Tunnel 设置](https://platform.openai.com/settings/organization/security/tunnels) 创建 Tunnel | 它属于你的 OpenAI 组织和 ChatGPT workspace。 |
| 创建 runtime API key，并在本机终端输入 | 它是凭据；启动器隐藏输入且不会保存。 |
| 在 ChatGPT Plugins 中创建 Tunnel 连接 | 这会修改你的 ChatGPT 账户设置。 |

若在 ChatGPT 网页版也看不到 **Developer mode**，不要继续反复尝试 Tunnel：本机设置或 Tunnel 命令都无法让它出现，该账号当前不能在 ChatGPT 中挂载这个自定义 MCP。此时仍可用下面的本地 Codex 方式。OpenAI 的产品 UI 仍在 beta，后续可能变化。

### 启动私有 Tunnel

Agent 完成安装、Developer mode 可用且你获得 `tunnel_id` 后，首次配置 profile：

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

1. 在 [chatgpt.com](https://chatgpt.com) 打开 **设置 → Apps → Advanced Settings**，开启 **Developer mode**。
2. 打开 **Plugins**，点击 **+**，连接方式选 **Tunnel**，选择或粘贴 `tunnel_id`。
3. 核对发现的工具并创建连接。
4. 新建普通 Chat，在工具菜单添加该连接，发送：

```text
使用 Project Context Reader 读取 /Users/你的用户名/work/项目名。先了解项目结构和关键代码，再给我实施方案；不要修改文件。
```

ChatGPT 会通过 `select_project` 选择目录，得到短期有效的项目 ID，并在后续读取中使用它。同一个 Chat 中提供另一个绝对路径即可切换项目。

OpenAI 的 Secure MCP Tunnel 是私有 MCP 的出站连接，不需要开放入站公网端口。[Tunnel 官方文档](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)

## 本地直接使用

Codex Local、Codex CLI 或本地项目聊天可直接安装插件并使用 `@Project Context Reader`。ChatGPT 网页端未显示 Developer mode 时，使用这条路径。

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
- `.git`、依赖目录、输出目录、`.env*`、证书和常见密钥文件均被拦截。
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
