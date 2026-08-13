---
phase: 40-text-und-notizsystem-fuer-fansub-plattform
status: planned
total_plans: 10
waves: 3
---

# Phase 40 — Text-/Notizsystem für Fansub-Plattform

## Ziel

Vier neue Note-Entitäten für die Fansub-Plattform: redaktionelle Gruppennotizen, persönliche Mitgliedergeschichten, Anime-Projekttexte und rollenbezogene Produktionsnotizen zu Release-Versionen. Vollständig mit Markdown-Rendering (goldmark + bluemonday), Soft-Delete und Admin-UI.

## Wave-Struktur

| Wave | Pläne | Abhängigkeiten | Parallel? |
|------|-------|----------------|-----------|
| 1 | 40-01, 40-02 | keine | ja |
| 2 | 40-03, 40-04, 40-05, 40-06 | Wave 1 | 40-03 und 40-04 parallel; 40-05 und 40-06 nach 40-03+04 |
| 3 | 40-07, 40-08, 40-09, 40-10 | Wave 2 | 40-07 zuerst; 40-08/40-09/40-10 nach 40-07 parallel |

## Alle Pläne

### Wave 1 — Datenbank

| Plan | Titel | Dateien |
|------|-------|---------|
| [40-01](./40-01-PLAN.md) | DB Migrations — 4 neue Note-Tabellen (0061–0064) | `database/migrations/0061–0064_*.sql` |
| [40-02](./40-02-PLAN.md) | DB Migration 0065 — contributor_roles Cleanup und 11 Kernrollen | `database/migrations/0065_*.sql` |

### Wave 2 — Backend

| Plan | Titel | Dateien | Depends On |
|------|-------|---------|------------|
| [40-03](./40-03-PLAN.md) | Backend — Markdown-Service (goldmark + bluemonday) | `backend/internal/services/markdown_service.go` | 40-01 |
| [40-04](./40-04-PLAN.md) | Backend — Repositories für alle 4 Note-Typen | `backend/internal/repository/fansub_notes_repository.go`, `release_version_notes_repository.go` | 40-01, 40-02 |
| [40-05](./40-05-PLAN.md) | Backend — Handler + Routes für Fansub-Notes | `backend/internal/handlers/admin_content_fansub_notes.go`, `admin_routes.go`, `main.go` | 40-03, 40-04 |
| [40-06](./40-06-PLAN.md) | Backend — Handler + Routes für release_version_notes (Bulk-Save) | `backend/internal/handlers/admin_content_release_version_notes.go`, `admin_routes.go`, `main.go` | 40-03, 40-04 |

### Wave 3 — Frontend

| Plan | Titel | Dateien | Depends On |
|------|-------|---------|------------|
| [40-07](./40-07-PLAN.md) | Frontend — TypeScript-Typen und API-Client-Funktionen | `frontend/src/types/fansubNotes.ts`, `releaseVersionNotes.ts`, `api.ts` | 40-05, 40-06 |
| [40-08](./40-08-PLAN.md) | Frontend — Fansub-Editor: Notizen-Tab (fansub_group_notes + member_group_stories) | `NotesTab.tsx`, `page.tsx` | 40-07 |
| [40-09](./40-09-PLAN.md) | Frontend — Fansub-Editor: Anime-Projekttexte | `AnimeProjectNotesSection.tsx`, `page.tsx` | 40-07 |
| [40-10](./40-10-PLAN.md) | Frontend — Release-Version-Editor: Notizen-Tab (Bulk-Save) | `ReleaseVersionNotesTab.tsx`, `EpisodeVersionEditorPage.tsx` | 40-07 |

## Abhängigkeitsgraph

```
40-01 ──────────────┬──→ 40-03 ─┬──→ 40-05 ─┬──→ 40-07 ─┬──→ 40-08
                    │           │           │            ├──→ 40-09
40-02 ──────────────┴──→ 40-04 ─┴──→ 40-06 ─┘            └──→ 40-10
```

## Neue Migrationen

| Nummer | Tabelle / Zweck |
|--------|-----------------|
| 0061 | `fansub_group_notes` — redaktionelle Gruppennotizen |
| 0062 | `member_group_stories` — persönliche Mitgliedergeschichten |
| 0063 | `anime_fansub_project_notes` — Anime-Projekttexte |
| 0064 | `release_version_notes` — rollenbezogene Produktionsnotizen |
| 0065 | `contributor_roles` — TRUNCATE + 11 Kernrollen (label, description) |

## Neue Backend-Dateien

- `backend/internal/services/markdown_service.go`
- `backend/internal/repository/fansub_notes_repository.go`
- `backend/internal/repository/release_version_notes_repository.go`
- `backend/internal/handlers/admin_content_fansub_notes.go`
- `backend/internal/handlers/admin_content_release_version_notes.go`

## Neue Frontend-Dateien

- `frontend/src/types/fansubNotes.ts`
- `frontend/src/types/releaseVersionNotes.ts`
- `frontend/src/app/admin/fansubs/[id]/edit/NotesTab.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.tsx`

## Geänderte Dateien

- `backend/go.mod` + `go.sum` (goldmark, bluemonday)
- `backend/cmd/server/admin_routes.go` (neue Routen)
- `backend/cmd/server/main.go` (neue Services + Repositories)
- `backend/internal/handlers/admin_content_handler.go` (neue Felder im Handler-Struct)
- `frontend/src/lib/api.ts` (neue API-Funktionen)
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` (neuer Notizen-Tab)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx` (neuer Notizen-Tab)

## Technische Entscheidungen (aus User-Entscheidungen + CONTEXT.md)

1. **Markdown-Rendering:** goldmark + bluemonday im Go-Backend — server-seitiges Rendering beim Save
2. **contributor_roles:** TRUNCATE CASCADE + 11 Kernrollen mit label/description neu einfügen (alte Seeds waren Test-Daten)
3. **Bulk-Save:** release_version_notes werden per Array-Request in einem POST gespeichert
4. **Visibility:** VARCHAR CHECK ('public'/'internal') — kein FK auf visibilities-Tabelle
5. **Status:** VARCHAR CHECK ('draft'/'published'/'archived'/'deleted')
6. **Soft-Delete:** deleted_at/deleted_by_user_id in allen 4 Tabellen
7. **UNIQUE:** release_version_notes: Partial Index auf (release_version_id, member_id, role_id) WHERE deleted_at IS NULL
8. **anime_fansub_project_notes:** UNIQUE Partial Index auf (anime_id, fansub_group_id) für MVP-Haupttext
