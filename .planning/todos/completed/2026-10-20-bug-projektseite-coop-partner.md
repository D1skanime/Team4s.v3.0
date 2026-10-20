---
created: 2026-10-20T00:00:00+00:00
title: "BUG: Projektseite zeigt falsche „Coop-Partner“, und andere Gruppen sind nicht klickbar"
area: public-project-page
status: decided
files:
  - backend/internal/repository/group_repository.go
  - backend/internal/repository/group_repository_cursor.go
  - frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts
  - frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx
  - frontend/src/app/anime/[id]/group/[groupId]/sections/ProjectStats.tsx
  - frontend/src/app/anime/[id]/group/[groupId]/releases/page.tsx
---

## Nutzerbefund (20.10.2026, „Mega Bug“)

Projektseite `/anime/2/group/26` (Strawhat Subs × 11eyes): Unter **„Coop-Partner“** erscheinen Bloody-Shadow und FlameHaze-subs, obwohl jede Gruppe ihre **eigenen** Releases gebaut hat und **keine** Partnerschaft besteht. Außerdem lassen sich die beiden Gruppen nicht anklicken.

## Ursache (geprüft)

- DB: Anime 2 hat je 12 Releases der Gruppen 24/25/26, kein einziges `release_version` mit mehr als einer Gruppe.
- `getOtherGroups` (`group_repository.go`, auch in `group_repository_cursor.go`) liefert **alle** anderen Gruppen mit Release zu diesem Anime (Feld `other_groups`).
- `projectPageData.ts:261` übernimmt `other_groups` ungefiltert als `cooperationGroups` → `HeroSection.tsx` → `ProjectStats.tsx` zeigt sie als „Coop-Partner“ (eingeführt mit Commit `0986ba6b5`).
- Bei mehreren Gruppen: `AvatarStack` **ohne Links**. Bei einer einzelnen Gruppe: Link auf `/fansubs/<slug>` (Gruppenseite) statt auf die Projektseite.

## Vom Nutzer gewünschtes Verhalten

1. **„Coop-Partner“** = nur Gruppen, die mit dieser Gruppe an mindestens einem **gemeinsamen Release** beteiligt sind (beide in `release_version_groups` desselben Releases dieses Animes). Dafür eine eigene Backend-Liste (z. B. `coop_groups`); `other_groups` bleibt unverändert, weil die Release-Liste es nutzt. Jede Coop-Gruppe ist klickbar und führt zur **Projektseite der Partnergruppe beim selben Anime**: `/anime/<animeId>/group/<groupId>`.
2. **„Weitere Gruppen zu diesem Anime“** auf der Projektseite = die übrigen Gruppen, die den Anime **getrennt** gemacht haben. Jede ist klickbar und führt zu **deren Projektseite**.
   - UI wiederverwenden: Diese Chips gibt es mit genau dieser Überschrift schon in `releases/page.tsx` (`otherGroupsSection`/`otherGroupChip`, ca. Z. 417). Als gemeinsame Komponente herausziehen, Link-Ziel per Prop, **nicht kopieren**.
3. Falls Avatare bleiben: `AvatarStack` in `@/components/ui` global um optionale Links erweitern, statt lokal eigenes Markup zu bauen.
4. Erwartung bei 11eyes/Strawhat: kein „Coop-Partner“. Bloody-Shadow und FlameHaze-subs stehen klickbar unter „Weitere Gruppen zu diesem Anime“ (Ziel `/anime/2/group/24` bzw. `/25`).
5. **Nicht anfassen:** „Weitere Releases dieser Episode“ auf der Release-Detailseite. Live geprüft am 20.10.: Diese Links führen korrekt zum Release derselben Episode der anderen Gruppe (z. B. Release 52 → 50/51).

## Tests und Vorgaben

- Backend-Test gegen echte Postgres-Fixture: getrennte Releases → kein Coop-Partner; gemeinsames Release → Partner; die eigene Gruppe ist nie enthalten.
- Frontend: Aufteilung Coop vs. weitere Gruppen und die Link-Ziele als reine Funktion testen, keine Render-/Klick-Simulation.
- Contract (`shared/contracts`) und Frontend-Typen nachziehen. Dateien ≤450 Zeilen, deutsche Texte mit Umlauten.
