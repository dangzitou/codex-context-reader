import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

const child = spawn(process.execPath, ["server.mjs"], { cwd: process.cwd(), env: { ...process.env, PROJECT_SELECTION_IDLE_MS: "1500" }, stdio: ["pipe", "pipe", "pipe"] });
function connect(proc) {
  let nextId = 1;
  const pending = new Map();
  createInterface({ input: proc.stdout }).on("line", (line) => {
    const response = JSON.parse(line);
    const resolve = pending.get(response.id);
    if (resolve) { pending.delete(response.id); resolve(response); }
  });
  return (method, params) => {
    const id = nextId++;
    proc.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), 3_000);
      pending.set(id, (response) => { clearTimeout(timer); resolve(response); });
    });
  };
}
const request = connect(child);

const initialized = await request("initialize", { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "test", version: "0" } });
assert.equal(initialized.result.serverInfo.name, "project-context-reader");
child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);
const listed = await request("tools/list", {});
assert.deepEqual(listed.result.tools.map((tool) => tool.name).sort(), ["git_context", "project_overview", "read_file", "search_code", "select_project"]);
const selected = await request("tools/call", { name: "select_project", arguments: { path: process.cwd() } });
const selectedText = selected.result.content[0].text;
assert.match(selectedText, /Selected project/);
const projectId = selectedText.match(/Project ID: ([^\n]+)/)?.[1];
assert.ok(projectId);
const read = await request("tools/call", { name: "read_file", arguments: { projectId, path: "package.json", endLine: 20 } });
assert.match(read.result.content[0].text, /codex-context-reader/);
const search = await request("tools/call", { name: "search_code", arguments: { projectId, query: "project-context-reader", maxResults: 2 } });
assert.equal(search.result.isError, undefined);
const missingProject = await request("tools/call", { name: "project_overview", arguments: {} });
assert.equal(missingProject.result.isError, true);
const denied = await request("tools/call", { name: "read_file", arguments: { projectId, path: "../package.json", endLine: 2 } });
assert.equal(denied.result.isError, true);
const subdir = await request("tools/call", { name: "project_overview", arguments: { projectId, path: "scripts" } });
assert.match(subdir.result.content[0].text, /Listing: scripts/);
assert.match(subdir.result.content[0].text, /chat-tunnel\.mjs/);
const blockedDir = await request("tools/call", { name: "project_overview", arguments: { projectId, path: "node_modules" } });
assert.equal(blockedDir.result.isError, true);
const paged = await request("tools/call", { name: "read_file", arguments: { projectId, path: "package.json", endLine: 5 } });
assert.match(paged.result.content[0].text, /\[File has \d+ lines; showing 1-5\. Continue with startLine=6\.\]/);
const batch = await request("tools/call", { name: "read_file", arguments: { projectId, paths: ["package.json", "LICENSE"], endLine: 2 } });
assert.match(batch.result.content[0].text, /===== package\.json =====/);
assert.match(batch.result.content[0].text, /===== LICENSE =====/);
const batchDenied = await request("tools/call", { name: "read_file", arguments: { projectId, paths: ["package.json", "../package.json"], endLine: 2 } });
assert.match(batchDenied.result.content[0].text, /===== \.\.\/package\.json =====/);
assert.match(batchDenied.result.content[0].text, /\[error\]/);
assert.equal(batchDenied.result.isError, undefined);
const globSearch = await request("tools/call", { name: "search_code", arguments: { projectId, query: "ripgrep", glob: "*.md" } });
assert.match(globSearch.result.content[0].text, /README\.md:\d+:/);
const globMiss = await request("tools/call", { name: "search_code", arguments: { projectId, query: "ripgrep", glob: "*.rs" } });
assert.equal(globMiss.result.content[0].text, "No matches.");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await sleep(1_200);
const renewed = await request("tools/call", { name: "project_overview", arguments: { projectId } });
assert.equal(renewed.result.isError, undefined);
await sleep(1_200);
const stillAlive = await request("tools/call", { name: "project_overview", arguments: { projectId } });
assert.equal(stillAlive.result.isError, undefined);
await sleep(1_800);
const expired = await request("tools/call", { name: "read_file", arguments: { projectId, path: "package.json", endLine: 2 } });
assert.equal(expired.result.isError, true);
assert.match(expired.result.content[0].text, /Unknown or expired projectId/);
child.kill();
const fallbackChild = spawn(process.execPath, ["server.mjs"], { cwd: process.cwd(), env: { ...process.env, PROJECT_SELECTION_IDLE_MS: "1500", PROJECT_SEARCH_FALLBACK: "1" }, stdio: ["pipe", "pipe", "pipe"] });
const fallbackRequest = connect(fallbackChild);
const fallbackSelect = await fallbackRequest("tools/call", { name: "select_project", arguments: { path: process.cwd() } });
const fallbackProjectId = fallbackSelect.result.content[0].text.match(/Project ID: ([^\n]+)/)?.[1];
assert.ok(fallbackProjectId);
const fallbackSearch = await fallbackRequest("tools/call", { name: "search_code", arguments: { projectId: fallbackProjectId, query: "ripgrep", glob: "*.md" } });
assert.match(fallbackSearch.result.content[0].text, /README\.md:\d+:/);
fallbackChild.kill();
console.log("MCP server check passed");
