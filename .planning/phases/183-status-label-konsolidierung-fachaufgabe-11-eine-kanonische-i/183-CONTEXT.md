# Phase 183: Status-/Label-Konsolidierung (Fachaufgabe 11) — CONTEXT

## Ziel

Eine kanonische Implementierung je byte-identischer Status-/Label-Gruppe statt redundanter
Parallel-Implementierungen. Konkret: Gruppe 4 (App-User-Konten-Status-Label) wird aus vier
byte-identischen Kopien auf einen zentralen Helfer zusammengeführt. Gruppe 5 (Release-Version-
Medien-Review-State-Label) ist bereits erledigt — der tote Zweig wurde zwischen Phase 175 und
heute bereits entfernt (siehe unten), hier bleibt nichts mehr zu tun.

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

## Vorschlag: Kanonische Implementierung je Gruppe

**Gruppe 4:** `UserDetailPageClient.tsx:57-81` als Vorbild (zentralste Konsumentenstelle,
identischer Code wie die anderen drei) nach `frontend/src/lib/appUserStatusLabels.ts` extrahieren
(zwei Funktionen `appUserStatusVariant`/`appUserStatusLabel`, Eingabe `app_users.status`). Die
drei übrigen Dateien (`AdminUsersClient.tsx`, `UserOverviewTab.tsx`, `RoleHoldersTable.tsx`)
werden auf den Helfer umgestellt, ihre lokalen Kopien entfernt. Verwendung bleibt über
`@/components/ui`-`Badge` mit dem vom Helfer gelieferten `variant`-Wert — keine Änderung am
UI-Primitiv nötig, nur an der Quelle des Label-/Varianten-Werts.

**Gruppe 5:** Kein Vorschlag nötig — bereits konsolidiert (siehe oben), keine Aktion.

## Abgrenzung (explizit NICHT Teil dieser Phase)

- Gruppe 2 (Fansub-Gruppenmedien-Kategorie-Label) und Gruppe 3 (Claim-Status-Label): echte
  Verhaltensabweichungen, kein stiller Merge (D-07-Regel) — brauchen eine Produktentscheidung,
  welches Wort/welche Fallwert-Abdeckung kanonisch wird. Siehe „Offene Fragen" unten.
- Gruppe 1 (Segment-Typ-Badge/OUTRO-Bug): bereits in Phase 176 behoben, kein weiterer
  Handlungsbedarf.
- Gruppe 5 (Release-Version-Medien-Review-State-Label): bereits in Phase 180 konsolidiert (toter
  Zweig entfernt), kein weiterer Handlungsbedarf.
- Gruppe 6 (Rollenlabel): korrekt zentralisiert, kein Handlungsbedarf.

## Offene Fragen an den Nutzer

1. **Sollen Gruppe 2/3 (Verhaltensabweichungen) jetzt in Phase 183 mit entschieden und gemergt
   werden, oder bleiben sie weiter zurückgestellt?** Die alte Roadmap empfahl, diese Entscheidung
   vor Phase 183 zu treffen, machte sie aber nicht zur Blockierung. Da beide seit Phase 175
   unverändert sind, besteht keine neue Dringlichkeit — Empfehlung: bei dieser Gelegenheit mit
   entscheiden (geringer Zusatzaufwand, da Phase 183 ohnehin dieselben Dateien/dasselbe Muster
   anfasst), aber nicht zwingend.

2. **Falls Gruppe 2 jetzt entschieden wird — welches Wort wird kanonisch?**
   - `old_website`: „Alte Website" (zentral, `fansub-labels.ts`) vs. „Alte Webseite" (Admin-Grid).
   - `irc_chat`: „IRC-Chat" (zentral, `fansub-labels.ts`) vs. „IRC / Chat" (Admin-Grid).
   - Empfehlung: `fansub-labels.ts` übernehmen (bereits als "AO5-08: zentrale deutsche Labels"
     deklariert, von der öffentlichen Fläche genutzt — naheliegender Vorbild-Kandidat), das
     Admin-Grid wird umgestellt, nicht umgekehrt.

3. **Falls Gruppe 3 jetzt entschieden wird — welches Wort und welche Fallwert-Abdeckung wird
   kanonisch?**
   - Label für `verified`: „Verifiziert" (`UserClaimsTab.tsx`) vs. „Genehmigt" (`ClaimsClient.tsx`,
     bewusst seit Phase 138/D-23 so gewählt mit Kommentar „reale Status-Vokabeln").
   - Fallwert-Abdeckung: `UserClaimsTab.tsx` kennt zusätzlich die Aliase `active`→`verified`,
     `open`→`pending`, `denied`→`rejected`; `ClaimsClient.tsx` kennt nur die drei reinen Werte
     (ein Claim mit `claim_status: 'active'` zeigt dort fälschlich den Rohwert `"active"`).
   - Empfehlung: Die breitere Fallwert-Abdeckung aus `UserClaimsTab.tsx` übernehmen (verhindert den
     Rohwert-Leak), aber das Wort „Genehmigt" aus `ClaimsClient.tsx` behalten, da es laut
     Code-Kommentar bewusst gegen erfundene/unklare Vokabeln gewählt wurde — das ist allerdings
     eine inhaltliche Produktentscheidung, keine rein technische; hier ist der Nutzer gefragt.

## Vergleichs-URLs (vorher/nachher, über http://127.0.0.1:3300)

- http://127.0.0.1:3300/admin/users — Gruppe 4, `AdminUsersClient.tsx`-Statuslabel in der Liste.
- http://127.0.0.1:3300/admin/users/<id> — Gruppe 4 (Kopfbereich + Tab „Übersicht") und Gruppe 3
  (Tab „Mitgliedsanfragen", `UserClaimsTab.tsx`) an derselben Seite.
- http://127.0.0.1:3300/admin/roles — Gruppe 4, `RoleHoldersTable.tsx`-Statuslabel in der
  Rolleninhaber-Tabelle.
- http://127.0.0.1:3300/admin/claims — Gruppe 3, `ClaimsClient.tsx`-Statuslabel zum Vergleich mit
  der Nutzerdetailseite für denselben Claim.
- http://127.0.0.1:3300/admin/fansubs/<id>/edit — Gruppe 2, Admin-Review-Grid-Kategorielabel
  (Medien-Tab) zum Vergleich mit der öffentlichen Fansub-Seite.
- http://127.0.0.1:3300/fansubs/<slug> — Gruppe 2, öffentliche Galerie-Kategorielabel
  (`FansubGroupMediaBlock.tsx` über `fansub-labels.ts`).
