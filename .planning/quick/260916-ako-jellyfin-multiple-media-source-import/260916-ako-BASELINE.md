# Multi-MediaSource import baseline — 2026-09-16

Start: `44268512`, clean canonical Linux worktree; Compose backend/frontend running.

## Read-only provider evidence

Fresh GET `/Shows/{11eyes-series-id}/Episodes` with the existing configured Jellyfin client probe (credentials never logged): 27 actual Items, 52 MediaSource representations, 38 distinct MediaSource IDs. Fourteen aliases have the same normalized provider path; no missing source IDs or inconsistent paths for repeated IDs. Season 1 episodes 2 and 3 each contain B-SH, FlameHazeSubs, Strawhat under one actual Item. The 38 count applies to this dataset, not a universal counting rule. Two sources are Season 0 OVA.

## Shared browser baseline

User logged in. Visible flow: `/admin/anime/2/episodes` → `Import & Mapping` → `Vorschau laden`.
Episode 1 already has three versions. Current preview shows only B-SH for episodes 2 and 3. Twenty-two normal-episode target inputs were present. Subsequent authoritative folder verification established that both OVA sources are outside the configured anime folder and are therefore not offered by this import context. No import or form save performed during baseline.

## Read-only database preflight

16 stream_sources; 4 carry selected Jellyfin snapshots; zero duplicate nonempty selected MediaSource IDs. Anime 2 has 12 neutral episodes and 3 release versions. No rows modified.

## Frontend checks before edits

- `npm run typecheck`: PASS.
- `npm run lint`: 3 errors, 319 warnings.
- Error details: `capture-responsive.cjs` lines 1/2 (require imports), `src/app/admin/users/tabs/CapabilityDetailRow.tsx` line 77 (unescaped quote).
- These are pre-existing and outside this fix. No broad lint cleanup authorized.

No NAS/Jellyfin mutations, rescans, database resets or provider credential changes.

## Isolated production build before implementation

Frozen `git archive 44268512 frontend` in the frontend container `/tmp/quick-260916-ako-baseline/frontend`; existing node_modules reused, NODE_ENV=production, `npm run build -- --webpack`. Source compilation succeeds. Next route type validation fails on the existing named export `buildCreateSuccessMessage` in `src/app/admin/anime/create/page.tsx`. The dev `.next` and source checkout are untouched. Full log is in the container `/tmp/quick-260916-ako-build-before.log`.

Runtime migration preflight: versions 1–165 applied, zero pending before the new migration.
