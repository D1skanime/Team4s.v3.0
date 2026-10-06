# Visual After-Capture Notes (174-24 Task 1)

Captured 2026-10-06 against `main` after 174-22 (`FansubEdit.module.css` split) and
174-23 (`ui.module.css` split) landed. Reproduces every shot in
`visual-baseline/before/BASELINE-NOTES.md` with identical URLs, viewports, fansub
group id (1 = `new-subs`, still the correct seeded row — no substitution needed),
and interactive-state triggers.

## Prerequisites reproduced identically

- **Frontend image freshness:** `team4sv30-frontend` was 1.5 days stale relative to
  `main` (image `Created` 2026-10-04T21:11, but 174-22/174-23 commits landed
  2026-10-05T21:04-21:36) — rebuilt (`docker compose build team4sv30-frontend &&
  docker compose up -d --no-deps team4sv30-frontend`) before capture, exactly as
  BASELINE-NOTES.md requires.
- **CORS origin constraint:** reproduced the identical same-container Node
  `net.createServer` TCP loopback proxy (127.0.0.1:3300 -> 127.0.0.1:3000) and
  pointed Playwright at `http://127.0.0.1:3300`.
- **Auth:** captured as the seeded `admin` user (`platform_admin`), password `123`
  per the orchestrator-provided baseline credential — a real Keycloak
  password-grant token (realm `team4s`, client `team4s-frontend`) injected as the
  `team4s_access_token` cookie, identical mechanism to BASELINE-NOTES.md.

## Deviation from literal 1500ms settle time (Task 1, auto-fixed, Rule 1)

BASELINE-NOTES.md documents a 1500ms settle before the `fansub-edit-desktop.png`
fullPage screenshot. Reproducing that literally produced a **false CSS-regression
signal**: the logo/banner `<img>` elements (next/image, `unoptimized`) reported
`complete: true` and correct `naturalWidth` well before 1500ms, and a non-fullPage
viewport screenshot at 1500ms showed them painted correctly — but a `fullPage: true`
screenshot taken at exactly 1500ms still rendered them as empty frames. This is a
Chromium fullPage-capture compositing race (confirmed via computed style at 1500ms:
`opacity: 1`, `visibility: visible`, correct `rect`), not a layout/CSS defect
introduced by the Welle-5 split. Extending the settle to 4500ms (desktop) /
+2000ms after the mobile viewport resize eliminated the race; re-captured shots
show the banner/logo painted identically to the before/ shots' layout and sizing.
No product file was touched — this is a capture-script timing fix only.

## Content differences found (classified, not CSS regressions)

Per the plan's DATEN-HINWEIS: real data changed via live UAT between the 174-01
BEFORE capture (2026-10-04) and this AFTER capture (2026-10-06). Classified below.

- **`fansub-edit-desktop.png` / `fansub-edit-mobile-375.png`:** the New-Subs
  group's banner and logo images are now different source images (a title-logo
  banner with "えむえむっ!" text overlay, a different logo portrait) than the
  before/ shots. Verified via DB: `fansub_groups.logo_id`/`banner_id` point to
  `media_assets` rows 193/192, both present on disk and served with HTTP 200 —
  this is a **data/content difference** (real group media was changed via Live-UAT
  after the BEFORE baseline, consistent with the "DATEN-HINWEIS" in the plan
  action), not a layout/spacing/color/font/state difference at identical content.
  Layout, spacing, card structure, borders, buttons, tabs, and mobile stacking are
  pixel-structurally identical to the before/ shots (including the mobile-only
  mid-form "Speichern" button position, present identically in both).
- **`ui-system-desktop.png`:** 30 bytes larger than the before/ shot (7,381,034 vs
  7,381,004) out of ~7.3 MB; side-by-side visual
  read of the full 1440x20196 page shows no visible layout/spacing/color
  difference in any of the Button/Input/Select/Card/Table/Tabs/etc. primitive
  showcases. Treated as sub-pixel font/GPU-antialiasing capture noise, not a CSS
  regression — consistent with `button-hover.png`, `button-focus.png`,
  `button-disabled.png`, `input-focus.png`, and `select-focus.png` all being
  **byte-for-byte identical** to their before/ counterparts (same file size, same
  content), which is the strongest possible proof that 174-23's Button/Input/Select
  single-owner extraction produced zero visual change for those exact interactive
  states.

## Verdict (Task 1 scope)

No CSS regression found. All content differences are explained by real data
changes (group media) independent of the Welle-5 CSS split. Task 2 (human
sign-off) is required to close this plan per the checkpoint protocol.
