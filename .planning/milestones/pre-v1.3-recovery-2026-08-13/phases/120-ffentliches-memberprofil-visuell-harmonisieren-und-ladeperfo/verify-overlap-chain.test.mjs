import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
const helper = new URL("./verify-overlap-chain.mjs", import.meta.url).pathname;
const sha = (value) => createHash("sha256").update(value).digest("hex");
function run(repo, ...args) { return spawnSync(process.execPath, [helper, ...args], { cwd: repo, encoding: "utf8" }); }
function fixture() {
  const repo = mkdtempSync(join(tmpdir(), "overlap-chain-"));
  mkdirSync(join(repo, ".git/refs/heads"), { recursive: true });
  mkdirSync(join(repo, "evidence")); mkdirSync(join(repo, "src"));
  writeFileSync(join(repo, "src/a.txt"), "alpha\n"); writeFileSync(join(repo, "src/b.txt"), "bravo\n");
  const head = "0123456789abcdef0123456789abcdef01234567"; const auth = join(repo, "authorization.json");
  writeFileSync(join(repo, ".git/HEAD"), "ref: refs/heads/main\n");
  writeFileSync(join(repo, ".git/refs/heads/main"), head + "\n");
  writeFileSync(auth, JSON.stringify({ schemaVersion: 1, authorizationId: "auth-test-001", actor: "test", authorizedAt: "2026-08-04T00:00:00.000Z", capturedHead: head, statusSha256: sha("status"), diffSha256: sha("diff"), baselineSha256: sha("baseline") }, null, 2) + "\n");
  return { repo, auth, head };
}
function init(f, paths = ["src/a.txt", "src/b.txt"], output = "evidence/initial.json") {
  const args = ["init", "--authorization", f.auth, "--output", output]; for (const path of paths) args.push("--path", path);
  const r = run(f.repo, ...args); assert.equal(r.status, 0, r.stderr); return join(f.repo, output);
}
function begin(f, expect, output, task = "task-1") {
  const r = run(f.repo, "begin", "--authorization", f.auth, "--plan", "120-02", "--task", task, "--output", output, "--expect", expect);
  assert.equal(r.status, 0, r.stderr); return join(f.repo, JSON.parse(r.stdout).receipt);
}
function finish(f, receipt, output) { return run(f.repo, "finish", "--authorization", f.auth, "--receipt", relative(f.repo, receipt), "--output", output); }
test("every command requires authorization and refresh flags are rejected", () => {
  const f = fixture(); for (const command of ["init", "check", "begin", "finish"]) { const r = run(f.repo, command, "--refresh"); assert.notEqual(r.status, 0); assert.match(r.stderr, /refresh|authorization/i); }
});
test("init rejects absent HEAD, invalid authorization digests, missing paths and duplicates", () => {
  const f = fixture(); const auth = JSON.parse(readFileSync(f.auth, "utf8")); delete auth.capturedHead; writeFileSync(f.auth, JSON.stringify(auth));
  assert.notEqual(run(f.repo, "init", "--authorization", f.auth, "--output", "evidence/x.json", "--path", "src/a.txt").status, 0);
  auth.capturedHead = f.head; auth.diffSha256 = "not-a-digest"; writeFileSync(f.auth, JSON.stringify(auth));
  assert.notEqual(run(f.repo, "init", "--authorization", f.auth, "--output", "evidence/x.json", "--path", "src/a.txt").status, 0);
  auth.diffSha256 = sha("diff"); writeFileSync(f.auth, JSON.stringify(auth));
  assert.notEqual(run(f.repo, "init", "--authorization", f.auth, "--output", "evidence/x.json", "--path", "src/missing.txt").status, 0);
  assert.notEqual(run(f.repo, "init", "--authorization", f.auth, "--output", "evidence/x.json", "--path", "src/a.txt", "--path", "src/a.txt").status, 0);
});
test("init is immutable and check rejects changed or missing bytes", () => {
  const f = fixture(); const initial = init(f);
  assert.notEqual(run(f.repo, "init", "--authorization", f.auth, "--output", "evidence/initial.json", "--path", "src/a.txt").status, 0);
  writeFileSync(join(f.repo, "src/a.txt"), "changed\n"); assert.notEqual(run(f.repo, "check", "--authorization", f.auth, "--expect", `src/a.txt=${initial}`).status, 0);
  writeFileSync(join(f.repo, "src/a.txt"), "alpha\n"); writeFileSync(join(f.repo, "src/b.txt"), "");
  assert.notEqual(run(f.repo, "check", "--authorization", f.auth, "--expect", `src/b.txt=${initial}`).status, 0);
});
test("check rejects wrong predecessor path, authorization mismatch, digest mismatch and absent manifest HEAD", () => {
  const f = fixture(); const initial = init(f); const manifest = JSON.parse(readFileSync(initial, "utf8"));
  const cases = [(m) => { m.entries[0].path = "src/other.txt"; }, (m) => { m.authorizationId = "other-auth"; }, (m) => { m.manifestDigest = sha("tampered"); }, (m) => { delete m.inputHead; }];
  for (const [index, mutate] of cases.entries()) { const copy = structuredClone(manifest); mutate(copy); const path = join(f.repo, `evidence/bad-${index}.json`); writeFileSync(path, JSON.stringify(copy)); assert.notEqual(run(f.repo, "check", "--authorization", f.auth, "--expect", `src/a.txt=${path}`).status, 0); }
});
test("begin rejects reused outputs and writes unique hidden receipts", () => {
  const f = fixture(); const initial = init(f); writeFileSync(join(f.repo, "evidence/existing.json"), "{}");
  assert.notEqual(run(f.repo, "begin", "--authorization", f.auth, "--plan", "120-02", "--task", "task-1", "--output", "evidence/existing.json", "--expect", `src/a.txt=${initial}`).status, 0);
  const first = begin(f, `src/a.txt=${initial}`, "evidence/step-1.json", "one"); const second = begin(f, `src/a.txt=${initial}`, "evidence/step-2.json", "two");
  assert.match(relative(f.repo, first), /^evidence\/\./); assert.notEqual(first, second); assert.ok(existsSync(first)); assert.ok(existsSync(second));
});
test("finish detects tampered receipts and refuses output overwrite", () => {
  const f = fixture(); const initial = init(f); const receipt = begin(f, `src/a.txt=${initial}`, "evidence/step.json");
  const data = JSON.parse(readFileSync(receipt, "utf8")); data.before[0].beforeSha256 = sha("wrong"); writeFileSync(receipt, JSON.stringify(data));
  assert.notEqual(finish(f, receipt, "evidence/step.json").status, 0);
  const receipt2 = begin(f, `src/a.txt=${initial}`, "evidence/fresh.json", "task-2"); writeFileSync(join(f.repo, "evidence/fresh.json"), "{}");
  assert.notEqual(finish(f, receipt2, "evidence/fresh.json").status, 0);
});
test("valid two-transition chain preserves predecessors and final audit applies exact latest overrides", () => {
  const f = fixture(); const initial = init(f); const receipt1 = begin(f, `src/a.txt=${initial}`, "evidence/step-1.json", "one");
  writeFileSync(join(f.repo, "src/a.txt"), "alpha-2\n"); const r1 = finish(f, receipt1, "evidence/step-1.json"); assert.equal(r1.status, 0, r1.stderr); assert.equal(existsSync(receipt1), false);
  const step1 = join(f.repo, "evidence/step-1.json"); const receipt2 = begin(f, `src/a.txt=${step1}`, "evidence/step-2.json", "two");
  writeFileSync(join(f.repo, "src/a.txt"), "alpha-3\n"); const r2 = finish(f, receipt2, "evidence/step-2.json"); assert.equal(r2.status, 0, r2.stderr);
  const step2 = join(f.repo, "evidence/step-2.json"); const m2 = JSON.parse(readFileSync(step2, "utf8"));
  assert.equal(m2.entries[0].beforeSha256, sha("alpha-2\n")); assert.equal(m2.entries[0].afterSha256, sha("alpha-3\n"));
  assert.equal(m2.entries[0].predecessor.manifestSha256, sha(readFileSync(step1))); assert.match(m2.manifestDigest, /^[a-f0-9]{64}$/);
  const audit = run(f.repo, "check", "--authorization", f.auth, "--initial", initial, "--latest", `src/a.txt=${step2}`); assert.equal(audit.status, 0, audit.stderr);
});
test("final audit rejects unrelated latest overrides and still checks every initial path", () => {
  const f = fixture(); const initial = init(f);
  assert.notEqual(run(f.repo, "check", "--authorization", f.auth, "--initial", initial, "--latest", `src/nope.txt=${initial}`).status, 0);
  writeFileSync(join(f.repo, "src/b.txt"), "changed\n"); assert.notEqual(run(f.repo, "check", "--authorization", f.auth, "--initial", initial).status, 0);
});
