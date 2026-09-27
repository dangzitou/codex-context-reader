import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const result = spawnSync(process.execPath, ["scripts/chat-tunnel.mjs", "--dry-run", "--configure", "--tunnel-id", "tunnel_test"], { cwd: process.cwd(), encoding: "utf8" });
assert.equal(result.status, 0, result.stderr);
const output = JSON.parse(result.stdout);
assert.match(output.client, /tunnel-client$/);
assert.match(output.initArgs.join(" "), /server\.mjs/);
assert.deepEqual(output.doctorArgs, ["doctor", "--profile", "project-context-reader", "--explain"]);
console.log("Tunnel launcher check passed");
