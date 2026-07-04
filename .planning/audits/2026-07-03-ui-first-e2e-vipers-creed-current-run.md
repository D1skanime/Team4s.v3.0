# 2026-07-03 - UI-first E2E Viper's Creed Current Run

Status: PARTIAL PASS with follow-up bugs

## Scope

- Fresh local reset via `scripts/reset-local-schema-cutover-data.ps1 -ConfirmLocal`.
- UI-only domain actions through the Codex in-app browser.
- Diagnostics via SQL/CLI only after UI actions.
- Accounts used with password `123`: `admin`, `csubs.leader`, `sheppert`, `sokolada`.

## UI Steps Completed

- Logged in as platform admin through Keycloak.
- Created `Viper's Creed` through `/admin/anime/create`.
- Loaded AniSearch ID `5132`.
- Searched Jellyfin for `Viper's Creed`, selected the matching series, and saved the Jellyfin-linked anime.
- Opened `/admin/anime/1/episodes/import`, loaded preview, and mapped 12 Jellyfin files.
- Entered `C-Subs, Honto` in the mapper; verified the UI now splits it into separate `C-Subs` and `Honto` chips.
- Applied mapping and created 12 episodes, 12 releases, 12 release versions, 12 variants, and 24 release-version group links.
- Edited all 12 release versions through `/admin/episode-versions/[id]/edit` with fansub.de 1280x720 release data.
- Created OP and ED segments through the segment UI, using Episode-Version/Jellyfin-stream source, no upload.
- Verified the 4-minute segment guard in the UI and by rejected invalid submit.
- Invited and accepted `csubs.leader`, `sheppert`, and `sokolada` through the UI invitation flow.
- Opened public anime/group/release pages.

## Key Data Verified

```txt
anime                  1
episodes              12
fansub_releases       12
release_versions      12
release_variants      12
release_version_groups 24
release_streams       12
```

Release-version data:

```txt
EP01 -Cyclops-                   2009-12-24 1280x720 1CC0A2E3 C-Subs, Honto
EP02 Neuer Rekrut -unknown-      2010-11-14 1280x720 725856F1 C-Subs, Honto
EP03 Kanonenschuss -shot-        2010-12-04 1280x720 0B89A591 C-Subs, Honto
EP04 Hexe -sorceress-            2010-12-18 1280x720 5D37069F C-Subs, Honto
EP05 Todesgott -grim reaper-     2010-12-18 1280x720 79194A30 C-Subs, Honto
EP06 Holzpuppe -golem-           2010-12-24 1280x720 FC73512F C-Subs, Honto
EP07 Chaos -riot-                2011-01-23 1280x720 D2F36C71 C-Subs, Honto
EP08 Paradies -eden-             2011-02-18 1280x720 DAE374A7 C-Subs, Honto
EP09 Verschwörung -intrigue-     2011-03-24 1280x720 E8A6018D C-Subs, Honto
EP10 Gegenschlag -counterattack- 2011-03-24 1280x720 539981BE C-Subs, Honto
EP11 Wahrheit -truth-            2011-03-24 1280x720 4C08E885 C-Subs, Honto
EP12 Ein Auge -blindness-        2011-03-24 1280x720 1540DB61 C-Subs, Honto
```

Segments:

```txt
OP Kara R.O.C.K. - iLL                               1-12 00:00:00-00:02:00 episode_version
ED Kara AINOOTO (Ai no Oto ~English ver.~) - moumoon 1-12 00:21:57-00:23:45 episode_version
```

Memberships:

```txt
csubs.leader C-Subs active fansub_lead
sheppert     C-Subs active admin, encoder, timer, translator, typesetter
sokolada     C-Subs active designer, editor, gfxler, quality_checker
```

Media ownership:

```txt
anime_media           4
episode_media         0
release_media         0
release_version_media 0
fansub_group_media    0
```

## Bugs And UX Findings

- Reset script does not clear `fansub_group_invitations`; old accepted Sheppert/Sokolada invitations survived while memberships were reset.
- Reset script also left the previous bad free-text group `C-Subs, Honto`; it was safely deleted after verifying it had no links.
- Fixed in `9498c4d7`: public anime page now shows `Episoden (12)` and counts one collaborative C-Subs/Honto release version as `+1 VERSION`.
- Fixed in `9498c4d7`: segment form save button is disabled while the 4-minute validation is failing.
- Public group page shows `0 Mitglieder` even after app memberships exist; invitation acceptance does not create public member profiles.
- Public group page does not expose OP/ED segments yet, despite the segments existing and being stream-backed.
- Drawer link `Meine Gruppen > C-Subs` was visible for the leader, but one Playwright click stayed on `/me/profile`; direct route `/admin/fansubs/3/edit` worked with leader permissions.
- Logout/role switching still has a delayed intermediate state and sometimes requires the visible `Erneut anmelden` button.
- DatePicker starts at `2016 - 2027` for empty 2009/2010/2011 dates, requiring one manual back step. This is much better than the previous 2088 issue, but still not content-aware.

## 2026-07-03 Continuation Notes

- User clarified that public presentation is not the current priority; public findings remain future-surface notes, not current blockers.
- Episode/release streaming remains in scope because OP/ED karaoke segment playback depends on it.
- Browser stream check:
  - `/api/releases/1/stream` opened in the browser as a video element with `readyState=4` and no media error.
  - `/api/releases/1/stream?startTimeTicks=1200000000` also opened as video after the active browser session refreshed, with duration around 1425 seconds and no media error.
  - A stale/expired browser session can briefly return `{"error":{"message":"anmeldung erforderlich"}}`; after visiting an authenticated app route (`/me/profile`), stream auth recovered. This should stay on the radar for segment playback robustness.
- Segment preview stream check:
  - As `csubs.leader`, `/admin/episode-versions/1/edit` loaded the segment editor and showed both OP/ED rows with source `Episode-Version / Jellyfin-Stream`.
  - OP drawer preview created a `<video>` with `src=/api/releases/1/stream?startTimeTicks=0`, `readyState=4`, duration around 1425 seconds, and no media error.
  - ED drawer preview created a `<video>` with `src=/api/releases/1/stream?startTimeTicks=13170000000` for `00:21:57`, `readyState=4`, duration around 1425 seconds, and no media error.
  - The current segment preview stops after the segment length in the browser UI. The stream endpoint itself is still a release-version stream with a start offset, not a server-side clipped segment response.
- Protected role/capability check:
  - `csubs.leader` can reach `/admin/fansubs/3/edit`, sees group basics/history/media/members/proposals/anime-release tabs, and can open `/admin/episode-versions/1/edit`.
  - First click on the C-Subs drawer link from `/me/profile` can leave the drawer open on the same route; clicking the visible drawer link then navigates correctly to `/admin/fansubs/3/edit`.
  - `csubs.leader` and `sheppert` profiles both still say no verified public Member entry is linked, even though their app memberships are active.
  - `sheppert` initially received `(403) keine berechtigte gruppenmitgliedschaft gefunden` for `/admin/episode-versions/1/edit` despite active C-Subs roles including `timer`.
  - Fixed locally in this run: release-version permission checks now honor active `fansub_group_member_roles` for any group linked through `release_version_groups`; `timer` fallback capabilities were aligned with DB `role_capabilities`.
  - After backend rebuild, `sheppert` can open `/admin/episode-versions/1/edit`, sees OP/ED segments, can open the segment edit drawer, sees `Speichern`, and the Jellyfin preview loads with `readyState=4`.

## Evidence

- Screenshot: `.planning/audits/screenshots-2026-07-03-vipers-creed-current-run/public-releases.png`

## Recommended Next Slice

1. Fix reset hygiene for invitations and orphan test groups.
2. Continue protected Admin/Leader/Fansubber permission and workflow testing before public surfaces, especially `sokolada` media/note role limits after the release-version permission fix.
3. Before exposing public OP/ED/Kara playback, decide whether segment playback needs a dedicated bounded endpoint/grant so clients cannot turn a segment preview into full-episode streaming.
4. Decide whether app memberships should create/link public member profiles or whether the public group page should separately show app members.
5. Expose approved stream-backed OP/ED segments on the public group/release pages.

## 2026-07-04 Fresh Reset Continuation

Status: PARTIAL PASS, current blocker is logout/role-switch reliability plus slow leader capability load.

Sources used:

- fansub.de group source: `https://www.fansub.de/gruppe.rhtml?id=124`
- fansub.de project source: `https://www.fansub.de/fansub.rhtml?id=2545`

Fresh reset and setup:

- Ran `scripts/reset-local-schema-cutover-data.ps1 -ConfirmLocal`.
- Cleared `media/` after workspace path safety check.
- Verified empty domain baseline before UI work: `anime=0`, `episodes=0`, `release_versions=0`, `release_version_groups=0`, `media_assets=0`.
- App users remained available with password `123`: `admin`, `csubs.leader`, `sheppert`, `sokolada`.
- Baseline groups remained: C-Subs `#3`, Honto `#4`.

UI steps completed in this continuation:

- Logged in as `admin` through Keycloak.
- Created Viper's Creed from AniSearch ID `5132` in `/admin/anime/create`.
- Linked Jellyfin series before episode mapping: `jellyfin:7896cbc2ebd598fbca5f1b4df08cc871`, folder `/media/Anime/Serie/Anime.TV.Sub/Vipers Creed`.
- Opened `/admin/anime/1/episodes/import`; preview showed 12 canonical episodes, 12 Jellyfin files, 12 suggestions, 0 conflicts.
- Added `C-Subs` and `Honto` as separate mapper chips and used `Ab hier`; all 12 rows received both groups.
- Applied mapping through UI.
- Episode overview showed 12 episodes and 12 total versions. Each episode showed `1 Version`, confirming the old collaborative-count bug did not reproduce.
- Opened `/admin/episode-versions/1/edit`; confirmed mapper still initially stored the physical filename as Release-Name and left date/CRC empty.
- Edited all 12 release versions through their UI editors with fansub.de 1280x720 release data, `hardsub`, exact release dates, and CRC32 values.
- Updated C-Subs real members through UI: `CSubs Leader` as Leader, `Sheppert Member` with translator/timer/typesetter/encoder/admin roles, `Sokolada Member` with design/editing/gfx/quality roles.
- Added historical C-Subs entries through UI: `Takayuki` founder from 2007-04-26 and `KamiKarin` leader from 2009-08-09.
- Updated Honto through UI with `Deutschland`, alias `Hontô-Subs`, Website `http://www.honto-subs.de/`, IRC `irc://irc.euirc.net/Honto`.
- Relogin as `csubs.leader` through `/login` -> `Erneut anmelden` -> Keycloak prompt with password `123`.
- Verified drawer contains direct `Meine Gruppen > C-Subs` link to `/admin/fansubs/3/edit`.
- Verified `csubs.leader` can eventually load `/admin/fansubs/3/edit` and see all group workspace tabs.
- Verified `csubs.leader` cannot access `/admin/fansubs/4/edit`; UI shows no authorized group membership for Honto.
- As leader, opened C-Subs `Anime & Veröffentlichungen`; Viper's Creed appears with `Releases: 12/12`, all episodes show `Versionen: 1`.

Release-version data verified after UI edits:

```txt
EP01 -Cyclops-                   v1 2009-12-24 1280x720 hardsub 1CC0A2E3 C-Subs, Honto
EP02 Neuer Rekrut -unknown-      v1 2010-11-14 1280x720 hardsub 725856F1 C-Subs, Honto
EP03 Kanonenschuss -shot-        v1 2010-12-04 1280x720 hardsub 0B89A591 C-Subs, Honto
EP04 Hexe -sorceress-            v1 2010-12-18 1280x720 hardsub 5D37069F C-Subs, Honto
EP05 Todesgott -grim reaper-     v1 2010-12-18 1280x720 hardsub 79194A30 C-Subs, Honto
EP06 Holzpuppe -golem-           v1 2010-12-24 1280x720 hardsub FC73512F C-Subs, Honto
EP07 Chaos -riot-                v1 2011-01-23 1280x720 hardsub D2F36C71 C-Subs, Honto
EP08 Paradies -eden-             v1 2011-02-18 1280x720 hardsub DAE374A7 C-Subs, Honto
EP09 Verschwörung -intrigue-     v1 2011-03-24 1280x720 hardsub E8A6018D C-Subs, Honto
EP10 Gegenschlag -counterattack- v1 2011-03-24 1280x720 hardsub 539981BE C-Subs, Honto
EP11 Wahrheit -truth-            v1 2011-03-24 1280x720 hardsub 4C08E885 C-Subs, Honto
EP12 Ein Auge -blindness-        v1 2011-03-24 1280x720 hardsub 1540DB61 C-Subs, Honto
```

Fresh invariant snapshot:

```txt
anime                  1
episodes               12
release_versions       12
release_variants       12
release_version_groups 24
fansub_group_members   3
hist_fansub_group_members 2
fansub_group_links     4
fansub_group_aliases   2
release_version_media  0
media_assets           4
```

No release version has anything other than two linked groups.

Fresh findings:

- Mapper still does not populate release-version metadata from fansub.de/Jellyfin resolution: Release-Name starts as physical filename, Release-Datum empty, CRC empty, resolution only `720p`. Manual UI correction works.
- EP08 remains split by data domain: release-version title corrected to fansub.de `Paradies -eden-`, but episode-level surfaces still show AniSearch/Jellyfin title `Paradiese`.
- DatePicker day selection is awkward for historical releases; duplicate day labels exist in surrounding-month cells. Manual use is possible, but automated UI tests must target the calendar grid, not button text alone.
- Historical member card displays `founder` instead of localized label `Gründer/in`.
- AppShell `Abmelden` did not log out after two clicks and >10 seconds; `/login` -> `Erneut anmelden` did force the Keycloak prompt.
- Leader C-Subs route initially stayed on `Berechtigungen werden geladen...` for roughly 10 seconds before loading. The permission result was correct but slow.
- Drawer direct group link is present for `csubs.leader`, but the first link click from `/me/profile` appeared to remain on profile; direct route loaded after the delayed permission check.
- Leader profile still says no verified public Member entry is linked, even though group app membership is active. That may be intended separation, but it is confusing.
- In the releases accordion text, accessible/concatenated text can read like `Versionen: 10 Personen`; visually this appears to be `Versionen: 1` plus `0 Personen`, but it is worth checking spacing/accessibility.
