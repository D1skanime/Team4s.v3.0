### Phase 150: Badge-Regeln — eine autoritative Schwellenquelle

**Goal:** Eine Änderung einer Badge-Schwelle wird an genau einer fachlich autoritativen Stelle vorgenommen. Das Frontend kennt keine Schwellen mehr und leitet weder Tier noch nächste Stufe noch „es fehlen noch X" selbst ab, sondern stellt nur dar, was das Backend entschieden hat.

**Requirements**: TBD (Nutzerauftrag vom 2026-09-06, wörtlich in `.planning/notes/2026-09-06-auftrag-phase150-badge-rules.md`; kein v1.4-Requirement-Mapping)
**Depends on:** Phase 149
**Scope-Grenze:** Ausschließlich Badge-Schwellen und Badge-Fortschrittsregeln. **Nicht** in dieser Phase: Badge-Karussell, `FocalCarousel`, Swipe, Animationen, Settle-Timer, Scroll-/Settle-Verhalten, Badge-Bildgrößen, WebP/AVIF, Lazy Loading, Bildkomprimierung, öffentliche Profil-Ladezeit, SQL-Performance außerhalb der Badge-Abfragen, neue Badge-Familien, neues Artwork, neues Badge-Design, große `MemberBadgeChain`-Refactorings. Die Rollen-Registry aus Phase 147 wird nicht erneut angefasst.

**Ausgangsbefund** (selbst gemessen 2026-09-06 auf `team4s-linux`, Commit `016da485` — Code gelesen, DB abgefragt und die Live-API für Member `type` ausgewertet):

  - Alle im Auftrag genannten Schwellen sind bestätigt: Role Volume 12/108/320/510 · Points 1/50/200/500/1000/2500 · Membership 5/7/10 Jahre · Contributions 1/5/15 und 10/50/150 (zweimal) · Productive 1/10/25/50.
  - **Persistiert werden nur drei Badge-Codes.** `SELECT badge_code FROM member_badges` liefert ausschließlich `first_contribution`, `historical_leader`, `verified`. Role-Volume-, Role-Entry-, Points-, Contribution- und Membership-Badges werden bei jedem Read live berechnet und nie geschrieben. Die Schwellen sind damit reine Code-Konstanten, keine Daten.
  - **Dieselben Zahlen liegen an acht Stellen** — sechs davon im Backend, die Doppelhaltung ist also nicht nur Backend↔Frontend, sondern auch backend-intern:

    | # | Ort | Familien | Form |
    |---|---|---|---|
    | 1 | `repository/member_profile_contribution_badges_repository.go:22,40,59` | contribution ×3 | `switch count >=` |
    | 2 | `repository/member_profile_dashboard_repository.go:103-107` | contribution ×3 | `contribFamilyAscendingThresholds`-Map, dieselben Zahlen |
    | 3 | `repository/member_profile_progress_repository.go:67-79` | progress, points, contribution ×3, membership | Inline-Literale in `loadBadgeProgress` |
    | 4 | `repository/member_profile_role_volume_repository.go:15-28` | role_volume | `highestRoleVolumeTier`-switch |
    | 5 | `repository/member_profile_role_volume_repository.go:78-100` | role_volume | zweiter switch in `roleVolumeProgressBadge`, dieselben Zahlen nochmal |
    | 6 | `services/badge_service.go:35-36,144-147,203-212` | membership, productive | Go-Argumente + SQL-`INTERVAL '5 years'` |
    | 7 | `components/profile/memberBadgeLabels.ts:195-199,275-282,354-360` | role_volume, points | `ROLE_VOLUME_TIER_THRESHOLDS`, `POINT_MILESTONES`, `ROLE_PROGRESS_STAGES` |
    | 8 | `components/profile/memberBadgeLabels.ts:418-441` | progress, contribution ×3 | Inline-Arrays `[1,5,15]`, `[10,50,150]`, `1/10/25/50` in den Familien-Definitionen |

    Der Kommentar an Ort 2 behauptet, die Single Source of Truth bleibe Ort 1 — tatsächlich sind die Zahlen dort ein zweites Mal ausgeschrieben.

  - **Root Cause der Frontend-Rechnung sind vier Lücken im ausgelieferten Vertrag.** Das Frontend rechnet nicht aus Nachlässigkeit, sondern weil die benötigte Information nicht im Response steht:
    1. `models.PublicMemberBadgeProgress` (`models/member_profile.go:204-211`) trägt `family`, `current_count`, `next_threshold`, `remaining_count`, `next_tier`, `complete` — aber **kein `current_tier`**. Aus `next_tier` allein ist das aktuelle Tier nicht ableitbar, dazu müsste man die Tier-Reihenfolge kennen, also die Schwellenliste. Das ist der direkte Grund, warum das Frontend die Liste hält.
    2. `badge_progress` enthält **keine role_volume-Familie**. `loadBadgeProgress` liefert sechs Familien, role_volume ist nicht darunter.
    3. `OwnDashboardRoleVolumeEntry` (`repository/member_profile_dashboard_repository.go:19-22`) trägt nur `role_code` und `count` — kein Tier, keine Schwelle, kein Rest.
    4. Der Dashboard-Response liefert `total_points` als nackte Zahl ohne Points-Fortschrittszeile; `category_progress` deckt nur die drei Contribution-Familien ab.

  - **Die Berechnung existiert im Backend bereits** und müsste nicht neu erfunden, sondern nur durchgereicht werden: `buildContribCategoryProgress` (`dashboard_repository.go:122`) liefert `CurrentTier` für die Dashboard-Familien, `roleVolumeProgressBadge` (`role_volume_repository.go:78`) liefert `current_tier`/`next_tier`/`next_threshold`/`remaining_count` für Role Volume. An der Live-API für Member `type` gemessen: `role_volume_typesetter_bronze` kommt mit `current_count 13 · current_tier bronze · next_threshold 108 · remaining_count 95 · next_tier silver` — also genau das, was `MemberBadgeChain` daneben selbst rekonstruiert.

  - **Vier Frontend-Stellen rechnen Business-Regeln nach:**
    - `app/members/[slug]/MemberProfileContent.tsx:47` — `deriveMilestoneBadge(profile.total_points ?? 0)` leitet das Punkte-Badge komplett aus `POINT_MILESTONES` ab, obwohl `badge_progress` die Familie `points` bereits liefert.
    - `app/me/dashboard/components/CategoryProgressTable.tsx:87` — `buildPointsRow` über `resolveNextPointMilestone` + `POINT_MILESTONES`.
    - `app/me/dashboard/components/CategoryProgressTable.tsx:103` — `buildRoleVolumeRow` über `resolveNextRoleVolumeThreshold`. Direkt daneben macht es `buildCategoryRow` bereits richtig und liest `row.current_tier` vom Backend — der Beleg, dass der serverautoritative Weg im selben File schon funktioniert.
    - `components/profile/MemberBadgeChain.tsx:634-637` — rekonstruiert bei fehlendem `current_count` den Zählwert aus `ROLE_VOLUME_TIER_THRESHOLDS[tier]`, leitet also aus dem Badge-Code die Business-Regel zurück.

  - **Das doppelte `role_entry_typesetter` ist ein echter Defekt, kein Datenproblem und keine Absicht.** Zwei Codepfade emittieren unabhängig voneinander denselben Badge-Code in dasselbe Array: `loadPublicBadges` (`member_profile_public_repository.go:203-215`) erzeugt aus `release_role_credit_lifecycles` je Rolle ein `role_entry_<code>` **ohne** Fortschrittsfelder, und `loadRoleVolumeBadges` (`member_profile_role_volume_repository.go:140-148`) hängt für jede Rolle mit Tier ≠ `entry` eine **zweite** `role_entry_<code>`-Zeile **mit** Fortschrittsfeldern an, bevor es das `role_volume_<code>_<tier>`-Badge ergänzt. Beide Funktionen sind in `GetPublicMemberProfile` (`member_profile_public_repository.go:121-134`) nacheinander verdrahtet. In der Live-Antwort steht `role_entry_typesetter` deshalb zweimal, einmal ohne und einmal mit Progress-Daten. Kein Kommentar erwähnt die Doppelung; `loadRoleVolumeBadges` verweist auf die andere Stelle nur als Vorbild für „nie persistiert". Konsument `MemberBadgeChain` fängt das heute mit `Math.max` ab — das ist die Kompensation, nicht die Absicht.

**Zielarchitektur** (kleinstmöglich, keine Neuentwicklung):

  - Eine einzige Go-Schwellenregistry als autoritative Quelle für alle Familien inklusive Role Volume. Die sechs Backend-Fundstellen leiten daraus ab, statt Zahlen zu wiederholen; die bestehenden Funktionsnamen und ihr Verhalten bleiben erhalten. Es entsteht **genau eine** Registry — keine zweite Quelle daneben, kein Spiegel, kein neuer Endpoint. Auch die Dashboard-Projektion rechnet Schwellen nicht mehr eigenständig nach, sondern leitet aus derselben Registry ab.
  - Der Vertrag wird an den vier belegten Lücken erweitert, nicht ersetzt: `current_tier` in `PublicMemberBadgeProgress`, role_volume als Familie in `badge_progress`, Tier/Schwelle/Rest in `OwnDashboardRoleVolumeEntry`, eine Points-Zeile im Dashboard-Fortschritt. **Kein neuer Badge-Endpoint.**
  - Die Doppelemission von `role_entry_<code>` wird an einer Stelle aufgelöst, sodass jeder Badge-Code höchstens einmal im Array steht und die Progress-Felder trägt.
  - Das Frontend behält ausschließlich Präsentation: Labels, Beschreibungen, Artwork, Varianten, Gruppen und die Reihenfolge der Badge-Codes. Badge-Codes, Family-Codes und Tier-Codes bleiben als stabiler Vertrag erhalten — `role_entry_timer_gold` ist Identität, kein Hardcoding.

**Success Criteria** (what must be TRUE):

  1. Es gibt genau eine autoritative Schwellenquelle im Backend, und nur eine. Keine der sechs bisherigen Backend-Fundstellen hält die Zahlen 12/108/320/510, 1/50/200/500/1000/2500, 5/7/10, 1/5/15, 10/50/150 oder 1/10/25/50 noch als eigenes Literal — auch nicht die Dashboard-Projektion, die heute mit `contribFamilyAscendingThresholds` eine eigene Kopie führt. Alle leiten aus der Registry ab, und es entsteht keine zweite Registry und kein Spiegel daneben. Nachweisbar per Suche über `backend/`.
  2. Das Frontend enthält keine Badge-Schwelle mehr. `ROLE_VOLUME_TIER_THRESHOLDS`, `POINT_MILESTONES`, `ROLE_PROGRESS_STAGES` und die Inline-Schwellen der Familien-Definitionen in `memberBadgeLabels.ts` sind entfernt oder tragen keine Zahlen mehr. Was bleibt, ist Präsentation: Label, Beschreibung, Artwork, Variante, Gruppe, Reihenfolge.
  3. Die vier Frontend-Rechenstellen lesen Tier, nächste Schwelle und Restwert aus dem Response statt sie abzuleiten — `MemberProfileContent.tsx:47`, `CategoryProgressTable.tsx:87` und `:103`, `MemberBadgeChain.tsx:634-637`. `deriveMilestoneBadge`, `resolveNextPointMilestone`, `resolveNextRoleVolumeThreshold` und `resolveRoleProgressPresentation` sind entfernt, soweit sie danach unbenutzt sind.
  4. Der Vertrag deckt alles ab, was die Oberfläche braucht: `current_tier` in `PublicMemberBadgeProgress`, role_volume als Familie in `badge_progress`, Tier/Schwelle/Rest in `OwnDashboardRoleVolumeEntry`, Points-Fortschritt im Dashboard. `shared/contracts/` ist mitgepflegt, und bestehende Felder behalten Namen und Bedeutung.
  5. `role_entry_<code>` erscheint je Rolle genau einmal in `public_badges` und trägt dabei die Fortschrittsfelder. Ein Test belegt das gegen echtes Postgres für eine Rolle oberhalb der Einstiegsstufe.
  6. Eine Änderung einer Schwelle in der Registry wirkt sich ohne jede TypeScript-Änderung auf die Oberfläche aus. Ein Test belegt das, indem er eine geänderte Schwelle durch die Kette bis in die gerenderte Ausgabe verfolgt.
  7. Tests decken jede Familie ab: Role Volume für mehrere `role_code`, Points, Membership, Contributions und Projects. Belegt wird außerdem, dass die höchste Stufe kein `next_threshold` mehr meldet und dass `remaining_count` nie negativ wird.
  8. Bestehende Profile bleiben API-kompatibel, oder der Vertrag wird bewusst und dokumentiert angepasst. Ein bestehender Anti-Drift-Test, der nach dem Umbau nur noch zwei identische Listen vergleicht, wird entfernt oder durch einen Vertragstest ersetzt, statt formal grün weiterzulaufen.
  9. Backend-, Frontend- und Contract-Tests laufen grün, ohne neue Fehler gegenüber der Baseline. Ein Live-UAT auf `:3000` belegt an einem echten Profil, dass Badge-Fortschritt unverändert korrekt dargestellt wird — Stufe, nächste Stufe und Restwert an derselben Stelle wie vorher.

**Regression-Gates** (müssen vor dem Abschluss grün sein):

  - `go build ./...`, `go vet ./...` sauber; `go test ./...` ohne neue Fehler gegenüber der Baseline von Commit `016da485` (heute 51 vorbestehende, DSN-bedingte Fehlschläge — Vergleich über einen separaten `git archive`-Checkout).
  - Die real-Postgres-Tests der Badge-Repositories laufen mit echter Testdatenbank, nicht nur gegen Stubs.
  - Frontend `vitest` vollständig, `tsc --noEmit` ohne neue Fehler, `docker compose build team4sv30-frontend` erfolgreich.
  - Live-Vergleich vorher/nachher an Member `type`: `role_volume_typesetter_bronze` behält `current_count 13 · current_tier bronze · next_threshold 108 · remaining_count 95 · next_tier silver`, und die Punkte-Zeile behält `current_count 39 · next_threshold 50 · remaining_count 11`.

**UI hint**: ja — die Badge-Fortschrittsanzeige auf dem öffentlichen Profil und im eigenen Dashboard wechselt ihre Datenquelle. Vor `plan-phase` `/gsd-ui-phase 150` laufen lassen.
