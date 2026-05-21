# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Current workflow:** `v1.1 asset lifecycle hardening`
- **Current slice:** `Verified Phase-49 auth boundary plus laufende globale UI-/Design-System-Migration der echten Fansub-Admin-Slices`

## Current State

### What Finished In This Pass
- Phase 49 remains executed and verified as `PASS_WITH_NOTES`.
- Das globale UI-System ist für diese Runde praktisch verbindlich geworden: `docs/frontend/ui-system.md`, `docs/frontend/ui-inventory.md` und `/dev/ui-system` dienen als reale Zielreferenz für Live-Slices.
- `Anime & Veröffentlichungen` auf `/admin/fansubs/88/edit` wurde live gegen den Mock gezogen:
  - Anime-Unterkarte näher am Banner-/Band-Motiv
  - Tabellenzeilen ruhiger und näher am Mock
  - `Theme-Segmente` als eigenes definiertes Innenpanel
  - OP/IN/ED-Spur näher an der globalen Segment-/Badge-Sprache
- Der OP/ED/IN-Theme-Drawer nutzt jetzt die globale Drawer-/Button-/Form-Sprache statt einer lokalen Sonderoptik.
- `Grunddaten` und `Medien` wurden visuell weiter an die globale ruhige Team4s-UI angeglichen.
- Die gemeinsamen Editor-/Tiptap-Stile wurden vorbereitend ruhiger gezogen, auch wenn `Anime-Einblicke` live noch nicht ehrlich testbar war.

### What Works
- Der zentrale Auth/API-Client ist als paralleler Boundary-Stand verifiziert; normale Seiten/Komponenten bleiben tokenfrei.
- Die echte Fansub-Seite hat jetzt einen klar erkennbaren Übergang in die globale Design-System-Sprache.
- `Anime & Veröffentlichungen`, OP/ED/IN-Drawer, `Grunddaten` und `Medien` sind nicht mehr nur Playground-Ideen, sondern live angenähert.
- Docker-Deploy plus Admin-Login auf `3002` funktioniert für die verglichenen Fansub-Slices wiederholt.
- Die gemeinsame Editor-Basis ist gestalterisch vorbereitet, sobald `Anime-Einblicke` wieder mit echtem Inhalt aufrufbar ist.

### What Is Open
- `Anime-Einblicke` ist weiterhin blockiert, solange Auth-/Datenzustand nur `Anmeldung erforderlich` oder fehlende Anime-Zuordnungen zeigt.
- `Anime & Veröffentlichungen` ist nah an der Mock-Vorgabe, aber nicht mathematisch pixelgleich; die größten Brüche sind weg, Feinschliff kann später noch folgen.
- Mehrere deutsche UI-Texte auf der echten Fansub-Seite sind noch hardcoded und teils kaputt encodiert; die Konsolidierung/i18n-Vorbereitung wurde bewusst nach hinten geschoben.
- Vollständiges `npm run lint` ist global nicht grün und bleibt ein separater Follow-up-Block, nicht Teil der heutigen UI-Wahrheit.
- Der Worktree enthält sehr viele unrelated Änderungen aus Auth-, Planungs- und GSD-Arbeit; beim nächsten Commit muss sehr bewusst gesliced werden.

## Active Planning Context
- Milestone: `v1.1 Asset Lifecycle Hardening`
- Praktisch aktiver UI-Themenblock: Live-Migration der echten Admin-Slices auf die globale UI-Basis aus Phase `48a`
- Praktisch aktiver Auth-Themenblock: verifizierter Phase-49-Boundary-Stand, der parallel bestehen bleibt
- Nächster sinnvoller UI-Slice ist `Anime-Einblicke`, sobald der Auth-/Datenzustand den echten Editorfall freigibt

## Key Decisions In Force
- `docs/architecture/db-schema-fansub-domain.md` bleibt der erste Referenzpunkt für Persistenzfragen.
- `release_version_groups.fansub_group_id` bleibt die kanonische Runtime-Spalte.
- Release-Media bleibt auf der bestehenden `media_assets` / `media_files` / `release_version_media`-Seam.
- Normale Frontend-API-Calls nutzen den zentralen Auth/API-Client als Token-Lifecycle-Owner.
- Normale Seiten/Komponenten bleiben tokenfrei und nutzen Session-/Capability-/Current-User-State statt roher Tokens.
- SSR-Seiten und Jellyfin/Streaming bleiben explizite serverseitige Boundaries für Phase 49.
- `/dev/ui-system` ist die verbindliche UI-Mock-Referenz für echte Admin-Migrationen, nicht nur loses Inspiration-Board.
