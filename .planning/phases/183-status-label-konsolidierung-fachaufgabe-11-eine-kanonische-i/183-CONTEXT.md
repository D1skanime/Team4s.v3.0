# Phase 183: Status-/Label-Konsolidierung (Fachaufgabe 11) — CONTEXT

## Ziel

Eine kanonische Implementierung je Status-/Label-Gruppe statt redundanter
Parallel-Implementierungen — sowohl für die byte-identische Gruppe 4 (App-User-Konten-Status-Label)
als auch, nach Nutzerentscheidung, für die beiden zuvor unentschiedenen Verhaltensabweichungen in
Gruppe 2 (Fansub-Gruppenmedien-Kategorie-Label) und Gruppe 3 (Claim-Status-Label). Gruppe 5
(Release-Version-Medien-Review-State-Label) ist bereits erledigt — der tote Zweig wurde zwischen
Phase 175 und heute bereits entfernt (siehe unten), hier bleibt nichts mehr zu tun.

## Nutzerentscheidungen (final, verbindlich)

- **D-01 (Gruppe 4):** App-User-Status-Label in einen gemeinsamen Helfer extrahieren (z. B.
  `frontend/src/lib/appUserStatusLabels.ts`), alle 4 Kopien (`AdminUsersClient.tsx`,
  `UserDetailPageClient.tsx`, `UserOverviewTab.tsx`, `RoleHoldersTable.tsx`) darauf umstellen —
  ohne sichtbare Änderung. Anzeige bleibt über `Badge` aus `@/components/ui`.
- **D-02 (Gruppe 2):** Wird mitentschieden. Kanonisch ist `fansub-labels.ts` („Alte Website",
  „IRC-Chat"). Das Admin-Review-Grid (`GroupMediaReviewGrid.tsx`) nutzt künftig dieselbe Quelle,
  keine eigene Kopie mehr. Sichtbare Änderung: Admin-Grid zeigt „Alte Website"/„IRC-Chat" statt
  „Alte Webseite"/„IRC / Chat".
- **D-03 (Gruppe 3):** Wird mitentschieden. Ein gemeinsamer Claim-Status-Helfer liefert überall
  dieselben Wörter: „Genehmigt" (`verified`/`active`), „Offen" (`pending`/`open`), „Abgelehnt"
  (`rejected`/`denied`) — die breite Alias-Abdeckung aus `UserClaimsTab.tsx` wird übernommen, damit
  nie ein Rohwert erscheint; das Wort „Genehmigt" (aus `ClaimsClient.tsx`) ersetzt „Verifiziert".
  Sichtbare Änderung ausschließlich: `/admin/users/<id>` Tab „Mitgliedsanfragen" zeigt künftig
  „Genehmigt" statt „Verifiziert" für `verified`.
- **D-04 (Gruppen 1, 5, 6):** Kein Handlungsbedarf (bereits erledigt bzw. korrekt zentralisiert,
  siehe unten). Tests für D-01/D-02/D-03: reine Logik-Tests der Helfer (alle Werte inkl. Aliase
  und unbekannter Wert), keine Render-Simulationen. Durchgängig korrekte Umlaute.

## Ist-Zustand (neu verifiziert gegenüber Phase 175)

### Gruppe 4: App-User-Konten-Status-Label

Unverändert gegenüber Phase 175 — weiterhin 4 byte-identische Implementierungen, Wort für Wort
geprüft für alle vier Eingabewerte (`active`/`pending`/`disabled`/unbekannt):

| Implementierung | Datei:Zeile (JETZT) | `active` | `pending` | `disabled` | default | Seite/Route |
|---|---|---|---|---|---|---|
| `getStatusVariant`/`getStatusLabel` | `frontend/src/app/admin/users/AdminUsersClient.tsx:40-46,47-52` | success/„Aktiv" | warning/„Ausstehend" | danger/„Deaktiviert" | neutral/Rohwert | `/admin/users` |
| `statusVariant`/`statusLabel` | `frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx:57-68,70-81` | success/„Aktiv" | warning/„Ausstehend" | danger/„Deaktiviert" | neutral/Rohwert | `/admin/users/<id>` |
| `statusVariant`/`statusLabel` | `frontend/src/app/admin/users/tabs/UserOverviewTab.tsx:39-49,52-62` | success/„Aktiv" | warning/„Ausstehend" | danger/„Deaktiviert" | neutral/Rohwert | `/admin/users/<id>` (Tab „Übersicht") |
| `statusVariant`/`statusLabel` | `frontend/src/app/admin/roles/RoleHoldersTable.tsx:45-55,58-68` | success/„Aktiv" | warning/„Ausstehend" | danger/„Deaktiviert" | neutral/Rohwert | `/admin/roles` (Rolleninhaber-Tabelle) |

Alle vier Texte sind Wort-für-Wort identisch, Umlaute korrekt verwendet. Der Code-Kommentar in
`RoleHoldersTable.tsx:39-43` dokumentiert die Duplikation weiterhin selbst ("Mitgliedsstatus-
Badge-Mapping — identisch zu `UserDetailPageClient.tsx`'s `statusVariant`/`statusLabel`"). Keine
der vier Dateien wurde seit Phase 175 angefasst oder verschoben — Fund bleibt 1:1 gültig.

### Gruppe 5: Release-Version-Medien-Review-State-Label

**Bereits erledigt, nicht mehr Teil des Scopes.** Die in Phase 175 als "tot" dokumentierte
`ReleaseVersionMediaGallery.tsx` existiert nicht mehr — gelöscht in Commit `f032829dd`
("chore(180-04): delete superseded dead ReleaseVersionMediaGallery.tsx (D-15)"), also im Zuge der
später gelaufenen Phase 180. Die produktive Implementierung (`statusBadge`) ist zudem umgezogen:
nicht mehr in `ReleaseVersionMediaSection.tsx`, sondern jetzt in
`frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaGrid.tsx:22-44`
(eine durch denselben Umbau entstandene Teilkomponente). Es gibt nur noch EINE Implementierung
(`statusBadge`), kein Duplikat mehr. Sichtbar unter `/admin/episode-versions/<versionId>/edit`.
**Für Phase 183 bleibt hier nichts zu tun** — der zweite der beiden in der alten Roadmap-Zeile
genannten Dead-Code-Punkte ("toter `reviewLabel`") ist bereits weg.

### Gruppe 1: Segment-Typ-Badge (OUTRO-Bug) — zur Einordnung

**Bereits erledigt in Phase 176, nicht Teil des Scopes (wie erwartet).** `segmenteTabUtils.ts`
existiert nicht mehr — gelöscht in Commit `81d7e491f` ("feat(176-02): derive segment badge/color/
spur from DB kuerzel, delete dead utils"). Die produktive `getTypeBadgeLabel`-Funktion
(`frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx:26-39`) mappt
jetzt direkt die DB-gehaltene Kurzform `theme_types.kuerzel` (Migration 0179) statt wie zuvor per
Namens-Raten (`.toUpperCase().includes('OUTRO')`) zu heuristisieren — der ursprüngliche Bug (OUTRO
→ fälschlich „PV") ist durch den Wechsel der Datenquelle strukturell nicht mehr möglich. Kein
Handlungsbedarf, nur zur Einordnung dokumentiert.

### Gruppe 2 + 3: Verhaltensabweichungen (Gruppenmedien-Kategorie, Claim-Status)

Beide weiterhin **unverändert und unentschieden** — keine der Phasen 176-182 hat sie berührt.

**Gruppe 2 — Fansub-Gruppenmedien-Kategorie-Label**, Werte `old_website`/`irc_chat` weichen
weiterhin ab:

| Kategorie | `frontend/src/lib/fansub-labels.ts:7,9` (zentral, öffentliche Galerie) | `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewGrid.tsx:31,33` (Admin-Review-Grid) |
|---|---|---|
| `old_website` | „Alte Website" | „Alte Webseite" |
| `irc_chat` | „IRC-Chat" | „IRC / Chat" |

`fansub-labels.ts` ist als "AO5-08: zentrale deutsche Labels" deklariert und wird von
`FansubGroupMediaBlock.tsx` (öffentliche Galerie, eingebunden über `FansubMediaSection.tsx` auf
`/fansubs/<slug>`) genutzt. `GroupMediaReviewGrid.tsx` ist das Admin-Review-Grid auf
`/admin/fansubs/<id>/edit` (Medien-Tab). Beide lesen denselben Enum-Wert aus
`media_assets.category` — derselbe Datensatz zeigt je nach Fläche ein anderes Wort.

**Gruppe 3 — Mitgliedsanfrage-(Claim)-Status-Label**, Wert `verified`/`active` weicht weiterhin
ab:

| Implementierung | `verified`/`active` → | `pending`/`open` → | `rejected`/`denied` → | unbekannt |
|---|---|---|---|---|
| `frontend/src/app/admin/users/tabs/UserClaimsTab.tsx:41-56` | „Verifiziert" | „Offen" | „Abgelehnt" | Rohwert |
| `frontend/src/app/admin/claims/ClaimsClient.tsx:57-67` (Kommentar „D-23: reale Status-Vokabeln, keine erfundenen Status") | „Genehmigt" (nur `verified`, kein `active`-Alias) | „Offen" (nur `pending`, kein `open`-Alias) | „Abgelehnt" (nur `rejected`, kein `denied`-Alias) | Rohwert |

`UserClaimsTab.tsx` sitzt auf `/admin/users/<id>` (Tab „Mitgliedsanfragen"), `ClaimsClient.tsx`
auf der zentralen `/admin/claims`-Workspace (seit Phase 138, D-23 — das ist also eine
ursprüngliche, bewusste Designentscheidung von damals, keine neuere Zwischenänderung). Beide
lesen `claim.claim_status` aus derselben Tabelle — ein Admin sieht für denselben Claim auf den
zwei Seiten zwei unterschiedliche Wörter. Zusätzlich divergiert die Fallwert-Abdeckung: ein Claim
mit `claim_status: 'active'` zeigt in `ClaimsClient.tsx` den rohen String `"active"` statt eines
deutschen Labels (fällt auf `default`), während `UserClaimsTab.tsx` ihn korrekt übersetzt.

### Gruppe 6: Rollenlabel

Weiterhin korrekt zentralisiert, kein Handlungsbedarf. `labelForRole` bleibt die einzige
Berechnungsfunktion in `frontend/src/lib/roleCatalog.ts:41-43`; `contributionRoles.ts:1,51` ruft
sie weiterhin nur auf, ohne eigene Mapping-Logik. Kein Duplikat, keine Abweichung möglich.

## Kanonische Implementierung je Gruppe (final)

**Gruppe 4 (D-01):** `UserDetailPageClient.tsx:57-81` als Vorbild (zentralste Konsumentenstelle,
identischer Code wie die anderen drei) nach `frontend/src/lib/appUserStatusLabels.ts` extrahieren
(zwei Funktionen `appUserStatusVariant`/`appUserStatusLabel`, Eingabe `app_users.status`). Die
drei übrigen Dateien (`AdminUsersClient.tsx`, `UserOverviewTab.tsx`, `RoleHoldersTable.tsx`)
werden auf den Helfer umgestellt, ihre lokalen Kopien entfernt. Verwendung bleibt über
`@/components/ui`-`Badge` mit dem vom Helfer gelieferten `variant`-Wert — keine Änderung am
UI-Primitiv nötig, nur an der Quelle des Label-/Varianten-Werts.

**Gruppe 2 (D-02):** `fansub-labels.ts` (`FANSUB_MEDIA_CATEGORY_LABELS`/`getFansubMediaCategoryLabel`)
wird alleinige Quelle. `GroupMediaReviewGrid.tsx` entfernt seine lokale `CATEGORY_OPTIONS`-Label-
Berechnung (`getCategoryLabel`) und importiert stattdessen aus `fansub-labels.ts`. Ergebnis:
„Alte Website" und „IRC-Chat" erscheinen künftig auch im Admin-Review-Grid.

**Gruppe 3 (D-03):** Neuer gemeinsamer Helfer (z. B. `frontend/src/lib/claimStatusLabels.ts`) mit
`claimStatusVariant`/`claimStatusLabel`, Eingabe `claim.claim_status`. Mapping: `verified`/`active`
→ „Genehmigt", `pending`/`open` → „Offen", `rejected`/`denied` → „Abgelehnt", unbekannt → Rohwert
(unverändert als Fallback). `UserClaimsTab.tsx` und `ClaimsClient.tsx` werden beide auf den Helfer
umgestellt, ihre lokalen Kopien entfernt. Einzige sichtbare Änderung: `UserClaimsTab.tsx`
(`/admin/users/<id>`, Tab „Mitgliedsanfragen") zeigt für `verified` künftig „Genehmigt" statt
„Verifiziert" — `ClaimsClient.tsx` zeigt unverändert „Genehmigt", gewinnt aber die bisher fehlenden
Aliase (`active`/`open`/`denied` zeigen künftig ein Label statt des Rohwerts).

**Gruppe 5:** Kein Vorschlag nötig — bereits konsolidiert (siehe oben), keine Aktion.

## Abgrenzung (explizit NICHT Teil dieser Phase)

- Gruppe 1 (Segment-Typ-Badge/OUTRO-Bug): bereits in Phase 176 behoben, kein weiterer
  Handlungsbedarf.
- Gruppe 5 (Release-Version-Medien-Review-State-Label): bereits in Phase 180 konsolidiert (toter
  Zweig entfernt), kein weiterer Handlungsbedarf.
- Gruppe 6 (Rollenlabel): korrekt zentralisiert, kein Handlungsbedarf.
- Keine weiteren Wortänderungen über die in D-02/D-03 festgelegten hinaus — insbesondere bleibt
  die Fallwert-Behandlung für unbekannte Status (Rohwert-Anzeige) unverändert, das ist kein
  Regressions-, sondern ein bewusst unverändert gelassener Rand.

## Vergleichs-URLs (vorher/nachher, über http://127.0.0.1:3300, mit konkreten vorhandenen IDs)

- http://127.0.0.1:3300/admin/users — Gruppe 4, `AdminUsersClient.tsx`-Statuslabel in der Liste
  (alle 9 App-User aktuell `active`/„Aktiv").
- http://127.0.0.1:3300/admin/users/2 — App-User „D1sk" (`id=2`, Status `active`). Gruppe 4
  (Kopfbereich + Tab „Übersicht") UND Gruppe 3 (Tab „Mitgliedsanfragen" — dieser Nutzer hat einen
  verifizierten Claim, `member_claims.id=1`, `claim_status='verified'`) an derselben Seite:
  vorher „Verifiziert", nachher „Genehmigt".
- http://127.0.0.1:3300/admin/roles — Gruppe 4, `RoleHoldersTable.tsx`-Statuslabel in der
  Rolleninhaber-Tabelle (`user_roles.user_id=1` hält `role_id=1`).
- http://127.0.0.1:3300/admin/claims — Gruppe 3, `ClaimsClient.tsx`-Statuslabel für denselben
  Claim (`member_claims.id=1`, `app_user_id=2`) zum Vergleich mit `/admin/users/2`: zeigt schon
  vorher „Genehmigt" (unverändert), gewinnt aber die Alias-Abdeckung für `active`/`open`/`denied`.
- http://127.0.0.1:3300/admin/fansubs/1/edit — Fansub-Gruppe „new-subs" (`id=1`), Medien-Tab,
  Gruppe 2: Medien-Eintrag `media_id=21` mit Kategorie `old_website` — vorher „Alte Webseite",
  nachher „Alte Website".
- http://127.0.0.1:3300/fansubs/new-subs — Gruppe 2, öffentliche Galerie-Kategorielabel für
  dasselbe `old_website`-Medium (`FansubGroupMediaBlock.tsx` über `fansub-labels.ts`, zeigt bereits
  vorher „Alte Website" — Referenzwert für den Vergleich mit dem Admin-Grid).

Hinweis: Aktuell existiert kein `irc_chat`-Datensatz in `fansub_group_media` und kein App-User mit
Status `pending`/`disabled` — der Live-Checkpoint vergleicht für diese Werte den Code (Mapping-
Tabelle) statt eines echten Datensatzes.
