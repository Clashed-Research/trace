import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const vendor = path.join(root, "vendor", "hmem");
const executable = process.platform === "win32" ? "npx.cmd" : "npx";
function run(args, cwd = root) {
  const result = spawnSync(executable, args, { cwd, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (!fs.existsSync(path.join(vendor, "src", "index.ts"))) {
  run(["--yes", "degit", "meterless/meterless/engines/hmem/reference", "vendor/hmem"]);
}
await import("./patch-hmem.mjs");
if (!fs.existsSync(path.join(vendor, "node_modules"))) {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npm, ["install", "--no-audit", "--no-fund"], { cwd: vendor, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
