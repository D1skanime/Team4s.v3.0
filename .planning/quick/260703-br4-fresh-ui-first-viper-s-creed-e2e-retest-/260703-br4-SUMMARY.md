---
status: complete
quick_id: 260703-br4
slug: fresh-ui-first-viper-s-creed-e2e-retest-
date: 2026-07-03
---

# Summary

Fresh UI-first E2E retest completed after auth/logout and DatePicker quick fixes.

## Completed

- Reset local dev data and media storage from a clean baseline.
- Extracted fansub.de source pages for group 124 and project 2545.
- Created Viper's Creed through the admin UI.
- Linked Jellyfin before mapper use.
- Loaded AniSearch ID 5132 through the UI.
- Imported 12 Jellyfin/AniSearch episode mappings through the UI.
- Created C-Subs and Honto via group chips without a collaboration pseudo-group.
- Confirmed release-native DB invariants with diagnostic SQL.
- Edited C-Subs group data, links, history note, historical members, and leader invitation through UI.
- Accepted leader invitation through real login/accept flow.
- Wrote audit report and stored screenshots.

## Main Findings

- Jellyfin is persisted and usable for import, but edit UI still shows a contradictory `Jellyfin-Link: Nicht verknüpft` field.
- Episode overview stat shows `Episoden 0` although 12 episode accordions exist.
- EP08 title is `Paradiese` instead of fansub.de `Paradies -eden-`.
- Mapper cannot capture CRC/file size/technical variants/v2 rows from fansub.de.
- Group history milestone YearPicker starts at `2088-2099` because that form allows max year 2099.
- Community links lack a contact/mail type.
- Several German UI strings still use ASCII umlaut replacements.

## Artifacts

- Audit report: `.planning/audits/2026-07-03-ui-first-e2e-vipers-creed-after-auth-datepicker-fixes.md`
- Screenshots: `.planning/audits/screenshots-2026-07-03-vipers-creed-fresh-after-fixes/`
