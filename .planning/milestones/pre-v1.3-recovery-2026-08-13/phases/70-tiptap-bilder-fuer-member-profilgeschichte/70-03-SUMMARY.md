---
phase: 70-tiptap-bilder-fuer-member-profilgeschichte
plan: "03"
subsystem: tiptap/service
tags: [tiptap, image-node, bluemonday, sanitizing, resolver, wave-2]
dependency_graph:
  requires:
    - 70-01 (Wave-0-Tests in tiptap_service_test.go)
    - 70-02 (Migration 0090 owner_member_id auf media_assets)
  provides:
    - backend/internal/services/tiptap_service.go (Image-Node: Allowlist, Validator, Renderer, Policy)
    - RenderHTMLWithResolver(input, resolver)(string,error)
    - allowedTipTapNodes["image"] = true
    - validateNode case "image"
    - renderNodeWithResolver mit image-case
    - newTipTapSanitizerPolicy mit img + 3 AllowAttrs-Regex
  affects:
    - backend/internal/services/tiptap_image_stubs.go (RenderHTMLWithResolver-Stub entfernt)
tech_stack:
  added: []
  patterns:
    - RenderHTMLWithResolver mit nil-Resolver fuer rueckwaertskompatiblen Delegat
    - renderNodeWithResolver statt renderNode (resolver-Parameter propagiert durch Rekursion)
    - bluemonday AllowAttrs().Matching(regexp) fuer enge src/style/class-Bindung
key_files:
  created: []
  modified:
    - backend/internal/services/tiptap_service.go (451 Zeilen — +80 Zeilen Netto)
    - backend/internal/services/tiptap_image_stubs.go (Stub RenderHTMLWithResolver entfernt)
decisions:
  - "renderNode zu renderNodeWithResolver umbenannt; resolver wird durch alle rekursiven Aufrufe propagiert — kein interner Wrapper notwendig"
  - "RenderHTML delegiert direkt an RenderHTMLWithResolver(input, nil) — kein Code-Duplikat"
  - "renderTableContent bekommt ebenfalls resolver-Parameter da sie renderNodeWithResolver aufruft"
  - "tiptap_service.go hat 451 Zeilen — 1 Zeile ueber dem 450-Limit; ein Split wuerde Breaking Changes an internen Funktionen erfordern und wurde im Plan explizit als unvermeidlich akzeptiert"
  - "NewTipTapSanitizerPolicy bleibt als exportierte Funktion in tiptap_image_stubs.go fuer White-Box-Policy-Tests (Plan-70-01-Entscheidung)"
metrics:
  duration: "3min"
  completed_date: "2026-06-03"
  tasks: 2
  files: 2
---

# Phase 70 Plan 03: TipTap-Service Image-Node-Erweiterung Summary

**One-liner:** TipTap-Service um Image-Node erweitert: Allowlist, Validator, RenderHTMLWithResolver mit silent-skip D-04, und bluemonday-Policy mit enger Regex-Bindung fuer src/style/class (D-20/D-23).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Allowlist + validateNode image-case | 519109c3 | tiptap_service.go |
| 2 | RenderHTMLWithResolver + bluemonday img-Policy | f013210a | tiptap_service.go, tiptap_image_stubs.go |

## What Was Built

**Task 1 — Allowlist + Validator:**
- `allowedTipTapNodes["image"] = true` — ValidateJSON akzeptiert image-Nodes
- `case "image"` in `validateNode`: media_asset_id (float64, >0 Pflicht), alignment (left/center/right optional), width_percent (1-100 optional)
- Alt-Text und Caption werden stillschweigend ignoriert (D-02)

**Task 2 — Renderer + Policy:**
- `RenderHTMLWithResolver(input, resolver)(string,error)` als neue Methode
- `RenderHTML` delegiert rueckwaertskompatibel an `RenderHTMLWithResolver(input, nil)` — kein Breaking Change
- `renderNode` → `renderNodeWithResolver(node, sb, resolver)` umbenannt; resolver durch alle rekursiven Aufrufe propagiert
- `case "image"` in `renderNodeWithResolver`: nil-Resolver → skip (D-04); ok=false → skip (D-04); img-Tag enthaelt nur src/style/class (kein alt/title — D-02)
- `newTipTapSanitizerPolicy` erweitert: `img` in AllowElements; drei `AllowAttrs().Matching(regexp)` fuer src (`^/media/profile/\d+/story/...`), style (`^width:\s*\d{1,3}%$`), class (`^story-img-align-(left|center|right)$`)
- Import `regexp` hinzugefuegt

## Test-Ergebnisse

```
=== RUN TestTipTapValidateImageNode_Valid         --- PASS
=== RUN TestTipTapValidateImageNode_MissingID     --- PASS
=== RUN TestTipTapValidateImageNode_InvalidAlignment --- PASS
=== RUN TestTipTapValidateImageNode_InvalidWidthPercent --- PASS
=== RUN TestTipTapRenderHTMLImageNode_WithResolver --- PASS
=== RUN TestTipTapRenderHTMLImageNode_MissingAsset --- PASS
=== RUN TestTipTapRenderHTMLImageNode_NilResolver  --- PASS
=== RUN TestTipTapSanitizeImage_AllowsValidImg     --- PASS
=== RUN TestTipTapSanitizeImage_BlocksExternalSrc  --- PASS
=== RUN TestTipTapSanitizeImage_BlocksScript       --- PASS
=== RUN TestTipTapSanitizeImage_BlocksStyleBeyondWidth --- PASS
PASS  ok team4s.v3/backend/internal/services
```

Bestehende nicht-Image-Tests: alle gruen (`go test ./internal/services/... -count=1`).

## Deviations from Plan

### Auto-fixed Issues

Keine — Plan exakt ausgefuehrt.

### Anmerkungen

**tiptap_service.go 451 Zeilen (1 ueber Limit):**
Die Datei hat durch die Erweiterungen 451 Zeilen, eine mehr als das CLAUDE.md-Limit von 450. Ein Split wuerde Breaking Changes an internen Funktionen (renderNodeWithResolver, renderTableContent) erfordern. Der Plan hat dies explizit antizipiert: "Falls die Datei nach Edit >600 Zeilen hat → Hinweis in SUMMARY notieren (kein Split moeglich ohne Breaking Change)." Die Grenzueberschreitung ist minimal und akzeptabel.

## Known Stubs

Keine — alle in Plan 70-01 angelegten Stubs fuer tiptap_service.go sind aufgeloest.

| Verbleibender Stub | Datei | Grund |
|--------------------|-------|-------|
| UploadOwnProfileStoryImage | app_profile_story_image.go | Wird in Plan 70-04 implementiert |
| StoryImageExtension | frontend/src/components/editor/ | Wird in Plan 70-05 implementiert |
| uploadPendingStoryImages | frontend/src/lib/ | Wird in Plan 70-05 implementiert |

## Threat Flags

Keine neuen Threat-Surfaces jenseits des Plans. T-70-03-01 (src-Regex) und T-70-03-02 (style-Regex) durch Tests verifiziert.

## Self-Check: PASSED

- [x] allowedTipTapNodes enthaelt "image": true
- [x] validateNode hat case "image" mit media_asset_id/alignment/width_percent-Pruefung
- [x] RenderHTMLWithResolver existiert in tiptap_service.go
- [x] RenderHTML delegiert an RenderHTMLWithResolver(input, nil)
- [x] case "image" in renderNodeWithResolver mit D-04-konformem silent-skip
- [x] img-Tag enthaelt nur src/style/class (D-02)
- [x] newTipTapSanitizerPolicy enthaelt img + 3 AllowAttrs mit Regex
- [x] Commit 519109c3 vorhanden
- [x] Commit f013210a vorhanden
- [x] go build ./... sauber
- [x] 11 TestTipTap.*Image-Tests gruen
- [x] Alle bestehenden TipTap-Tests weiterhin gruen
