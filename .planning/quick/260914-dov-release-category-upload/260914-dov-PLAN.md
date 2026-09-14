---
phase: quick-260914-dov
plan: 01
type: execute
wave: 1
depends_on: []
autonomous: true
files_modified:
  - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx
  - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx
requirements: []
---

## Ziel / verbindliche UI-Spezifikation

Nutzerauftrag: Auf /me/releases/28/workspace öffnet jede der vier Kategorien direkt „Medien hochladen“ mit der richtigen Kategorie. Beide separaten Uploadbuttons und die untere „Noch keine Medien“-Card entfallen. Bestehendes Erscheinungsbild, Abstände, Kategorienamen/Zähler, Farben, Rundungen und responsive Aufteilung bleiben. Ohne Medien entfällt auch die alleinstehende Aktive-Kategorie-/0-Medien-Zeile; die vier Zähler zeigen den Leerzustand. Mit Medien bleiben Kategorieüberschrift und Galerie. Der Dialog entspricht dem zweiten Nutzerscreenshot unverändert.

Kategorie-Enum → vier native Buttons in benannter Gruppe mit aria-pressed für den aktiven Filter und aria-haspopup=dialog bei Uploadberechtigung. Kein neuer Dropdown/Uploadflow. Nur lesende Nutzer können weiterhin filtern, ohne Uploaddialog. Während aktivem Upload keine Kategorie-/Queueänderung. Kein Dialog bei Mount oder reinem Wechsel zu Bilder & Medien.

## read_first / bestehende Nähte

AGENTS.md, AI-HANDOFF.md, docs/engineering/implementation-contract.md, docs/frontend/ui-system.md, docs/agent-guidelines-ui.md, docs/frontend/auth-api-client.md; Domainregeln zu release_version_media in docs/architecture/db-schema-fansub-domain.md; STATE/ROADMAP aktueller Stand.
ReleaseVersionMediaSection.tsx/.test.tsx/.module.css, .helpers.tsx, useReleaseVersionMedia.ts, ui/Drawer.tsx, types/releaseVersionMedia.ts;
me/releases/[versionId]/workspace/page.tsx und page.test.tsx; Admin EpisodeVersionEditorPage.tsx.

## Bestand / Scope

HEAD 2fbfdf01; untracked frontend/scripts/shot2.mjs nicht anfassen. Gemeinsame Section wird vom Member-Workspace und Admin-Editor genutzt: gleiche Kategoriebedienung an beiden Stellen, kein Modus-/Parallelkomponentenbau. Header-Anzeige „Medien hochladen“ im Workspace ist ein Capability-Badge, kein dritter Uploadbutton. Datenabruf, Upload, Retry, Review und Media-Ownership bleiben im bestehenden useReleaseVersionMedia und API-Client. Kein API-/DB-Vertragswechsel.

## Tasks

1. Regressionstests: alle vier Kategorien öffnen sofort den passenden Dialog und übergeben ihren autoritativen Kategoriecode an startUpload; beide redundanten Buttons und leere Card fehlen. Nur-Lesen kann Galerie filtern; laufende Queue bleibt geschützt; Abbrechen/erneut Öffnen derselben Kategorie setzt Draft zurück. Bestehende Tests auf neue Einstiegspunkte anpassen, zuerst Red-Beweis ausführen.
2. Bestehenden openUploadSheet-Einstieg zu selectCategory zusammenführen: Kategorie setzen und bei erlaubtem Upload bestehenden Dialog öffnen. Redundante Buttons/EmptyState entfernen, Überschrift nur bei Galerie, Helfertext präzisieren. Keine Styles/Transportschicht ändern. Bestehende Fehler-/Retry-/Revisions-/Preview-/Readonly-Tests erhalten.
3. Gezielte Tests, Refresh-only-Workspace/zentraler API-Transport, Browser bei 390×844/768×1024/1440×900 mit leeren und belegten Kategorien, Keyboard/Touch, keine echten Uploads. Lint, Typecheck, isolierter Produktionsbuild, diff-check. Codecommit + Summary/STATE, keine neue Phase und kein Human-UAT-Sign-off.

## Risiken / Abnahme

Versions-ID und Kategorie müssen genau weitergegeben werden; keine Kategorieänderung während Upload. Bestehende Medien nach Abbrechen weiterhin erreichbar. Berechtigungen nie aus Access-Token allein ableiten; zentraler Session-Refresh bleibt unverändert. Browserfixtures ausschließlich mit abgefangenen API-Antworten, keine Nutzerdaten-/DB-Schreibzugriffe. Altfehler separat dokumentieren: 13 Lintfehler/331 Warnungen, AnimePageProps.searchParams-Typecheck, formatEditLoadError-Pageexport im Build. Bestehende Human-UAT der Phasen156–159 unverändert.

Quick-Ausführung inline für den kleinen eng gekoppelten Fix; kein sinnvoll unabhängig parallelisierbarer Implementierungsteil.
