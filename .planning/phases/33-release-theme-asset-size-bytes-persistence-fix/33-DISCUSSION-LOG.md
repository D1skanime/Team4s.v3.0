# Phase 33: Release-Theme-Asset size_bytes Persistence Fix - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-06
**Phase:** 33-release-theme-asset-size-bytes-persistence-fix
**Areas discussed:** Fix-Strategie, Backfill

---

## Fix-Strategie

| Option | Description | Selected |
|--------|-------------|----------|
| A — media_files Record | Nach CreateMediaAsset einen media_files-Eintrag anlegen (variant='original', size=len(data)). Kein DB-Schema-Change, konsistent mit Image/Video-Upload-Pattern. | ✓ |
| B — size_bytes Spalte in media_assets | Migration hinzufügen, CreateMediaAsset persistiert direkt, Query auf ma.size_bytes umstellen. Sauberer langfristig, aber mehr Umbauarbeit. | |

**User's choice:** Option A — media_files Record
**Notes:** Kein Schema-Change gewünscht, bestehende Pattern beibehalten.

---

## Backfill

| Option | Description | Selected |
|--------|-------------|----------|
| Nur neue Assets | Bestehende Assets behalten size_bytes: 0 | ✓ |
| Backfill via Skript | Dateigröße von Disk lesen und nachträglich eintragen | |

**User's choice:** Kein Backfill
**Notes:** Bestehende Daten sind nur Testdaten, kein Backfill nötig.

---

## Claude's Discretion

- Fehlerbehandlung bei InsertMediaFile-Fehler
- Exact method signature for InsertMediaFile on MediaRepository
