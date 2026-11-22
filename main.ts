// gta6-meme-x-01 — entry link validator (round 7, fresh in-session write).
// Reads POST.json next to this file, validates the X post URL, and writes
// ONLY POST.json (exact filename) into MAKEFUN_OUTPUT_DIR.
// Node stdlib only. Never touches the repository itself at run time.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function fail(message: string): never {
  console.error(`entry link error: ${message}`);
  process.exit(1);
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR;
if (!outDir) fail("MAKEFUN_OUTPUT_DIR is not set");

let raw: string;
try {
  raw = readFileSync(join(here, "POST.json"), "utf8");
} catch {
  fail("POST.json not found next to main.ts");
}

let data: unknown;
try {
  data = JSON.parse(raw);
} catch {
  fail("POST.json is not valid JSON");
}

const candidate =
  typeof data === "string"
    ? data
    : typeof data === "object" && data !== null
      ? (data as Record<string, unknown>).post_url ??
        (data as Record<string, unknown>).url
      : undefined;
if (typeof candidate !== "string" || candidate.trim() === "") {
  fail('POST.json must hold an X status URL as a string, or {"post_url": "..."}');
}

let url: URL;
try {
  url = new URL(candidate.trim());
} catch {
  fail(`not a valid URL: ${candidate.trim()}`);
}

if (url.protocol !== "https:") fail("post URL must use https");
if (url.port !== "") fail("post URL must not carry a port");
if (url.username !== "" || url.password !== "") {
  fail("post URL must not carry credentials");
}
const hosts = new Set([
  "x.com",
  "www.x.com",
  "twitter.com",
  "www.twitter.com",
  "mobile.twitter.com",
]);
if (!hosts.has(url.hostname.toLowerCase())) {
  fail(`post URL host must be x.com or twitter.com, got ${url.hostname}`);
}
const m = /^\/([A-Za-z0-9_]{1,15})\/status\/(\d+)$/.exec(url.pathname);
if (!m) {
  fail("post URL must look like https://x.com/<handle>/status/<id>");
}

const canonical = `https://x.com/${m[1]}/status/${m[2]}`;
mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, "POST.json"),
  JSON.stringify({ post_url: canonical }, null, 2) + "\n",
  "utf8",
);
console.log(`entry link OK: ${canonical}`);
