import {
  cpSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  readdirSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const stage = join(root, "artifacts", "clients-widget");
// Stage only compiled assets and the manifest, never the working directory or .env.
rmSync(stage, { recursive: true, force: true });
mkdirSync(join(stage, "app"), { recursive: true });
cpSync(join(root, "dist"), join(stage, "app"), { recursive: true });
renameSync(join(stage, "app", "index.html"), join(stage, "app", "widget.html"));
cpSync(join(root, "plugin-manifest.json"), join(stage, "plugin-manifest.json"));
// Check the built HTML, since Vite relocates module scripts during bundling.
const entryHtml = readFileSync(join(stage, "app", "widget.html"), "utf8");
const sdkTag = '<script src="https://static.zohocdn.com/creator/widgets/version/2.0/widgetsdk-min.js"></script>';
if (entryHtml.indexOf(sdkTag) < 0 || entryHtml.indexOf(sdkTag) > entryHtml.indexOf('<script type="module"'))
  throw new Error("Portal SDK must load before the application module in the packaged HTML.");

const files = [];
function walk(path) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const file = join(path, entry.name);
    if (entry.isDirectory()) walk(file);
    else files.push(file);
  }
}
walk(stage);
if (files.length > 255) throw new Error("Widget exceeds Creator file limit.");
if (files.some((file) => /(^|\/)\.env/.test(file)))
  throw new Error("Environment file in widget package.");
const source = files.map((file) => readFileSync(file, "utf8")).join("\n");
if (/REFRESH_TOKEN|CLIENT_SECRET|Zoho-oauthtoken/.test(source))
  throw new Error("Server credential code found in widget package.");
const cli = join(root, "node_modules", "zoho-extension-toolkit", "index.js");
for (const command of ["validate", "pack"])
  execFileSync(process.execPath, [cli, command], {
    cwd: stage,
    stdio: "inherit",
    env: { ...process.env, NO_UPDATE_NOTIFIER: "1" },
  });
const archive = join(stage, "dist", "clients-widget.zip");
if (statSync(archive).size > 10 * 1024 * 1024)
  throw new Error("Widget exceeds Creator ZIP size limit.");
console.log(`Widget ready: ${archive}`);
