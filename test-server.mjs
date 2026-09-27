import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

const child = spawn(process.execPath, ["server.mjs"], { cwd: process.cwd(), env: process.env, stdio: ["pipe", "pipe", "pipe"] });
let nextId = 1;
const responses = new Map();
createInterface({ input: child.stdout }).on("line", (line) => {
  const response = JSON.parse(line);
  const resolve = responses.get(response.id);
  if (resolve) { responses.delete(response.id); resolve(response); }
});
function request(method, params) {
  const id = nextId++;
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), 3_000);
    responses.set(id, (response) => { clearTimeout(timer); resolve(response); });
  });
}

const initialized = await request("initialize", { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "test", version: "0" } });
assert.equal(initialized.result.serverInfo.name, "project-context-reader");
child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);
const listed = await request("tools/list", {});
assert.deepEqual(listed.result.tools.map((tool) => tool.name).sort(), ["git_context", "project_overview", "read_file", "search_code", "select_project"]);
const selected = await request("tools/call", { name: "select_project", arguments: { path: process.cwd() } });
assert.match(selected.result.content[0].text, /Selected project/);
const read = await request("tools/call", { name: "read_file", arguments: { path: "package.json", endLine: 20 } });
assert.match(read.result.content[0].text, /codex-context-reader/);
const search = await request("tools/call", { name: "search_code", arguments: { query: "project-context-reader", maxResults: 2 } });
assert.equal(search.result.isError, undefined);
const denied = await request("tools/call", { name: "read_file", arguments: { path: "../package.json", endLine: 2 } });
assert.equal(denied.result.isError, true);
child.kill();
console.log("MCP server check passed");
