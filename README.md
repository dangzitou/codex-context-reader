# Codex Context Reader

A read-only [Model Context Protocol](https://modelcontextprotocol.io/) plugin for **local projects in the ChatGPT desktop app** and Codex. It lets ChatGPT or Codex inspect a local project only when you select it, retrieving code on demand instead of pasting an entire repository into a conversation.

This is intended to reduce unnecessary prompt context and token use. Actual token consumption depends on the model and the questions asked.

[中文](#中文) · [ChatGPT Chat](#use-in-regular-chatgpt-chat) · [Installation](#installation) · [Security](#security) · [Contributing](CONTRIBUTING.md)

## Where it runs

| Surface | Local project tools |
| --- | --- |
| ChatGPT desktop app, **local project** chat or ChatGPT Work | Supported directly |
| ChatGPT desktop app, **Codex → Local** task or Codex CLI | Supported directly |
| Regular ChatGPT Chat, desktop or web | Supported through Secure MCP Tunnel |
| Mobile ChatGPT | Connect through a running Secure MCP Tunnel |

Choose **Work in a project**, attach the local folder, and start a new chat from that project for direct local use. For regular ChatGPT Chat, follow [Use in regular ChatGPT Chat](#use-in-regular-chatgpt-chat).

## What it does

- Select a local project for the current MCP session without restarting ChatGPT or Codex.
- Show a compact project and Git overview.
- Search literal code text with `ripgrep`.
- Read bounded file excerpts with line numbers.
- Summarize uncommitted Git changes and recent commits.

It never modifies project files, runs project code, reads `.git` metadata, or returns likely secret files such as `.env`, PEM, and key files.

## How it saves context

Instead of attaching a repository or pasting files into ChatGPT, ask a question and let the model retrieve only the relevant overview, search results, and file ranges. This keeps most unrelated code outside the model context.

```mermaid
flowchart LR
  U[Your Codex Local request] --> C[Local Codex host]
  C -->|approved select_project| P[Selected local project]
  C -->|overview / search / excerpts| P
  P -->|small, relevant results| C
  C --> A[Evidence-backed plan]
```

## Requirements

- ChatGPT desktop app with a local project chat or ChatGPT Work, or Codex CLI.
- [Codex CLI](https://developers.openai.com/codex/cli/) on `PATH` for the one-command installer.
- Node.js 18 or later.
- [`ripgrep`](https://github.com/BurntSushi/ripgrep) (`rg`) for code search.
- Git is optional, but enables branch, status, diff, and commit context.

## Use in regular ChatGPT Chat

A normal ChatGPT Chat runs remotely, so it cannot start this local stdio server by itself. [Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels) connects the already-tested server on your computer to a developer-mode ChatGPT app through outbound HTTPS; your project directory remains private and no inbound firewall port is opened.

### One-time setup

1. In [Platform tunnel settings](https://platform.openai.com/settings/organization/security/tunnels), create a tunnel associated with the ChatGPT workspace you will use. Keep its `tunnel_id`.
2. Create a runtime API key permitted to use that tunnel. Do not put it in this repository or in a ChatGPT prompt.
3. Download `tunnel-client` from the Platform tunnel settings page, then initialize it beside this plugin.

macOS/Linux:

```sh
export TUNNEL_CLIENT_BIN="/absolute/path/to/tunnel-client"
npm run chat:tunnel -- --configure --tunnel-id "your-tunnel-id"
# Preferred: prompt for the key without echoing or saving it
npm run chat:tunnel -- --prompt-key
# Or use an environment variable in this terminal only
export CONTROL_PLANE_API_KEY="your-runtime-key"
npm run chat:tunnel
```

Windows PowerShell:

```powershell
$env:TUNNEL_CLIENT_BIN = "C:\absolute\path\to\tunnel-client.exe"
npm run chat:tunnel -- --configure --tunnel-id "your-tunnel-id"
# Preferred: prompt for the key without echoing or saving it
npm run chat:tunnel -- --prompt-key
# Or use an environment variable in this PowerShell window only
$env:CONTROL_PLANE_API_KEY = "your-runtime-key"
npm run chat:tunnel
```

`chat:tunnel -- --configure` writes the `project-context-reader` profile once. `chat:tunnel` then runs `doctor --explain` and keeps the tunnel in the foreground. Later runs need only `npm run chat:tunnel -- --prompt-key` or a terminal-only `CONTROL_PLANE_API_KEY`. A healthy client reports `ready`; if it stops, Chat cannot call the tools.

### Add it to ChatGPT Chat

1. In ChatGPT Settings → Security and login, turn on **Developer mode**.
2. Open **Plugins**, select **+**, choose **Tunnel**, then select or paste the `tunnel_id`.
3. Review the discovered tools and create the app connection.
4. Start a new regular Chat, add the new connection from the tools menu, then send:

```text
Use Project Context Reader to read /Users/alex/work/payments-service. First inspect the project and key code, then propose an implementation plan. Do not modify files.
```

ChatGPT should ask before `select_project`. This tool only selects a directory in memory for the current MCP session. To switch projects, provide another absolute path in the same chat; no restart is needed.

> Secure MCP Tunnel is for private developer-mode use. It is not a public plugin distribution mechanism. Publishing this MCP server for everyone would require a stable public HTTPS endpoint and authentication.

## Installation

The plugin must be cloned under your home directory because ChatGPT's personal marketplace resolves plugins from `~/plugins/` (or `%USERPROFILE%\\plugins\\` on Windows).

### Install with Codex

You can paste this prompt directly into a local Codex chat. It chooses the correct macOS or Windows path itself:

```text
Install https://github.com/dangzitou/codex-context-reader as a personal ChatGPT desktop plugin on this computer. Clone it into the required home-directory plugins path for this operating system, but inspect an existing target first and do not overwrite unrelated files. Run its documented npm installer, verify that `codex plugin list` shows `project-context-reader@personal` as installed and enabled, and tell me how to invoke it in a new local project chat. Only change the cloned plugin directory and the personal marketplace file required by its installer.
```

The prompt installs the plugin once. Selecting or switching a project later happens with `select_project` inside a new local project chat; it does not require another install or restart.

### macOS

Install the prerequisites if needed:

```sh
brew install node ripgrep git
```

Clone and install the plugin:

```sh
mkdir -p "$HOME/plugins"
git clone https://github.com/dangzitou/codex-context-reader.git "$HOME/plugins/project-context-reader"
cd "$HOME/plugins/project-context-reader"
npm run install:plugin
```

The installer creates or updates `~/.agents/plugins/marketplace.json` and installs `project-context-reader` from your Personal marketplace. If the plugin does not appear, restart the ChatGPT desktop app once after this initial installation.

### Windows (PowerShell)

Install Node.js LTS and Git from their official installers, then install ripgrep:

```powershell
winget install BurntSushi.ripgrep.MSVC
```

Clone and install the plugin:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\plugins" | Out-Null
git clone https://github.com/dangzitou/codex-context-reader.git "$env:USERPROFILE\plugins\project-context-reader"
Set-Location "$env:USERPROFILE\plugins\project-context-reader"
npm run install:plugin
```

If the plugin does not appear, restart the ChatGPT desktop app once after this initial installation. If `codex` is not on `PATH`, open the app's Plugins page and install **Project Context Reader** from the Personal marketplace after running the script.

### Verify

In the ChatGPT desktop app, select **Work in a project**, attach the project folder, and create a new chat from that project. Type `/mcp` and confirm that `project-context-reader` is connected. Then type `@Project Context Reader` and send a request with an absolute local path:

```text
Read /Users/alex/work/payments-service. First inspect the project, then propose an implementation plan. Do not modify files.
```

On Windows, use a drive-letter path:

```text
Read C:\Users\Alex\source\payments-service. First inspect the project, then propose an implementation plan. Do not modify files.
```

ChatGPT asks you to approve `select_project`. That selection is kept only in the current MCP session. To switch projects, state the new absolute path in the same chat; no configuration edit or restart is required.

## Tools

| Tool | Purpose |
| --- | --- |
| `select_project` | Select one absolute local directory for this session. Requires approval. |
| `project_overview` | Read structure, branch, working-tree status, and recent commits for a selected project ID. |
| `search_code` | Search literal text in the selected project ID while excluding dependencies, output, and likely secret files. |
| `read_file` | Return up to 400 lines from a file in the selected project ID. |
| `git_context` | Read Git status, diff summary, and five recent commits for a selected project ID. |

## Security

- The project is selected explicitly through an approval-gated tool.
- Selection IDs are random, held only in memory, and expire after 30 minutes or when the MCP server stops.
- File reads stay inside the selected directory after resolving symlinks.
- The server blocks `.git`, `node_modules`, common output directories, `.env*`, and common key-file extensions.
- This is a local MCP server. The code excerpts it returns are still sent to the ChatGPT conversation. Use it only with repositories that your organization permits you to share with ChatGPT.

Please report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## Development

```sh
git clone https://github.com/dangzitou/codex-context-reader.git
cd codex-context-reader
npm test
```

The test starts the server over stdio, performs an MCP initialization, checks the tool catalog, selects a project, reads a file, searches code, and verifies path-traversal rejection.

## License

[MIT](LICENSE) © Deng Zitao

---

<a id="中文"></a>

# 中文

Codex Context Reader 是一个面向 **ChatGPT 桌面端本地项目**和 Codex 的只读 MCP 插件。它让 ChatGPT 或 Codex 在你确认后按需检索本地项目，而不是把整个仓库或大量文件直接放进对话。

它的目标是减少无关代码进入上下文，从而节省不必要的 token。实际 token 消耗仍取决于模型和具体提问。

## 适用范围

| 使用界面 | 本地项目工具 |
| --- | --- |
| ChatGPT 桌面端的**本地项目**聊天或 ChatGPT Work | 支持；安装后需新建聊天 |
| ChatGPT 桌面端的 **Codex → Local** 任务或 Codex CLI | 支持 |
| 未绑定本地项目的既有 Quick Chat | 插件可能显示但没有本机工具目录；请新建本地项目聊天 |
| 网页版或移动端 ChatGPT | 此本地 stdio 服务不支持 |

选择 **在项目中工作**，绑定本地目录，并从该项目新建聊天。发送请求前先输入 `/mcp`，确认 `project-context-reader` 已连接。插件进程运行在本机，网页版或移动端的托管会话无法启动它。

## 功能

- 在同一会话中动态切换本地项目，不需要重启 ChatGPT 或 Codex。
- 获取项目结构、Git 分支和近期提交概览。
- 使用 `ripgrep` 精确搜索代码。
- 按行读取最多 400 行文件内容。
- 获取未提交改动摘要和近期 Git 提交。

插件不修改任何项目文件，不执行项目代码，不读取 `.git` 内容，并会屏蔽 `.env`、证书和常见密钥文件。

## 在普通 ChatGPT Chat 中使用

普通 ChatGPT Chat 运行在远端，不能自行启动本机的 stdio 服务。通过 [Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)，可以将这台电脑上已验证的服务经由**出站 HTTPS**接入开发者模式的 ChatGPT 应用；项目目录仍在内网，不需要开放入站端口。

### 一次性配置

1. 在 [Platform tunnel settings](https://platform.openai.com/settings/organization/security/tunnels) 创建 Tunnel，并关联将要使用的 ChatGPT workspace，记录 `tunnel_id`。
2. 创建具有该 Tunnel 使用权限的 runtime API key。不要把它写入仓库或发到 ChatGPT 对话。
3. 从 Platform tunnel settings 下载 `tunnel-client`，然后在本插件旁初始化：

macOS/Linux：

```sh
export TUNNEL_CLIENT_BIN="/tunnel-client 的绝对路径"
npm run chat:tunnel -- --configure --tunnel-id "你的 tunnel_id"
# 推荐：隐藏输入 key，不回显也不保存
npm run chat:tunnel -- --prompt-key
# 或仅在当前终端设置环境变量
export CONTROL_PLANE_API_KEY="你的 runtime key"
npm run chat:tunnel
```

Windows PowerShell：

```powershell
$env:TUNNEL_CLIENT_BIN = "C:\tunnel-client.exe 的绝对路径"
npm run chat:tunnel -- --configure --tunnel-id "你的 tunnel_id"
# 推荐：隐藏输入 key，不回显也不保存
npm run chat:tunnel -- --prompt-key
# 或仅在当前 PowerShell 窗口设置环境变量
$env:CONTROL_PLANE_API_KEY = "你的 runtime key"
npm run chat:tunnel
```

`chat:tunnel -- --configure` 首次写入 `project-context-reader` profile。`chat:tunnel` 随后执行 `doctor --explain`，并以前台方式保持 Tunnel 运行。以后只需 `npm run chat:tunnel -- --prompt-key`，或仅在当前终端设置 `CONTROL_PLANE_API_KEY`。状态为 `ready` 时，Chat 才能调用工具。

### 在 Chat 中添加连接

1. 打开 ChatGPT 设置 → **Security and login**，开启 **Developer mode**。
2. 打开 **Plugins**，点击 **+**，连接方式选 **Tunnel**，选择或粘贴 `tunnel_id`。
3. 核对发现的工具并创建应用连接。
4. 新建普通 Chat，在工具菜单中添加该连接，然后发送：

```text
使用 Project Context Reader 读取 /Users/你的用户名/work/项目名。先了解项目结构和关键代码，再给我实施方案；不要修改文件。
```

ChatGPT 应在调用 `select_project` 前请求确认。该操作只在当前 MCP 会话的内存中选择目录；同一 Chat 中提供另一个绝对路径即可切换，无需重启。

> Secure MCP Tunnel 用于私有的开发者模式连接，不是公开分发方案。若要让所有用户直接安装使用，需要稳定的公网 HTTPS MCP 服务和认证机制。

## 安装

请按上方的 [macOS](#macos) 或 [Windows](#windows-powershell) 步骤安装。首次安装后重启一次 ChatGPT 桌面端即可；之后在新的本地项目聊天中切换项目时只需提供新的绝对路径。

### 让 Codex 自动安装

把下面整段直接发给本机的 Codex 即可。它会根据当前系统选择 macOS 或 Windows 的正确路径：

```text
请把 https://github.com/dangzitou/codex-context-reader 安装为这台电脑上 ChatGPT 桌面端的个人插件。请按当前操作系统把仓库 clone 到用户主目录下该插件要求的 plugins 路径；如果目标目录已经存在，先检查内容，不要覆盖无关文件。运行仓库 README 中的 npm 安装脚本，随后用 `codex plugin list` 验证 `project-context-reader@personal` 已安装且已启用，并告诉我如何在新建本地项目聊天中调用它。除克隆出的插件目录和安装脚本必需的个人 marketplace 配置文件外，不要修改其他文件。
```

这段提示词只需用于首次安装。之后在本地项目聊天中用 `select_project` 选择或切换项目，不需要再次安装或重启。

在 ChatGPT 桌面端选择 **在项目中工作**，绑定项目目录并新建聊天；先用 `/mcp` 确认 `project-context-reader` 已连接后输入：

```text
使用 Project Context Reader 读取 /Users/你的用户名/work/项目名。先了解项目结构和关键代码，再给我实施方案；不要修改文件。
```

出现 `select_project` 确认时，核对路径后批准即可。随后要切换项目时，直接告诉 ChatGPT 新路径，无须再次安装或重启。

## 安全与数据边界

- `select_project` 返回随机项目 ID，仅保存在内存中；30 分钟后或 MCP 服务停止时失效。
- 读取范围被限制在已选择项目内，符号链接也会校验真实路径。
- 插件返回到 ChatGPT 的代码片段会成为对话上下文；请仅对公司允许提供给 ChatGPT 的代码库使用。

欢迎阅读 [贡献指南](CONTRIBUTING.md)，并按 [MIT 许可证](LICENSE) 使用和分发本项目。
