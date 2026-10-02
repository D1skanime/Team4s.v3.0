# Phase 173 Plan 16 — Task 3 Checklist (joint execution: orchestrator + human user)

**Purpose:** Task 3 of `173-16-PLAN.md` — backup, run the Phase-173 display-variant backfill
(`DRY_RUN=true` first, then for real), and perform the full live D-13 UAT on `:3300`/`:3000`. Per
explicit user instruction, this was **not** run autonomously by the executor. This checklist is
ready to run as-is; every command below was verified read-only (binary paths, env vars, DB
contents, live route responses) but **not executed destructively**.

All commands assume `ssh team4s-linux`, `cd /home/d1sk/team4s`.

---

## Step 0 — Backups (run BEFORE anything else, in this order)

The backfill's fansub-namespace migration (D-09/D-17) **physically moves files** and the
generic/story-image phases **write new rows**. Both are additive/idempotent by design (D-11
confirmed by `173-07`'s tests), but back up first per the threat register's T-173-16-01 mitigation
(dry-run-first convention) and CLAUDE.md's "preserve `media/`/imported databases" rule.

```bash
mkdir -p /home/d1sk/team4s/backups

# 1. Media directory (239M at last check, mounted from host at ./media)
tar -czf /home/d1sk/team4s/backups/media-pre-173-16-backfill-$(date +%Y%m%d-%H%M%S).tar.gz \
  -C /home/d1sk/team4s media

# 2. Database (team4s_v2, custom-format pg_dump via the running db container, no password needed
#    -- local trust auth inside the container, verified read-only in this session)
docker compose exec -T team4sv30-db pg_dump -U team4s -d team4s_v2 -F c \
  > /home/d1sk/team4s/backups/team4s_v2-pre-173-16-backfill-$(date +%Y%m%d-%H%M%S).dump
```

Verify both backup files are non-trivially sized before proceeding (`ls -lh
/home/d1sk/team4s/backups/`). Expect the media tarball in the tens-of-MB range (compressed from
239M) and the DB dump in the hundreds-of-KB-to-low-MB range (733KB observed for a read-only test
dump in this session).

**Restore commands (reference only, hopefully never needed):**
```bash
# Media: tar -xzf <tarball> -C /home/d1sk/team4s   (overwrites ./media in place)
# DB:    docker compose exec -T team4sv30-db pg_restore -U team4s -d team4s_v2 --clean < <dump>
```

---

## Step 1 — Backfill: DRY_RUN first

```bash
docker compose exec -T -e DRY_RUN=true team4sv30-backend sh -lc \
  "cd /app && PATH=/usr/local/go/bin:\$PATH go run ./cmd/migrate-display-backfill"
```

The container already has `DATABASE_URL=postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_v2?sslmode=disable`
and `MEDIA_STORAGE_DIR=/app/media` set (verified in this session — these match the binary's own
defaults exactly, so no extra env vars are needed beyond `DRY_RUN`). `ffmpeg` (`/usr/bin/ffmpeg`)
and `vipsthumbnail` (`/usr/bin/vipsthumbnail`) are both present and at their default paths
(verified via `which` in the running container).

**Review the printed stats summary** (`Total candidates` / `Successfully processed` / `Failed`).
`Failed` must be `0`. A non-zero `Total candidates` is expected and healthy — it means real
pre-existing assets are waiting for their `display` variant / namespace migration (confirmed in
this session: e.g. all 6 fansub-group logos currently have only an `original` `media_files` row,
no `display` row yet, and live under the flat `/app/media/logo_*.png` path, not
`/app/media/fansub/<group_id>/...`).

---

## Step 2 — Backfill: the real run

Only after Step 1's dry-run summary looks sane (zero failures, candidate count matches
expectations):

```bash
docker compose exec -T team4sv30-backend sh -lc \
  "cd /app && PATH=/usr/local/go/bin:\$PATH go run ./cmd/migrate-display-backfill"
```

Review the summary again — `Failed` must still be `0`.

**Idempotency re-check (recommended, per 173-07's own SUMMARY):** run Step 1's exact `DRY_RUN=true`
command once more. `Total candidates` should now be `0` (everything already backfilled/migrated).

---

## Step 3 — Live D-13 UAT on `http://127.0.0.1:3300` (desktop) and mobile emulation (375px, DPR 3)

All six public surfaces named in `173-CONTEXT.md`'s findings, cross-referenced against the
specific D-IDs each check proves. Open DevTools (Network tab, device toolbar for mobile emulation)
before navigating.

### 3a. Backend contract + namespace redirect (D-05, D-09, D-17)

1. **Legacy fansub media URL redirects (D-09/D-17):** request a pre-backfill flat legacy path —
   e.g. `curl -I http://127.0.0.1:3300/api/v1/media/files/logo_1787928990830_d3b5184c5dc28cca.png`
   (New-Subs' logo, group id 1, confirmed present in the live DB this session). Expect **HTTP 301**
   with a `Location` header now pointing at `/media/fansub/1/logo_1787928990830_d3b5184c5dc28cca.png`.
   Then `curl -I` that new URL directly — expect **HTTP 200**.
2. **`display_url` present in API responses (D-05):** open Network tab, reload a fansub group page
   (e.g. `/fansubs/new-subs`), inspect the group/profile JSON response — confirm a `display_url`
   field is populated (not null) for the logo/banner, alongside the unchanged `thumbnail_url`/
   `original_url`.

### 3b. Transparency / PNG (D-18) — fansub group logos

Real transparent-PNG candidates confirmed in this session (all `512x512 RGBA`, currently only an
`original` row, no `display` row yet — i.e. they'll gain a `display` row during Step 1/2):
`New-Subs` (`/fansubs/new-subs`), `Bloody-Shadow` (`/fansubs/bloody-shadow`), `AnimeOwnage`
(`/fansubs/animeownage`).

- Open one of these group pages on a **light** background page area AND confirm no checkerboard/
  black/white box appears behind the logo (transparency preserved, not flattened to JPEG).
- Open the same page with the OS/browser in dark mode, or scroll to a dark-background section of
  the page — confirm the logo's transparent background still shows the page background through it,
  not a stray solid box.
- DevTools Network tab: confirm the logo request is still `.png` (via `_next/image` once optimized,
  or the direct path), never silently converted to `.jpg`.

### 3c. Release gallery / hero (D-02/D-03/D-26/D-27 — REQ-173-26/27)

Open `http://127.0.0.1:3300/anime/1/group/1/releases/27` (confirmed 10 real
`release_version_media` rows in this session).

- **Desktop (1440px+):** every gallery thumbnail renders visibly sharp (no pixelation). DevTools
  Network tab: confirm `_next/image?url=...` requests, with the decoded `url` param pointing at a
  `display`-variant path (not `thumbnail`/`original`).
- **Mobile emulation (375px, DPR 3):** same sharpness/Network checks; confirm the normal grid cards
  request a `w=` value that rounds up to at least the `1480` deviceSize bucket (not `640`) — this
  is Task 0's `sizes` fix; confirm **no horizontal overflow** anywhere on the page.
- **Click-to-original (D-03):** click into the lightbox on both viewports; confirm the Network tab
  shows a NEW request for the `original_url` path (larger file size) only after the click — the
  thumbnail/display request must not already be the original.
- Also open `http://127.0.0.1:3300/anime/1/group/1` (project/hero page) and repeat the sharpness +
  Network-tab check for the hero banner/poster.

### 3d. Fansub group media gallery + banner/logo (D-02 — REQ-173-28)

Open `http://127.0.0.1:3300/fansubs/new-subs` (and/or `/fansubs/bloody-shadow`,
`/fansubs/animeownage`).

- Confirm the group media gallery tiles, banner, and logo all render sharp; Network tab shows
  `_next/image` requests sourced from `display_url`.
- Click a gallery tile's lightbox — confirm original loads only after the click (D-03).

### 3e. Public member profile avatar/background (D-02/D-04/D-07 — REQ-173-29)

Open `http://127.0.0.1:3300/members/timer` (confirmed live, HTTP 200, in Task 0a's checks this
session).

- Confirm avatar and background render sharp; Network tab shows `_next/image` sourced from
  `display_url` for a NON-animated avatar/background.
- **If this member (or another member you pick) has an animated GIF/WebP avatar:** confirm it
  renders the TRUE ORIGINAL, unoptimized (no `_next/image` wrapping, raw `<img>` request for the
  original file) — D-07's guarantee, proven in `173-15`'s own regression test but worth a live
  spot-check.
- **No animated avatar exists in the current dataset** (confirmed via a DB query this session) —
  see Step 3g below for the fresh-upload check that exercises this path for real.

### 3f. The two documented `imageDisplay.ts` exceptions (D-16)

Open `http://127.0.0.1:3300/anime/1` (an anime detail page, NOT the group/project page) and inspect
the poster. Separately, find any page rendering `AnimeMediaProvider`'s `AnimeTitleLogo`/
`AnimeInfoBanner`.

- Confirm these TWO specific surfaces are sharp (the backend-side 173-09 fix feeds them a
  display-preferring source already) but their Network-tab requests look like `imageDisplay.ts`'s
  own on-the-fly resize query shape (e.g. a query string resembling `?display=...`), NOT a
  `_next/image?url=...&w=...` request. This is intentional — do not treat it as a bug.

### 3g. Animated GIF/WebP stay animated (D-19/D-20/D-21) — requires a fresh upload

No animated asset exists in the current dataset (confirmed via DB query), so this check needs a
fresh upload during this session:

1. Through the admin uploader, upload one animated GIF into a release-version-media gallery (or
   any non-`segment_preview` asset type). Confirm (via the API response's `display` variant URL,
   or a direct file check under `media/`) that its `display` file is a genuine ANIMATED WebP
   (not a single static frame) — `file <path>` should report multiple frames, or open it in a
   browser and watch it loop.
2. Repeat with an animated WebP upload (NOT a Kara/`segment_preview` asset — those correctly stay
   rejected per D-20). Confirm it is ACCEPTED and its `display` variant is also animated.
3. Attempt an animated WebP as a Kara/`segment_preview` asset specifically — confirm it is still
   REJECTED (D-20's one narrow exception).
4. View the newly-uploaded animated asset on its public page — confirm it renders animated (not a
   static first frame) and is served `unoptimized` (no `_next/image` wrapping breaking the
   animation).

### 3h. Task 0a's E426 safety net (live-UAT finding this session)

1. `curl -I http://127.0.0.1:3300/fansubs/new-subs` → expect **HTTP 200** (this returned HTTP 500
   with an E426 error before this session's Task 0a fix — re-confirm it stays fixed after the
   backfill changes underlying data).
2. Same for `/fansubs/new-subs/fansubprojekt/buddy-complex`, `/anime/1/group/1`,
   `/anime/1/group/1/releases/27`, `/members/timer` — all **HTTP 200**, no E426 text anywhere in
   the response body (`curl -s ... | grep -c E426` → `0`).
3. **After** the backfill runs (Steps 1-2), re-run these same 5 curl checks once more — confirm
   they are STILL all HTTP 200 (the backfill changes which `media_files` rows exist and which paths
   are flat vs. namespaced, so this is the regression check that Task 0a's fix keeps holding against
   the POST-backfill data shape too, not just the pre-backfill shape it was built against).

### 3i. Performance: cold-cache RAM/CPU (D-13)

```bash
docker compose restart team4sv30-frontend
# wait ~10s for the container to be ready, then load a real gallery page once in the browser
# (e.g. the release-27 gallery from 3c), then immediately:
docker stats --no-stream team4sv30-frontend
```

Record the peak RAM/CPU% for the phase SUMMARY.

---

## Step 4 — After all of the above pass

Report back to the executor/orchestrator with: (a) confirmation every sub-step above passed or a
list of concrete deviations, (b) the recorded RAM/CPU numbers from Step 3i, and (c) explicit
acknowledgement of the two documented `imageDisplay.ts` exceptions (3f). The executor will then
write the final `173-16-SUMMARY.md` (replacing the interim one left by this session), run the
`state`/`roadmap`/`requirements` completion commands, and close out Phase 173.
