---
status: complete
phase: 73-public-fansub-page-fansubs-slug-erweitern
source: [73-VERIFICATION.md]
started: 2026-06-07T12:50:52Z
updated: 2026-06-07T13:20:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Mobile-Overflow 375px (UAT-13 / 73-06)
expected: Auf `/fansubs/animeownage` bei 375px Viewport kein horizontaler Overflow; Hero-Banner-Oberkante nicht abgeschnitten.
result: pass
evidence: "document.scrollWidth == clientWidth == 375; kein Dokument-Overflow. Sektions-Nav-Buttons ragen in einem gewollten horizontalen Scroll-Container über 375px, verursachen aber keinen Page-Overflow. object-position: center top bestätigt."

### 2. Nav "Gruppenleitung" benannt + scrollbar (UAT-7 Naming / 73-07)
expected: Nav-Button "Gruppenleitung" (nicht "Timeline"); Section id `gruppenleitung`; Heading + Empty-State konsistent benannt.
result: pass
evidence: "Nav-Button, Heading und Empty-State alle 'Gruppenleitung'; section id='gruppenleitung'. Drei-Namen-Problem behoben."

### 3. Höhepunkte vs. Projekte konsistent (UAT-12 / 73-08)
expected: Kein Widerspruch zwischen Höhepunkte-Zähler und Projekte-Sektion.
result: issue
reported: "Höhepunkte zeigt '2 Anime-Projekte', Projekte-Sektion zeigt 'Noch keine Projekte'. Widerspruch besteht weiter (jetzt 2 statt 1)."
severity: major
evidence: "API: GET /fansubs/88/contributions -> anime_count=2; GET /anime?fansub_id=88 -> meta.total=0. 73-08 wechselte Zähler von anime_relations_count(1) auf anime_count(2), beide zählen aber nicht-öffentliche Beiträge; die Projekte-Sektion nutzt getAnimeList (nur öffentliche). Quellen weiterhin verschieden."

### 4. Geschichte-EmptyState (UAT-8 / 73-09)
expected: Keine irreführende CollapsibleStory; EmptyState mit Fakten-Subtitle.
result: pass
evidence: "Heading 'Noch keine Geschichte hinterlegt' + Subtitle '1999 bis 2022 • Deutschland • aktiv'. Kein CollapsibleStory-Hauptinhalt mehr."

### 5. Gruppenmedien kein Duplikat (UAT-6 / 73-09)
expected: Gruppenmedien-Block wiederholt nicht Logo/Banner; bei fehlenden Medien direkt EmptyState.
result: pass
evidence: "Gruppenmedien zeigt EmptyState 'Noch keine Medien hinterlegt', kein Logo/Banner-Render."

### 6. Kollaboration-Seite (UAT-16 / 73-10)
expected: Vereinfachtes Layout mit Hinweis-Block "Dies ist eine Kollaboration zwischen:" und klickbaren Gruppen-Links; kein Standalone-Profil; kein API-Spam.
result: issue
reported: "Vereinfachtes Layout + Hinweis-Block korrekt, ABER 'Keine Gruppenangaben hinterlegt.' — die beteiligten Gruppen-Links fehlen, obwohl Daten existieren."
severity: minor
evidence: "Slug /fansubs/animeownage-project-messiah (id 92) zeigt nur Hero + Hinweis. Hero liest group.collaboration_members; der Slug-Endpunkt /api/v1/fansub-slugs/{slug} liefert das Feld nicht (omitempty). DB fansub_collaboration_members(92) -> [88,89]; dedizierter Endpunkt /api/v1/fansubs/92/collaboration-members existiert, wird aber nicht aufgerufen. Kern-Intent (keine Standalone-Gruppe) erfüllt."

### 7. Badge "auch Mitglied" (UAT-5 / 73-10)
expected: Bei Überschneidung Contributor/Mitglied (Angeldust) Badge "auch Mitglied".
result: issue
reported: "Kein Badge 'auch Mitglied', obwohl Angeldust als Ehemaliges Mitglied UND Externer Mitwirkender erscheint."
severity: minor
evidence: "page.tsx teamMemberNames = domainProjection.members (nur aktiv) = ['Ballelboy']. Angeldust steht in domainProjection.historical, nicht in members -> isAlsoMember=false -> kein Badge. Historische Mitglieder werden im Cross-Reference übersehen."

## Summary

total: 7
passed: 4
issues: 3
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Höhepunkte-Projektzähler entspricht der angezeigten Projektliste"
  status: failed
  reason: "anime_count=2 (inkl. nicht-öffentlicher) vs. getAnimeList total=0 (nur öffentliche). 73-08 wechselte nur die Zählerquelle, ohne die Diskrepanz zu beseitigen."
  severity: major
  test: 3
  artifacts: [frontend/src/components/fansubs/FansubHighlightsSection.tsx, frontend/src/app/fansubs/[slug]/page.tsx]
  missing: ["Zähler muss dieselbe Quelle wie die Projekte-Sektion nutzen — z.B. projects.length (bereits in page.tsx vorhanden) an FansubHighlightsSection durchreichen, statt contributions.anime_count"]

- truth: "Kollaborations-Seite zeigt die beteiligten Gruppen als klickbare Links"
  status: failed
  reason: "group.collaboration_members wird vom Slug-Endpunkt nicht geliefert; Hero zeigt immer Fallback 'Keine Gruppenangaben hinterlegt.'. Daten existieren (DB + /collaboration-members-Endpunkt)."
  severity: minor
  test: 6
  artifacts: [frontend/src/app/fansubs/[slug]/page.tsx, frontend/src/components/fansubs/FansubHeroSection.tsx]
  missing: ["page.tsx muss für group_type='collaboration' getCollaborationMembers(group.id) über /api/v1/fansubs/:id/collaboration-members laden und an FansubHeroSection übergeben (api.ts-Funktion ggf. ergänzen)"]

- truth: "Externe Mitwirkende sind klar von Mitgliedern getrennt, mit Querverweis bei Duplikaten"
  status: failed
  reason: "teamMemberNames enthält nur aktive Mitglieder; historische Mitglieder (Angeldust) werden im 'auch Mitglied'-Abgleich übersehen."
  severity: minor
  test: 7
  artifacts: [frontend/src/app/fansubs/[slug]/page.tsx]
  missing: ["teamMemberNames muss aktive UND historische Mitglieder umfassen: domainProjection.members + domainProjection.historical"]

- truth: "Gruppenleitung-Sektion spiegelt den Lead (fansub_lead)"
  status: failed
  reason: "leader_timeline=[] vom Backend; Sektion zeigt 'Noch keine Gruppenleitung eingetragen.' obwohl Ballelboy fansub_lead ist. 73-07 hat nur umbenannt, die Daten-Lücke blieb."
  severity: minor
  test: 2
  artifacts: [frontend/src/app/fansubs/[slug]/page.tsx, frontend/src/components/fansubs/GroupLeaderTimeline.tsx]
  missing: ["Lead aus domainProjection.members mit Rolle 'fansub_lead' ableiten, wenn contributions.leader_timeline leer ist (Frontend-Fallback) — oder Backend leader_timeline befüllen"]
