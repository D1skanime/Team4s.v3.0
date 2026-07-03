---
status: blocked_partial
date: 2026-07-03
quick_id: 260703-a3r
scope: UI-first E2E Viper's Creed Jellyfin fresh reset retest
---

# UI-first E2E Fresh Retest: Viper's Creed / C-Subs / Honto

## Result

BLOCKED/PARTIAL.

The fresh reset, platform-admin UI flow, Jellyfin-first anime creation, AniSearch linkage, episode mapper, fansub group chip creation, C-Subs edit, historical notes, historical members, and leader invitation creation were completed through the UI.

The full multi-role continuation is blocked because the browser remains visibly authenticated as Platform Admin after app logout, confirmed Keycloak logout, and reload. Continuing as leader/member would require cookie/storage manipulation, which the Auftrag forbids except as a documented login-flow defect workaround.

## Fresh Reset

Allowed CLI/SQL reset steps:

- Ran `scripts/reset-local-schema-cutover-data.ps1 -ConfirmLocal`.
- Removed leftover local test fansub groups before UI work.
- Verified fresh counts before UI creation: anime 0, episodes 0, fansub_groups 0, releases 0, media_assets 0.
- Media folder file count was 0.
- Services were local Docker services on `127.0.0.1:3000`, backend `8092`, DB `team4s_v2`.

## Source Extraction

Freshly fetched:

- `https://www.fansub.de/gruppe.rhtml?id=124`
- `https://www.fansub.de/fansub.rhtml?id=2545`

Extracted source facts:

- Group: C-Subs / Cookie-Subs.
- Group links: `http://cookie-subs.org/`, `irc://irc.otakubox.at/C-Subs`, contact `support[-at-]cookie-subs.org`.
- Group history: founded 26.04.2007 by Takayuki; led by Sheppert from 01.04.2008; transferred to KamiKarin on 09.08.2009.
- Historical members used in UI: Sheppert and Sokolada.
- Project: Viper's Creed, 2009, groups C-Subs and Honto, 12/12, Action / Mecha / Science Fiction, complete.
- AniSearch ID used for the anime: `5132`.
- fansub.de release rows extracted: 26 rows, including two resolutions for most episodes and `01v2`.

## UI Routes Tested

- `/login`
- `/admin`
- `/admin/anime`
- `/admin/anime/create`
- `/admin/anime/1/edit`
- `/admin/anime/1/episodes`
- `/admin/anime/1/episodes/import`
- `/admin/fansubs`
- `/admin/fansubs/49/edit`
- `/admin/users`

## Screenshots

Screenshots are in:

`C:/Users/admin/Documents/Team4s/.planning/audits/screenshots-2026-07-03-vipers-creed-fresh/`

Key screenshots:

- `05-jellyfin-search-results.png`
- `07-anisearch-loaded-after-jellyfin.png`
- `10-edit-jellyfin-gate.png`
- `13-import-preview.png`
- `16-mapping-applied-episodes-overview.png`
- `17-admin-fansubs-list.png`
- `23-csubs-history-note-saved-without-autolink.png`
- `28-csubs-historical-sokolada-saved.png`
- `31-csubs-leader-invite-created.png`
- `32-auth-logout-state-stuck.png`

## What Worked

- Platform Admin reached the admin UI.
- Anime was created through the UI after a fresh reset.
- Jellyfin was used first and selected the expected candidate:
  - Title: `Viper's Creed`
  - Jellyfin item ID: `7896cbc2ebd598fbca5f1b4df08cc871`
  - Path: `/media/Anime/Serie/Anime.TV.Sub/Vipers Creed`
- AniSearch ID `5132` was loaded through the UI.
- Edit page confirmed:
  - source `jellyfin:7896cbc2ebd598fbca5f1b4df08cc871`
  - Jellyfin linked
  - AniSearch loaded
  - 4 create assets persisted at anime scope
- Episode import context showed AniSearch and Jellyfin linked before preview.
- Mapper loaded 12 canonical episodes and 12 Jellyfin files.
- C-Subs and Honto were entered as separate group chips.
- `Ab hier` propagation applied both groups to all 12 rows.
- Mapping created 12 episodes, 12 releases, 12 release versions, and 24 release-version/group links.
- Admin fansub list showed exactly C-Subs and Honto, no duplicate coop group.
- C-Subs edit saved:
  - country Germany
  - founded year 2007
  - alias Cookie-Subs
  - website and IRC link
- Group history saved through UI after avoiding auto-linking.
- Historical milestone for 2007 was saved.
- Historical members Sheppert and Sokolada were saved without email/app user linkage.
- Leader invitation was created through UI for `csubs.leader@team4s.local` with Leader role.

## DB Invariants After UI Actions

Counts:

- anime: 1
- anime_source_links: 2
- episodes: 12
- fansub_groups: 2
- fansub_releases: 12
- release_versions: 12
- release_variants: 12
- release_variant_episodes: 12
- release_streams: 12
- stream_sources: 12
- release_version_groups: 24
- media_assets: 4
- media_files: 0
- release_media: 0
- release_version_media: 0
- fansub_group_media: 0
- historical members: 2

Provider links:

- `anisearch:5132`
- `jellyfin:7896cbc2ebd598fbca5f1b4df08cc871`

Groups:

- C-Subs: 12 release-version links
- Honto: 12 release-version links

Media ownership:

- No release media was attached directly to episodes.
- No version-scoped media was written into `release_media`.
- No release-version media was created because the mapper creates streams/version metadata, not process-media uploads.
- Group-media upload seam was visible, but no source-authentic group media file was available from fansub.de for upload.

## Bugs / UX Issues

1. Auth logout is broken/sticky.
   - App still showed Platform Admin after UI logout.
   - It still showed Platform Admin after confirmed Keycloak logout and page reload.
   - This blocks leader/member role switching without forbidden cookie/storage manipulation.

2. Admin navigation link was unreliable from `/login`.
   - The visible `Verwaltung` link did not navigate during the first attempt; direct route navigation was required.

3. Episode overview stats are wrong.
   - After mapping, UI showed `Episoden 0` while 12 episode accordions existed and DB had 12 episodes.

4. Mapper title quality issue for episode 8.
   - UI/AniSearch mapper produced `Paradiese`; fansub.de release title says `Paradies -eden-`.

5. Release metadata coverage gap.
   - fansub.de has 26 release rows including CRC, file sizes, 704x400 variants, and `01v2`.
   - UI mapper only represented the 12 Jellyfin files and did not offer CRC/file-size capture.

6. Group history editor auto-links domain text but backend rejects link marks.
   - Text containing `fansub.de` was auto-linked by the editor.
   - Save failed with `nicht erlaubter Mark-Typ: "link"`.
   - Saving succeeded only after changing text to avoid the domain auto-link.

7. Milestone year picker jumped into a future range.
   - The picker opened at `2076-2087` and required multiple `Früher` clicks to reach 2007.

8. C-Subs contact link has no suitable community-link type.
   - UI supports website, discord, twitter, github, irc.
   - fansub.de contact mail could not be modeled without misusing another type.

9. Admin users page appears read-only.
   - No visible UI path to create test users.
   - Auth seed CLI was required to create `csubs.leader`.

## Blocked Remaining Auftrag Parts

Not completed because of the auth role-switch blocker:

- Log in as leader through normal visible flow.
- Verify leader finds group through normal visible entry.
- Verify leader can edit own group and lacks foreign admin rights.
- Log in as Sheppert/Sokolada app users.
- Verify member profile/group visibility and rights.
- Complete release-version process-media upload through non-admin role.

## Recommended Next Phase

Run a narrow auth/session hardening phase before repeating the full role E2E:

- Fix app logout so it clears local app session and survives reload.
- Add an explicit local test-user seed command or admin UI create flow.
- Add a regression test for switching Platform Admin -> Leader -> Member in the same browser context.
- Then rerun this Auftrag from the fresh reset point and continue from the leader invitation acceptance.
