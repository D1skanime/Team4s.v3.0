# Fachaufgabe 11: Status-/Label-Darstellung — Inventur

**Quelle:** 175-CONTEXT.md D-02 #11. Baut direkt auf `174-HOTSPOTS.md` D-07 "Status Mapping"-Verdikt auf (bestätigter `getTypeBadgeLabel`-OUTRO-Bug, F-02) und erweitert die Prüfung auf alle Label-/Status-Darstellungsfunktionen (Review-Status, Rollenlabels, Kategorie-Labels, Konten-Status).
**Methode:** `grep -rn "^export function get.*Label\|^export function get.*Status\|^function get.*Label\|^function get.*Status"` über `frontend/src/` (Produktionscode, Tests ausgeschlossen) lieferte alle Kandidaten-Funktionen. Für jede Gruppe semantisch gleicher Funktionen (gleicher Eingabe-Wertebereich) wurden ALLE Implementierungen gelesen und für denselben Eingabewert verglichen (nicht nur "sieht ähnlich aus" — D-07-Prinzip). Jede Gruppe wurde zusätzlich darauf geprüft, ob die jeweilige Datei überhaupt von Produktionscode importiert wird (nicht nur von ihrem eigenen Test).

Spalten gemäß D-03: (a) UI-Fläche, (b) Label-Berechnungsfunktion, (c) Backend-Herkunft des Status-Enums, (d) Rechte-Bezug (meist n/a), (e) Datenhaltung, (f) Verhaltensvergleich je Eingabewert.

---

## Übersicht: 6 untersuchte Label-Funktionsgruppen

| # | Gruppe | Implementierungen | Verhaltensabweichung? |
|---|---|---|---|
| 1 | Segment-Typ-Badge (Kurzform OP/ED/IN/OUT/PV) | 2 | **JA — bestätigter F-02-Bug** |
| 2 | Fansub-Gruppenmedien-Kategorie-Label | 2 | **JA — neuer Fund** |
| 3 | Mitgliedsanfrage-(Claim)-Status-Label | 2 | **JA — neuer Fund** |
| 4 | App-User-Konten-Status-Label (`statusLabel`/`statusVariant`) | 4 | Nein (byte-identisch) |
| 5 | Release-Version-Medien-Review-State-Label | 2 | Nein (byte-identisch), aber eine Seite ist totes Produktionscode-Duplikat |
| 6 | Rollenlabel (Role-Catalog) | 1 zentral + 1 korrekt wiederverwendend | Nein — korrekt zentralisiert (false positive) |

**Ergebnis: 3 von 6 Gruppen zeigen eine Verhaltensabweichung** (derselbe Eingabewert liefert je nach Implementierung ein anderes Ergebnis). Jede davon wird unten als eigenständiger, UNENTSCHIEDENER Bug-Befund dokumentiert — kein Merge-Vorschlag ohne Entscheidung, welcher Wert korrekt ist (D-07-Regel).

---

## Gruppe 1: Segment-Typ-Badge — bestätigter `getTypeBadgeLabel`-OUTRO-Bug (F-02)

- **(a) UI-Fläche:** Segment-Liste im Episoden-Editor, rendert über `SegmentTimeline` — `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx:344,400`; konsumiert außerdem von `SegmentsListSection.tsx:97,160`.
- **(b) Implementierung 1 (PRODUKTIV, tatsächlich gerendert):** `getTypeBadgeLabel` — `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx:16-23`:
  ```
  if (upper.includes('OUTRO')) return 'OUT'
  if (upper.includes('PV')) return 'PV'
  ```
  Für `'Outro'` → **`'OUT'`**.
- **(b) Implementierung 2 (NICHT produktiv genutzt, nur Test-Import):** `getTypeBadgeLabel` — `frontend/src/app/admin/episode-versions/[versionId]/edit/segmenteTabUtils.ts:3-9`:
  ```
  if (upper.includes('OUTRO') || upper.includes('PV')) return 'PV'
  ```
  Für `'Outro'` → **`'PV'`**.
- **Zusatzbefund gegenüber 174-HOTSPOTS.md:** `segmenteTabUtils.ts` wird NIRGENDS von Produktionscode importiert (`grep -rn "segmenteTabUtils" frontend/src/` → einziger Treffer außer der Datei selbst ist `SegmenteTab.test.tsx:13`). Die gesamte 77-Zeilen-Datei ist damit **totes Produktionscode-Duplikat**, das ausschließlich durch seine eigene Testdatei "lebendig" gehalten wird — exakt das Muster, das 174-HOTSPOTS.md für diesen Fund noch nicht festgestellt hatte (dort nur die Verhaltensabweichung selbst benannt, nicht die Totheit einer Seite).
- **(c) Backend-Herkunft:** `theme_type_name` kommt als Freitext-Spalte aus `jellyfin_themes`/`release_theme_segments` (Segment-Typnamen wie "Opening 1", "Outro", "Insert Song" — kein Backend-Enum, reine String-Heuristik im Frontend).
- **(d) Rechte-Bezug:** n/a — reine Darstellung, kein Rechte-Check beteiligt.
- **(e) Datenhaltung:** `AdminThemeSegment.theme_type_name` (String, aus Jellyfin-Import oder manueller Eingabe).
- **(f) Verhaltensvergleich:** Eingabewert `'Outro'`/`'OUTRO ...'` liefert in Implementierung 1 `'OUT'`, in Implementierung 2 `'PV'`. **Bestätigter Bug (F-02), hier durch eigenen Code-Vergleich erneut verifiziert.**

**D-04-Klassifikation: NICHT blind mergen (F-02/D-07-Regel) + totes Duplikat entfernen.** Zwei getrennte Befunde: (1) welcher Rückgabewert für OUTRO korrekt ist, bleibt eine Entscheidung für Nutzer/Folgephase; (2) unabhängig davon ist `segmenteTabUtils.ts`s komplette `getTypeBadgeLabel`-Exportfunktion toter Code und könnte ohne Produktverhaltensänderung entfernt werden, sobald die Testdatei auf die produktive Implementierung umgestellt ist — das ist aber selbst eine Code-Änderung (D-01-Ausnahme), daher nur dokumentiert, nicht durchgeführt.

**Verwandte, NICHT abweichende Funktion (zur Einordnung):** `getKaraCategoryLabel` (`ReleaseVersionMediaSection.helpers.tsx:52-58`) mappt denselben `theme_type_name`-Wertebereich auf ausgeschriebene Kategorienamen ('Opening'/'Ending'/'Insert'/**'Outro'**) für die Kara-Story-Ansicht — bewusst anderer Ausgabe-Kontrakt (Volltext statt Kurz-Badge) für eine andere UI-Fläche, **legitim getrennt**, kein drittes Mitglied dieser Duplikat-Gruppe.

---

## Gruppe 2: Fansub-Gruppenmedien-Kategorie-Label — neuer Fund

- **(a) UI-Fläche 1 (Admin-Review-Grid):** `GroupMediaReviewGrid.tsx` — Kategorie-Dropdown + Anzeige-Label im Prüf-Grid der Fansub-Gruppenmedien.
- **(a) UI-Fläche 2 (öffentlicher Block):** `FansubGroupMediaBlock.tsx` — öffentliche Fansub-Gruppen-Galerie.
- **(b) Implementierung 1:** `getCategoryLabel` → `CATEGORY_OPTIONS` — `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewGrid.tsx:28-36,63-65`.
- **(b) Implementierung 2:** `getFansubMediaCategoryLabel` → `FANSUB_MEDIA_CATEGORY_LABELS` — `frontend/src/lib/fansub-labels.ts:4-13,27-29` (zentrale, als "AO5-08: zentrale deutsche Labels" kommentierte Konstante, auch von `FansubGroupMediaBlock.tsx` konsumiert).
- **(c) Backend-Herkunft:** `FansubGroupMediaCategory` — derselbe Enum-Typ in beiden Implementierungen (`gallery`/`history_screenshot`/`old_website`/`forum`/`irc_chat`/`event_meeting`/`artwork_fanart`/`other`), Spalte `media_assets.category` (gemeinsame Herkunft für beide Flächen).
- **(d) Rechte-Bezug:** n/a.
- **(e) Datenhaltung:** `media_assets.category` (String-Enum-Spalte).
- **(f) Verhaltensvergleich — Wert-für-Wert, 8 Kategorien:**

  | Kategorie | `fansub-labels.ts` (zentral, öffentlich) | `GroupMediaReviewGrid.tsx` (Admin-Grid) | Identisch? |
  |---|---|---|---|
  | `gallery` | Galerie | Galerie | Ja |
  | `history_screenshot` | Historische Screenshots | Historische Screenshots | Ja |
  | `old_website` | **Alte Website** (`fansub-labels.ts:7`) | **Alte Webseite** (`GroupMediaReviewGrid.tsx:30`) | **NEIN** |
  | `forum` | Forum | Forum | Ja |
  | `irc_chat` | **IRC-Chat** (`fansub-labels.ts:9`) | **IRC / Chat** (`GroupMediaReviewGrid.tsx:32`) | **NEIN** |
  | `event_meeting` | Event / Treffen | Event / Treffen | Ja |
  | `artwork_fanart` | Artwork / Fanart | Artwork / Fanart | Ja |
  | `other` | Sonstiges | Sonstiges | Ja |

  2 von 8 Werten weichen textlich ab: `old_website` ("Alte Website" vs. "Alte Webseite") und `irc_chat` ("IRC-Chat" vs. "IRC / Chat"). Dasselbe Eingabe-Enum liefert je nach Fläche (Admin-Prüf-Grid vs. öffentliche Galerie) ein anderes, nicht identisches Label für denselben Datensatz — exakt das vom OUTRO-Bug bekannte Muster (gleicher Wert, unterschiedliches Ergebnis), hier allerdings nur Rechtschreib-/Formatierungsvarianten (kein semantischer Gegensatz wie `OUT` vs. `PV`), aber dennoch eine echte, unentschiedene Inkonsistenz.

**D-04-Klassifikation: NICHT blind mergen — als eigenständiger Befund dokumentiert.** Welches der beiden Labels pro Kategorie "kanonisch" sein soll (die bereits als "AO5-08: zentrale deutsche Labels" deklarierte `fansub-labels.ts`-Variante ist der naheliegende Vorbild-Kandidat, da sie bereits für zentrale Wiederverwendung gedacht war), bleibt einer Folgephase/dem Nutzer vorbehalten — nicht in dieser Phase entschieden (D-01).

---

## Gruppe 3: Mitgliedsanfrage-(Claim)-Status-Label — neuer Fund

- **(a) UI-Fläche 1:** Nutzerdetailseite, Claims-Tab — `frontend/src/app/admin/users/tabs/UserClaimsTab.tsx` (zeigt die Claims EINES Nutzers).
- **(a) UI-Fläche 2:** Zentrale Claims-Workspace — `frontend/src/app/admin/claims/ClaimsClient.tsx` (zeigt ALLE Claims gruppenübergreifend, Teil der in Phase 138 eingeführten `/admin/claims`-IA).
- **(b) Implementierung 1:** `claimStatusLabel`/`claimStatusVariant` — `frontend/src/app/admin/users/tabs/UserClaimsTab.tsx:41-56,57+` — beide lesen `claim.claim_status` (Zeile 122-123).
- **(b) Implementierung 2:** `claimStatusLabel`/`claimStatusVariant` — `frontend/src/app/admin/claims/ClaimsClient.tsx:57-67,70-80` — beide lesen ebenfalls `claim.claim_status` (Zeile 284-285,389), **bestätigt dasselbe Datenfeld wie Implementierung 1** (kein unterschiedlicher Datenpfad, der die Abweichung erklären könnte).
- **(c) Backend-Herkunft:** `claim.claim_status` — Feld aus dem Member-Claims-Modell (`fansub_group_member_historical_links`/`member_claims`-Domäne, Werte u. a. `verified`/`pending`/`open`/`rejected`/`denied`/`active`).
- **(d) Rechte-Bezug:** n/a (reine Statusdarstellung).
- **(e) Datenhaltung:** Claim-Entität, Spalte für den Verifikationsstatus (gleicher Datensatz, von beiden UI-Flächen über denselben API-Endpunkt geladen — beide Seiten zeigen Claims aus derselben Tabelle).
- **(f) Verhaltensvergleich für den Eingabewert `'verified'`:**

  | Implementierung | `case 'verified'` → |
  |---|---|
  | `UserClaimsTab.tsx:44-46` | `'Verifiziert'` |
  | `ClaimsClient.tsx:59-60` | `'Genehmigt'` |

  **Abweichung bestätigt:** derselbe Claim mit `claim_status: 'verified'` zeigt auf der Nutzerdetailseite "Verifiziert", auf der zentralen Claims-Seite "Genehmigt" — ein Admin, der beide Flächen für denselben Claim besucht, sieht zwei unterschiedliche Wörter für denselben Zustand. Zusätzlich divergiert die Fallwert-Abdeckung: `UserClaimsTab.tsx` behandelt zusätzlich `'active'` (→ ebenfalls "Verifiziert") und `'open'`/`'denied'` als Aliase für `'pending'`/`'rejected'`; `ClaimsClient.tsx` kennt nur die drei reinen Werte `verified`/`rejected`/`pending` (kein `active`/`open`/`denied`-Alias) — ein Claim mit `claim_status: 'active'` würde in `ClaimsClient.tsx` auf den `default`-Zweig fallen und den rohen String `"active"` statt eines deutschen Labels zeigen, während `UserClaimsTab.tsx` ihn korrekt übersetzt.

**D-04-Klassifikation: NICHT blind mergen — als eigenständiger Befund dokumentiert.** Welches Label (`'Verifiziert'` vs. `'Genehmigt'`) und welche Fallwert-Abdeckung (mit oder ohne `active`/`open`/`denied`-Aliase) kanonisch sein soll, bleibt einer Folgephase/dem Nutzer vorbehalten.

---

## Gruppe 4: App-User-Konten-Status-Label — byte-identisches Duplikat (kein Verhaltensbefund)

- **(a)/(b) 4 Implementierungen**, alle mit identischer Logik (`'active'`→Erfolg/"Aktiv", `'pending'`→Warnung/"Ausstehend", `'disabled'`→Gefahr/"Deaktiviert", sonst neutral/Rohwert):
  - `getStatusVariant`/`getStatusLabel` — `frontend/src/app/admin/users/AdminUsersClient.tsx:40-46,47-52` (Admin-Nutzerliste).
  - `statusVariant`/`statusLabel` — `frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx:57-68,70-81` (Nutzerdetailseite, Kopfbereich).
  - `statusVariant`/`statusLabel` — `frontend/src/app/admin/users/tabs/UserOverviewTab.tsx:39-49,52-...` (Übersichts-Tab derselben Detailseite).
  - `statusVariant`/`statusLabel` — `frontend/src/app/admin/roles/RoleHoldersTable.tsx:45-55,58-...` (Rollen-Matrix-Rolleninhaber-Tabelle) — **dieser Fund ist bereits im Code selbst dokumentiert**: ein Kommentar direkt über der Funktion (`RoleHoldersTable.tsx:39-43`) sagt wörtlich "Mitgliedsstatus-Badge-Mapping — identisch zu `UserDetailPageClient.tsx`'s `statusVariant`/`statusLabel` (keine zweite, abweichende Zuordnung...)" — die Duplikation war dem ursprünglichen Autor bewusst und bewusst in Kauf genommen.
- **(c) Backend-Herkunft:** `app_users.status`-Spalte (Enum `active`/`pending`/`disabled`).
- **(d) Rechte-Bezug:** n/a.
- **(e) Datenhaltung:** `app_users.status`.
- **(f) Verhaltensvergleich:** Für alle 4 Eingabewerte (`active`/`pending`/`disabled`/unbekannt) liefern alle 4 Implementierungen identische Variante UND identisches Label. **Keine Abweichung.**

**D-04-Klassifikation: Duplikat (mergen).** Vier byte-identische Funktionspaare für denselben Enum — ein echter Merge-Kandidat für eine Folgephase (z. B. nach `frontend/src/lib/`), kein Verhaltensrisiko beim Mergen (im Gegensatz zu Gruppe 1-3), da alle vier Implementierungen bereits exakt übereinstimmen. Der Code-Kommentar in `RoleHoldersTable.tsx` belegt, dass dies kein unbeabsichtigtes Copy/Paste war, sondern eine bewusste, aber nicht konsolidierte Wiederholung.

---

## Gruppe 5: Release-Version-Medien-Review-State-Label — Duplikat mit totem Zweig

- **(a) UI-Fläche 1 (PRODUKTIV):** `ReleaseVersionMediaSection.tsx` — die tatsächlich im Episoden-Editor gerenderte Medien-Sektion (`EpisodeVersionEditorPage.tsx`, `/me/releases/[versionId]/workspace/page.tsx` und weitere, siehe Importliste unten).
- **(a) UI-Fläche 2 (NICHT produktiv genutzt):** `ReleaseVersionMediaGallery.tsx` — eigenständige Galerie-Komponente, die NIRGENDS außer ihrer eigenen Testdatei importiert wird (`grep -rn "ReleaseVersionMediaGallery" frontend/src/` → nur `ReleaseVersionMediaGallery.tsx` selbst und `ReleaseVersionMediaGallery.test.tsx`).
- **(b) Implementierung 1:** `statusBadge` — `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx:36-62`.
- **(b) Implementierung 2:** `reviewLabel` — `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaGallery.tsx:32-48`.
- **(c) Backend-Herkunft:** `item.review_state` (`'pending'|'confirmed'|'rejected'|'tombstoned'`, aus `release_version_media_review_lifecycle.review_state`, Migration 0135) mit Fallback auf das ältere `item.review_status`/`item.visibility`-Paar (`'freigegeben'`/`'abgelehnt'`).
- **(d) Rechte-Bezug:** n/a.
- **(e) Datenhaltung:** `release_version_media_review_lifecycle.review_state` (primär), `media_assets.review_status`/`visibility` (Fallback für ältere Datensätze ohne Lifecycle-Zeile).
- **(f) Verhaltensvergleich:** Für alle 4 `review_state`-Werte UND den gesamten Fallback-Zweig (`review_status === 'freigegeben'` → Sichtbarkeits-abhängiges Label, `'abgelehnt'` → "Abgelehnt", sonst "In Prüfung") liefern beide Implementierungen **wortgleiche** Labels ('Bestätigt'/'Abgelehnt'/'Entfernt'/'In Prüfung'/'Öffentlich'/'Intern'). **Keine Abweichung** — nur die Rückgabeform unterscheidet sich (`statusBadge` liefert zusätzlich `className`+`variant` für ein Badge, `reviewLabel` liefert nur den rohen String).

**D-04-Klassifikation: Duplikat (mergen), mit demselben toten-Code-Muster wie Gruppe 1.** `ReleaseVersionMediaGallery.tsx` ist eine vollständige, parallel gepflegte Komponente mit eigenem CSS-Modul und eigener Testdatei, die aber nie in eine Seite eingebunden wurde — ein zweites Beispiel (neben `segmenteTabUtils.ts`) für "totes Paralleldesign, das nur die eigene Testsuite lebendig hält". Da die Label-Logik hier (im Gegensatz zu Gruppe 1) tatsächlich identisch ist, ist ein Merge risikofrei möglich, sobald entschieden ist, ob die tote Komponente entfernt oder reaktiviert wird (außerhalb des D-01-Scopes dieser Phase).

---

## Gruppe 6: Rollenlabel (Role-Catalog) — korrekt zentralisiert (false positive)

- **(b) Zentrale Implementierung:** `labelForRole(rows, code)` — `frontend/src/lib/roleCatalog.ts:41-43` (`getRole(rows, code)?.label_de || readableCodeLabel(code)`), beliefert von `RoleCatalogProvider.tsx` (lädt `GET /api/v1/role-catalog/...` einmalig im App-Layout).
- **(b) Wiederverwendende Implementierung:** `roleLabels(catalog, codes)` — `frontend/src/components/contributions/contributionRoles.ts:38-42` — ruft intern **exakt** `labelForRole` aus `roleCatalog.ts` auf (Import-Zeile `contributionRoles.ts:1`), keine eigene Label-Berechnung.
- **(c) Backend-Herkunft:** `role_definitions.label_de` (Rollenkatalog-Tabelle, s. a. `data/10-rechte-anzeigen-durchsetzen.md`).
- **(d) Rechte-Bezug:** n/a — ausdrücklich bestätigt in `data/10-*.md`: der Rollenkatalog ist kein Rechte-Gate.
- **(e) Datenhaltung:** `role_definitions` (separate Metadaten-Tabelle, nicht der Rechte-Cache).
- **(f) Verhaltensvergleich:** Da `contributionRoles.ts` keine eigene Mapping-Logik besitzt, sondern denselben `roleCatalog.ts`-Code aufruft, ist eine Abweichung strukturell ausgeschlossen (nicht nur zufällig gleich — wie bereits für die zentrale Rechte-Resolution in `data/10-*.md` festgestellt).

**D-04-Klassifikation: Legitim zentral — korrektes Wiederverwendungsmuster, kein Duplikat.** Bestätigt den bereits in `174-HOTSPOTS.md` (D-07 "Rights Resolution") und `data/10-*.md` dokumentierten Befund, dass zentrale Infrastruktur (hier: Rollenkatalog) im Gegensatz zu den oben genannten Label-Gruppen korrekt NICHT dupliziert wurde.

---

## Zusammenfassung (reproduzierbar per `scripts/count-11-status-label-darstellung.sh`)

- **Untersuchte Label-Funktionsgruppen: 6**
- **Gefundene Verhaltensabweichungen (gleicher Eingabewert → unterschiedliches Ergebnis): 3** (Gruppe 1 Segment-Typ-Badge/F-02, Gruppe 2 Fansub-Medien-Kategorie, Gruppe 3 Claim-Status)
- **Byte-identische Duplikate ohne Verhaltensabweichung: 2** (Gruppe 4 App-User-Status — 4 Implementierungen, Gruppe 5 Release-Version-Medien-Review-State — 2 Implementierungen)
- **Korrekt zentralisiert (false positive): 1** (Gruppe 6 Rollenlabel)
- **Zusätzlich gefundenes totes Produktionscode-Duplikat (nur über eigene Testdatei "lebendig"): 2** (`segmenteTabUtils.ts` — Gruppe 1, `ReleaseVersionMediaGallery.tsx` — Gruppe 5)
- **Keine fälschlich Rechte suggerierenden Labels gefunden:** `grep -rn "Prüfbar\|bearbeitbar"` über `frontend/src/` (ohne Tests) ergab 0 Treffer — kein Label behauptet eine Handlungsberechtigung, die nicht über die in `data/04-*.md`/`data/10-*.md` dokumentierten Capability-Felder abgesichert ist.
