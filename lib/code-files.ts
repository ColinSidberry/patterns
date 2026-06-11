// Build-time file source for the /code viewer. Renders only GIT-TRACKED files,
// so anything gitignored (secrets like serviceAccount.json, .env*, personal
// notes) can never appear. Reads from the build checkout (process.cwd()), so no
// GitHub token or API is needed. Server-only; used at build time.

import { promises as fs } from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();

// Defense-in-depth: never render these even if somehow tracked.
function isSecretFile(name: string): boolean {
  return (
    name.startsWith(".env") ||
    name === ".npmrc" ||
    /serviceaccount/i.test(name) ||
    /credentials?/i.test(name) ||
    /\.(pem|key|p12|pfx|crt|cert)$/i.test(name)
  );
}

// Only render known text/source files.
const TEXT_EXT = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".json", ".css", ".scss", ".md", ".mdx",
  ".html", ".yml", ".yaml", ".txt", ".toml", ".sh",
]);
const TEXT_NAMES = new Set([".gitignore", "Dockerfile", "Makefile"]);

function isRenderable(name: string): boolean {
  if (isSecretFile(name)) return false;
  if (TEXT_NAMES.has(name)) return true;
  return TEXT_EXT.has(path.extname(name));
}

let cache: string[] | null = null;

export async function listFiles(): Promise<string[]> {
  if (cache) return cache;

  let tracked: string[] = [];
  try {
    // -z: null-delimited, safe for unusual filenames.
    const { stdout } = await execFileAsync("git", ["ls-files", "-z"], {
      cwd: ROOT,
      maxBuffer: 1024 * 1024 * 64,
    });
    tracked = stdout.split("\0").filter(Boolean);
  } catch {
    // Fail closed: if git isn't available, render nothing rather than risk
    // exposing untracked/ignored files via a disk walk.
    tracked = [];
  }
  if (tracked.length === 0) {
    console.warn("[code-files] git ls-files returned no files; /code will be empty");
  }

  const out = tracked.filter((f) => isRenderable(path.basename(f)));
  out.sort();
  cache = out;
  return out;
}

export async function readFile(rel: string): Promise<string | null> {
  // Only ever serve files that listFiles() approved (tracked + renderable).
  const allowed = new Set(await listFiles());
  if (!allowed.has(rel)) return null;

  const full = path.resolve(ROOT, rel);
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) return null;
  try {
    return await fs.readFile(full, "utf8");
  } catch {
    return null;
  }
}
