# STATUS

## Project Snapshot
- **Project:** Team4s.v3.0
- **Milestone:** `v1.1 Asset Lifecycle Hardening`
- **Status:** Der Fansub-Admin und der Release-Version-Media-Flow sind heute stark nachgezogen worden. Die UI ist deutlich moderner, und der Release-Media-Upload wurde live bis in DB und Dateisystem verifiziert.
- **Current branch:** `main`
- **Current focus:** Tagesabschluss dokumentieren, den heutigen Stand sauber pushen, und morgen entweder mit Testdaten-Cleanup oder direkt mit dem nächsten schmalen Pre-43-Slice starten.

## What Works Now
- `http://localhost:3000/admin/fansubs/88/edit` ist der verlässlichere lokale Prüfstand für den aktuellen Frontend-Code.
- `http://localhost:3000/admin/episode-versions/62/edit?tab=media` wurde live mit Playwright geprüft.
- Der Multi-Upload-Bug im Release-Version-Media-Tab ist behoben: nachgezogene Bilder ersetzen die bestehende Auswahl nicht mehr.
- Lokale Vorschaubilder vor dem Upload funktionieren.
- Ein echter Upload auf Release-Version 62 wurde erfolgreich verarbeitet:
  - `release_version_media.id = 20`
  - `media_assets.id = 112`
  - `media_files` enthält `original` + `thumb`
  - Dateien liegen unter `C:\Users\admin\Documents\Team4s\media\release-version\62\5cc20f1f-9d27-4e73-b0a5-4dd9f15c5489\`
- `Description / History` ist aus dem Fansub-Gruppen-Flow entfernt, inklusive neuer Drop-Migration `0071`.
- `Tags / Aliase` und `Community-Links` sind in `Grunddaten` integriert statt als eigene schwache Reiter.

## What Is Not Done Yet
- Der echte Test-Upload auf Release-Version 62 ist noch vorhanden und kann bei Bedarf wieder gelöscht werden.
- `3002` ist als Prüfoberfläche nicht durchgehend verlässlich; für harte UAT war heute `3000` plus lokales Backend nötig.
- TipTap-Bildintegration ist weiterhin nur geplant, nicht umgesetzt.
- Phase 42 ist bewusst zurückgestellt und sollte nicht vor 43 bis 48 aktiv weitergebaut werden.
- Cross-AI review remains unavailable locally.

## Valid Commands
- `docker compose up -d team4sv30-db team4sv30-redis`
- `docker compose up -d --build team4sv30-backend team4sv30-frontend`
- `cd frontend && npm run dev`
- `cd frontend && npm run typecheck`
- `cd frontend && npx vitest run "src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx"`
- `cd backend && go test ./internal/handlers ./internal/repository`
- `git diff --check`
- `http://localhost:3000/admin/fansubs/88/edit`
- `http://localhost:3000/admin/episode-versions/62/edit?tab=media`

## Verification Evidence
- 2026-05-16: Playwright-Live-UAT gegen `http://localhost:3000/admin/episode-versions/62/edit?tab=media` bestätigt zwei gleichzeitige lokale Upload-Vorschauen.
- 2026-05-16: `POST /api/v1/admin/release-versions/62/media` lieferte `status: ready`, `media_asset_id: 112`, `release_version_media_id: 20`.
- 2026-05-16: `GET /api/v1/admin/release-versions/62/media` liefert den frisch gespeicherten Upload mit `thumbnail_url` und `original_url` zurück.
- 2026-05-16: DB-Prüfung bestätigt den Relationseintrag in `release_version_media`, den Asset-Eintrag in `media_assets` und zwei Varianten in `media_files`.
- 2026-05-16: Dateisystem-Prüfung bestätigt `original.jpg` und `thumb.jpg` unter `media/release-version/62/...`.

## Top 3 Next
1. Den echten Test-Upload auf Release-Version 62 löschen oder bewusst als Testdaten stehen lassen.
2. Falls vor Phase 43 noch ein kleiner Slice sinnvoll ist: letzte UI-Kanten im Release-/Fansub-Admin glätten, aber ohne neuen Architekturblock.
3. Danach auf Phase 43 fokussieren und Phase 42 weiterhin bewusst parken.

## Risks / Blockers
- Ein versehentliches Vermischen von Testdaten mit gewünschtem Produktzustand bleibt das unmittelbarste praktische Risiko.
- Die lokale Oberfläche auf `3002` war heute nicht stabil genug für jede Live-Prüfung; dieser Drift sollte vor längeren UI-UATs beachtet werden.
- Der Worktree ist breit und enthält viele Planungs-/Produktänderungen gleichzeitig; Staging/Commit-Schnitt muss bewusst bleiben.
