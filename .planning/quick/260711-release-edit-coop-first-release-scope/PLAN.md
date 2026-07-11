---
status: in_progress
date: 2026-07-11
---

# Quick Fix: Coop-Release-Anzeige und First-Release-Gruppenscope

## Ziel

Im Admin-Editbereich muessen gemeinsame Release-Versionen als Zusammenarbeit sichtbar bleiben, ohne dass Beitraege einer anderen Gruppe den Meilenstein "Erstes Release" freischalten.

## Read First

- `docs/architecture/db-schema-fansub-domain.md`
- `docs/api/api-contracts.md`
- `backend/internal/repository/admin_content_fansub_releases.go`
- `backend/internal/repository/anime_coverage_repository.go`
- `backend/internal/repository/fansub_group_history_repository.go`
- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseMediaDrawer.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx`

## Tasks

1. Additiv alle beteiligten Gruppennamen im Admin-Release-Summary liefern.
2. Fansub-Edit-Drawer und Episode-Version-Editor mit Gruppennamen-Liste anzeigen.
3. First-Release-Coverage und Create-Guard auf gruppeneigene Text-/Media-Beitraege begrenzen.
4. Shared Contracts und fokussierte Tests/Checks aktualisieren.
