---
status: complete
quick: 260525-code-altlasten-und-domain-audit
completed: 2026-05-25
---

# Summary

WP-02 `fansub-drawer-release-version-id` wurde umgesetzt.

## Ergebnis

- Der Fansub-Release-Drawer nutzt fuer Release-Version-Media nicht mehr `release_id` als `versionId`.
- Admin-Release-Summaries liefern jetzt `release_version_id`.
- Der Drawer laedt Release-Version-Media nur, wenn eine konkrete `release_version_id` vorhanden ist.
- Die Domain-Regel wurde in `AGENTS.md` und `docs/architecture/db-schema-fansub-domain.md` gegen Rueckfall auf `release_media` abgesichert.
- Der fehlende Quick-Ordner wurde mit `ROADMAP.md` und `STATUS.md` rekonstruiert.

## Checks

- `npm run test -- --run "src/app/admin/fansubs/[id]/edit/page.test.tsx"`
- `npm run typecheck`
- `go test ./internal/repository ./internal/models ./internal/handlers`
- DB-Pruefung: `release_version_groups.fansubgroup_id` existiert nicht; Migration 0057 ist angewendet.

## Hinweise

- Keine neue Migration angelegt, weil `0057_drop_release_version_groups_fansubgroup_id` bereits existiert und lokal angewendet ist.
- Testwarnung bleibt unveraendert: der `next/image`-Mock reicht `unoptimized` an ein normales `img` durch.
