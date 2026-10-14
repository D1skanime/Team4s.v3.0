---
phase: 182-alten-bildspeicher-entfernen-f-01-legacy-bildpfade-anime-cov
plan: 01
subsystem: database
tags: [go, pgx, repository, dead-code-removal, anime-assets]

# Dependency graph
requires:
  - phase: 182-CONTEXT
    provides: "D-01..D-04 Nutzerentscheidungen und die Schrittfolge (Schritt 1 von 3) fuer die Entfernung des alten Bildspeichers"
provides:
  - "Legacy-branch-freie anime_assets*.go: jede vormals hasV2AssetSchema-gegate Funktion hat jetzt exakt einen (V2-)Codepfad"
  - "hasV2AssetSchema/hasAnimeMediaTable/ensureAnimeMediaAsset vollstaendig entfernt (0 Aufrufer, 0 Definitionen)"
  - "Toter V1-Test TestGetResolvedAssetsV1_CoverBannerBackgroundPreferDisplayOverOriginal entfernt"
affects: [182-02, 182-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Unconditional-V2-delegation: Public-Methoden (AssignManualCover, ClearBanner, ...) sind jetzt Ein-Zeiler, die direkt an die *V2-Variante delegieren, ohne Schema-Erkennung vorzuschalten"

key-files:
  created: []
  modified:
    - backend/internal/repository/anime_assets.go
    - backend/internal/repository/anime_assets_cover.go
    - backend/internal/repository/anime_assets_background.go
    - backend/internal/repository/anime_assets_background_video.go
    - backend/internal/repository/anime_assets_banner_logo.go
    - backend/internal/repository/anime_display_variant_test.go
    - backend/internal/repository/runtime_authority_test.go

key-decisions:
  - "TestAnimeAssetCompatibilityUsesV2CoverHelpersWhenLegacySlotsAreGone (ein Quelltext-grep-Scheintest nach CLAUDE.md-Teststil-Definition) wurde nicht einfach mit neuen Substrings geflickt, sondern durch eine echte Abwesenheits-Pruefung (CLAUDE.md-Ausnahme 1) ersetzt, da das urspruengliche Verhalten laengst durch TestGetResolvedAssetsV2_*/TestGetByIDV2_* echt abgedeckt ist"
  - "ApplyProviderCover (anime_assets_cover.go) bewusst unveraendert gelassen, da es per 182-CONTEXT.md/182-02-PLAN.md explizit Plan 182-02 zugeordnet ist (cover_image-Mirror-Write, nicht Teil von Schritt 1)"

patterns-established:
  - "Pattern: Dead-Branch-Removal nach Live-Schema-Befund (182-CONTEXT.md Abschnitt 2) statt Codequalitaets-Heuristik -- jede Loeschung ist durch den dokumentierten, nachgemessenen Produktionszustand (anime_media existiert immer) begruendet"

requirements-completed: [D-03]

# Metrics
duration: ~25min
completed: 2026-10-14
---

# Phase 182 Plan 1: Tote hasV2AssetSchema-Legacy-Zweige entfernen Summary

**`hasV2AssetSchema`/`hasAnimeMediaTable`/`ensureAnimeMediaAsset` und alle davon gegateten `if useV2Schema {...} else {...}`-Legacy-Zweige in `anime_assets*.go` entfernt -- jede betroffene Funktion hat jetzt genau einen (V2-)Codepfad, ohne Verhaltensaenderung.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-10-14T23:09:57Z
- **Tasks:** 1 von 1
- **Files modified:** 7 (6 geplante + 1 zusaetzliche Testdatei-Reparatur)

## Accomplishments
- `GetResolvedAssets`, `AssignManualCover`, `ClearCoverWithResult`, `AddManualBackground`, `RemoveBackground`, `ApplyProviderBackgrounds`, `AssignManualBackgroundVideo`, `AddManualBackgroundVideo`, `ClearBackgroundVideo`, `ApplyProviderBackgroundVideo`, `AssignManualBanner`, `ClearBanner`, `AssignManualLogo`, `ClearLogo`, `ApplyProviderBanner`, `ApplyProviderLogo` delegieren jetzt alle unbedingt an ihre `*V2`-Variante -- kein `useV2Schema`-Check mehr.
- `hasV2AssetSchema`, `hasAnimeMediaTable` (Methoden auf `AnimeAssetRepository`) und `ensureAnimeMediaAsset` vollstaendig geloescht; 0 verbleibende Aufrufer.
- Der nun pfadlose V1-Test `TestGetResolvedAssetsV1_CoverBannerBackgroundPreferDisplayOverOriginal` und seine `createAnimeAssetV1Schema`-Fixture entfernt.
- Ein durch diese Aenderung direkt kaputt gewordener Quelltext-grep-Test (`TestAnimeAssetCompatibilityUsesV2CoverHelpersWhenLegacySlotsAreGone`) wurde statt mit neuen Substring-Patches durch eine echte Abwesenheits-Pruefung (`TestAnimeAssetRepositoryNoLongerHasLegacyV2SchemaDetection`) ersetzt, konform mit der CLAUDE.md-Teststil-Regel.

## Task Commits

Der einzige Task des Plans wurde atomar committet:

1. **Task 1: Remove dead hasV2AssetSchema legacy branches from anime_assets*.go** - `de2502e65` (refactor)

_Hinweis: Die Plan-Metadaten (SUMMARY.md, STATE.md, ROADMAP.md) werden separat committet._

## Files Created/Modified
- `backend/internal/repository/anime_assets.go` - `GetResolvedAssets` auf Ein-Zeiler zu `getResolvedAssetsV2` reduziert; `hasV2AssetSchema`/`hasAnimeMediaTable`/`ensureAnimeMediaAsset` entfernt; `strconv`-Import (nur von `ensureAnimeMediaAsset` genutzt) entfernt
- `backend/internal/repository/anime_assets_cover.go` - `AssignManualCover`/`ClearCoverWithResult` delegieren unbedingt an `assignManualCoverV2`/`clearCoverV2`; `ApplyProviderCover` unveraendert (Plan 182-02)
- `backend/internal/repository/anime_assets_background.go` - `AddManualBackground`/`RemoveBackground`/`ApplyProviderBackgrounds` auf unbedingte V2-Delegation reduziert; `errors`-Import (nur vom Legacy-Zweig genutzt) entfernt
- `backend/internal/repository/anime_assets_background_video.go` - alle vier Funktionen (`AssignManualBackgroundVideo`, `AddManualBackgroundVideo`, `ClearBackgroundVideo`, `ApplyProviderBackgroundVideo`) auf unbedingte V2-Delegation reduziert, inkl. Entfernen des toten `ApplyProviderBackgroundVideo`-Fallbacks `return ErrNotFound`
- `backend/internal/repository/anime_assets_banner_logo.go` - alle sechs Funktionen (`AssignManualBanner`, `ClearBanner`, `AssignManualLogo`, `ClearLogo`, `ApplyProviderBanner`, `ApplyProviderLogo`) auf unbedingte V2-Delegation reduziert; Imports von `errors`/`fmt`/`strings`/`pgx` auf nur noch `context`+`models` reduziert (71% Datei-Umschreibung laut Diffstat)
- `backend/internal/repository/anime_display_variant_test.go` - `createAnimeAssetV1Schema` und `TestGetResolvedAssetsV1_CoverBannerBackgroundPreferDisplayOverOriginal` entfernt; verbleibender Kommentar bei `createAnimeAssetV2Schema` auf die neue, pfadlose Realitaet aktualisiert
- `backend/internal/repository/runtime_authority_test.go` - `TestAnimeAssetCompatibilityUsesV2CoverHelpersWhenLegacySlotsAreGone` (Quelltext-grep-Scheintest) durch `TestAnimeAssetRepositoryNoLongerHasLegacyV2SchemaDetection` (Abwesenheits-Pruefung) ersetzt (Deviation, siehe unten)

## Decisions Made
- `ApplyProviderCover` bewusst nicht angefasst -- es gehoert laut 182-CONTEXT.md/182-02-PLAN.md explizit zu Plan 182-02 (Umstellung auf `cover_resolved_url`), nicht zu diesem Schritt.
- Die generischen Resolve-Helfer `resolveAnimeBannerAsset`/`resolveAnimeResolvedAsset` (`anime_assets_resolve.go`) wurden bewusst NICHT geloescht, obwohl sie nach dieser Aenderung keine Aufrufer mehr in `anime_assets*.go` haben -- sie sind nicht im Scope dieses Plans (nicht in `files_modified` gelistet, nicht in den acceptance_criteria erwaehnt) und Go erlaubt ungenutzte Package-Funktionen ohne Build-Fehler; eine Entfernung waere unangeforderter Scope-Creep.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `runtime_authority_test.go` brach durch die geplante Entfernung**
- **Found during:** Task 1 Verifikation (`go test ./internal/repository/...`)
- **Issue:** `TestAnimeAssetCompatibilityUsesV2CoverHelpersWhenLegacySlotsAreGone` prüfte per `os.ReadFile`+`strings.Contains` auf exakte Quelltext-Fragmente des jetzt entfernten Dual-Pfad-Codes (u. a. `"usev2schema, err := r.hasv2assetschema(ctx)"`) -- nach der geplanten Entfernung schlug der Test zwangslaeufig fehl. Dieses Testmuster selbst ist zudem nach CLAUDE.md "Teststil" explizit verboten ("Verboten: Lesen der eigenen .go-Quelldatei ... per strings.Contains, um zu behaupten, etwas existiere ... ohne den Code je aufzurufen").
- **Fix:** Test durch `TestAnimeAssetRepositoryNoLongerHasLegacyV2SchemaDetection` ersetzt -- eine Abwesenheits-Pruefung (CLAUDE.md-Ausnahme 1: "ein Bezeichner darf NIRGENDS in der Datei vorkommen") fuer die drei entfernten Symbole in den fuenf betroffenen Dateien. Das reale V2-Verhalten bleibt echt abgedeckt durch `TestGetResolvedAssetsV2_CoverBannerLogoPreferDisplayOverOriginal`/`TestGetByIDV2_PosterBannerPreferDisplayOverOriginal` (Postgres-Integrationstests).
- **Files modified:** `backend/internal/repository/runtime_authority_test.go`
- **Verification:** `go test ./internal/repository/... -run TestAnimeAssetRepositoryNoLongerHasLegacyV2SchemaDetection -v` -> PASS; volles Repository-Testpaket zeigt vor/nach identisches, vorbestehendes Fehlerbild (siehe Issues Encountered)
- **Committed in:** `de2502e65` (Teil des Task-1-Commits)

---

**Total deviations:** 1 auto-fixed (1x Rule 1)
**Impact on plan:** Notwendig, um die Testsuite nach der geplanten Entfernung gruen zu halten, ohne das verbotene Testmuster weiterzukopieren. Kein Scope-Creep -- die Reparatur betrifft exakt die durch Task 1 verursachte Breakage.

## Issues Encountered
- `go test ./internal/repository/...` (volles Paket) zeigt ~40 vorbestehende, themenfremde Fehlschlaege (Member-Punkte/Badges/Archive/Phase128/134/141), die alle zusaetzliche `TEAM4S_PHASE128_TEST_DSN`/Live-Netzwerk-/Fixture-Eingaben benoetigen, die in dieser Sandbox nicht verfuegbar sind. Per throwaway-Git-Worktree-Vergleich (Commit `957daf57a`, vor diesem Plan) gegen denselben Docker-Lauf bestaetigt: das Fehlerbild ist vor/nach dieser Aenderung byte-identisch -- keine Regression, siehe `deferred-items.md` in diesem Phasenordner. Die tatsaechlich fuer diesen Plan relevante Verifikation (`go build ./... && go vet ./internal/repository/... && go test ./internal/repository/... -run 'TestGetResolvedAssetsV2|TestGetByIDV2' -v`) ist gruen, und beide genannten Tests laufen zusaetzlich zur Skip-Pruefung echt gegen Postgres (`team4s_phase106_test_173`) durch (PASS, kein Skip).

## User Setup Required

None - keine externe Service-Konfiguration erforderlich.

## Next Phase Readiness
- `anime_assets*.go` ist jetzt vollstaendig legacy-branch-frei und bereit fuer Plan 182-02 (Umstellung der vier rohen Leser auf `animeCoverImageSelectSQL`/`animeCoverAvailableSQL`, danach Entfernung von `syncLegacyAnimeCoverImageV2` und Umstellung von `ApplyProviderCover` auf `cover_resolved_url`).
- Keine Blocker. `anime.cover_image`-Spalte selbst, die vier rohen Leser und die Mirror-Write-Mechanik sind unveraendert -- wie geplant Scope von 182-02/182-03.

---
*Phase: 182-alten-bildspeicher-entfernen-f-01-legacy-bildpfade-anime-cov*
*Completed: 2026-10-14*

## Self-Check: PASSED

- FOUND: `backend/internal/repository/anime_assets.go`
- FOUND: `backend/internal/repository/anime_assets_cover.go`
- FOUND: `backend/internal/repository/anime_assets_background.go`
- FOUND: `backend/internal/repository/anime_assets_background_video.go`
- FOUND: `backend/internal/repository/anime_assets_banner_logo.go`
- FOUND: `backend/internal/repository/anime_display_variant_test.go`
- FOUND: `backend/internal/repository/runtime_authority_test.go`
- FOUND: `.planning/phases/182-alten-bildspeicher-entfernen-f-01-legacy-bildpfade-anime-cov/deferred-items.md`
- FOUND: commit `de2502e65` (git log --oneline --all)
