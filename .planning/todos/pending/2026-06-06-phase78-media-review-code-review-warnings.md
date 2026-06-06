---
created: 2026-06-06T00:00:00+02:00
title: Phase-78 Medien-Review Code-Review-Warnings abarbeiten
area: admin-fansub-workspace
files:
  - backend/internal/repository/media_repository.go
  - backend/cmd/server/admin_routes.go
  - frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaReviewSection.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx
  - frontend/src/types/releaseVersionMedia.ts
---

## Problem

Code-Review Phase 78 (`78-REVIEW.md`) — Warnings/Info, die nach den Critical-Fixes
(CR-01/02/03) als Folgearbeit offen bleiben:

- WR-01: `ListFansubGroupMediaForReview` liefert `200 {"data":[]}` für nicht existierende
  Gruppen-IDs (keine 404-Unterscheidung). (`media_repository.go`)
- WR-02: `ReleaseVersionMediaReviewSection` initialisiert Draft-State nur beim Mount; kein
  Re-Sync bei Prop-Update von `externalMedia`. (`ReleaseVersionMediaReviewSection.tsx:118`)
- WR-03: nil-Guard auf `fansubMediaReviewHandler` in der Routenregistrierung degradiert
  still statt fail-fast; Kommentar zur Registrierungsreihenfolge faktisch falsch. (`admin_routes.go`)
- WR-04: `GetFansubMediaOwner` nutzt `LIMIT 1` auf einem nicht eindeutigen Join — mehrdeutig,
  falls ein media_asset mehreren Gruppen zugeordnet ist; Cross-Group-Tamper-Check könnte
  fälschlich passen. (`media_repository.go`)
- WR-05: `handleCancelInvitation` schreibt eine Erfolgsmeldung in `actionError`-State
  (Fehler-Styling). (`ClaimManagementPanel.tsx:165`)
- IN-01: Duplizierte Enum-Validierungs-Maps in zwei Handler-Dateien → konsolidieren.
- IN-02: `ReleaseVersionMediaItem`-Typ fehlen `visibility`/`review_status`; Draft-Init nutzt
  Hardcoded-Defaults statt Serverwerte.
- IN-03: `ReviewQueue` und `ContributionsReviewSection` sind Near-Duplicate-Komponenten ohne
  geteilten Code.

## Desired Outcome

Folge-Slice, der die Warnings priorisiert abarbeitet (WR-04 und WR-01 zuerst — Sicherheits-/
Korrektheitsnähe), Info-Punkte nach Bedarf. Tests/Typecheck grün halten.
