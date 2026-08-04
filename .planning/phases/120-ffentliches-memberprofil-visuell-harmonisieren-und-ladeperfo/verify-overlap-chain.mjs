#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, unlinkSync, statSync } from "node:fs";
import { dirname, basename, isAbsolute, join, relative, resolve, sep } from "node:path";

const DIGEST = /^[a-f0-9]{64}$/;
const COMMANDS = new Set(["init", "check", "begin", "finish"]);
const REPEATABLE = new Set(["path", "expect", "latest"]);
const BLOCKED_FLAGS = new Set(["refresh", "accept", "auto-refresh", "force"]);

function fail(message) { throw new Error(message); }
function sha(value) { return createHash("sha256").update(value).digest("hex"); }
function canonical(value) {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
  }
  return JSON.stringify(value);
}
function withDigest(value, field = "manifestDigest") {
  const copy = structuredClone(value);
  delete copy[field];
  return { ...copy, [field]: sha(canonical(copy)) };
}
function parseArgs(argv) {
  const command = argv.shift();
  if (!COMMANDS.has(command)) fail("command must be one of init, check, begin, finish");
  const args = {};
  while (argv.length) {
    const token = argv.shift();
    if (!token.startsWith("--")) fail(`unexpected argument: ${token}`);
    const key = token.slice(2);
    if (BLOCKED_FLAGS.has(key)) fail(`--${key} is forbidden; authorization can never be refreshed or auto-accepted`);
    if (!argv.length || argv[0].startsWith("--")) fail(`--${key} requires a value`);
    const value = argv.shift();
    if (REPEATABLE.has(key)) (args[key] ??= []).push(value);
    else {
      if (key in args) fail(`duplicate option --${key}`);
      args[key] = value;
    }
  }
  return { command, args };
}
function requireOnly(args, allowed, required) {
  for (const key of Object.keys(args)) if (!allowed.includes(key)) fail(`unsupported option --${key}`);
  for (const key of required) if (args[key] === undefined || args[key].length === 0) fail(`--${key} is required`);
}
function findRepo(start) {
  let cursor = resolve(start);
  while (true) {
    if (existsSync(join(cursor, ".git"))) return cursor;
    const parent = dirname(cursor);
    if (parent === cursor) fail("repository root not found");
    cursor = parent;
  }
}
function inside(root, candidate, label) {
  const full = resolve(root, candidate);
  const rel = relative(root, full);
  if (rel === ".." || rel.startsWith(".." + sep) || isAbsolute(rel)) fail(`${label} is outside repository`);
  return full;
}
function normalizePath(root, value) {
  if (!value || isAbsolute(value)) fail("tracked path must be repository-relative");
  const full = inside(root, value, "tracked path");
  const normalized = relative(root, full).split(sep).join("/");
  if (!normalized || normalized.startsWith("../")) fail("invalid tracked path");
  return normalized;
}
function resolveFile(root, value, label) {
  if (!value) fail(`${label} is required`);
  return inside(root, value, label);
}
function actualHead(root) {
  const dotGit = join(root, ".git");
  let gitDir = dotGit;
  if (statSync(dotGit).isFile()) {
    const match = readFileSync(dotGit, "utf8").trim().match(/^gitdir:\s*(.+)$/);
    if (!match) fail("invalid .git file");
    gitDir = resolve(root, match[1]);
  }
  const headValue = readFileSync(join(gitDir, "HEAD"), "utf8").trim();
  if (/^[a-f0-9]{40,64}$/.test(headValue)) return headValue;
  const match = headValue.match(/^ref:\s*(.+)$/);
  if (!match) fail("repository HEAD is absent");
  const loose = join(gitDir, ...match[1].split("/"));
  if (existsSync(loose)) {
    const value = readFileSync(loose, "utf8").trim();
    if (/^[a-f0-9]{40,64}$/.test(value)) return value;
  }
  const packed = join(gitDir, "packed-refs");
  if (existsSync(packed)) {
    for (const line of readFileSync(packed, "utf8").split("\n")) {
      const [value, ref] = line.split(" ");
      if (ref === match[1] && /^[a-f0-9]{40,64}$/.test(value)) return value;
    }
  }
  fail("repository HEAD is absent");
}
function readJson(path, label) {
  if (!existsSync(path)) fail(`${label} does not exist`);
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch { fail(`${label} is not valid JSON`); }
}
function loadAuthorization(root, value) {
  const path = resolveFile(root, value, "authorization");
  const raw = readFileSync(path);
  const data = readJson(path, "authorization");
  if (data.schemaVersion !== 1) fail("unsupported authorization schemaVersion");
  if (typeof data.authorizationId !== "string" || !data.authorizationId.trim()) fail("authorizationId is absent");
  if (typeof data.capturedHead !== "string" || !/^[a-f0-9]{40,64}$/.test(data.capturedHead)) fail("authorization captured HEAD is absent");
  for (const key of ["statusSha256", "diffSha256", "baselineSha256"]) {
    if (!DIGEST.test(data[key] ?? "")) fail(`authorization ${key} is invalid`);
  }
  return { data, digest: sha(raw), path };
}
function verifyDigest(document, label) {
  if (!DIGEST.test(document.manifestDigest ?? "")) fail(`${label} manifestDigest is absent`);
  const expected = withDigest(document).manifestDigest;
  if (expected !== document.manifestDigest) fail(`${label} manifest digest mismatch`);
}
function loadManifest(root, value, auth) {
  const path = resolveFile(root, value, "manifest");
  const raw = readFileSync(path);
  const data = readJson(path, "manifest");
  verifyDigest(data, "manifest");
  if (data.schemaVersion !== 1) fail("unsupported manifest schemaVersion");
  if (!data.manifestId || typeof data.manifestId !== "string") fail("manifest id is absent");
  if (!data.inputHead || !/^[a-f0-9]{40,64}$/.test(data.inputHead)) fail("manifest input HEAD is absent");
  if (data.authorizationId !== auth.data.authorizationId) fail("manifest authorization ID mismatch");
  if (data.authorizationDigest !== auth.digest) fail("manifest authorization digest mismatch");
  if (!Array.isArray(data.entries) || data.entries.length === 0) fail("manifest entries are absent");
  const seen = new Set();
  for (const entry of data.entries) {
    entry.path = normalizePath(root, entry.path);
    if (seen.has(entry.path)) fail(`duplicate manifest path: ${entry.path}`);
    seen.add(entry.path);
    if (!DIGEST.test(entry.afterSha256 ?? "")) fail(`invalid after SHA-256 for ${entry.path}`);
    if (entry.beforeSha256 !== null && entry.beforeSha256 !== undefined && !DIGEST.test(entry.beforeSha256)) fail(`invalid before SHA-256 for ${entry.path}`);
  }
  return { data, rawDigest: sha(raw), path };
}
function splitMapping(root, value, label) {
  const index = value.indexOf("=");
  if (index <= 0 || index === value.length - 1) fail(`${label} must be path=manifest`);
  return { path: normalizePath(root, value.slice(0, index)), manifest: value.slice(index + 1) };
}
function fileDigest(root, path) {
  const full = inside(root, path, "tracked path");
  if (!existsSync(full) || !statSync(full).isFile()) fail(`tracked file missing: ${path}`);
  return sha(readFileSync(full));
}
function entryFor(manifest, path) {
  const entries = manifest.data.entries.filter((entry) => entry.path === path);
  if (entries.length !== 1) fail(`predecessor manifest does not contain exactly path ${path}`);
  return entries[0];
}
function verifyCurrent(root, path, manifest) {
  const entry = entryFor(manifest, path);
  const actual = fileDigest(root, path);
  if (actual !== entry.afterSha256) fail(`modified bytes for ${path}: expected ${entry.afterSha256}, got ${actual}`);
  return entry;
}
function mappings(root, values, label) {
  const result = new Map();
  for (const value of values ?? []) {
    const item = splitMapping(root, value, label);
    if (result.has(item.path)) fail(`duplicate ${label} path: ${item.path}`);
    result.set(item.path, item.manifest);
  }
  return result;
}
function ensureNewOutput(root, value) {
  const path = resolveFile(root, value, "output");
  if (existsSync(path)) fail(`output already exists: ${relative(root, path)}`);
  if (!existsSync(dirname(path))) fail("output directory does not exist");
  return path;
}
function writeImmutable(path, value) {
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
}
function receiptDigest(receipt) {
  const copy = structuredClone(receipt); delete copy.receiptDigest; return sha(canonical(copy));
}

function commandInit(root, args, auth) {
  requireOnly(args, ["authorization", "output", "path"], ["authorization", "output", "path"]);
  const output = ensureNewOutput(root, args.output);
  const paths = args.path.map((path) => normalizePath(root, path));
  if (new Set(paths).size !== paths.length) fail("duplicate tracked path");
  paths.sort();
  const inputHead = actualHead(root);
  const base = {
    schemaVersion: 1,
    manifestId: `initial:${auth.data.authorizationId}`,
    authorizationId: auth.data.authorizationId,
    authorizationDigest: auth.digest,
    inputHead,
    finishHead: inputHead,
    entries: paths.map((path) => ({ path, beforeSha256: null, afterSha256: fileDigest(root, path) })),
  };
  writeImmutable(output, withDigest(base));
  console.log(JSON.stringify({ manifest: relative(root, output).split(sep).join("/") }));
}
function commandCheck(root, args, auth) {
  requireOnly(args, ["authorization", "expect", "initial", "latest"], ["authorization"]);
  if (args.expect && args.initial) fail("--expect and --initial are mutually exclusive");
  if (!args.expect && !args.initial) fail("check requires --expect or --initial");
  if (args.latest && !args.initial) fail("--latest requires --initial");
  if (args.expect) {
    for (const [path, value] of mappings(root, args.expect, "expect")) {
      verifyCurrent(root, path, loadManifest(root, value, auth));
    }
  } else {
    const initial = loadManifest(root, args.initial, auth);
    const latest = mappings(root, args.latest, "latest");
    const initialPaths = new Set(initial.data.entries.map((entry) => entry.path));
    for (const path of latest.keys()) if (!initialPaths.has(path)) fail(`unrelated latest override: ${path}`);
    for (const entry of initial.data.entries) {
      const chosen = latest.has(entry.path) ? loadManifest(root, latest.get(entry.path), auth) : initial;
      verifyCurrent(root, entry.path, chosen);
    }
  }
  console.log(JSON.stringify({ ok: true }));
}
function commandBegin(root, args, auth) {
  requireOnly(args, ["authorization", "plan", "task", "output", "expect"], ["authorization", "plan", "task", "output", "expect"]);
  const output = ensureNewOutput(root, args.output);
  const expectations = mappings(root, args.expect, "expect");
  const before = [];
  for (const [path, value] of expectations) {
    const predecessor = loadManifest(root, value, auth);
    const entry = verifyCurrent(root, path, predecessor);
    before.push({
      path,
      beforeSha256: entry.afterSha256,
      predecessor: { manifestId: predecessor.data.manifestId, manifestSha256: predecessor.rawDigest },
    });
  }
  before.sort((a, b) => a.path.localeCompare(b.path));
  const receiptPath = join(dirname(output), `.${args.plan}-${args.task}-${randomUUID()}.receipt.json`);
  const base = {
    schemaVersion: 1, authorizationId: auth.data.authorizationId, authorizationDigest: auth.digest,
    plan: args.plan, task: args.task, inputHead: actualHead(root),
    output: relative(root, output).split(sep).join("/"), before,
  };
  writeImmutable(receiptPath, { ...base, receiptDigest: receiptDigest(base) });
  console.log(JSON.stringify({ receipt: relative(root, receiptPath).split(sep).join("/") }));
}
function commandFinish(root, args, auth) {
  requireOnly(args, ["authorization", "receipt", "output"], ["authorization", "receipt", "output"]);
  const output = ensureNewOutput(root, args.output);
  const receiptPath = resolveFile(root, args.receipt, "receipt");
  if (dirname(receiptPath) !== dirname(output) || !basename(receiptPath).startsWith(".") || !basename(receiptPath).endsWith(".receipt.json")) fail("receipt is not the matching hidden evidence receipt");
  const receipt = readJson(receiptPath, "receipt");
  if (receipt.receiptDigest !== receiptDigest(receipt)) fail("receipt digest mismatch");
  if (receipt.authorizationId !== auth.data.authorizationId || receipt.authorizationDigest !== auth.digest) fail("receipt authorization mismatch");
  if (receipt.output !== relative(root, output).split(sep).join("/")) fail("receipt output mismatch");
  if (!receipt.inputHead || !/^[a-f0-9]{40,64}$/.test(receipt.inputHead)) fail("receipt input HEAD is absent");
  if (!Array.isArray(receipt.before) || receipt.before.length === 0) fail("receipt before entries are absent");
  const seen = new Set();
  const entries = receipt.before.map((before) => {
    const path = normalizePath(root, before.path);
    if (seen.has(path)) fail(`duplicate receipt path: ${path}`); seen.add(path);
    if (!DIGEST.test(before.beforeSha256 ?? "") || !before.predecessor?.manifestId || !DIGEST.test(before.predecessor?.manifestSha256 ?? "")) fail(`invalid predecessor receipt for ${path}`);
    return { path, predecessor: before.predecessor, beforeSha256: before.beforeSha256, afterSha256: fileDigest(root, path) };
  });
  const finishHead = actualHead(root);
  const base = {
    schemaVersion: 1, manifestId: `${receipt.plan}:${receipt.task}:${randomUUID()}`,
    authorizationId: auth.data.authorizationId, authorizationDigest: auth.digest,
    plan: receipt.plan, task: receipt.task, inputHead: receipt.inputHead, finishHead, entries,
  };
  writeImmutable(output, withDigest(base));
  unlinkSync(receiptPath);
  console.log(JSON.stringify({ manifest: relative(root, output).split(sep).join("/") }));
}

try {
  const { command, args } = parseArgs(process.argv.slice(2));
  if (!args.authorization) fail("--authorization is required");
  const root = findRepo(process.cwd());
  const auth = loadAuthorization(root, args.authorization);
  if (command === "init") commandInit(root, args, auth);
  else if (command === "check") commandCheck(root, args, auth);
  else if (command === "begin") commandBegin(root, args, auth);
  else commandFinish(root, args, auth);
} catch (error) {
  console.error(`overlap-chain: ${error.message}`);
  process.exitCode = 1;
}
