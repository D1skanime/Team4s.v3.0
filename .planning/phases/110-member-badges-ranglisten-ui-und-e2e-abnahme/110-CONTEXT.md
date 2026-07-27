# Phase 110: Member-Badges, Ranglisten-UI und E2E-Abnahme - Context

**Gathered:** 2026-07-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 110 macht die in Phase 109 bereitgestellte Punktsumme sichtbar — bewusst
**klein und global-schlank**, Idee für Idee. Drei UI-Ideen sind für diese Phase gesetzt:

1. Eine öffentliche **globale Ranglisten-Seite** mit permanentem Navigations-Einstieg.
2. Die **Gesamtpunktzahl am Member-Profil**.
3. **Rollen-Einstiegs-Badges** (Typ 1) als abgeleitete Projektion aus dem Punktebuch.

Es wird nur das **globale Allzeit-Total** dargestellt (konsistent mit Phase 109). Kein neuer
Backend-Buchungspfad — die Daten (Punktsumme + rollenbezogene Buchungen) existieren bereits.

**Bewusst NICHT in dieser Phase** (Nutzerwunsch „klein bleiben"): weitere Badge-Typen (2+),
Gruppen-/Kategorie-/Zeitraum-Ranglisten, Ranglistenplatz am Profil. Der breitere Roadmap-Umfang
von Phase 110 (volle E2E/UAT-Suite, Security-/Abuse-Tests) ist in dieser Diskussion **nicht**
final abgesteckt — siehe Divergenz-Hinweis.

</domain>

<decisions>
## Implementation Decisions

### D-01 Ranglisten-Einstieg (öffentliche Seite + Navigation)
- Neue öffentliche Seite unter **`/members/ranking`**: die globale Rangliste, Member absteigend
  nach Netto-Gesamtpunkten, jede Zeile Name + Punktzahl. Datenquelle ist der vorhandene
  Endpunkt + `getMemberPointRanking()` aus Phase 109 (paginiert).
- **Einstieg = neuer Nav-Eintrag „Rangliste"** in der bestehenden AppShell-Gruppe
  „Entdecken"/„Public-Bereich" (`AppShell.tsx`), sichtbar **anonym UND eingeloggt**, direkt
  neben „Anime entdecken". Damit ist die Rangliste vom Haupttor `/anime` immer einen Klick
  entfernt — kein Extra-Menü, keine versteckte Verlinkung.
- Account-Mitglieder verlinken von ihrer Zeile auf ihr Profil `/members/[slug]`; **historische
  Einträge ohne Profil bleiben reiner Text ohne Link** (Roadmap-SC1).

### D-02 Punkte am Member-Profil
- Die **Gesamtpunktzahl als eine prominente Zahl im `MemberProfileHero`** (z. B. „220 Punkte"),
  oben beim Namen. Aus der vorhandenen Punktsumme, kein neuer Backend-Aufwand.
- **Nur die Zahl** — kein Ranglistenplatz („Platz N") in dieser Phase (deferred), keine
  Aufschlüsselung wofür (konsistent mit D-04 aus Phase 109).

### D-03 Badge-Typ 1 — „Einmalige Rollen-Einstiegs-Badges"
- Pro Rolle **einmal** vergeben, **keine Stufen**. Beispiele/Labels: „Erste Übersetzung"
  (`translator`), „Erstes Timing" (`timer`), „Erster Encode" (`encoder`), „Erstes Typesetting"
  (`typesetter`), „Erste Qualitätsprüfung" (`quality_checker`), „Erste Dokumentation als
  Projektleitung" (`project_lead`), „Erstes Editing" (`editor`), „Erste Raw-Bereitstellung"
  (`raw_provider`) …
- **Bedingung: der Member hält ≥ 1 netto Punkt aus akzeptierter Arbeit in genau dieser Rolle.**
  Der Punkt IST der Beweis der akzeptierten Leistung — eine bloße Rollen-Zuweisung ohne Punkt
  reicht nicht.
- **Live-Projektion:** Wird der Punkt storniert (netto auf 0 gefallen), **verfällt das Badge
  wieder**. Kein „einmal erreicht, bleibt für immer".
- **Keine hartcodierte Rollenliste** — es gilt automatisch für jede punktfähige Rolle. Rollen,
  die nie Punkte bringen (reine Verwaltung), erscheinen nie. `editor` und `raw_provider` sind
  ausdrücklich dabei.
- **Keine Punkte fürs Haben** eines Badges (GAM-04 / D-07 aus Phase 106 — Profilpflege und
  Selbstpflege erzeugen keine Punkte). Verifiziert: aktuell vergibt kein Profil-/Avatar-/Story-
  Handler Punkte; Punktquellen sind ausschließlich `release_role_work`, `release.contribution`/
  `review.decision` und `project_note`.
- Datenquelle: **rollen-gefilterte, netto-positive `release_role_work`-Buchungen** aus
  `point_ledger_entries` — NICHT die aggregierte Gesamtsumme (die kennt die Rolle nicht).
- Anzeige über die **bestehenden** Badge-Komponenten (`MemberBadgeChain` / `memberBadgeLabels`),
  erweitert um die per-Rolle-Labels. Kein neues Badge-UI erfinden.
- **Badge-Bilder/Artwork liefert der Nutzer später.** Vorerst **Platzhalter/Dummy-Bilder**
  verwenden (bzw. die vorhandenen Lucide-Icons des Katalogs), so dass ein späterer Austausch
  gegen echte Assets ohne Logikänderung möglich ist.
- **Anzeigeort: die bestehende „Auszeichnungen"-Sektion (`MemberBadgeChain`)** im öffentlichen
  Profil — kein neuer UI-Ort, kein neues Layout. Die Rollen-Einstiegs-Badges reihen sich als
  eigene Gruppe in die vorhandene Chain ein. Eine Highlight-Reihe unter dem Hero
  (`MemberBadgeHighlights`) wird bewusst weggelassen (Nutzerwunsch „klein bleiben").

### D-04 „Auszeichnungen"-Sektion als erweiterbarer, kategorie-gruppierter Container
- Die „Auszeichnungen"-Sektion wird so gebaut, dass sie **beliebig viele Badge-Familien als
  beschriftete Kategorie-Gruppen** aufnimmt (z. B. „Rollen", „Fortschritt", „Mitgliedschaft",
  „Besondere Auszeichnungen", „Events" …). **Jede neue Familie = eine weitere Gruppe** nach
  demselben Muster; **leere Kategorien werden ausgeblendet**. Kein Umbau bei neuen Badge-Typen.
- **Rollen-Gruppe** führt pro Rolle die rollenbezogenen Badges zusammen: Einstieg (Typ 1) und
  später die Volumen-Stufe (Typ 3, Phase 112) in **einer** Zeile je Rolle.
- Phase 110 baut diesen Container + die erste Gruppe „Rollen" (Typ 1) und sortiert die bereits
  vorhandenen Katalog-Badges (`Gründungsmitglied`, `5+ Jahre Mitglied`, `Historische Leitung`,
  `Allrounder`, `Verifiziert` …) in passende Gruppen ein. Spätere Typen (Phase 112 ff.) hängen
  nur weitere Gruppen an.

### Claude's Discretion
- Exakte Badge-Codes/Labels/Icons/Palette je Rolle (im Stil des vorhandenen Katalogs).
- Ob die Rolle je Ledger-Eintrag aus `source_key`/`source_type` rekonstruiert oder über einen
  Join auf die Release-Besetzungsdaten ermittelt wird (Recherche-Detail), solange D-03 gilt.
- Layout-Details der Ranglisten-Seite und der Hero-Punktzahl, im Rahmen des globalen UI-Systems.

> **Divergenz zur ROADMAP.md:** Der Roadmap-Eintrag für Phase 110 ist deutlich breiter
> (gruppen-/kategoriebezogene Ranglisten mit Aktiv-/Historisch-Unterscheidung, volle E2E/UAT-
> Abnahme über alle Lebenszyklen, Security-/Abuse-Testsuite). Diese Diskussion reduziert den
> Umfang bewusst auf die drei obigen UI-Ideen (Nutzerwunsch „klein bleiben, Idee für Idee").
> **Dieser CONTEXT ist für die Planung maßgeblich.** Die restlichen Roadmap-Success-Criteria
> (Gruppen-/Kategorie-Ranglisten, E2E/UAT-Breite, Security-Tests) bleiben offen und sollten in
> eigene kleine Folge-Iterationen/Phasen gezogen werden; Roadmap entsprechend nachziehen.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Verbindlicher Phase-Kontext
- `.planning/ROADMAP.md` — Phase-110-Grenze; durch diesen CONTEXT auf die drei UI-Ideen reduziert.
- `.planning/REQUIREMENTS.md` — GAM-04 (Badges als getrennte, abgeleitete Projektion; keine
  Punkte für Selbstpflege).
- `.planning/phases/109-ranglisten-und-punkteprojektionen/109-CONTEXT.md` — Punktsumme-Fundament,
  global-schlank-Entscheidung (D-03/D-04), Endpunkt `GET /api/v1/member-point-ranking`.

### Projektregeln
- `./CLAUDE.md` — **globale UI-Primitives Pflicht** (`@/components/ui`), korrekte Umlaute in
  user-facing Strings, 450-Zeilen-Limit. UI-Showcase/Referenz: Route `/dev/ui-system`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/components/layout/AppShell.tsx` — Nav; `publicItems` in BEIDEN Shells
  (authenticated + anonymous), Gruppe „Entdecken"/„Public-Bereich". Hier kommt „Rangliste" rein.
- `frontend/src/lib/api.ts` — `getMemberPointRanking(page?)` + `MemberPointRankingRow` (Phase 109),
  direkt für die Ranglisten-Seite nutzbar.
- `frontend/src/app/members/[slug]/page.tsx` + `frontend/src/components/profile/MemberProfileHero.tsx`
  — Profil-Hero, Ziel für die Punktzahl (D-02).
- `frontend/src/components/profile/MemberBadgeChain.tsx` + `memberBadgeLabels.ts` — vorhandener
  Badge-Katalog/-Anzeige; um Rollen-Einstiegs-Badges erweitern (D-03).
- `frontend/src/types/fansub.ts` — `FANSUB_GROUP_ROLE_OPTIONS` (kanonische Rollen-Codes:
  translator, timer, typesetter, editor, encoder, raw_provider, quality_checker, project_lead,
  designer, gfxler, fansub_lead, techadmin).

### Integration Points
- Es gibt **keine** Mitglieder-Übersichtsseite (nur `/members/[slug]`) — die neue Ranglisten-
  Seite `/members/ranking` wird faktisch der Einstieg in die Member-Welt.
- Badge-Ableitung (D-03) braucht eine **rollen-gefilterte** Sicht auf `point_ledger_entries`
  (`release_role_work`, netto positiv). Ob dafür ein neuer schmaler Read/Repository nötig ist
  oder die Rolle aus vorhandenen Beitragsdaten join-bar ist, klärt die Recherche.

</code_context>

<specifics>
## Specific Ideas

- Leitprinzip des Nutzers: „klein bleiben und Idee für Idee umsetzen." Reihenfolge der Ideen:
  (1) Ranglisten-Seite + Nav, (2) Punkte am Profil-Hero, (3) Rollen-Einstiegs-Badges.
- Badge-Grundsatz: „nur wenn er den Punkt hat, hat er den Beitrag wirklich geleistet" — der
  Punkt ist die Akzeptanz-Bedingung; Storno entzieht Punkt UND Badge.

</specifics>

<deferred>
## Deferred Ideas

- **Badge-Typ 2 und weitere** — der Nutzer definiert sie später der Reihe nach.
- **Ranglistenplatz am Profil** („Platz N") — bewusst zurückgestellt (D-02 = nur Punktzahl).
- **Gruppen-/Kategorie-/Zeitraum-Ranglisten** — bleiben deferred bis die UI sie wirklich braucht
  (inkl. `effective_at`-vs-`recorded_at`-Zeitsemantik).
- **Breite E2E/UAT-Abnahme und Security-/Abuse-Testsuite** (Roadmap-SC5/SC6 von 110) — nicht in
  dieser schlanken Iteration finalisiert; als eigene kleine Folgeschritte planen.

</deferred>

---

*Phase: 110-member-badges-ranglisten-ui-und-e2e-abnahme*
*Context gathered: 2026-07-27*
