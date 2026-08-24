# Member-profile seed fixture (`seed-member-profile-fixtures.mjs`)

Reusable, **idempotent**, API-driven seed that populates the two reference public
member profiles — `csubs-leader` (member 1) and `sheppert` (member 2) — plus the
supporting fansub groups, anime, release versions, memberships, roles,
contributions and awarded release credits that make up the full Phase-129
scenario matrix.

It talks **only to the real creation/admin API** (Keycloak direct-grant token —
no direct SQL writes), so it doubles as the Phase-134 clean-reset fixture: run it
once on a fresh database and both reference profiles are fully populated.

**Phase 134-01 extension:** the script now also uploads one real, member-owned
story image per reference profile (`scripts/fixtures/seed134-story.jpg`, the
only binary asset this script reads from disk) via
`POST /api/v1/me/profile/story-images`, and its scenario constants/assertions
are driven from `scripts/member-profile-fixture.manifest.json` — the single
checked-in source of truth (see `scripts/README-manifest.md`).

## Requirements

- Node 18+ (uses global `fetch`, `FormData`, `Blob`; **no npm dependencies**).
- Network reach to the backend API and Keycloak.
- Two accounts: an admin (Token A) and `sheppert` (Token B) — see below.
- `scripts/fixtures/seed134-story.jpg` and `scripts/member-profile-fixture.manifest.json`
  present alongside the script (both are checked into git; no separate setup).

## How to run

```bash
node scripts/seed-member-profile-fixtures.mjs
```

The local Linux VM currently has **no host-level Node**; Node lives inside the
`team4sv30-frontend` container, which can reach the published API/Keycloak ports.
Run it there:

```bash
docker cp scripts/seed-member-profile-fixtures.mjs team4sv30-frontend:/tmp/seed.mjs
docker exec team4sv30-frontend node /tmp/seed.mjs
```

Any Node 18+ host that can reach `SEED_API_BASE` / `SEED_KC_BASE` works equally.

The script prints a per-step log and finishes with a `=== SUMMARY ===` block and
a final `RESULT: PASS` / `RESULT: FAIL` line. Exit code is `0` on PASS, `1` on
any failed assertion or fatal error.

## Environment variables

All optional; defaults target the live VM. Never read ports from `.env` literals —
override here instead.

| Variable             | Default                          | Meaning                                        |
| -------------------- | -------------------------------- | ---------------------------------------------- |
| `SEED_API_BASE`      | `http://192.168.235.196:18092`   | Backend API base URL                           |
| `SEED_KC_BASE`       | `http://192.168.235.196:18081`   | Keycloak base URL                              |
| `SEED_ADMIN_USER`    | `csubs-leader@team4s.local`      | Token A — platform admin, linked to member 1   |
| `SEED_ADMIN_PW`      | `123`                            | Token A password                               |
| `SEED_SHEPPERT_USER` | `sheppert@team4s.local`          | Token B — member 2 (no admin)                  |
| `SEED_SHEPPERT_PW`   | `123`                            | Token B password                               |

Auth is a Keycloak **direct grant** (`grant_type=password`) against realm
`team4s`, public client `team4s-frontend`. The script tries the configured
(email-form) username first and falls back to the bare local part if that login
fails. **Token B login failing is fatal** — member 2's `/me/profile` edit cannot
be done any other way (sheppert is not an admin).

## Token accounts / identity map

- **Token A** = `csubs-leader@team4s.local` / `123` → app_user 2, `platform_admin`,
  linked member **1**. Drives every admin/create route + the memorial endpoint +
  `PUT /me/profile` for member 1.
- **Token B** = `sheppert@team4s.local` / `123` → app_user 3, linked member **2**.
  Used only for `PUT /me/profile` on member 2.

## Scenario matrix covered

Distributed across the two reference profiles:

- **Member in two groups, one current + one historical** — member 1 is in
  `seed129-group-a` (current, `left_date` NULL) and `seed129-group-b` (historical,
  `left_date` set).
- **Multi-role membership** — member 1 in group A carries `fansub_lead` +
  `translator` + `typesetter`.
- **Year-only active period** — member 1 `active_from_year=2015`
  (`is_currently_active=true`); member 2 `active_from_year=2016`,
  `active_until_year=2019`. (Set via `PUT /me/profile`; the public projection does
  not expose the year until the PMDA-01 fix — asserted against `/me/profile`.)
- **Memorial** — applied to member 2 (`profile_status=memorial`) via the admin
  memorial endpoint.
- **Contributions in both states** — member 1 has 10 confirmed + public
  contributions (10 distinct anime) and 1 draft / not-public contribution, proving
  the confirmed+public filter and total parity.
- **Same anime across two release versions** — anime 01 has two release versions,
  each with an awarded effective-crew credit for member 1 (the dedupe case).
- **Badge/point threshold** — 10 confirmed distinct-anime projects + awarded
  release credits (`total_points > 0`).
- **Activity larger than one page** — 10 current projects (page size 6) so the
  public `/members/:slug/projects` "Mehr anzeigen" continuation has a real 2nd page.
- **Member-owned story image (Phase 134-01)** — both member 1 and member 2 get a
  real `media_assets` row (uploaded via `POST /api/v1/me/profile/story-images`
  from `scripts/fixtures/seed134-story.jpg`) referenced from their
  `member_story_json`, so `member_story_html` on the public profile contains a
  real, resolvable `<img>` tag (not just uploaded-and-orphaned media).

## Idempotency

Safe to re-run; a second run creates no duplicates. Techniques used:

- **Groups** — 409 on duplicate slug treated as success; id recovered by listing.
- **Anime** — resolved via the group's attached-anime list (authoritative), then
  a title search, then created; each anime attached to group A (409 = already
  attached).
- **Historical memberships** — unique `(fansub_group_id, member_id)`; listed first,
  409 treated as success.
- **Member roles** — `hist_group_member_roles` has **no** unique constraint, so
  existing role codes are listed and skipped (check-then-create).
- **Anime contributions** — the create endpoint upserts by
  `(group, anime, member)`; re-running updates the same row.
- **Release versions** — the block is gated on the existing version count (creates
  only up to 2); the episode is created once (unique index) and a repeat create is
  tolerated.
- **Effective release crew** — `PUT …/contributions/effective` replaces the
  snapshot and `applyDiff` skips already-awarded rows; point ledger entries are
  idempotency-keyed.
- **`/me/profile` and memorial** — naturally idempotent writes.
- **Story image (Phase 134-01)** — `GET /me/profile` is checked first for an
  existing TipTap image node; if one is already present its `media_asset_id` is
  reused and the upload endpoint is never called again. This is required, not
  just an optimization: the backend's cleanup-on-save lifecycle
  (`applyStoryImageLifecycle`) deletes any previously-referenced image dropped
  from a new `PUT /me/profile` body, so every re-run's `PUT` must keep including
  the same already-uploaded id.

## Notes

- `media_provider` for release versions must be one of `jellyfin` / `youtube` /
  `vimeo` / `direct` (a `stream_sources` check constraint); the seed uses `direct`.
- The anime-contribution endpoint **rejects** `release_version_id` — version-scoped
  credits go exclusively through the effective-crew endpoint.
- The degenerate "years set while dates NULL" row is intentionally **out of scope**;
  the year-only *period* is API-reachable via `PUT /me/profile`.
- The story image's `src` inside `member_story_html` is `/media/profile/{memberID}/story/{uuid}/original.{ext}`
  — this is the actual pattern the backend's TipTap sanitizer allows (see
  `scripts/README-manifest.md` "Story-image URL shape"), **not**
  `/media/story-images/{id}` (a separate resolve-by-ID endpoint used only for
  editor-side preview).

## Phase-139 contribution-override demo data (`seed-phase139-contribution-fixtures.mjs`)

Purpose: Phase 139 (Scalable User-Admin Projections) requires live UAT of the user-detail
Contributions tab's "Nur Abweichungen" (only-deviations) filter (UADM-03/F-03). As of the
139-RESEARCH.md investigation, the live database had 13 `release_crew_snapshots` rows, all
`snapshot_mode='inherited'`, zero `independent` — meaning the override-detection UI had nothing
real to show. This script closes that gap by driving the REAL
`PUT /api/v1/admin/release-versions/:versionId/contributions/effective` endpoint (the same
crew-override editor drawer an admin uses) to produce:

1. An **`independent`-but-identical** row on one release version (crew set-equal to the project
   standard — must NOT be flagged as a deviation).
2. An **`independent`-and-different** row on a second release version (crew genuinely differs from
   the project standard — MUST be flagged as a deviation, the case the "Nur Abweichungen" filter
   needs to have something real to show).

Unlike `seed-member-profile-fixtures.mjs`, this script performs **read-only discovery** first: it
scans real fansub groups' attached anime (preferring `seed129-group-a` if that fixture data exists
in this environment, otherwise the first suitable anime+group pair found anywhere) for an anime
that already has a project-standard `anime_contributions` row and at least 2 release versions, then
targets exactly one of those release versions for the identical case and a second for the different
case. It is safe to re-run: it re-reads the current effective crew before writing and skips the PUT
call entirely when the current state already matches the desired target (idempotent, no
duplicate-conflict failures).

Run the same way as the other seed scripts in this directory (the Linux VM has no host-level Node;
run inside the `team4sv30-frontend` container):

```bash
docker cp scripts/seed-phase139-contribution-fixtures.mjs team4sv30-frontend:/tmp/seed-phase139-contribution-fixtures.mjs
docker exec team4sv30-frontend node /tmp/seed-phase139-contribution-fixtures.mjs
```

Prints a `RESULT: PASS` / `RESULT: FAIL` summary plus the exact group/anime/release-version
identifiers it touched — the live-UAT step (139-10) uses those printed identifiers to know exactly
which user/anime/project to open and which release version to expect under "Nur Abweichungen".

Environment variables (all optional): `SEED_API_BASE` (default
`http://192.168.235.196:18092`), `SEED_KC_BASE` (default `http://192.168.235.196:18081`),
`SEED_ADMIN_USER` (default `admin@team4s.de` — this environment's actual platform_admin account;
deliberately differs from the sibling script's `csubs-leader@team4s.local` default, since that
fixture profile does not exist in every environment this script may run against), `SEED_ADMIN_PW`
(default `123`).
