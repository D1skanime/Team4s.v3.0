# Phase 42: TipTap Collaboration MVP fuer fansub_group_notes - Context

**Gathered:** 2026-05-12
**Status:** Ready for planning
**Source:** User direction after Phase 41 discussion; official TipTap collaboration docs

<domain>
## Phase Boundary

Diese Phase fuehrt einen schmalen Collaboration-MVP auf Basis des neuen TipTap-Editors ein.

**Was diese Phase liefert:**
- Echtzeit-Kollaboration nur fuer `fansub_group_notes`
- stabile Dokument-ID-Bindung pro bestehender Gruppennotiz
- Collaboration-Auth fuer berechtigte Benutzer
- Presence-Grundlage im Editor-Kontext
- Persistenz zur bestehenden Fachquelle `fansub_group_notes.body_json`
- klares Save-/Sync-Modell fuer `body_json`, `body_html`, `body_text`

**Was diese Phase NICHT liefert:**
- keine Collaboration fuer `member_group_stories`
- keine Collaboration fuer `anime_fansub_project_notes`
- keine Collaboration fuer `release_version_notes`
- keine freie Ausweitung auf Anime-/Release-Domainentitaeten
- kein vollwertiges Kommentar-/Track-Changes-System
- keine neue parallele Textspeicherung ausserhalb von `fansub_group_notes`
- keine breite Rollenumgestaltung des gesamten Auth-Systems

</domain>

<current_state>
## Current State

- Phase 41 hat TipTap als Editor-Basis fuer die vier Notizsysteme eingefuehrt, ist aber laut aktuellem UAT noch nicht vollstaendig gruen.
- `fansub_group_notes` ist die fachlich passende erste Collaboration-Seam, weil es offizielle Gruppennotizen repraesentiert und nicht an Release-Rollen oder Anime-Kontexte gekoppelt ist.
- Das Projekt hat bereits eine Admin-/Auth-Infrastruktur, aber noch keine dokumentierte Collaboration-Session-Schicht fuer TipTap/Yjs-Dokumente.
- Das Domain-Risiko bleibt hoch: Release-/Fansub-Daten duerfen nicht an die falsche Entitaet gekoppelt werden.

</current_state>

<decisions>
## Locked Decisions

- Phase 42 MVP-Zielobjekt: `fansub_group_notes`
- Keine Ausweitung auf `member_group_stories` in diesem MVP
- Deployment-Modell: `self-hosted only`
- Collaboration-Backend wird als projekt-eigener Self-Hosted-Stack geplant, nicht als TipTap Platform/Cloud
- Redis ist im Projekt bereits vorhanden und soll fuer den Self-Hosted-Collaboration-Stack genutzt werden
- Fachliche Primarquelle bleibt `fansub_group_notes.body_json`
- `body_html` und `body_text` bleiben serverseitig abgeleitete Felder
- Dokumentidentitaet muss notiz-zentriert sein, nicht gruppenweit lose
- Collaboration-Rechte muessen explizit an bestehende Team4s-Rollen gekoppelt werden
- Phase 42 darf keinen zweiten konkurrierenden Notizspeicher einfuehren

## Open Technical Decisions

- konkrete Self-Hosted-Laufzeit/Topologie (z. B. Hocuspocus-Prozess, Redis-Nutzung fuer Awareness/Skalierung, Persistenz-Hooks)
- exakte JWT-Form fuer Collaboration-Verbindungen
- Persistenzmodus: expliziter Save, snapshot-basiert, webhook-basiert oder Hybrid
- ob Presence schon in Phase 42 nur als Teilnehmerliste oder bereits mit Carets/Cursors startet
- ob neue Gruppennotizen erst lokal angelegt und danach kollaborativ verbunden werden oder ob Collaboration nur fuer bestehende Notizen startet

</decisions>

<constraints>
## Constraints

- Phase 41 muss vor produktiver Phase-42-Umsetzung funktional stabil sein; Planning darf aber jetzt erfolgen.
- Die bestehende Fansub-Domainregel bleibt: release-spezifische Inhalte duerfen nicht auf neutrale oder falsche Entitaeten driften.
- Collaboration darf nicht dazu fuehren, dass eine Gruppennotiz versehentlich anime- oder release-bezogen gespeichert wird.
- Undo/Redo muss mit Collaboration kompatibel sein; lokaler StarterKit-History-Modus ist dafuer kritisch.
- Initialinhalt darf in kollaborativen Dokumenten nicht bei jedem Connect erneut injiziert werden.
- Externe Document-Cloud ist fuer Team4s ausgeschlossen; Betriebsverantwortung liegt voll beim Projekt.
- Der vorhandene Redis-Stack (`team4sv30-redis`) ist ein bestehender Betriebsbaustein und soll nicht ignoriert oder parallel neu erfunden werden.

</constraints>

<artifacts>
## Relevant Artifacts

- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/phases/41-globalen-tiptap-rich-text-editor-einfuehren/41-CONTEXT.md`
- `.planning/phases/41-globalen-tiptap-rich-text-editor-einfuehren/41-RESEARCH.md`
- `.planning/phases/41-globalen-tiptap-rich-text-editor-einfuehren/41-UAT.md`
- `frontend/src/components/editor/RichTextEditor.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/NotesTab.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/NotesTab.helpers.tsx`
- `frontend/src/lib/api.ts`
- `backend/internal/handlers/admin_content_fansub_group_notes.go`
- `backend/internal/repository/fansub_group_notes_repository.go`

</artifacts>
