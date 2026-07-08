---
phase: 99-ffentliches-fansub-member-profil-redesign
plan: "10"
subsystem: ui
tags: [nextjs, react, css-modules, public-group-page]

requires:
  - phase: 99-05..99-09
    provides: Bereinigte Gruppenseite (Kennzahlen, Reihenfolge, Sammelhinweise) und stabile Public-Read-DTOs
provides:
  - Entfernung des hartcodierten Subgroups-Fehlertexts aus HeroSection.tsx und GroupAssetsExperience.tsx (AO4-08/AO4-14)
  - Asset-Sektion blendet sich bei fehlendem Jellyfin-Ordner/leeren Episoden-Assets aus statt Fehlertext zu zeigen
  - Beschriftete Projekt-Navigation "Weitere Projekte von {Gruppe}" (AO4-10)
  - Verifikation, dass der Hero-Backdrop bereits ein Verlaufs-Overlay statt Vollflaechen-Abdunklung nutzt (AO4-09)
affects: [99-11, 99-12, 99-13, 99-14]

tech-stack:
  added: []
  patterns:
    - "Leerfall-Sektionen werden durch Nichtrendern (null) statt Fehlertext-Box behandelt"
    - "GroupEdgeNavigation-Label ist optional (currentGroupName?) damit bestehende releases/page.tsx-Nutzung ohne Beschriftung unveraendert bleibt"

key-files:
  created: []
  modified:
    - "frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx"
    - "frontend/src/components/groups/GroupAssetsExperience.tsx"
    - "frontend/src/app/anime/[id]/group/[groupId]/GroupAssetShowcase.tsx"
    - "frontend/src/components/groups/GroupEdgeNavigation.tsx"
    - "frontend/src/components/groups/GroupEdgeNavigation.module.css"

key-decisions:
  - "currentGroupName ist eine optionale Prop an GroupEdgeNavigation statt Pflichtprop, damit die zweite Nutzung in releases/page.tsx (mode=releases, ausserhalb des Plan-Scopes) nicht angepasst werden musste und weiterhin unveraendert kompiliert"
  - "groupAssetsError zeigt jetzt immer eine generische Meldung ('Medien konnten gerade nicht geladen werden.') statt der rohen ApiError-Message, da diese technischen Backend-Text enthalten kann (AO4-14)"
  - "page.module.css wurde nicht veraendert: Hero-Backdrop nutzt bereits linear-gradient-Overlays (heroStyle inline + .hero::after) mit dem Poster als eigenstaendigem z-index:1-Element ueber dem Overlay -- AO4-09 war bereits erfuellt"

patterns-established:
  - "Technische Fehlermeldungen im oeffentlichen UI werden durch eine feste, nutzerverstaendliche Kurzmeldung ersetzt statt error.message direkt zu rendern"

requirements-completed: [AO4-08, AO4-09, AO4-10, AO4-14]

duration: 25min
completed: 2026-07-08
---

# Phase 99 Plan 10: Projektseite-Fehlermeldungen bereinigt, Hero-Overlay verifiziert, Navigation beschriftet Summary

**Hartcodierter Subgroups-Fehlertext aus HeroSection/GroupAssetsExperience entfernt, Asset-Sektion blendet sich im Leerfall aus, GroupEdgeNavigation zeigt jetzt "Weitere Projekte von {Gruppe}"**

## Performance

- **Duration:** ca. 25 min
- **Started:** 2026-07-08T16:15:00Z (approx.)
- **Completed:** 2026-07-08T16:39:31Z
- **Tasks:** 2/2
- **Files modified:** 5 (+1 nicht im Plan gelistet: GroupAssetShowcase.tsx, siehe Deviations)

## Accomplishments
- Keine technische Fehlermeldung ("kein passender Subgroups-Ordner gefunden" / zweite Kopie) mehr im oeffentlichen UI; grep-Gate liefert 0 Treffer
- Asset-Sektion (`GroupAssetShowcase`) wird nur noch gerendert, wenn `hasGroupFolder && hasEpisodeAssets`; sonst kein Rendering statt Fehlerbox
- `GroupEdgeNavigation` zeigt ein sichtbares, dauerhaftes Label "Weitere Projekte von {Gruppe}" zusaetzlich zu den bestehenden `aria-label`s
- Hero-Backdrop-Overlay in `page.module.css` bereits als `linear-gradient` verifiziert; Poster bleibt als eigenstaendiges `z-index:1`-Element voll sichtbar (kein Aenderungsbedarf)

## Task Commits

1. **Task 1: Technische Fehlermeldungen entfernen, Asset-Sektion ausblenden** - `94508a01` (fix)
2. **Task 2: Hero-Verlaufs-Overlay und beschriftete Navigation** - `1a334b24` (feat)

**Plan metadata:** (folgt in separatem Commit)

## Files Created/Modified
- `frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx` - Fehlertext-Zweige entfernt, Asset-Sektion nur bei vollstaendigen Daten gerendert, `currentGroupName` an `GroupEdgeNavigation` durchgereicht
- `frontend/src/components/groups/GroupAssetsExperience.tsx` - zweite Subgroups-Textkopie und technischer Episoden-Hinweis entfernt; ungenutzte `folderFound`-Prop entfernt
- `frontend/src/app/anime/[id]/group/[groupId]/GroupAssetShowcase.tsx` - `folderFound`-Prop-Uebergabe entfernt (Folgeanpassung nach Prop-Entfernung)
- `frontend/src/components/groups/GroupEdgeNavigation.tsx` - optionale `currentGroupName`-Prop, sichtbares Label im Overlay
- `frontend/src/components/groups/GroupEdgeNavigation.module.css` - `.groupLabel`-Klasse (bestehende Token-Konvention `var(--group-nav-*, var(--color-*))`), Mobile-Anpassung

## Decisions Made
- `currentGroupName` optional statt Pflicht-Prop, um die zweite bestehende Nutzung in `releases/page.tsx` (out of scope) nicht anfassen zu muessen
- Fehleranzeige bei echtem API-Fehler zeigt generische deutsche Kurzmeldung statt `error.message` (verhindert zukuenftiges Leaken technischer Backend-Texte)
- `page.module.css` unveraendert gelassen, da Hero-Overlay bereits ein Verlauf ist und das Poster bereits als eigenstaendiges Element ueber dem Overlay liegt

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `GroupAssetShowcase.tsx` an entfernte `folderFound`-Prop angepasst**
- **Found during:** Task 1 (GroupAssetsExperience-Bereinigung)
- **Issue:** Nach Entfernen der ungenutzten `folderFound`-Prop aus `GroupAssetsExperience` haette `GroupAssetShowcase.tsx` einen TypeScript-Fehler (unbekannte Prop) verursacht
- **Fix:** `folderFound={episodes.length > 0}` aus dem Aufruf entfernt
- **Files modified:** `frontend/src/app/anime/[id]/group/[groupId]/GroupAssetShowcase.tsx`
- **Verification:** `npm run typecheck` fehlerfrei
- **Committed in:** `94508a01` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Notwendige Folgeanpassung nach Prop-Entfernung, kein Scope-Creep.

## Issues Encountered
None.

## Verification durchgefuehrt

- `rg -n "Subgroups-Ordner" frontend/src` → 0 Treffer
- `cd frontend; npm run typecheck` → fehlerfrei (beide Tasks)
- `npx vitest run src/app/anime` → 1 Testdatei, 4 Tests bestanden (keine Regression)
- Live-Check via Docker: `docker restart team4sv30-frontend`, danach `curl http://localhost:3000/anime/1/group/1` gegen echte Daten (Anime 1 "Viper's Creed", Gruppen C-Subs/Honto) — Label "Weitere Projekte von C-Subs" im gerenderten Payload bestaetigt, keine "Subgroups-Ordner"/"kein passender"-Texte im Output gefunden

## User Setup Required
None - keine externe Konfiguration erforderlich.

## Next Phase Readiness
- Projektseite ist frei von geleakten technischen Fehlermeldungen; Navigation ist verstaendlich beschriftet
- Folgeplaene 99-11+ (Release-Detailseite, eingebettetes neuestes Release) koennen auf der jetzt bereinigten Projektseite aufbauen
- Live-Check via :3000 in Plan 99-14 sollte zusaetzlich visuell (Screenshot) pruefen, dass das Verlaufs-Overlay auf realen Backdrop-Bildern subjektiv gut wirkt

---
*Phase: 99-ffentliches-fansub-member-profil-redesign*
*Completed: 2026-07-08*
