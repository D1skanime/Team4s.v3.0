---
phase: 73-public-fansub-page-fansubs-slug-erweitern
plan: "08"
subsystem: frontend/fansubs
tags: [gap-closure, highlights, anime-count, fansub-page]
dependency_graph:
  requires: []
  provides: [konsistenter-anime-projektzaehler]
  affects: [FansubHighlightsSection]
tech_stack:
  added: []
  patterns: [null-coalescing fallback, public-count source]
key_files:
  created: []
  modified:
    - frontend/src/components/fansubs/FansubHighlightsSection.tsx
decisions:
  - "computeHighlights verwendet contributions?.anime_count ?? null als einzige Quelle fuer den Anime-Projektzaehler (nicht mehr group.anime_relations_count)"
  - "Wenn contributions null ist oder anime_count === 0, wird die Kachel durch den .filter entfernt (kein '0 Anime-Projekte'-Widerspruch)"
metrics:
  duration: 3min
  completed: 2026-06-07
---

# Phase 73 Plan 08: Höhepunkte-Projektzähler auf öffentliche Quelle umstellen

**One-liner:** Anime-Projektzähler in computeHighlights nutzt ausschließlich contributions.anime_count (is_public_on_anime_page=true) statt group.anime_relations_count (alle Relationen).

## Tasks

| # | Name | Status | Commit |
|---|------|--------|--------|
| 1 | computeHighlights — Projektzähler auf contributions.anime_count umstellen | DONE | (siehe unten) |

## Was wurde gebaut

In `FansubHighlightsSection.tsx` wurde Zeile 25 in `computeHighlights` geändert:

**Vorher:**
```ts
{ label: 'Anime-Projekte', value: group.anime_relations_count || contributions?.anime_count || null },
```

**Nachher:**
```ts
{ label: 'Anime-Projekte', value: contributions?.anime_count ?? null },
```

Root-Cause des UAT-12-Widerspruchs: `group.anime_relations_count` zählte alle `anime_fansub_groups`-Einträge ohne Sichtbarkeitsfilter, während die Projekte-Sektion nur öffentlich freigegebene Anime zeigt. `contributions.anime_count` kommt aus `GET /fansubs/:id/contributions` und zählt `anime_contributions WHERE is_public_on_anime_page = true` — dieselbe öffentliche Sicht wie die Projekte-Sektion.

Wenn `contributions` null ist (API-Fehler-Fallback), ergibt `?? null` → null → Kachel wird durch `.filter(h => h.value !== null && h.value !== 0)` entfernt. Wenn `anime_count === 0`, wird die Kachel ebenfalls entfernt. Kein "1 Anime-Projekte" mehr während die Projekte-Sektion "Noch keine Projekte" zeigt.

`group` bleibt als Parameter, da er weiterhin für `founded_year`, `dissolved_year`, `release_versions_count` und `members_count` gebraucht wird.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None - reine Frontend-Logik-Änderung, kein neuer API-Aufruf, kein neues Trust-Boundary.

## Automated Tests

node_modules ist in diesem Checkout nicht installiert — vitest/tsc konnten nicht lokal ausgeführt werden. Typsicherheit wurde durch Code-Lesen verifiziert: `contributions?.anime_count` ist `number` (aus `PublicGroupContributionsResponse.anime_count: number`), `?? null` ergibt `number | null`, das ist kompatibel mit `Highlight.value: number | string | null`. Keine Breaking-Changes. Live-Verifikation erfolgt über Dev-Server :3000.

## Self-Check: PASSED

- `frontend/src/components/fansubs/FansubHighlightsSection.tsx` existiert und ist geändert
- Genau eine Zeile wurde geändert (Anime-Projekte-Highlight)
- Kein anderer Code in der Datei wurde berührt
