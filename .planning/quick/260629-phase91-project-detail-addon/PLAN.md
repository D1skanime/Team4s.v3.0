# Phase 91 Add-on PLAN - Mein Projekt

## Ziel

Beim Öffnen eines Projekts aus "Meine Projekte" soll eine projektorientierte Detailseite erscheinen, die Projektkopf, Rollenaggregation und Release-Versionen-Liste zeigt, ohne projektweite Notizen oder eine aggregierte Beiträge-Timeline einzuführen.

## Backend

- Neuer read-only Member-Endpoint:
  - `GET /api/v1/me/projects/:animeId?fansub_group_id=...`
- Owner:
  - `backend/internal/handlers/contributions_me_project_handler.go`
  - `backend/internal/repository/anime_contributions_member_project_repository.go`
- Auth:
  - vorhandenes `authMiddleware`
  - vorhandene verified-member-Auflösung über `member_claims`
- Berechtigung:
  - confirmed `anime_contributions` des eingeloggten Members für `anime_id + fansub_group_id`
- Keine Migrationen.

## Frontend

- Neue Route:
  - `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx`
- Link aus:
  - `frontend/src/components/contributions/AnimeGroupCard.tsx`
- API/DTO:
  - `frontend/src/lib/api.ts`
  - `frontend/src/types/contributions.ts`
- Styling:
  - `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/project.module.css`
  - kleine Ergänzung in `contributions.module.css`

## Contracts

- `shared/contracts/contributions.yaml`
- `shared/contracts/openapi.yaml`

## Tests

- Frontend-Test für Detailseite:
  - Refresh-Session-Gate
  - Defaultfilter "Nur meine Beiträge"
  - "Alle" + Folgen-Suche
  - 20er-Nachladen
- Backend-Source-Invariant für die neue Projektion:
  - zweites Backdrop
  - eigene Notizen/Medien
  - member_id-Anker
  - confirmed-Projektberechtigung

## Risiken

- Der Quick-Jump "Medien zu Projekt" verweist auf die bestehende Gruppen-/Anime-Verwaltung mit Query-Filter. Eine eigenständige Member-Medienübersicht wird nicht neu gebaut.
- Echte serverseitige Pagination bleibt ein Follow-up, falls Projektlisten im Member-Kontext zu groß werden.
