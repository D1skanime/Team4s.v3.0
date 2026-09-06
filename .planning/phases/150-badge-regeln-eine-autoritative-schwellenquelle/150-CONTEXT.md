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
