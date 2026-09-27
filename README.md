# Codex Context Reader

A read-only [Model Context Protocol](https://modelcontextprotocol.io/) server for letting **regular ChatGPT Chat** inspect a user-selected local project without pasting an entire repository into the conversation.

It returns only the overview, search matches, and bounded file excerpts needed for the question. This reduces unrelated context and token use. Actual usage depends on the model and request.

[中文](#中文) · [Install](#install-for-regular-chatgpt-chat) · [Security](#security) · [Contributing](CONTRIBUTING.md)

## Install for regular ChatGPT Chat

### Recommended: give this prompt to a local Codex agent

Paste the following into a **local Codex agent** on the computer that holds the project. It completes the install, test, and private Tunnel preparation. It deliberately leaves only account-bound actions and hidden-key entry to you.

```text
Set up https://github.com/dangzitou/codex-context-reader for regular ChatGPT Chat on this computer. Work carefully and make the smallest changes needed.

1. Detect macOS, Linux, or Windows. Inspect any existing target before changing it. Clone or update the repository at the required personal-plugin path: ~/plugins/project-context-reader on macOS/Linux or %USERPROFILE%\plugins\project-context-reader on Windows. Do not overwrite unrelated files.
2. Ensure Node.js 18+, Git, and ripgrep are available. Run npm test and npm run install:plugin. Verify codex plugin list shows project-context-reader@personal as installed and enabled.
3. Download the current tunnel-client only from the official OpenAI release or Platform Tunnel page. Verify its SHA-256 against the official checksum. Keep it under a user-owned local directory and set TUNNEL_CLIENT_BIN for the current terminal; do not put it in this repository.
4. If I provide a tunnel_id, run npm run chat:tunnel -- --configure --tunnel-id <tunnel_id>. If I do not provide one, tell me that I must create a Tunnel in Platform first. Never create, request, print, store, or paste an API key into chat, files, Git, shell history, or logs.
5. Tell me the one remaining command to run in my own terminal: npm run chat:tunnel -- --prompt-key. Do not start the Tunnel yourself unless I have entered the runtime key locally through that hidden prompt.
6. After the Tunnel is ready, tell me the exact ChatGPT steps: enable Developer mode, create a Plugins → Tunnel connection, then add it to a new regular Chat.

Do not expose the local project to the public internet. Do not modify any project selected for reading.
```

### What you must do yourself

| Step | Why it stays with you |
| --- | --- |
| Create a Tunnel in [Platform settings](https://platform.openai.com/settings/organization/security/tunnels) | It belongs to your OpenAI organization and ChatGPT workspace. |
| Create a runtime API key | It is a credential. Never paste it into ChatGPT, Codex, or an issue. |
| Enter the key in a local terminal | The launcher hides the input and does not save it. |
| Enable ChatGPT Developer mode and create the connection | This changes your ChatGPT account settings. |

### Start the private Tunnel

After the agent has installed the repository and you have a `tunnel_id`, configure the profile once:

```sh
cd "$HOME/plugins/project-context-reader"
npm run chat:tunnel -- --configure --tunnel-id "your-tunnel-id"
```

On Windows PowerShell, use:

```powershell
Set-Location "$env:USERPROFILE\plugins\project-context-reader"
npm run chat:tunnel -- --configure --tunnel-id "your-tunnel-id"
```

Then start it whenever you want to use regular ChatGPT Chat:

```sh
npm run chat:tunnel -- --prompt-key
```

The key input is hidden and stays only in the launched process environment. `doctor --explain` runs before the Tunnel starts. Keep this terminal open; wait until it reports `ready`.

### Add the connection in ChatGPT

1. In ChatGPT Settings → **Security and login**, enable **Developer mode**.
2. Open **Plugins**, choose **+**, choose **Tunnel**, and select or paste your `tunnel_id`.
3. Review the discovered tools and create the connection.
4. Start a new regular Chat, add the connection from the tools menu, and send:

```text
Use Project Context Reader to read /Users/alex/work/payments-service. First inspect the project and key code, then propose an implementation plan. Do not modify files.
```

ChatGPT selects the directory through `select_project`, returns a short-lived project ID, and uses it for subsequent reads. To switch projects, provide another absolute path in the same chat.

## Direct local use

For a local project chat, ChatGPT Work, Codex Local, or Codex CLI, install the plugin and use `@Project Context Reader`. A Secure MCP Tunnel is only needed for remote ChatGPT Chat, web, and mobile.

### Manual installation

The personal marketplace expects the source directory below.

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
- Secure MCP Tunnel opens an outbound connection; it does not open an inbound port or publish the project on the internet. [OpenAI Tunnel documentation](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)

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

Codex Context Reader 是一个只读 [MCP](https://modelcontextprotocol.io/) 服务，让**普通 ChatGPT Chat** 在用户确认后按需读取本地项目，而不用把整个仓库粘贴进对话。

它只返回解决问题所需的项目概览、搜索结果和有限文件片段，减少无关上下文和 token 消耗。实际消耗取决于模型和提问。

[安装](#在普通-chatgpt-chat-中安装) · [安全](#安全与数据边界) · [贡献](CONTRIBUTING.md)

## 在普通 ChatGPT Chat 中安装

### 推荐：把下面提示词交给本机 Codex Agent

将下面整段发送给保存项目的电脑上的 **本机 Codex Agent**。它会完成安装、测试和私有 Tunnel 的准备工作；只有账户权限和隐藏输入密钥需要你自己操作。

```text
请在这台电脑上把 https://github.com/dangzitou/codex-context-reader 配置为可供普通 ChatGPT Chat 使用。请谨慎执行，只做必要改动。

1. 判断当前系统是 macOS、Linux 还是 Windows；修改前先检查目标目录。将仓库 clone 或更新到个人插件要求的路径：macOS/Linux 使用 ~/plugins/project-context-reader，Windows 使用 %USERPROFILE%\plugins\project-context-reader。不要覆盖无关文件。
2. 确保 Node.js 18+、Git 和 ripgrep 可用。运行 npm test 与 npm run install:plugin，并确认 codex plugin list 显示 project-context-reader@personal 已安装且已启用。
3. 仅从 OpenAI 官方发布页或 Platform Tunnel 页面下载最新 tunnel-client。用官方 SHA-256 清单校验，将它放在用户拥有的本地目录，并仅为当前终端设置 TUNNEL_CLIENT_BIN；不要把二进制放进本仓库。
4. 如果我提供 tunnel_id，运行 npm run chat:tunnel -- --configure --tunnel-id <tunnel_id>；如果没有，明确告诉我需要先在 Platform 创建 Tunnel。绝不创建、索取、打印、保存或把 API key 粘贴到聊天、文件、Git、Shell 历史或日志中。
5. 告诉我唯一需要在我自己终端运行的命令：npm run chat:tunnel -- --prompt-key。除非我已在本机通过该隐藏输入方式输入 runtime key，否则不要替我启动 Tunnel。
6. Tunnel ready 后，告诉我 ChatGPT 的精确操作：开启 Developer mode，在 Plugins → Tunnel 新建连接，再把连接添加到新建普通 Chat。

不要把本地项目暴露到公网，也不要修改任何供读取的项目文件。
```

### 必须由你自己完成的步骤

| 操作 | 原因 |
| --- | --- |
| 在 [Platform Tunnel 设置](https://platform.openai.com/settings/organization/security/tunnels) 创建 Tunnel | 它属于你的 OpenAI 组织和 ChatGPT workspace。 |
| 创建 runtime API key | 它是凭据，绝不能粘贴到 ChatGPT、Codex 或 Issue。 |
| 在本机终端输入 key | 启动器会隐藏输入，不保存该 key。 |
| 开启 ChatGPT Developer mode 并创建连接 | 这会修改你的 ChatGPT 账户设置。 |

### 启动私有 Tunnel

Agent 完成安装、你获得 `tunnel_id` 后，首次配置 profile：

```sh
cd "$HOME/plugins/project-context-reader"
npm run chat:tunnel -- --configure --tunnel-id "你的 tunnel_id"
```

Windows PowerShell：

```powershell
Set-Location "$env:USERPROFILE\plugins\project-context-reader"
npm run chat:tunnel -- --configure --tunnel-id "你的 tunnel_id"
```

之后每次要在普通 ChatGPT Chat 中使用时，运行：

```sh
npm run chat:tunnel -- --prompt-key
```

该命令会隐藏输入 key，key 只存在于启动后的进程环境中。启动前会执行 `doctor --explain`；保持这个终端打开，看到 `ready` 后再使用 Chat。

### 在 ChatGPT 中添加连接

1. 打开 ChatGPT 设置 → **Security and login**，开启 **Developer mode**。
2. 打开 **Plugins**，点击 **+**，连接方式选 **Tunnel**，选择或粘贴 `tunnel_id`。
3. 核对发现的工具并创建连接。
4. 新建普通 Chat，在工具菜单添加该连接，发送：

```text
使用 Project Context Reader 读取 /Users/你的用户名/work/项目名。先了解项目结构和关键代码，再给我实施方案；不要修改文件。
```

ChatGPT 会通过 `select_project` 选择目录，得到短期有效的项目 ID，并在后续读取中使用它。同一个 Chat 中提供另一个绝对路径即可切换项目。

## 本地直接使用

本地项目聊天、ChatGPT Work、Codex Local 或 Codex CLI 可直接安装插件后使用 `@Project Context Reader`。只有远端普通 ChatGPT Chat、网页版和移动端才需要 Secure MCP Tunnel。

### 手动安装

个人 marketplace 要求源码放在以下目录。

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
- Secure MCP Tunnel 是出站连接，不开放入站端口，也不会把项目发布到公网。[OpenAI Tunnel 文档](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)

## 开发

```sh
npm test
```

测试覆盖 MCP 初始化、项目选择、项目 ID 限定读取、路径穿越拒绝和 Tunnel 启动参数生成。

## 许可证

[MIT](LICENSE) © Deng Zitao
