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
const suppliedClient = value("--client") ?? process.env.TUNNEL_CLIENT_BIN;

function usage(exitCode = 0) {
  console.log("Usage: npm run chat:tunnel -- [--configure --tunnel-id tunnel_...] [--profile name] [--client /path/to/tunnel-client] [--force] [--dry-run]");
  process.exit(exitCode);
}
function quote(value) {
  return /\s/.test(value) ? `"${value.replaceAll('"', '\\"')}"` : value;
}
async function defaultClient() {
  const candidate = join(homedir(), ".local", "share", "codex-context-reader", "tunnel-client", "v0.0.15", "extracted", "tunnel-client");
  try { await access(candidate); return candidate; } catch { return "tunnel-client"; }
}
function invoke(client, toolArgs) {
  const result = spawnSync(client, toolArgs, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
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
if (!process.env.CONTROL_PLANE_API_KEY) {
  console.error("Set CONTROL_PLANE_API_KEY to a runtime key with Tunnels Read + Use before starting the tunnel.");
  process.exit(1);
}
invoke(client, ["doctor", "--profile", profile, "--explain"]);
invoke(client, ["run", "--profile", profile]);
