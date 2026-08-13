---
status: complete
phase: 09-controlled-anisearch-id-enrichment-before-create-with-fill-only-jellysync-follow-up
source: [09-01-SUMMARY.md, 09-02-SUMMARY.md, 09-03-SUMMARY.md]
started: 2026-04-07T00:00:00Z
updated: 2026-04-07T11:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Explicit AniSearch load before save
expected: Geh auf http://localhost:3002/admin/anime/create. Gib einen Titel ein und trag eine gültige AniSearch-ID ein. Klick den AniSearch-Load-Button. Leere Draft-Felder werden befüllt (fill-only), bereits ausgefüllte Felder bleiben unberührt. Der Anime wird noch NICHT gespeichert.
result: pass

### 2. Duplicate AniSearch ID redirect
expected: Verwende eine AniSearch-ID, die bereits mit einem bestehenden lokalen Anime verknüpft ist. Nach dem Load-Klick soll die Seite direkt zur Edit-Route dieses Anime weiterleiten, statt im Create-Formular zu bleiben.
result: pass

### 3. AniSearch failure stays non-blocking
expected: Gib eine ungültige oder nicht erreichbare AniSearch-ID ein und klick Load. Es soll ein Inline-Fehler angezeigt werden. Der Button "Anime erstellen" bleibt trotzdem klickbar — der Anime kann manuell gespeichert werden.
result: pass

### 4. Fill-only Jellysync follow-up
expected: Importiere zuerst einen Anime-Draft via Jellyfin Sync. Dann lade AniSearch. AniSearch soll Jellyfin-Werte überschreiben (Priorität: Manual > AniSearch > Jellyfin). Manuell eingetippte Felder bleiben geschützt. Beide Reihenfolgen funktionieren.
result: pass
fix_commits:
  - "65a70e6 fix(create): AniSearch overrides Jellyfin fields (priority: manual > anisearch > jellyfin)"
  - "4cda6a3 fix(create): Jellyfin fill-only — AniSearch values survive subsequent Jellyfin sync"

### 5. Tag persistence through create
expected: Gib im Create-Formular einen oder mehrere Tag-Tokens ein und speichere den Anime. Öffne anschließend den Edit-Route dieses Anime. Die eingegebenen Tags sollen dort noch sichtbar sein (persistiert, nicht nur Draft-State).
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "AniSearch überschreibt Jellyfin-Werte (Priorität: Manual > AniSearch > Jellyfin)"
  status: resolved
  reason: "Beide Reihenfolgen (Jellyfin→AniSearch und AniSearch→Jellyfin) funktionieren korrekt."
  severity: major
  test: 4
  root_cause: |
    Zwei Seiten desselben Problems:
    1. Jellyfin→AniSearch: buildAniSearchEnrichmentRequest sandte manualDraftValues inkl. Jellyfin-Werte → Backend
       behandelte Jellyfin-Felder als protected. Fix: jellyfinDraftSnapshot als Basis für AniSearch-Request.
    2. AniSearch→Jellyfin: hydrateManualDraftFromJellyfinPreview überschrieb immer alle Felder. Fix: fill-only
       Semantik — Jellyfin befüllt nur leere Felder.
  artifacts:
    - path: "frontend/src/app/admin/anime/create/page.tsx"
    - path: "frontend/src/app/admin/anime/hooks/useManualAnimeDraft.ts"
  fix_commits:
    - "65a70e6"
    - "4cda6a3"
