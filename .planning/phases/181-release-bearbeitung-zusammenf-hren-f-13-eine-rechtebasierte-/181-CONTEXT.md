# Phase 181 — Release-Bearbeitung zusammenführen (F-13) — NEUSTART

**Status:** Der erste Versuch (Pläne 181-01..09) wurde vom Nutzer verworfen und per
Revert (Commit `dae19862`) vollständig zurückgenommen. Sicherung liegt im Zweig
`backup/phase181-erster-versuch` — nicht anfassen. Alle Planungsartefakte des
ersten Versuchs liegen jetzt unter `verworfen-erster-versuch/` in diesem Ordner
(reine Ablage, keine Grundlage für den Neustart).

**Fehler des ersten Versuchs:** Die zusammengeführte Seite wurde im Stil des
`/me`-Workspace gebaut („Release-Projektbereich“, Breadcrumb „Meine Projekte“).
Das ist falsch — siehe D-01.

---

## Verbindliche Nutzerentscheidung (2026-10-14)

Ersetzt D-01 bis D-05 des ersten Versuchs vollständig. Diese Entscheidungen sind
bindend für Planung und Ausführung.

- **D-01** — Die eine Release-Bearbeitungsseite IST der bestehende Editor unter
  `/admin/episode-versions/[versionId]/edit` — exakt diese Oberfläche, so wie sie
  heute über `/admin/fansubs/<id>/edit?tab=releases` → „Notizen & Bilder öffnen“
  erreicht wird (Kopf „Contributor/Admin Editor“, Tabs Informationen · Segmente ·
  Media/Assets · Notizen/Beiträge · Öffentliche Release-Seite, oben rechts
  Zurück · Folge x/y · Weiter, unten Zurück + Zur Fansubgruppe). Die Adresse
  bleibt unverändert. Kein neues Layout, kein neuer Pfad, kein Umbau der Seite.

- **D-02** — Alle Einstiege, die heute auf `/me/releases/[id]/workspace` zeigen
  (insbesondere „Meine Projekte“/Projektseite und Dashboard), springen künftig
  auf diesen Editor, mit passendem `return_to`, damit „Zurück“ dorthin führt, wo
  man herkam.

- **D-03** — `/me/releases/[id]/workspace` leitet dauerhaft auf den Editor weiter
  (Query/`return_to` erhalten). Danach wird der Workspace-Code entfernt, sofern
  nichts anderes ihn nutzt.

- **D-04** — Mitglieder ohne Admin-Rechte, die heute den Workspace nutzen, müssen
  den Editor mit ihren bisherigen Rechten nutzen können (der Editor kennt
  bereits den Contributor-Modus). Siehe „Rechtevergleich Editor vs. Workspace“
  unten für den nachgemessenen Befund und die daraus folgende Auflage.

- **D-05** — Keine Verhaltensänderung am Editor selbst (Notizen, Medien,
  Segmente, Blättern bleiben wie heute). Regression ausdrücklich verboten: der
  erste Versuch zeigte im Notizen-Tab fälschlich „Keine Rollen zugeordnet“,
  obwohl der Editor für Release-Version 27 die Notiz von `timer` korrekt zeigt.

---

## Ist-Zustand: Einstiegspunkte

### Zeigen heute auf `/me/releases/[id]/workspace` (D-02/D-03 betreffen diese)

| # | Fundstelle | Kontext |
|---|---|---|
| 1 | `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx:351` | „Arbeitsfläche öffnen“-Button je Release-Zeile in der Mitglieder-Projektansicht |
| 2 | `frontend/src/app/me/dashboard/components/attentionHelpers.ts:38` (`resolveWorkspaceHref`), gerendert in `AttentionSection.tsx:195` | Dashboard-Link für neue Zuweisungen (`?tab=segments`) |
| 3 | `frontend/src/app/me/dashboard/components/AttentionSection.tsx:172` | Dashboard-Link je abgelehnter Notiz-Revision (`?tab=notes`) |
| 4 | `frontend/src/components/contributions/ContributionCard.tsx:100` | „Arbeitsfläche öffnen“ je bestätigtem Beitrag, nur bei `mode === 'confirmed'` |
| 5 | `frontend/src/components/contributions/AnimeGroupCard.tsx:280` | „Arbeitsfläche öffnen“ je Rolle/Zeitraum |

Alle 5 hängen an der **eigenen bestätigten `anime_contribution`** des Nutzers
(`attentionHelpers.ts:31-39`, `ContributionCard.tsx:95-104`) — unabhängig von
einer Fansub-Gruppenmitgliedschaft.

### Zeigen heute auf `/admin/episode-versions/[versionId]/edit`

| # | Fundstelle | Kontext |
|---|---|---|
| 1 | `frontend/src/components/episodes/EpisodesOverview/VersionRow.tsx:123` | „Bearbeiten“ in Anime-Episoden-Übersicht, hinter `PlatformAdminGate` |
| 2 | `frontend/src/app/admin/anime/[id]/episodes/[episodeId]/versions/page.tsx:663` | „Bearbeiten“ in Episoden-Versionen-Liste, Seite hinter `PlatformAdminGate` (`page.tsx:14,693`) |
| 3 | `frontend/src/app/admin/users/tabs/UserMediaTab.tsx:116` | „Release-Medien öffnen“ im Admin-User-Detail |
| 4 | `frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx:287` | „Release bearbeiten“ in der Admin-Prüfliste |
| 5 | `frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.ts:185` (`releaseVersionToolsTarget`), gerendert in `ReleaseRowDetails.tsx:106-123` | „Notizen & Bilder öffnen“ im Releases-Tab von `/admin/fansubs/<id>/edit?tab=releases` — **das ist D-01s Referenzpfad** |
| 6 | `frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaDrawerSummary.tsx:92` | „Media verwalten“ im Medien-Drawer derselben Seite |

Einstieg #5 wird nur angezeigt, wenn `canOpenReleaseTools` (`ReleaseRowDetails.tsx:112-113`)
zutrifft: `canOpenWithoutProjectAssignment || hasOwnProjectAssignment`. Dabei ist
`canOpenWithoutProjectAssignment` (`AnimeReleasesCockpit.tsx:444-447`)
`isPlatformAdmin || canUseReleaseMedia || canUseReleaseNotes`, und diese beiden
stammen (`FansubEditClient.tsx:152-153`, `fansubEditAccess.ts:140-147`) aus
**gruppenweiten** Capabilities (`getFansubGroupCapabilities`). Ein reiner
Mitwirkender ohne Gruppenrolle erfüllt `hasOwnProjectAssignment` zwar über seine
eigene Contribution, aber `releaseVersionToolsTarget` liefert trotzdem `null`,
solange die gruppenweiten `canViewMedia`/`canEditNotes`-Flags `false` sind
(`fansubEditAccess.ts:171-188`). **Diese Person sieht Einstieg #5 nicht.**

---

## Rechtevergleich Editor vs. Workspace (D-04)

**Backend-Rechteprüfung: identisch.** Beide Seiten laden dieselben zwei
Endpunkte mit derselben Prüf-Logik:

- `GET /api/v1/admin/episode-versions/:versionId/editor-context` —
  `backend/internal/handlers/admin_content_episode_version_editor.go:16-64`.
  Admin lädt direkt; Nicht-Admin durchläuft `permissions.CanForReleaseVersion`
  mit `ActionReleaseVersionView`/`MediaView`/`NotesWrite` (Zeile 31-50).
- `GET /api/v1/admin/release-versions/:versionId/capabilities` —
  `backend/internal/handlers/admin_content_release_version_media_capabilities.go:25-110`.
- Kernprüfung: `backend/internal/permissions/permissions.go:626-707`
  (`CanForReleaseVersion`) — Platform-Admin-Bypass (637-645), dann Gruppenrolle
  (`canForReleaseVersionGroupRole`, 719-745) **oder** `anime_contribution`-Rollen-
  Fallback (`ListActorContributionRolesForVersion` + `roleAllows`, 672-686). Ein
  reiner Mitwirkender ohne jede Fansub-Gruppenrolle kommt über seine
  Contribution-Rolle (z. B. `translator`, `timer`) rein, sofern diese Rolle die
  jeweilige Action in `role_capabilities` besitzt.
- Editor-Seite selbst (`EpisodeVersionEditorPage.tsx:194-211`) gated bereits auf
  `isPlatformAdmin || isContributorScopedEditor` (letzteres aus genau diesen
  Capabilities) — der „Contributor-Modus“ aus D-04 existiert also schon
  (Eyebrow-Label „Contributor Editor“, Zeile 320-322).
- Workspace-Seite (`frontend/src/app/me/releases/[versionId]/workspace/page.tsx:96-98,251,270-274`)
  ruft dieselben zwei Endpunkte und prüft `hasAnyWorkspaceAccess` — bitidentisch
  zur Editor-Bedingung. Einzige Abweichung: ein zusätzliches Notizen-Gate
  `can_edit_notes && memberId != null` (Zeile 271), ohne Entsprechung im Editor.

**Befund:** Es gibt **keinen Mitwirkenden, der heute den Workspace öffnen darf,
aber vom Editor serverseitig abgewiesen würde.** Die Rechteprüfung der
Zielseite selbst ist identisch. Die Lücke liegt ausschließlich in der
**Frontend-Navigation**: Die 5 Workspace-Einstiegspunkte sind an die eigene
Contribution gebunden (siehe oben), während die vergleichbaren Editor-
Einstiegspunkte (#1/#2 admin-only, #5/#6 an gruppenweite Capabilities gebunden)
für einen reinen Mitwirkenden ohne Fansub-Gruppenrolle ins Leere laufen. Diese
Person hätte heute **gar keinen Link** zum Editor, obwohl eine direkt
eingegebene Editor-URL dank identischer Backend-Prüfung funktionieren würde.

**Betroffener Fall:** Bestätigter Mitwirkender mit nur einer
`anime_contribution`-Rolle (z. B. `translator`, `timer`, `encoder`) auf eine
konkrete Release-Version, ohne eigene Fansub-Gruppenrolle (kein `fansub_lead`/
`co_leader`) und ohne Platform-Admin-Flag.

**Auflage für die Planung:** Wenn D-02 die 5 Workspace-Links künftig auf den
Editor umbiegt, müssen diese neuen Linkziele ihre bisherige
Sichtbarkeitsbedingung (eigene Contribution) behalten — NICHT zusätzlich die
gruppenweiten Capabilities der Admin-Einstiegspunkte #5/#6 verlangen. Sonst
verliert genau die oben beschriebene Person ihren einzigen Zugang zur
Bearbeitung, obwohl der Editor sie laut Backend zulässt. Das ist eine reine
Link-Sichtbarkeits-Frage (welche Bedingung entscheidet, ob der Link gerendert
wird), keine Rechte-Erweiterung am Editor oder Backend — Editor-Layout und
-Verhalten bleiben laut D-01/D-05 unverändert.

---

## Abgrenzung

- Keine neue UI-SPEC nötig — es entsteht keine neue Oberfläche, nur
  Linkziele/Redirects/Rechte-Sichtbarkeit ändern sich.
- Kein Umbau von `/admin/episode-versions/[versionId]/edit` selbst (Tabs,
  Reihenfolge, Notizen-Darstellung bleiben exakt wie heute — D-05).
- `/me/releases/[id]/workspace`-Code wird erst nach Aktivierung der Redirects
  entfernt, und nur wenn keine andere Stelle ihn noch referenziert (D-03).
- Verwandter, aber nicht identischer Befund aus dem ersten Versuch
  (`verworfen-erster-versuch/181-REVIEW.md`, Finding WR-02): Breadcrumb/
  Zurück-Links verwiesen hart auf `/admin/anime`, unerreichbar für
  Non-Admin-Fansub-Leads. Für den Neustart gilt stattdessen die Editor-UI
  unverändert (D-05) — `return_to` (D-02/D-03) löst das Rücksprung-Problem
  anders, nicht über Breadcrumb-Umbau.
