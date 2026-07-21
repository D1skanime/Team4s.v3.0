# Phase 106: Medienkern-Schema & Legacy-Abbau - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-21
**Phase:** 106-medienkern-schema-legacy-abbau
**Areas discussed:** Migrationsstrategie, Legacy-Abbau-Grenze BE/FE, content_hash & Dedup, Enum-Repräsentation

---

## Migrationsstrategie

| Option | Description | Selected |
|--------|-------------|----------|
| Append-only | Neue Migration 0131+ legt media/media_variant an + droppt Legacy per DROP; Altmigrationen bleiben unberührt. Konsistent mit Kette (bis 0130), minimales Risiko, DOWN sauber. | ✓ |
| Konsolidierung | Altmigrationen im leeren Zustand bereinigen/zusammenfassen. Sauberere Endkette, aber deutlich aufwändiger, bricht mit append-only-Historie. | |

**User's choice:** Append-only (empfohlen)
**Notes:** Löst die im Architekturentscheid §8 explizit offen gelassene Migrations-Grundsatzfrage. Nummern vor Vergabe prüfen (Kollisionshistorie im Projekt).

---

## Legacy-Abbau-Grenze (Backend vs. Frontend)

| Option | Description | Selected |
|--------|-------------|----------|
| Nur build-breaking FE | 106 bereinigt nur FE-Teile, die sonst auf entfernte Backend-Routen/Symbole zeigen (z.B. /covers/). Rest-FE-Politur → Phase 109. Hält 106 als reines Fundament. | ✓ |
| Voller §6-Abbau inkl. FE | 106 entfernt alle §6-FE-Teile sofort (ScreenshotGallery, screenshotImage.ts, GroupAssets-Doppeltypen, tote Admin-Upload-Komponenten). Mehr FE-Churn in Schema-Phase. | |
| Strikt backend-only | 106 fasst kein FE an; tote FE-Referenzen bis 109. Risiko Build rot, widerspricht Roadmap-SC2 (/covers/ in 106). | |

**User's choice:** Nur build-breaking FE (empfohlen)
**Notes:** Roadmap-SC2 listet /covers/ explizit in 106; Phase 109 SC4 entfernt ScreenshotGallery. Grenze bewusst so gezogen, dass 106 Build/typecheck grün lässt, ohne die FE-Umstellung vorzuziehen.

---

## content_hash & Dedup-Zeitpunkt

| Option | Description | Selected |
|--------|-------------|----------|
| Plain, kein UNIQUE | content_hash nullable ohne UNIQUE; Dedup-Verhalten erst mit MediaFileService in 107. Bewahrt „reines Schema, keine Verhaltensänderung". Index optional. | ✓ |
| UNIQUE schon in 106 | Partial UNIQUE(content_hash) WHERE NOT NULL bereits in 106. Sauberer Endzustand, aber ohne 107-Logik entstehen noch keine Zeilen. | |

**User's choice:** Plain, kein UNIQUE (empfohlen)
**Notes:** Dedup („Mehrfachverwendung zählt einmal", PO-Entscheid 1) ist ein 107-Verhalten und wird nicht in die Schema-Phase vorgezogen.

---

## Enum-Repräsentation

| Option | Description | Selected |
|--------|-------------|----------|
| TEXT + CHECK | Folgt dominanter Projektkonvention (50 Dateien), additive Werterweiterung per Migration, gut mit pgx. | ✓ |
| Native ENUM (CREATE TYPE) | Typsicherer auf DB-Ebene, aber Erweiterung umständlicher (ALTER TYPE) und bricht mit Konvention (nur 2 Dateien). | |

**User's choice:** TEXT + CHECK (empfohlen)
**Notes:** Gilt für kind/source/processing_status/variant/status.

---

## Claude's Discretion

- Contract-Check-Umfang: `scripts/schema-v2-contract-check.ps1` erweitern vs. analog neu (SC3 verlangt nur „analog").
- Exakte DROP-Reihenfolge und `.down.sql`-Rückbau innerhalb der Append-only-Migration.
- Ob/welcher non-unique Index auf `content_hash`.

## Deferred Ideas

- Voller Frontend-Legacy-Abbau (ScreenshotGallery-Ersatz, GroupAssets-Typen, tote Admin-Upload-Komponenten) → Phase 109.
- UNIQUE(content_hash) + Dedup-Logik → Phase 107.
- Verwendungsrelationstabellen + Kernmedien-FK-Slots + Permissions → Phase 108.
- Reset-/Seed-Skripte, TSV-Cover-Zuordnung, E2E-Gate → Phase 110.
- `todo.match-phase 106`-Treffer (UI-Politur-Todos) sind Keyword-Fehlalarme, thematisch fremd — nicht gefoldet.
