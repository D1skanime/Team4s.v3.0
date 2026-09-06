# Phase 150: Badge-Regeln — eine autoritative Schwellenquelle - Context

**Gathered:** 2026-09-06
**Status:** Ready for planning
**Source:** User Planning Directive (wörtlich aus dem `/gsd-plan-phase 150 --skip-research` Aufruf) + `.planning/ROADMAP.md` (Phase-150-Abschnitt) + `150-UI-SPEC.md` (approved)

<domain>
## Phase Boundary

Eine Änderung einer Badge-Schwelle wird an genau einer fachlich autoritativen Stelle vorgenommen.
Das Frontend kennt danach keine Schwellen, Tiers oder "es fehlen noch X"-Ableitungen mehr — es
stellt nur noch dar, was das Backend im Response bereits entschieden hat. Betroffen sind alle
Badge-Familien: role_volume, points, membership, die drei Contribution-Familien und die
`role_entry_<code>`-Duplikat-Emission. Keine erneute Breitenrecherche nötig (Ausgangsbefund ist im
Roadmap-Eintrag bereits vollständig selbst gemessen mit Datei- und Zeilenangaben) — jede
Fundstelle wird vor dem Ändern trotzdem einzeln im aktuellen Code verifiziert.

</domain>

<decisions>
## Implementation Decisions

### Backend: eine autoritative Schwellenregistry
- D-01: Genau EINE Go-Schwellenregistry als autoritative Quelle für alle Badge-Familien
  inklusive role_volume. Keine zweite Registry, kein Spiegel, kein neuer Endpoint.
- D-02: Alle sechs bisherigen Backend-Fundstellen leiten aus der Registry ab statt Zahlen zu
  wiederholen:
  - `repository/member_profile_contribution_badges_repository.go:22,40,59` (highestContribProjectsTier / Chronicle / Archivist)
  - `repository/member_profile_dashboard_repository.go:103-107` (contribFamilyAscendingThresholds)
  - `repository/member_profile_progress_repository.go:67-79` (loadBadgeProgress-Literale)
  - `repository/member_profile_role_volume_repository.go:15-28` (highestRoleVolumeTier)
  - `repository/member_profile_role_volume_repository.go:78-100` (roleVolumeProgressBadge, zweiter switch mit denselben Zahlen)
  - `services/badge_service.go:35-36,144-147,203-212` (Membership 7/10 als Go-Argument, long_term 5 Jahre als SQL-`INTERVAL`-Literal, productive 10/25/50)
- D-03: Bestehende Funktionsnamen und ihr Verhalten bleiben erhalten — es ist eine
  Herkunftsänderung der Zahlen, kein Umbau der Ableitungslogik.
- D-04: Die 5-Jahres-Schwelle im SQL-`INTERVAL`-Literal und die 7/10-Jahre als Go-Argument
  müssen beide aus der Registry kommen, ohne die Query-Semantik zu ändern.

### Vertragserweiterung (erweitern, nicht ersetzen)
- D-05: `models.PublicMemberBadgeProgress` bekommt `current_tier` (fehlt heute; aus `next_tier`
  allein nicht ableitbar).
- D-06: `role_volume` wird als Familie in `badge_progress` geführt, sofern das der kleinste
  saubere Weg ist. Bestehende Berechnung in `roleVolumeProgressBadge` wiederverwenden, nicht neu
  schreiben.
- D-07: `OwnDashboardRoleVolumeEntry` bekommt Tier, nächste Schwelle und Restwert (heute nur
  `role_code` + `count`).
- D-08: Der Dashboard-Response bekommt eine Punkte-Fortschrittszeile, damit das Frontend
  `total_points` nicht mehr selbst in Milestones übersetzt.
- D-09: `shared/contracts/` wird mitgepflegt. Bestehende Feldnamen und Bedeutungen bleiben
  stabil.

### Duplikat-Fix an der Quelle
- D-10: `loadPublicBadges` (`member_profile_public_repository.go:203-215`) und
  `loadRoleVolumeBadges` (`member_profile_role_volume_repository.go:140-148`) dürfen
  `role_entry_<code>` nicht mehr doppelt emittieren. Nach dem Fix erscheint der Code je Rolle
  genau einmal und trägt die Fortschrittsfelder. Keine Frontend-Kompensation — die heutige
  `Math.max`-Kompensation in `MemberBadgeChain` entfällt ersatzlos.

### Frontend-Rückbau
- D-11: Entfernen aus `components/profile/memberBadgeLabels.ts`: `ROLE_VOLUME_TIER_THRESHOLDS`
  (195-199), `POINT_MILESTONES` (275-282), `ROLE_PROGRESS_STAGES` (354-360), die Inline-Schwellen
  in den Familien-Definitionen (418-441: `[1,5,15]`, `[10,50,150]` zweimal, `1/10/25/50`).
- D-12: Vier Rechenstellen lesen künftig Tier/Schwelle/Rest aus dem Response statt sie
  abzuleiten:
  - `app/members/[slug]/MemberProfileContent.tsx:47` (`deriveMilestoneBadge`)
  - `app/me/dashboard/components/CategoryProgressTable.tsx:87` (`buildPointsRow`)
  - `app/me/dashboard/components/CategoryProgressTable.tsx:103` (`buildRoleVolumeRow`)
  - `components/profile/MemberBadgeChain.tsx:634-637` (count-Rekonstruktion aus dem Threshold)
  `buildCategoryRow` in derselben Datei macht es bereits richtig (liest `row.current_tier`) und
  ist das Vorbild.
- D-13: `deriveMilestoneBadge`, `resolveNextPointMilestone`, `resolveNextRoleVolumeThreshold` und
  `resolveRoleProgressPresentation` werden entfernt, soweit sie danach unbenutzt sind.
  Präsentation bleibt vollständig erhalten: Labels, Beschreibungen, Artwork, Varianten, Gruppen,
  Reihenfolge der Badge-Codes.

### UI-Parität (Empfehlung aus dem UI-Checker in 150-UI-SPEC.md)
- D-14: Die Dashboard-Paritätsprüfung muss ausdrücklich auch die Punkte-Zeile mit den benannten
  Zahlen gegenprüfen (`current_count 39 · next_threshold 50 · remaining_count 11` für Member
  `type`), nicht nur die Role-Volume-Zahlen (`current_count 13 · current_tier bronze ·
  next_threshold 108 · remaining_count 95 · next_tier silver`).

### Harte Randbedingungen
- D-15: Keine neuen Endpoints, keine zweite Registry, keine neuen Badge-Familien, kein neues
  Artwork, kein neues Badge-Design.
- D-16: Karussell, `FocalCarousel`, Swipe, Animationen, Settle-Timer, Badge-Bildgrößen,
  WebP/AVIF, Lazy Loading und die allgemeine Profil-Ladezeit sind ausdrücklich NICHT Teil dieser
  Phase. Ebenso keine großen `MemberBadgeChain`-Refactorings über den beschriebenen Rückbau
  hinaus.
- D-17: Die Rollen-Registry aus Phase 147 wird nicht erneut angefasst: keine manuelle
  Rollenliste, keine Label→Code-Rückauflösung, stabile `role_code`-Werte. Falls `role_entry_*`
  dynamisch erzeugt wird, bleibt dieses Prinzip erhalten.
- D-18: Deutsche UI-Strings und Kommentare in deutschsprachigen Dateien mit korrekten Umlauten
  (ä ö ü Ä Ö Ü ß), nie ae/oe/ue/ss.
- D-19: Produktionsdateien höchstens 450 Zeilen. `memberBadgeLabels.ts` hat heute 544 Zeilen und
  schrumpft durch den Rückbau — nach dem Rückbau prüfen, ob es unter das Limit fällt; falls nicht,
  splitten.
- D-20: Tests belegen Verhalten durch echte Aufrufe (httptest/Fake-Repository o.ä.), nicht durch
  Quelltext-Substring-Suche.
- D-21: Kein Worktree — alles direkt auf `main`, sequenziell.
- D-22: Ein bestehender Anti-Drift-Test, der nach dem Umbau nur noch zwei identische Listen
  vergleicht, wird entfernt oder durch einen echten Vertragstest ersetzt — nicht formal grün
  weiterlaufen lassen.
- D-23: Der Checkpoint-Plan mit Live-UAT wird von außen (extern durch den Nutzer) gefahren und
  ist als eigener, NICHT-autonomer Plan am Ende der Phase vorzusehen. Die Regression-Gates aus dem
  Roadmap-Eintrag sind dort verbindlich abzuarbeiten, inklusive des Live-Vorher/Nachher-Vergleichs
  an Member `type`.

### Claude's Discretion
- Genaue interne Struktur/Namensgebung der Go-Schwellenregistry (Package-Pfad, Dateiname,
  exportierte Typen), solange genau eine Registry entsteht und bestehende Go-Konventionen aus
  `backend/internal/...` eingehalten werden.
- Feinschnitt der Wellen/PLAN.md-Aufteilung (wie viele Pläne, welche Reihenfolge), solange die
  Wave-Abhängigkeiten (Registry vor Ableitungen vor Vertrag vor Frontend-Rückbau vor
  Checkpoint/UAT) eingehalten werden.

## Revision 2026-09-06 (nach Plan-Checker-Vorlauf, VOR dem ersten Checker-Lauf)

Der erste Planner-Durchlauf (Plan 150-05) fand eine echte, im ursprünglichen Ausgangsbefund nicht
erfasste fünfte Rechenstelle und schlug vor, `ROLE_VOLUME_TIER_THRESHOLDS`, `POINT_MILESTONES`,
`ROLE_PROGRESS_STAGES` und die `FAMILY_DEFINITIONS`-Inline-Schwellen zu behalten, weil sie die
Mehrstufen-"Leiter"-Streifen speisen. Diese Auflösung wurde vom Nutzer geprüft und **verworfen**:
sie verfehlt SC-2 (kein "soweit unbenutzt"-Vorbehalt für diese vier Konstanten) und das
Phasenziel selbst — eine geänderte Registry-Schwelle würde die angezeigte Leiter sonst still
falsch machen. D-11/D-13 werden durch die folgenden Entscheidungen präzisiert (nicht ersetzt, nur
konkretisiert):

- D-24: Die Stufenliste ("Leiter") jeder `badge_progress`-Familie (alle sieben: die sechs
  bestehenden plus `role_volume`) kommt aus derselben Go-Schwellenregistry wie alles andere in
  dieser Phase. Konkret: `PublicMemberBadgeProgress` (Go: `backend/internal/models/member_profile.go`;
  TS: `frontend/src/types/profile.ts`) bekommt ein zusätzliches Feld — pro Stufe der stabile Code
  bzw. Tier-Token (je nach Familie das bestehende Namensschema, z. B. volle Badge-Codes bei
  `points`/`progress`/`membership`, nackte Tier-Token bei den Contribution-Familien und bei
  `role_volume`, analog zu `current_tier`s bestehender Konvention pro Familie) und die zugehörige
  Schwelle, aufsteigend sortiert. Das ist eine Erweiterung derselben, bereits für `current_tier`
  und die `role_volume`-Familie erweiterten Struktur — keine zweite Registry, kein neuer Endpoint,
  kein paralleles Feld.
  - Backend-seitig ist das nahezu kostenlos: `buildBadgeProgress` (`member_profile_progress_repository.go`)
    bekommt die aufsteigende Schwellenliste für die sechs Nicht-role_volume-Familien bereits als
    Parameter (`[]badgeProgressThreshold`, selbst aus `badges.<Family>.Tiers` aufgebaut) — sie muss
    nur zusätzlich in die neue Stufenliste des Rückgabewerts übernommen werden, keine neue Quelle.
  - Für `role_volume` gilt dieselbe Erweiterung, zusätzlich zu `current_tier`/`next_threshold`/
    `remaining_count`/`next_tier`, die Plan 150-03 dort bereits vorsieht.
  - Sonderfall "Einstieg"/"entry": `badges.RoleVolume.Tiers` enthält bewusst nur bronze/silver/
    gold/platinum (12/108/320/510) — die "entry"-Stufe (Schwelle 1) ist seit jeher eine
    präsentationslokale Umbenennung der leeren Registry-Antwort (D-03, unverändert für
    `CurrentTier`/`NextTier`/`Remaining`). Damit auch die "entry"-Stufe nicht als Frontend-Literal
    überlebt, wird sie GENAU DORT, wo die `role_volume`-Stufenliste für den Contract gebaut wird
    (Plan 150-03, backend-seitig, NICHT im Frontend), als erste Stufe (Code "entry", Schwelle 1)
    vorangestellt — konsistent mit dem bestehenden D-03-Präzedenzfall, dass "entry" backend-lokal
    behandelt wird, nur jetzt auch für die Stufenliste. Die Zahl 1 ist damit nirgends mehr ein
    Frontend-Literal.
- D-25: Nach D-24 entfallen `ROLE_VOLUME_TIER_THRESHOLDS`, `POINT_MILESTONES`,
  `ROLE_PROGRESS_STAGES` und die Inline-Schwellen-Arrays in `FAMILY_DEFINITIONS`
  (`memberBadgeLabels.ts`) ERSATZLOS — keine Ausnahme, kein "soweit unbenutzt" mehr nötig, weil
  jeder verbleibende Aufrufer auf die vom Server gelieferte Stufenliste umgestellt wird:
  - `resolveMemberBadgeFamilies` liest die Stufenliste aus dem jeweiligen `badge_progress`-Eintrag
    (`progress.stages` o. ä.) statt aus `FAMILY_DEFINITIONS[key].stages`. `FAMILY_DEFINITIONS`
    behält ausschließlich `group`/`label`/`unitSingular`/`unitPlural` (reine Präsentation).
  - `resolveRoleProgressPresentation` wird NICHT gelöscht, sondern umgestellt: sie erhält künftig
    den passenden `role_volume`-`badge_progress`-Eintrag (gefiltert nach `family === 'role_volume'`
    und passendem `role_code`) statt eines rohen Zählwerts, und leitet Tier/nächste
    Schwelle/Rest/Stufenliste ausschließlich aus dessen Feldern ab (inkl. der jetzt vom Server
    gelieferten Stufenliste inkl. "entry"). Sie trifft keine Tier-Auswahl mehr selbst und kennt
    keine Schwelle mehr als eigenes Literal.
  - Die fünfte, im ursprünglichen Ausgangsbefund nicht benannte Rechenstelle — der Aufruf von
    `resolveRoleProgressPresentation` in der "roles"-Karussellgruppe von `MemberBadgeChain.tsx`
    (Stand vor dieser Revision: um Zeile 726) — wird hiermit explizit als fünfte Fundstelle neben
    den vier ursprünglich benannten (`MemberProfileContent.tsx:47`,
    `CategoryProgressTable.tsx:87`/`:103`, `MemberBadgeChain.tsx:634-637`) aufgenommen und ist
    gleichrangig in Scope. Der bei `MemberBadgeChain.tsx:634-637` gebaute `roleCounts`-Map bleibt
    für Anzeige-/Sortierzwecke (Reihenfolge der Rollen-Karten, roher Anzeigewert) bestehen, liefert
    aber ab jetzt nicht mehr die Grundlage für die Tier-/Fortschritts-Ableitung — dafür wird
    zusätzlich der passende `badge_progress`-`role_volume`-Eintrag nach `role_code` nachgeschlagen.
  - Das Dashboard (`CategoryProgressTable.tsx`) rendert keine Stufen-Leiter (nur je eine
    Fortschrittszeile pro Kategorie) — D-24/D-25 betreffen dort nichts zusätzlich zu dem, was
    D-12 bereits für `buildPointsRow`/`buildRoleVolumeRow` vorsieht.
- D-26: Ob der "erreicht/aktuell/gesperrt"-Zustand pro Stufe weiterhin clientseitig aus
  `current_count >= stage.threshold` (beides jetzt serverautoritative Werte derselben Antwort)
  berechnet wird, oder ob der Server stattdessen ein explizites `earned`/`state`-Feld pro Stufe
  mitliefert, ist Claude's Discretion — beides ist zulässig, solange KEIN unabhängiges
  Frontend-Threshold-Literal mehr existiert, das bei einer Registry-Änderung nicht automatisch
  mitzieht.
- D-27: Der Executor verifiziert nach dem Umbau per grep, dass keine der vier genannten
  Konstanten (`ROLE_VOLUME_TIER_THRESHOLDS`, `POINT_MILESTONES`, `ROLE_PROGRESS_STAGES`, sowie
  keine Inline-Schwellen-Arrays in `FAMILY_DEFINITIONS`) und keine sonstige badge-bezogene
  Schwellenzahl mehr in `memberBadgeLabels.ts` (bzw. einer eventuell abgespaltenen Datei) als
  Literal vorkommt. Findet der Executor per eigenem Grep einen echten Überlebenden, der laut
  dieser Revision hätte entfernt werden sollen, ist das im SUMMARY explizit zu benennen, nicht
  still zu übernehmen.
- D-28: Success Criterion 6 (Registry-Änderung wirkt sich ohne TypeScript-Änderung bis in die
  Oberfläche aus) muss durch den vom Checkpoint-Plan (150-06) durchgeführten Propagationsnachweis
  ausdrücklich auch die Stufen-Leiter abdecken (z. B. Rollen-Badge-Leiter oder Punkte-Meilenstein-
  Leiter), nicht nur die einzelne Fortschrittszeile im Dashboard.

## Revision 2026-09-06, zweiter Durchgang (sechster Fund: `resolveRoleVolumePresentation`)

Der erste Revisionsdurchgang (150-05, Task 3) fand einen sechsten, bis dahin nicht benannten
Fundort — `resolveRoleVolumePresentation`s Label `"${ROLE_VOLUME_TIER_LABELS[tier]} ·
${ROLE_VOLUME_TIER_THRESHOLDS[tier]}+"` (z. B. `"Gold · 320+"`) — und schlug vor, das
"· Schwelle+"-Suffix ERSATZLOS ZU STREICHEN, mit der (falschen) Begründung, es werde nirgends
gerendert. Das wurde geprüft und widerlegt: `CategoryProgressTable.test.tsx:98`
(`expect(screen.getAllByText("Bronze · 12+"))`) und `MemberBadgeChain.test.tsx:695`
(`getByLabelText('Silber · 108+ gesperrt')`) beweisen, dass genau dieser String heute real
gerendert wird (Dashboard-Zeilenlabel via `buildRoleVolumeRow`/`buildCategoryRow`, und
Locked-Stage-ARIA-Label in der Rollen-Leiter). Das Suffix zu streichen wäre eine sichtbare
Änderung und verletzt die byte-exakte Baseline aus `150-UI-SPEC.md`. Diese Auflösung ist
**verworfen**.

**Verbindliche Entscheidung (D-29):**

- Das Label-FORMAT `"<Tier-Label> · <Zahl>+"` ist Präsentation und bleibt unverändert im
  Frontend — an der Zusammensetzung selbst ändert sich nichts.
- Die ZAHL darin ist Business-Regel und muss aus der vom Server gelieferten Stufenliste
  (`badge_progress[].stages`, D-24) stammen, nicht aus `ROLE_VOLUME_TIER_THRESHOLDS`.
  `resolveRoleVolumePresentation` (bzw. der Code-Pfad, der dieses Label baut) bekommt die
  Schwelle als Eingabe, statt sie selbst nachzuschlagen — ob als zusätzlicher Parameter oder
  indem die Label-Erzeugung an die Aufrufstelle wandert, die die Stufenliste ohnehin schon hat
  (`buildRoleVolumeRow`/`buildCategoryRow` im Dashboard; die entsprechende Stelle in
  `MemberBadgeChain.tsx`), ist Claude's Discretion — beide Wege sind zulässig, solange danach
  keine Schwellenzahl mehr als Frontend-Literal existiert.
- Dieselbe Regel gilt für JEDEN weiteren Präsentationspfad, der heute eine Zahl aus einer der
  vier Konstanten (`ROLE_VOLUME_TIER_THRESHOLDS`, `POINT_MILESTONES`, `ROLE_PROGRESS_STAGES`,
  `FAMILY_DEFINITIONS`-Inline-Arrays) zieht: das Anzeigeformat bleibt exakt wie heute, nur die
  Zahlenherkunft wechselt zum Server.
- Die gerenderten Strings bleiben zeichengleich — `"Bronze · 12+"` bleibt `"Bronze · 12+"`,
  solange die Registry `12` sagt. `CategoryProgressTable.test.tsx:98` und
  `MemberBadgeChain.test.tsx:695` bleiben mit UNVERÄNDERTEN erwarteten Strings bestehen und sind
  ausdrücklich Teil des Paritätsnachweises. Passen sie Fixtures an, um die neue Stufenliste
  mitzuliefern, ist das eine Fixture-Anpassung — die erwarteten (`expect(...)`) Strings selbst
  dürfen nicht geändert werden.
- D-30: Fundstellen-Register — der ursprüngliche Ausgangsbefund im Roadmap-Eintrag nannte vier
  Frontend-Rechenstellen. Während der Planung sind bisher zwei weitere hinzugekommen: (5) der
  `resolveRoleProgressPresentation`-Aufruf in der "roles"-Karussellgruppe von
  `MemberBadgeChain.tsx` (D-25), und (6) `resolveRoleVolumePresentation`s Label-Schwelle (D-29,
  dieser Abschnitt). Jede weitere während der Planung oder Ausführung entdeckte Präsentationsstelle,
  die heute eine Zahl aus einer der vier Konstanten zieht, ist nach demselben Muster zu behandeln
  (Format bleibt, Zahl kommt vom Server) UND vollständig und nummeriert fortlaufend (7, 8, …) in
  der jeweiligen PLAN.md sowie später in der SUMMARY zu benennen — nicht still zu beheben. Der
  gewachsene Befund muss nachvollziehbar bleiben.


</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase-Grundlage
- `.planning/ROADMAP.md` (Abschnitt "### Phase 150: Badge-Regeln — eine autoritative
  Schwellenquelle") — vollständiger selbst gemessener Ausgangsbefund (8 Threshold-Fundstellen,
  4 Vertragslücken, 1 Duplikat-Defekt), Zielarchitektur, 9 Success Criteria, Regression-Gates.
  Verbindliche Grundlage, keine erneute Breitenrecherche nötig.
- `.planning/notes/2026-09-06-auftrag-phase150-badge-rules.md` — wörtlicher Nutzerauftrag vom
  2026-09-06.
- `.planning/phases/150-badge-regeln-eine-autoritative-schwellenquelle/150-UI-SPEC.md` — vom
  UI-Checker mit 6/6 PASS freigegebene byte-exakte Copy-/Verhaltens-Baseline und die
  Vorher/Nachher-Paritätsmethode (Abschnitte A/B), inklusive der Empfehlung zur Punkte-Zeile
  (siehe D-14).

</canonical_refs>

<specifics>
## Specific Ideas

Alle konkreten Datei- und Zeilenangaben stehen in den Decisions D-01 bis D-14 oben und im
Roadmap-Eintrag selbst — sie sind wortwörtlich aus dem Nutzerauftrag übernommen und nicht neu zu
recherchieren, nur vor dem Ändern im aktuellen Code zu verifizieren.

</specifics>

<deferred>
## Deferred Ideas

None — dieser Auftrag deckt die komplette Phase 150 ab. Alles außerhalb (Karussell, Animationen,
Bildformate, Ladezeit, neue Badge-Familien) ist explizit zukünftige, andere Arbeit und keine
Phase-150-Deferred-Idee, sondern eine Scope-Grenze (siehe D-16).

</deferred>

---

*Phase: 150-badge-regeln-eine-autoritative-schwellenquelle*
*Context gathered: 2026-09-06 via User Planning Directive (`/gsd-plan-phase 150 --skip-research` command context)*
