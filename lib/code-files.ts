// Build-time file source for the /code viewer. Renders only source files, never
// secrets. Reads from the build checkout (process.cwd()); no GitHub token/API.
// Server-only; used at build time.
//
// Strategy: prefer `git ls-files` (exact tracked set). If git is unavailable —
// as it is in the Vercel build — fall back to a disk walk. That's safe because
// any Vercel build (git clone or .gitignore-respecting CLI upload) contains
// ONLY tracked files, so gitignored secrets aren't on disk to begin with; and
// isSecretFile() blocks known-secret names regardless, covering local dev.

import { promises as fs } from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();

// Directories we never descend into.
const IGNORE_DIRS = new Set([
  "node_modules", ".next", ".git", ".vercel", ".turbo",
  "dist", "build", "coverage", ".idea", ".vscode",
]);

// Never render anything that could carry secrets or personal notes.
function isSecretFile(name: string): boolean {
  return (
    name.startsWith(".env") ||
    name === ".npmrc" ||
    name.startsWith(".dev-notes") ||
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

async function fromGit(): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("git", ["ls-files", "-z"], {
      cwd: ROOT,
      maxBuffer: 1024 * 1024 * 64,
    });
    return stdout.split("\0").filter(Boolean);
  } catch {
    return [];
  }
}

async function fromDisk(): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (IGNORE_DIRS.has(e.name)) continue;
        await walk(path.join(dir, e.name));
      } else {
        out.push(path.relative(ROOT, path.join(dir, e.name)));
      }
    }
  }
  await walk(ROOT);
  return out;
}

// Skip oversized files: huge data blobs exceed Vercel's prerender/ISR payload
// limit (build failure) and would make unusable pages anyway.
const MAX_BYTES = 1024 * 1024; // 1 MB

async function withinSizeLimit(rel: string): Promise<boolean> {
  try {
    const st = await fs.stat(path.resolve(ROOT, rel));
    return st.isFile() && st.size <= MAX_BYTES;
  } catch {
    return false;
  }
}

let cache: string[] | null = null;

export async function listFiles(): Promise<string[]> {
  if (cache) return cache;

  let files = await fromGit();
  if (files.length === 0) files = await fromDisk();

  const renderable = files.filter((f) => isRenderable(path.basename(f)));
  const sized: string[] = [];
  for (const f of renderable) {
    if (await withinSizeLimit(f)) sized.push(f);
  }
  sized.sort();
  cache = sized;
  return sized;
}

export async function readFile(rel: string): Promise<string | null> {
  // Only ever serve files that listFiles() approved (tracked/renderable, never
  // a secret). This also stops path traversal — anything outside the list 404s.
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
