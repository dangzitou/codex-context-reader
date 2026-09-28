#!/usr/bin/env node
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, readdir, realpath, stat } from "node:fs/promises";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";
import { createInterface } from "node:readline";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const EXCLUDED_PARTS = new Set([".git", "node_modules", "dist", "build", "coverage", ".next"]);
const SECRET_NAME = /^(?:\.env(?:\..*)?|.*\.(?:pem|key|p12|pfx))$/i;
const READ_BATCH_CHAR_BUDGET = 120_000;
const FALLBACK_FILE_LIMIT = 4_000;
const selectedProjects = new Map();
const PROJECT_SELECTION_IDLE_MS = Math.max(1_000, Number(process.env.PROJECT_SELECTION_IDLE_MS) || 30 * 60 * 1000);
const SELECTION_SWEEP_MS = Math.min(60_000, Math.ceil(PROJECT_SELECTION_IDLE_MS / 4));
const SELECTION_TTL_TEXT = PROJECT_SELECTION_IDLE_MS >= 60_000 ? `${Math.round(PROJECT_SELECTION_IDLE_MS / 60_000)} minutes` : `${Math.round(PROJECT_SELECTION_IDLE_MS / 1000)} seconds`;

setInterval(() => {
  const cutoff = Date.now() - PROJECT_SELECTION_IDLE_MS;
  for (const [projectId, entry] of selectedProjects) if (entry.lastUsed < cutoff) selectedProjects.delete(projectId);
}, SELECTION_SWEEP_MS).unref();

function toolText(content, isError = false) {
  return { content: [{ type: "text", text: content }], ...(isError && { isError: true }) };
}

async function projectRoot(projectId) {
  const entry = typeof projectId === "string" ? selectedProjects.get(projectId) : undefined;
  if (!entry) throw new Error("Unknown or expired projectId. Call select_project again.");
  entry.lastUsed = Date.now();
  return entry.root;
}

async function selectProject(requestedPath) {
  if (typeof requestedPath !== "string" || !isAbsolute(requestedPath)) throw new Error("path must be an absolute local directory path.");
  const root = await realpath(requestedPath);
  if (!(await stat(root)).isDirectory()) throw new Error("Selected path is not a directory.");
  const projectId = randomUUID();
  selectedProjects.set(projectId, { root, lastUsed: Date.now() });
  return `Selected project: ${basename(root)}\nPath: ${root}\nProject ID: ${projectId}\nUse this projectId for subsequent reads. It expires after ${SELECTION_TTL_TEXT} without reads or when the MCP server stops.`;
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

async function overview(root, requestedPath = ".") {
  let listRoot = root;
  let listing = "root";
  if (requestedPath !== undefined && requestedPath !== "." && requestedPath !== "") {
    listRoot = await safePath(root, requestedPath);
    if (!(await stat(listRoot)).isDirectory()) throw new Error("Path is not a directory.");
    listing = requestedPath;
  }
  const entries = await readdir(listRoot, { withFileTypes: true });
  const visible = entries.filter((entry) => !EXCLUDED_PARTS.has(entry.name) && !SECRET_NAME.test(entry.name)).slice(0, 80).map((entry) => `${entry.isDirectory() ? "dir " : "file"} ${entry.name}`);
  const [branch, status, commits] = await Promise.all([
    git(root, ["branch", "--show-current"]),
    git(root, ["status", "--short"]),
    git(root, ["log", "-3", "--format=%h %s"]),
  ]);
  return [`Project: ${basename(root)}`, `Listing: ${listing}`, `Branch: ${branch || "detached or unavailable"}`, `Working tree: ${status || "clean"}`, "Recent commits:", commits || "(unavailable)", "Entries:", visible.join("\n") || "(empty)"].join("\n");
}

function globToRegExp(pattern) {
  return new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, "\u0000").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]").replace(/\u0000/g, ".*")}$`);
}

async function fallbackSearch(root, target, query, globRe, maxResults) {
  const baseRel = relative(root, target).split(sep).filter(Boolean).join("/");
  const matches = [];
  let scanned = 0;
  async function scanFile(filePath, relPath) {
    if (matches.length >= maxResults || scanned >= FALLBACK_FILE_LIMIT) return;
    scanned++;
    let content;
    try { content = await readFile(filePath, "utf8"); } catch { return; }
    if (content.includes("\0")) return;
    const lines = content.split("\n");
    for (let index = 0; index < lines.length && matches.length < maxResults; index++) if (lines[index].includes(query)) matches.push(`${relPath}:${index + 1}:${lines[index]}`);
  }
  async function walk(dir, relPrefix) {
    if (matches.length >= maxResults || scanned >= FALLBACK_FILE_LIMIT) return;
    let dirents;
    try { dirents = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of dirents) {
      if (matches.length >= maxResults || scanned >= FALLBACK_FILE_LIMIT) return;
      if (entry.name.startsWith(".") || EXCLUDED_PARTS.has(entry.name) || SECRET_NAME.test(entry.name)) continue;
      const entryRel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(join(dir, entry.name), entryRel);
      else if (entry.isFile() && (!globRe || globRe.test(entryRel))) await scanFile(join(dir, entry.name), entryRel);
    }
  }
  let targetStat;
  try { targetStat = await stat(target); } catch { return "No matches."; }
  if (targetStat.isFile()) await scanFile(target, baseRel);
  else await walk(target, baseRel);
  const suffix = scanned >= FALLBACK_FILE_LIMIT && matches.length < maxResults ? `\n[fallback search stopped after scanning ${scanned} files; install ripgrep for full coverage]` : "";
  return matches.length ? `${matches.join("\n")}${suffix}` : `No matches.${suffix}`;
}

async function readExcerpt(root, requestedPath, startLine, endLine) {
  const file = await safePath(root, requestedPath);
  if (!(await stat(file)).isFile()) throw new Error("Path is not a regular file.");
  const source = await readFile(file, "utf8");
  if (source.includes("\0")) throw new Error("Binary files are not readable.");
  const lines = source.split("\n");
  const total = lines.length > 1 && lines[lines.length - 1] === "" ? lines.length - 1 : lines.length;
  const excerpt = lines.slice(startLine - 1, endLine).map((line, index) => `${String(startLine + index).padStart(5)} | ${line}`).join("\n");
  const body = excerpt.length > 50_000 ? `${excerpt.slice(0, 50_000)}\n[truncated]` : excerpt || "(empty range)";
  if (startLine > total) return `${body}\n[File has ${total} lines; the requested range starts past the end of the file.]`;
  if (endLine < total) return `${body}\n[File has ${total} lines; showing ${startLine}-${Math.min(endLine, total)}. Continue with startLine=${endLine + 1}.]`;
  return body;
}

const tools = [
  {
    name: "select_project",
    title: "Select local project",
    description: "Select one absolute local directory after the user explicitly names or approves it. Returns an opaque projectId required for later reads; the binding renews on every read and expires after 30 minutes of inactivity. This changes in-memory state and never writes a configuration file.",
    inputSchema: { type: "object", properties: { path: { type: "string", minLength: 2, maxLength: 2000, description: "Absolute path of the local project directory" } }, required: ["path"], additionalProperties: false },
    annotations: { readOnlyHint: false, openWorldHint: false },
  },
  {
    name: "project_overview",
    title: "Project overview",
    description: "Show a selected project's directory structure (root or any project-relative directory), Git branch, concise status, and three recent commit subjects. Call this before reading code.",
    inputSchema: { type: "object", properties: { projectId: { type: "string", description: "Opaque ID returned by select_project" }, path: { type: "string", maxLength: 500, default: ".", description: "Optional project-relative directory to list instead of the root" } }, required: ["projectId"], additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "search_code",
    title: "Search project code",
    description: "Find literal text in the configured project, optionally narrowed to files matching a glob. Excludes Git metadata, dependencies, build output, and likely secret files.",
    inputSchema: { type: "object", properties: { projectId: { type: "string", description: "Opaque ID returned by select_project" }, query: { type: "string", minLength: 1, maxLength: 300, description: "Literal text to find" }, glob: { type: "string", minLength: 1, maxLength: 100, description: "Optional include glob for file paths, e.g. \"*.ts\"" }, path: { type: "string", maxLength: 500, default: ".", description: "Optional project-relative directory or file" }, maxResults: { type: "integer", minimum: 1, maximum: 100, default: 40 } }, required: ["projectId", "query"], additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "read_file",
    title: "Read file excerpts",
    description: "Read a bounded line range from one, or up to eight, project-relative text files in a single call. Refuses Git metadata and likely secret files.",
    inputSchema: { type: "object", properties: { projectId: { type: "string", description: "Opaque ID returned by select_project" }, path: { type: "string", minLength: 1, maxLength: 500, description: "Project-relative file path (single read)" }, paths: { type: "array", minItems: 1, maxItems: 8, items: { type: "string", minLength: 1, maxLength: 500 }, description: "Up to 8 project-relative file paths read in one call" }, startLine: { type: "integer", minimum: 1, default: 1 }, endLine: { type: "integer", minimum: 1, default: 400 } }, required: ["projectId"], additionalProperties: false },
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
    if (name === "project_overview") return toolText(await overview(root, args.path));
    if (name === "git_context") {
      const [status, diff, commits] = await Promise.all([git(root, ["status", "--short"]), git(root, ["diff", "--stat"]), git(root, ["log", "-5", "--format=%h %ad %s", "--date=short"])]);
      return toolText(["Status:", status || "clean", "\nUncommitted diff summary:", diff || "none", "\nRecent commits:", commits].join("\n"));
    }
    if (name === "search_code") {
      if (typeof args.query !== "string" || !args.query || args.query.length > 300) return toolText("query must be 1 to 300 characters.", true);
      const glob = args.glob;
      if (glob !== undefined && (typeof glob !== "string" || !glob.trim() || glob.length > 100 || glob.includes(".."))) return toolText("glob must be 1 to 100 characters and cannot contain \"..\".", true);
      const path = args.path ?? ".";
      const maxResults = Number.isInteger(args.maxResults) ? args.maxResults : 40;
      if (maxResults < 1 || maxResults > 100) return toolText("maxResults must be between 1 and 100.", true);
      const target = path === "." ? root : await safePath(root, path);
      const globArgs = glob?.trim() ? ["--glob", glob.trim()] : [];
      try {
        const { stdout } = await execFileAsync("rg", ["--fixed-strings", "--line-number", "--no-heading", "--color", "never", "--max-count", String(maxResults), ...globArgs, "--glob", "!.git/**", "--glob", "!node_modules/**", "--glob", "!dist/**", "--glob", "!build/**", "--glob", "!coverage/**", "--glob", "!.next/**", "--glob", "!.env*", "--", args.query, target], { cwd: root, timeout: 10_000, maxBuffer: 150_000 });
        const lines = stdout.trim().split("\n").filter(Boolean).slice(0, maxResults);
        return toolText(lines.length ? lines.join("\n") : "No matches.");
      } catch (cause) {
        if (cause.code === 1) return toolText("No matches.");
        if (cause.code === "ENOENT" || process.env.PROJECT_SEARCH_FALLBACK === "1") return toolText(await fallbackSearch(root, target, args.query, globArgs.length ? globToRegExp(glob.trim()) : null, maxResults));
        throw cause;
      }
    }
    if (name === "read_file") {
      const startLine = Number.isInteger(args.startLine) ? args.startLine : 1;
      const endLine = Number.isInteger(args.endLine) ? args.endLine : 400;
      if (startLine < 1 || endLine < startLine || endLine - startLine >= 400) return toolText("Request at most 400 lines with endLine >= startLine.", true);
      const requestedPaths = Array.isArray(args.paths) ? args.paths : [args.path];
      if (!requestedPaths.length || requestedPaths.length > 8 || requestedPaths.some((p) => typeof p !== "string" || !p || p.length > 500)) return toolText("Provide one project-relative path, or 1 to 8 paths in \"paths\".", true);
      if (requestedPaths.length === 1) {
        try {
          return toolText(await readExcerpt(root, requestedPaths[0], startLine, endLine));
        } catch (cause) {
          return toolText(cause.message || "Unable to read the file.", true);
        }
      }
      const sections = [];
      let budget = READ_BATCH_CHAR_BUDGET;
      for (let index = 0; index < requestedPaths.length; index++) {
        let body;
        try { body = await readExcerpt(root, requestedPaths[index], startLine, endLine); }
        catch (cause) { body = `[error] ${cause.message || "Unable to read the file."}`; }
        if (body.length > budget) body = `${body.slice(0, budget)}\n[truncated to fit the batch output budget]`;
        sections.push(`===== ${requestedPaths[index]} =====\n${body}`);
        budget -= body.length;
        if (budget <= 0 && index < requestedPaths.length - 1) {
          sections.push("[Remaining files skipped: batch output budget reached.]");
          break;
        }
      }
      return toolText(sections.join("\n\n"));
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
