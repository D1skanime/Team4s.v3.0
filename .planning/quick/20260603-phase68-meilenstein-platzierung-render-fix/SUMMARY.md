---
type: quick
slug: phase68-meilenstein-platzierung-render-fix
status: complete
completed: 2026-06-03
---

# Summary: Phase-68 Remediation — Meilenstein-Platzierung + Render-Bug

Behebt zwei beim Live-UAT von Phase 68 gefundene Defekte.

## Befunde (aus Live-UAT)
1. **Falsche Platzierung:** Meilenstein-CRUD (`GroupHistorySection`) lag nur auf der
   künftig-öffentlichen Seite `/admin/my-groups/[id]` — dort soll nur Anzeige sein.
2. **Render-Bug:** gespeicherter Meilenstein rendete als „—" (Titel/Jahr/Notiz fehlten).

## Root Cause Render-Bug
`repository.GroupHistoryRow` (backend) hatte **keine `json:"..."`-Tags** → Go serialisierte
PascalCase (`Title`, `Year`, `EventType`, `Note`), das Frontend (`GroupHistoryRow` in api.ts)
liest aber snake_case (`title`, `year`, `event_type`, `note`) → alle Felder `undefined`.

## Änderungen
- `backend/internal/repository/fansub_group_history_repository.go` — snake_case `json`-Tags
  am `GroupHistoryRow`-Struct ergänzt.
- `frontend/src/components/groups/GroupHistorySection.tsx` — neue Prop `readOnly`: blendet
  „+ hinzufügen", Form und Row-Edit/Delete-Buttons aus (Anzeige-Modus).
- `frontend/src/app/admin/my-groups/[id]/page.tsx` — `<GroupHistorySection ... readOnly />`
  (künftig-öffentliche Fläche → nur Anzeige).
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` — editierbare `<GroupHistorySection>`
  in den „Gruppengeschichte"-Tab eingehängt (Edit-Bereich = wo CRUD hingehört).

## Verifikation (live, App-Browser :3000)
- **Render-Bug behoben:** Eintrag rendet jetzt „2010 · Meilenstein · UAT Testmeilenstein — …".
- **my-groups read-only:** kein „+ hinzufügen", 0 Edit/Delete-Buttons, Timeline sichtbar.
- **Edit-Bereich editierbar:** „+ hinzufügen" + Edit/Delete vorhanden.
- **CRUD end-to-end:** Create → Render → Edit (Prefill + Update) → Delete (Modal + „Meilenstein
  gelöscht."-Toast) bestätigt. DB nach Delete leer (Testdaten weg).
- `npm run typecheck` grün; `npx eslint` 0 errors (nur bestehende Warnungen); Backend neu gebaut.

## Git-Disziplin
Nur eigene 4 Dateien + Quick-Artefakte gestaged (kein `git add -A`); kein stash; Working Tree
war clean (parallele Session hatte committet).
