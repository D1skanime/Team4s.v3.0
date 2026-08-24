---
phase: 139-scalable-user-admin-projections
type: ui-spec
status: approved
---

# Phase 139 UI-SPEC

## Contributions section

Header copy:
> Zeigt die fachlichen Beiträge dieses Benutzers nach Anime und Projekt. Diese Ansicht ist informativ; Bearbeitung erfolgt in den bestehenden Projekt-/Release-Arbeitsflächen.

Toolbar:
- Anime filter
- Gruppe/Projekt filter
- Beitragsrolle/-typ filter
- toggle `Nur Abweichungen`
- Zeitraum
- reset
- total project count

Projection:
```
Anime title

Project / Fansub group
Project standard
[role chips always visible]

Episode 1–6
Entspricht Projektstandard

Episode 7
Abweichung
[effective user roles / delta explanation]

Episode 8–13
Entspricht Projektstandard
```

Rules:
- project standard not hidden behind an accordion,
- standard ranges compact,
- real deviations visually distinct but not oversized,
- no raw release-version ids,
- legacy/dispute states remain truthful and distinguishable if returned by projection,
- project block is the pagination unit.

## Media section

Header copy:
> Zeigt Medien, die diesem Benutzer im jeweiligen Anime-/Projekt-/Release-Kontext zugeordnet sind. Die Ansicht ist informativ; Änderungen erfolgen in der Release-Medien-Arbeitsfläche.

Toolbar:
- Anime
- Gruppe/Projekt
- Release/Episode
- Medientyp
- Zeitraum
- reset
- total release-context count

Projection:
```
Anime · Project / Group
Episode 5 · Version 1
[small lazy thumbnails / compact media rows]

Hochgeladen: date
Type/category where useful

[Release-Medien öffnen]
```

Rules:
- no physical storage/path diagnostics,
- no raw owner_context,
- no fake permission badge,
- one workspace action per context block,
- thumbnail/lazy loading only,
- release/episode context block is pagination unit.

## Rights scale

The Phase-138 rights content stays visually/semantically intact.
At large membership counts:
- provide server-filtered/paginated membership selector,
- load effective rights only for selected group,
- preserve `section=rights&group=` deep-link behavior,
- do not show every group's rights simultaneously by default.

## Narrow layout

At narrow widths:
- filters wrap/stack,
- no wide mandatory data table,
- project/context blocks remain readable cards/rows,
- pagination controls keyboard reachable,
- thumbnails use bounded dimensions,
- no page-level x overflow.
