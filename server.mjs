#!/usr/bin/env node
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, readdir, realpath, stat } from "node:fs/promises";
import { basename, isAbsolute, relative, resolve, sep } from "node:path";
import { createInterface } from "node:readline";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const EXCLUDED_PARTS = new Set([".git", "node_modules", "dist", "build", "coverage", ".next"]);
const SECRET_NAME = /^(?:\.env(?:\..*)?|.*\.(?:pem|key|p12|pfx))$/i;
const selectedProjects = new Map();
const PROJECT_SELECTION_TTL_MS = 30 * 60 * 1000;

function toolText(content, isError = false) {
  return { content: [{ type: "text", text: content }], ...(isError && { isError: true }) };
}

async function projectRoot(projectId) {
  if (typeof projectId !== "string" || !selectedProjects.has(projectId)) throw new Error("Unknown or expired projectId. Call select_project again.");
  return selectedProjects.get(projectId);
}

async function selectProject(requestedPath) {
  if (typeof requestedPath !== "string" || !isAbsolute(requestedPath)) throw new Error("path must be an absolute local directory path.");
  const root = await realpath(requestedPath);
  if (!(await stat(root)).isDirectory()) throw new Error("Selected path is not a directory.");
  const projectId = randomUUID();
  selectedProjects.set(projectId, root);
  setTimeout(() => selectedProjects.delete(projectId), PROJECT_SELECTION_TTL_MS).unref();
  return `Selected project: ${basename(root)}\nPath: ${root}\nProject ID: ${projectId}\nUse this projectId for subsequent reads. It expires after 30 minutes or when the MCP server stops.`;
}

function isInside(root, candidate) {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== "..");
}

function hasBlockedPart(path) {
  return path.split(/[\\/]/).some((part) => EXCLUDED_PARTS.has(part) || SECRET_NAME.test(part));
}

async function safePath(root, requestedPath) {
  if (typeof requestedPath !== "string" || !requestedPath || isAbsolute(requestedPath) || hasBlockedPart(requestedPath)) throw new Error("Path is outside the readable project scope.");
  const candidate = resolve(root, requestedPath);
  if (!isInside(root, candidate)) throw new Error("Path is outside the configured project.");
  const actual = await realpath(candidate);
  if (!isInside(root, actual) || hasBlockedPart(relative(root, actual))) throw new Error("Path is outside the readable project scope.");
  return actual;
}

async function git(root, args) {
  try {
    return (await execFileAsync("git", args, { cwd: root, timeout: 4_000, maxBuffer: 200_000 })).stdout.trim();
  } catch {
    return "Not a Git repository or Git data is unavailable.";
  }
}

async function overview(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const visible = entries.filter((entry) => !EXCLUDED_PARTS.has(entry.name) && !SECRET_NAME.test(entry.name)).slice(0, 80).map((entry) => `${entry.isDirectory() ? "dir " : "file"} ${entry.name}`);
  const [branch, status, commits] = await Promise.all([
    git(root, ["branch", "--show-current"]),
    git(root, ["status", "--short"]),
    git(root, ["log", "-3", "--format=%h %s"]),
  ]);
  return [`Project: ${basename(root)}`, `Branch: ${branch || "detached or unavailable"}`, `Working tree: ${status || "clean"}`, "Recent commits:", commits || "(unavailable)", "Top-level entries:", visible.join("\n") || "(empty)"].join("\n");
}

const tools = [
  {
    name: "select_project",
    title: "Select local project",
    description: "Select one absolute local directory after the user explicitly names or approves it. Returns an opaque projectId required for later reads. This changes in-memory state and never writes a configuration file.",
    inputSchema: { type: "object", properties: { path: { type: "string", minLength: 2, maxLength: 2000, description: "Absolute path of the local project directory" } }, required: ["path"], additionalProperties: false },
    annotations: { readOnlyHint: false, openWorldHint: false },
  },
  {
    name: "project_overview",
    title: "Project overview",
    description: "Show a selected project's root-level structure, Git branch, concise status, and three recent commit subjects. Call this before reading code.",
    inputSchema: { type: "object", properties: { projectId: { type: "string", description: "Opaque ID returned by select_project" } }, required: ["projectId"], additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "search_code",
    title: "Search project code",
    description: "Find literal text in the configured project. Excludes Git metadata, dependencies, build output, and likely secret files.",
    inputSchema: { type: "object", properties: { projectId: { type: "string", description: "Opaque ID returned by select_project" }, query: { type: "string", minLength: 1, maxLength: 300, description: "Literal text to find" }, path: { type: "string", maxLength: 500, default: ".", description: "Optional project-relative directory or file" }, maxResults: { type: "integer", minimum: 1, maximum: 100, default: 40 } }, required: ["projectId", "query"], additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "read_file",
    title: "Read file excerpt",
    description: "Read a bounded line range from a project-relative text file. Refuses Git metadata and likely secret files.",
    inputSchema: { type: "object", properties: { projectId: { type: "string", description: "Opaque ID returned by select_project" }, path: { type: "string", minLength: 1, maxLength: 500, description: "Project-relative file path" }, startLine: { type: "integer", minimum: 1, default: 1 }, endLine: { type: "integer", minimum: 1, default: 400 } }, required: ["projectId", "path"], additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "git_context",
    title: "Git context",
    description: "Read the current Git status, diff summary, and five recent commits for a selected project.",
    inputSchema: { type: "object", properties: { projectId: { type: "string", description: "Opaque ID returned by select_project" } }, required: ["projectId"], additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
];

async function callTool(name, args = {}) {
  try {
    if (name === "select_project") return toolText(await selectProject(args.path));
    const root = await projectRoot(args.projectId);
    if (name === "project_overview") return toolText(await overview(root));
    if (name === "git_context") {
      const [status, diff, commits] = await Promise.all([git(root, ["status", "--short"]), git(root, ["diff", "--stat"]), git(root, ["log", "-5", "--format=%h %ad %s", "--date=short"])]);
      return toolText(["Status:", status || "clean", "\nUncommitted diff summary:", diff || "none", "\nRecent commits:", commits].join("\n"));
    }
    if (name === "search_code") {
      if (typeof args.query !== "string" || !args.query || args.query.length > 300) return toolText("query must be 1 to 300 characters.", true);
      const path = args.path ?? ".";
      const maxResults = Number.isInteger(args.maxResults) ? args.maxResults : 40;
      if (maxResults < 1 || maxResults > 100) return toolText("maxResults must be between 1 and 100.", true);
      const target = path === "." ? root : await safePath(root, path);
      try {
        const { stdout } = await execFileAsync("rg", ["--fixed-strings", "--line-number", "--no-heading", "--color", "never", "--max-count", String(maxResults), "--glob", "!.git/**", "--glob", "!node_modules/**", "--glob", "!dist/**", "--glob", "!build/**", "--glob", "!coverage/**", "--glob", "!.next/**", "--glob", "!.env*", "--", args.query, target], { cwd: root, timeout: 10_000, maxBuffer: 150_000 });
        const lines = stdout.trim().split("\n").filter(Boolean).slice(0, maxResults);
        return toolText(lines.length ? lines.join("\n") : "No matches.");
      } catch (cause) {
        if (cause.code === 1) return toolText("No matches.");
        throw cause;
      }
    }
    if (name === "read_file") {
      const startLine = Number.isInteger(args.startLine) ? args.startLine : 1;
      const endLine = Number.isInteger(args.endLine) ? args.endLine : 400;
      if (startLine < 1 || endLine < startLine || endLine - startLine >= 400) return toolText("Request at most 400 lines with endLine >= startLine.", true);
      const file = await safePath(root, args.path);
      if (!(await stat(file)).isFile()) return toolText("Path is not a regular file.", true);
      const source = await readFile(file, "utf8");
      if (source.includes("\0")) return toolText("Binary files are not readable.", true);
      const excerpt = source.split("\n").slice(startLine - 1, endLine).map((line, index) => `${String(startLine + index).padStart(5)} | ${line}`).join("\n");
      return toolText(excerpt.length > 50_000 ? `${excerpt.slice(0, 50_000)}\n[truncated]` : excerpt || "(empty range)");
    }
    return toolText(`Unknown tool: ${name}`, true);
  } catch (cause) {
    return toolText(cause.message || "Unable to read the project.", true);
  }
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

async function handle(request) {
  if (!request || request.jsonrpc !== "2.0" || typeof request.method !== "string") return;
  const reply = (result) => request.id !== undefined && send({ jsonrpc: "2.0", id: request.id, result });
  if (request.method === "initialize") {
    reply({ protocolVersion: request.params?.protocolVersion || "2025-11-25", capabilities: { tools: { listChanged: false } }, serverInfo: { name: "project-context-reader", version: "0.1.0" }, instructions: "Read-only local project access for planning. First call select_project only when the user explicitly supplies or approves an absolute local path. Reuse its projectId in every later project_overview, search_code, read_file, and git_context call. Do not request secret files or modify the project." });
  } else if (request.method === "ping") reply({});
  else if (request.method === "tools/list") reply({ tools });
  else if (request.method === "tools/call") reply(await callTool(request.params?.name, request.params?.arguments));
  else if (request.id !== undefined) send({ jsonrpc: "2.0", id: request.id, error: { code: -32601, message: "Method not found" } });
}

let queue = Promise.resolve();
createInterface({ input: process.stdin, crlfDelay: Infinity }).on("line", (line) => {
  queue = queue.then(async () => {
    try { await handle(JSON.parse(line)); } catch { send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }); }
  });
});
