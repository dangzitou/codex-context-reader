#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const server = join(root, "server.mjs");
const args = process.argv.slice(2);
const value = (flag) => { const index = args.indexOf(flag); return index === -1 ? undefined : args[index + 1]; };
const tunnelId = value("--tunnel-id");
const configure = args.includes("--configure");
const profile = value("--profile") ?? "project-context-reader";
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const promptKey = args.includes("--prompt-key");
const suppliedClient = value("--client") ?? process.env.TUNNEL_CLIENT_BIN;

function usage(exitCode = 0) {
  console.log("Usage: npm run chat:tunnel -- [--configure --tunnel-id tunnel_...] [--profile name] [--client /path/to/tunnel-client] [--prompt-key] [--force] [--dry-run]");
  process.exit(exitCode);
}
function quote(value) {
  return /\s/.test(value) ? `"${value.replaceAll('"', '\\"')}"` : value;
}
async function defaultClient() {
  const candidate = join(homedir(), ".local", "share", "codex-context-reader", "tunnel-client", "v0.0.15", "extracted", "tunnel-client");
  try { await access(candidate); return candidate; } catch { return "tunnel-client"; }
}
function invoke(client, toolArgs, env = process.env) {
  const result = spawnSync(client, toolArgs, { stdio: "inherit", env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function promptForKey() {
  if (!process.stdin.isTTY) throw new Error("--prompt-key requires an interactive terminal.");
  process.stdout.write("Runtime API key (hidden): ");
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = "";
    const finish = (error) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      if (error) reject(error); else resolve(value);
    };
    process.stdin.on("data", (chunk) => {
      for (const character of chunk.toString("utf8")) {
        if (character === "\r" || character === "\n") return finish();
        if (character === "\u0003") return finish(new Error("Input cancelled."));
        if (character === "\u007f") {
          if (value) { value = value.slice(0, -1); process.stdout.write("\b \b"); }
        } else { value += character; process.stdout.write("*"); }
      }
    });
  });
}

if (args.includes("--help") || args.includes("-h")) usage();
if (configure && !tunnelId?.startsWith("tunnel_")) {
  console.error("--configure requires an OpenAI --tunnel-id.");
  usage(1);
}
if (!configure && tunnelId) {
  console.error("--tunnel-id is only used with --configure.");
  usage(1);
}
if (!/^[A-Za-z0-9_-]+$/.test(profile)) {
  console.error("--profile may contain only letters, digits, underscores, and hyphens.");
  process.exit(1);
}
const client = suppliedClient ?? await defaultClient();
const mcpCommand = `${quote(process.execPath)} ${quote(server)}`;
const initArgs = configure ? ["init", "--sample", "sample_mcp_stdio_local", "--profile", profile, "--tunnel-id", tunnelId, "--mcp-command", mcpCommand, "--health-listen-addr", "127.0.0.1:0"] : null;
if (promptKey && configure) {
  console.error("--prompt-key is only used when starting an existing profile.");
  process.exit(1);
}
if (force && !configure) {
  console.error("--force is only used with --configure.");
  process.exit(1);
}
if (force) initArgs.push("--force");
if (dryRun) {
  console.log(JSON.stringify({ client, initArgs, doctorArgs: ["doctor", "--profile", profile, "--explain"], runArgs: ["run", "--profile", profile] }, null, 2));
  process.exit(0);
}
if (initArgs) {
  invoke(client, initArgs);
  console.log(`Configured tunnel-client profile: ${profile}`);
  process.exit(0);
}
const runtimeKey = process.env.CONTROL_PLANE_API_KEY || (promptKey ? await promptForKey() : "");
if (!runtimeKey) {
  console.error("Set CONTROL_PLANE_API_KEY or pass --prompt-key with a runtime key that has Tunnels Read + Use.");
  process.exit(1);
}
const runtimeEnv = { ...process.env, CONTROL_PLANE_API_KEY: runtimeKey };
invoke(client, ["doctor", "--profile", profile, "--explain"], runtimeEnv);
invoke(client, ["run", "--profile", profile], runtimeEnv);
