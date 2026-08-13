---
phase: 115-globale-suche-postgres-fts
plan: 08
subsystem: search
tags: [search, meilisearch, documentation, live-uat, explain-analyze, smoke, checkpoint]
status: checkpoint-live-uat-pending
requires:
  - "Plan 115-02 (Migration 0140 search_foundation — Live-Apply steht aus)"
  - "Plan 115-04 (scripts/smoke-search.ps1 + /api/v1/search Route + OpenAPI)"
  - "Plan 115-07 (Ergebnisfläche/Filter/Drawer — UI-Abnahme steht aus)"
provides:
  - "docs/search/meilisearch-dock-point.md (D-10 Meilisearch-Andockpunkt-Doku, kein Code)"
  - "docs/search/phase-115-live-uat.md (konsolidierte Live-UAT-Checkliste Block A 115-02 + Block B 115-08)"
affects:
  - "Phase-115-Abschluss (bleibt bis zum bestandenen Live-UAT offen)"
tech-stack:
  added: []
  patterns: ["SearchProvider-Interface als einziger Provider-Andockpunkt (D-02)"]
key-files:
  created:
    - docs/search/meilisearch-dock-point.md
    - docs/search/phase-115-live-uat.md
  modified: []
decisions:
  - "D-10 als reine Doku umgesetzt: Meilisearch dockt als zweite SearchProvider-Impl (nur main.go-Wiring) an, PostgreSQL bleibt Source of Truth (D-01), Sichtbarkeits-Gate bleibt serverseitig (D-11); kein Code/keine Paketinstallation"
  - "Alle Phase-115-Live-DB-Verifikationen in EINER konsolidierten Live-UAT-Checkliste gebündelt (Block A = 115-02 Migration-Apply+EXPLAIN, Block B = 115-08 Rebuild/Re-Import/Smoke/UI) — Docker war down, kein EXPLAIN/Smoke/Migrations-Ergebnis fabriziert"
metrics:
  duration: "~15 min"
  completed: 2026-07-29
  tasks: 2
  files: 2
---

# Phase 115 Plan 08: Absicherung + Abschluss (Meilisearch-Doku + konsolidierter Live-UAT-Handoff) Summary

D-10 ist als reine Dokumentation erfüllt (`docs/search/meilisearch-dock-point.md`): sie
benennt das bestehende `SearchProvider`-Interface als einzigen Andockpunkt, skizziert
einen PostgreSQL-abgeleiteten, eventually-consistenten Meilisearch-Index (PostgreSQL
bleibt Source of Truth, D-01), den serverseitigen Erhalt von Sichtbarkeit/Berechtigungen
(D-11) und die Messwerte, die einen späteren Wechsel rechtfertigen — ohne jeden Code.
Der Live-UAT-Task (Migration-Apply + EXPLAIN + Re-Import + Smoke + UI) konnte NICHT
ausgeführt werden (Docker-WSL2-Engine down, Sandbox ohne Host-Port-Zugriff); statt
irgendetwas zu fabrizieren, ist eine einzige konsolidierte Live-UAT-Checkliste committet,
die die ausstehende 115-02-Verifikation (Block A) und die 115-08-Verifikation (Block B)
zu EINEM Durchlauf bündelt.

## Was umgesetzt wurde

### Task 1 — Meilisearch-Andockpunkt dokumentieren (D-10) · Commit 4fee5e6b · ABGESCHLOSSEN
- `docs/search/meilisearch-dock-point.md` (181 Zeilen, ≤450): Andockpunkt =
  `SearchProvider`-Interface (`backend/internal/models/search.go`), heute nur vom
  Postgres-Provider `repository.SearchRepository` implementiert; ein Meilisearch-Provider
  wäre eine zweite Impl desselben Interfaces, nur in `main.go` verdrahtet — keine
  Handler-/OpenAPI-/Frontend-Änderung.
- Dokumentiert: Sync aus PostgreSQL (initialer Voll-Sync + inkrementell; Reindex
  jederzeit gefahrlos, da PostgreSQL Source of Truth bleibt); Erhalt von
  Sichtbarkeit/Berechtigungen über serverseitige Nachfilterung/Query-Zeit-Filter
  (Client sieht nie mehr als heute, D-11); Wechsel-Messwerte als Tabelle (Suchlatenz
  p95/p99, #Dokumente, Tippfehlerqualität, Facetten-Kosten, PG-Ressourcen,
  Ranking-Aufwand, Search-as-you-type-Qualität) inkl. Leitplanke gegen vorschnelle
  „DB ist zu langsam"-Schlüsse (D-09, Memory Perf-Basis).
- Akzeptanzkriterien erfüllt: `test -f` ✓; `grep -ci SearchProvider` ≥1 ✓ (mehrfach);
  `grep -ci "Sichtbarkeit|Messwert|Latenz"` ≥2 ✓; `git status` zeigte nur die .md ✓
  (keine Code-Datei/Migration/Paket).

### Task 2 — Live-UAT (Migration-Apply + EXPLAIN + Re-Import + Smoke + UI) · CHECKPOINT · NICHT AUSGEFÜHRT
- **Blocker:** Docker-Desktop-WSL2-Engine down (`500 Internal Server Error` auf
  `dockerDesktopLinuxEngine`); Bash-Sandbox erreicht Host-Ports ohnehin nicht.
- **Kein** EXPLAIN-Plan, **kein** Migrations-Apply-Ergebnis, **kein** Smoke-Output
  fabriziert.
- Stattdessen: `docs/search/phase-115-live-uat.md` (Commit 97e0b74f) — eine
  konsolidierte, selbst-enthaltene Checkliste, die je Schritt das exakte Kommando +
  die PASS-Assertion liefert und reale Container/Ports über `docker ps` bezieht (nicht
  aus `.env`). Sie bündelt:
  - **Block A (aus 115-02 Task 2):** `docker compose up -d --build team4sv30-backend`
    → `migrate up`/`status` (0140 applied) → zwei `EXPLAIN (ANALYZE, BUFFERS)` mit
    Assertion `Bitmap Index Scan on idx_anime_title_unaccent_trgm` bzw.
    `idx_fansub_group_aliases_normalized_unaccent_trgm` (kein Seq Scan) → Baseline in
    `docs/performance/anime-search-query-plan-tracking.md` eintragen.
  - **Block B (aus 115-08 Task 2):** Route-Live-Check (`/api/v1/search` → 200) →
    D-12-Re-Import (z. B. „A Silent Voice", danach `SELECT` auf `anime_titles`/`romaji`
    liefert Zeilen) → `pwsh scripts/smoke-search.ps1` (D-04/D-05/D-07/D-11/D-12) →
    Frontend-Restart + visuelle/mobile Abnahme (Nav in beiden Shells, `/suche`
    Fokus/Akzent/mobiler Drawer, Reload-Restore von Tab/Filter-Zustand).

## Deviations from Plan

Keine inhaltliche Abweichung. Task 2 ist per Plan-Vorgabe ein
`checkpoint:human-verify` (Live-Terminal erforderlich) und wird gemäß Auftrag als EIN
konsolidierter Live-UAT-Handoff übergeben, der zusätzlich die aus Plan 115-02
ausstehende Migration-Apply-/EXPLAIN-Verifikation mit aufnimmt (Nutzerentscheidung:
gebündelte Live-Abnahme der Phase 115).

## Known Stubs

Keine. Beide gelieferten Artefakte sind vollständige Dokumente ohne Platzhalterwerte,
die in die UI fließen. Das Feld „Angewandter Plan" in der Perf-Doku bleibt bewusst leer,
bis der Live-UAT (Block A) real ausgeführt wird — das ist ein dokumentierter
Handoff-Zustand, kein Stub.

## Live-UAT-Handoff (Voraussetzung für Phase-115-Abschluss)

Auszuführen im echten Terminal, sobald Docker läuft — vollständige Schrittliste mit
Kommandos und PASS-Assertions in `docs/search/phase-115-live-uat.md`. Erst nach
bestandenem Durchlauf (Block A A1–A6 + Block B B1–B5) gilt Phase 115 als verifiziert.

## Commits
- `4fee5e6b` docs(115-08): Meilisearch-Andockpunkt dokumentieren (D-10, nur Doku) — Task 1
- `97e0b74f` docs(115-08): konsolidierte Live-UAT-Checkliste Phase 115 — Task 2 (Handoff)

## Self-Check: PASSED
- docs/search/meilisearch-dock-point.md — FOUND
- docs/search/phase-115-live-uat.md — FOUND
- Commit 4fee5e6b — FOUND
- Commit 97e0b74f — FOUND
