#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const expectedRoot = join(homedir(), "plugins", "project-context-reader");
if (pluginRoot !== expectedRoot) {
  throw new Error(`Clone this repository to ${expectedRoot} before running the installer.`);
}

const marketplacePath = join(homedir(), ".agents", "plugins", "marketplace.json");
let marketplace = { name: "personal", interface: { displayName: "Personal" }, plugins: [] };
try {
  marketplace = JSON.parse(await readFile(marketplacePath, "utf8"));
} catch (cause) {
  if (cause.code !== "ENOENT") throw cause;
}
if (!Array.isArray(marketplace.plugins) || typeof marketplace.name !== "string") throw new Error(`Invalid marketplace file: ${marketplacePath}`);
const entry = {
  name: "project-context-reader",
  source: { source: "local", path: "./plugins/project-context-reader" },
  policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
  category: "Productivity",
};
const index = marketplace.plugins.findIndex((plugin) => plugin.name === entry.name);
if (index === -1) marketplace.plugins.push(entry);
else marketplace.plugins[index] = entry;
await mkdir(dirname(marketplacePath), { recursive: true });
await writeFile(marketplacePath, `${JSON.stringify(marketplace, null, 2)}\n`);

if (process.argv.includes("--skip-codex")) process.exit(0);
const install = spawnSync("codex", ["plugin", "add", "project-context-reader@personal"], { stdio: "inherit" });
if (install.error?.code === "ENOENT") console.log("Marketplace entry created. Install Project Context Reader from the Personal marketplace in the ChatGPT desktop app.");
else if (install.status !== 0) process.exit(install.status || 1);
