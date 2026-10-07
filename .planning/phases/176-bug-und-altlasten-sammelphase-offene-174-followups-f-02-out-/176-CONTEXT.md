# Phase 176: Bug- und Altlasten-Sammelphase aus Phase 174 + Phase 175 — Context

**Stand:** 2026-10-07, final — übernommen aus `.planning/notes/176-bugphase-CONTEXT-draft.md` und
ergänzt um die verbindlichen Punkte aus `175-ROADMAP-PROPOSAL.md` (Abschnitt „Phase 176:
Bugfix-Sammelphase" + Abschnitt „Nutzer-Bestätigung") sowie `175-USER-DECISIONS.md`.
**Quelle:** Nutzerauftrag 2026-10-06/07; Einträge aus `174-FOLLOWUPS.md`;
`.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/175-ROADMAP-PROPOSAL.md`;
`.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/175-USER-DECISIONS.md`;
`.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/175-PERMISSION-MATRIX.md`.

<domain>
## Phase Boundary

Gezielte Fehler- und Altlasten-Behebung. Keine neuen Features, keine Zusammenführung von
Parallelsystemen (das sind eigene Folgephasen aus `175-ROADMAP-PROPOSAL.md`: Phase 177
Bildanzeige, Phase 178 Suche, Phase 179/180 Uploader, Phase 181 Release-Bearbeitung, Phase 182
Bildspeicher, Phase 183 Status-/Label-Konsolidierung). Jeder Fix klein, einzeln committet, mit
Logik-Test hinter dem Button oder Live-Abnahme bei UI-Punkten.

**Risiko: Mittel.** Die meisten Einzelpunkte sind Spalten-/Routen-/Konstanten-Fixes ohne
Strukturumbau, aber Paket D enthält eine echte Sicherheits-/Rechte-Lücke (Permission-Matrix-Zeile
5.3) und Paket C potenziell eine Bestandsdaten-Bereinigung an Produktionsdaten (daher der
blockierende Checkpoint) — in Summe rechtfertigt das "mittel" statt "gering" (verbindliche
Nutzer-Korrektur am Checkpoint, Punkt 1 der Nutzer-Bestätigung).
</domain>

<packages>
## Interne Struktur — 5 klar getrennte, voneinander geblockte Arbeitspakete

Die Phase wird NICHT als ein durchmischter Fix-Strom bearbeitet, sondern in fünf eigenständige
Pakete gegliedert, die jeweils einzeln abgeschlossen (eigene Commits, eigene Tests) werden, bevor
das nächste Paket begonnen wird — keine Überlappung/Verzahnung zwischen den Paketen.

- **Paket A — Story-Entfernung:** D-16. Kein Nutzer-Checkpoint nötig (0 Datensätze betroffen).
- **Paket B — Theme-Kürzel OUT:** D-01.
- **Paket C — F-05 `anime_contributions`:** D-02 (Code-Fix ohne Checkpoint) + D-23
  (Bestandsdaten-Bereinigung MIT blockierendem Checkpoint — getrennter Schritt).
- **Paket D — Rechte- und Sicherheitsfixes:** D-17 (5.3), D-18 (6.1/6.2), D-19 (8.4), D-21
  (Memorial-Guard-Merge, Kleinfund).
- **Paket E — restliche 174-Bugs + Kleinfunde:** D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10,
  D-11, D-12, D-20 (review_status_id Kleinfund).

Reihenfolge der Pakete: A → B → C → D → E (oder nach Planerermessen, solange jedes Paket
abgeschlossen ist, bevor das nächste beginnt — keine Vorgabe einer zwingenden A-E-Reihenfolge
durch den Nutzer, nur die Trennung selbst ist verbindlich).
</packages>

<decisions>
## Implementation Decisions

- **D-01 F-02 OUTRO-Label (Nutzer 2026-10-07, Paket B):** „Outro" bleibt ein eigener Theme-Typ (id
  9, aktuell 0 Segmente) mit Kürzel `OUT`. Das Kürzel wird nicht mehr per Namens-Raten
  (`includes('OP')` …) abgeleitet, sondern als festes Feld beim Typ in der Datenbank geführt
  (analog Phase 163/164 „Labels aus DB"): OP Kara → `OP`, ED Kara → `ED`, Insert Kara → `IN`,
  Outro → `OUT`. Die beiden Rate-Funktionen (`SegmenteTab.helpers.tsx`, `segmenteTabUtils.ts`)
  werden entfernt bzw. durch das DB-Kürzel ersetzt; der Test, der `Outro → PV` festschreibt, wird
  auf das fachlich richtige Verhalten umgestellt (bewusste Verhaltenskorrektur, kein Grünbiegen).
  Farben/Spuren (`getTypeColor`, `isUpperSpur`) ebenfalls vom Typ statt vom Namen ableiten, soweit
  dafür Daten vorhanden sind. `segmenteTabUtils.ts` ist laut `data/11-status-label-darstellung.md`
  totes Produktionscode (nur Test-Import, kein Produktions-Importeur) → vollständig entfernen.
- **D-02 F-05 doppelte Projekt-Einträge, Code-Fix (Nutzer: „Ursache finden", Paket C):** Ursache
  ermitteln, warum `anime_contributions` für Mitglied `timer` (Anime 1 / Gruppe 1) 9-fach mit
  gleichen Rollen existiert (Erzeugungsweg, fehlende Eindeutigkeit, Import/Backfill?). Ergebnis
  dokumentieren und die Ursache im Code/Schema beheben (z. B. Eindeutigkeit + idempotentes
  Anlegen). **Dieser Code-Fix läuft ohne Checkpoint.**
- **D-03 F-03 Umlaute (Paket E):** ASCII-Ersetzungen in User-Strings der Fansub-Anlegeseite (z. B.
  „Tag hinzugefuegt.") auf echte Umlaute; dabei repo-weit nach weiteren ASCII-Umlauten in
  User-Strings suchen und mitbeheben (CLAUDE.md-Sprachregel).
- **D-04 F-04 native Felder (Paket E):** 9 native `<input>/<select>` auf der Fansub-Anlegeseite
  durch `@/components/ui`-Primitives ersetzen; Aussehen per Live-Abnahme.
- **D-05 F-06 bekannte rote Tests (Paket E):** die 6 Frontend-Baseline-Fehler
  (cssCustomProperties-Guard ×2, PublicReleaseSurfacesShowcase, EpisodeImportEpisodeGroup ×2,
  mitwirkende/page „Vollständiges Memberprofil"), die tsc-Fehler in
  `ReleaseDetailHero.test.tsx`, den doppelten `description`-Key in `shared/contracts/openapi.yaml`
  (~Zeile 2205) beheben. Jeweils prüfen, ob Test oder Code falsch ist — Tests nicht nur „grün
  biegen".
- **D-06 F-14 Test-DB (Paket E):** Phase-107-Test-Fixture-Schema nachziehen (u. a.
  `user_group_capability_overrides`), damit die 8 RVM-Handler-Tests und die
  Review-Decision-Tests wieder echt laufen; Revisionsschutz für Nicht-Hochlader-Metadaten-Edits an
  Release-Medien prüfen und ggf. ergänzen.
- **D-07 F-19 Mobil-Speichern (Paket E):** sticky „Speichern" auf `/admin/fansubs/[id]/edit` darf
  auf ~375 px keine Felder verdecken; Live-Abnahme Mobil.
- **D-08 F-21 `getAdminTagTokens` (Paket E):** Semantik der zwei Fassungen klären, eine behalten,
  die andere entfernen, Aufrufer umstellen.
- **D-09 F-22 Quelltext-Tests (Paket E):** Tests mit `os.ReadFile`+`strings.Contains` auf
  Produktionsdateien durch Verhaltenstests ersetzen (mindestens die in F-22 genannten) — konsistent
  mit der repo-weiten Teststil-Regel in `CLAUDE.md`.
- **D-10 F-23 Display-Namensregel (Paket E):** `displayVariantFileName` und
  `rvmReplaceDisplayPath` auf eine Stelle zusammenführen.
- **D-11 F-24 wackeliger Test (Paket E):** `AnimeProjectNotesSection.test.tsx` deterministisch
  machen.
- **D-12 F-12 CSS-Spread-Muster (Paket E):** die 16 `{ ...shared, ...own }`-Stellen im
  Fansub-Edit auf das robuste Muster aus 174-23 umstellen.
- **D-13 Prüfkette:** nach jedem Fix betroffene Tests; am Ende volle Suiten vorher/nachher-Vergleich
  aus vollständiger Repo-Kopie, Prod-Build ohne Cache, Live-Abnahme der UI-Punkte. Ziel: die
  Baseline-Fehlerliste wird kürzer, nicht länger.
- **D-14 Git:** auf `main`, exakte Pfade, ein Commit je Fix. Kein `git stash` bei offenen
  Änderungen.
- **D-15 Globale UI-Regeln:** Jede berührte UI MUSS die globalen Primitives aus
  `@/components/ui` nutzen (Button, Select, FormField, Input, Textarea, …) — keine handgebauten
  nativen `<select>/<input>/<textarea>/<button>` (siehe CLAUDE.md „Frontend-UI"). Deutscher
  UI-Text verwendet immer echte Umlaute (ä/ö/ü/ß), keine ASCII-Ersetzungen (siehe CLAUDE.md
  „Sprachqualität").
- **D-16 Member-Group-Story-Entfernung (Nutzer-Entscheidung 1 aus `175-USER-DECISIONS.md`, Paket
  A, Fachaufgabe 6 Cluster 3):** Die Mitglieder-Gruppen-Geschichte ist keine fehlende UI, sondern
  eine abgelöste Altlast — die Geschichte der Gruppe wird bereits auf der
  Fansub-Bearbeiten-Seite („Gruppengeschichte") gepflegt; die persönliche Geschichte bleibt im
  Profil (`members.member_story_*`) unverändert bestehen. Vollständig zu entfernen: Tabelle
  `member_group_stories` (Migration 0062/0068, 0 Datensätze), die 5 Admin-Endpunkte
  `/admin/fansubs/:id/member-stories*`, der Handler `admin_content_member_stories.go`, sowie die
  ungenutzten Frontend-API-Funktionen in `history.ts`/`fansubs-members.ts` (0 Frontend-Konsumenten,
  bestätigt). **Kein Nutzer-Checkpoint nötig** — 0 Datensätze betroffen, Entfernung ist bestätigt
  sicher. Permission-Matrix-Zeile 6.4 (Member-Group-Story inkonsistentes Rechte-Modell) wird durch
  diese Entfernung gegenstandslos — keine eigene Rechte-Fix-Arbeit nötig, nur Löschung.
- **D-17 Permission-Matrix-Zeile 5.3 — Claim-Invite-Accept ohne `disabled`-Check (Paket D,
  Sicherheitsbefund aus Phase 175):** `AcceptClaimInvitation`
  (`member_claim_invitations_handler.go:144`) erhält denselben `disabled`-Status-Check wie
  `AcceptFansubInvitation` (Zeile 5.2) — `AcceptFansubInvitation` ist das Vorbild für den Fix.
- **D-18 Permission-Matrix-Zeilen 6.1/6.2 — Notizen-Tab-Gate/Buttons (Paket D):** Das
  Notizen-Tab-Gate (`fansubEditAccess.ts:46`, ODER-Verknüpfung weiter als Durchsetzung) und die
  Button-Ebene (`NotesTab.tsx:66-94`, fehlendes `foundingOnly`-Pendant) erhalten entweder ein
  `foundingOnly`-Pendant (analog `GroupHistorySection`s `foundingOnly`-Flag als Vorbild) oder die
  Durchsetzung wird um `ActionFansubGroupPageFoundingHistoryEdit` erweitert — Entscheidung über den
  konkreten Fix-Ansatz obliegt der Umsetzung dieser Phase. Beide Ebenen des Notizen-Tabs werden
  zusammen in einem Arbeitsschritt behoben.
- **D-19 Permission-Matrix-Zeile 8.4 — Legacy-Mitglied-Löschen (Paket D):** Der Orphan-Endpunkt
  `DELETE /fansubs/:id/members/:memberId` (`fansub_group_members.go`, 0 Frontend-Aufrufer
  außerhalb von Tests) wird vollständig entfernt (reine Dead-Code-Entfernung, keine
  Rechte-Konsistenz-Frage).
- **D-20 Kleinfund — tote Spalte `anime_contributions.review_status_id` (Paket E):** Seit
  Migration 0097 faktisch tot (wird nur kopiert, nie für Review-Entscheidungen gelesen/
  geschrieben, Fachaufgabe 4 Nebenbefund) — prüfen und entfernen.
- **D-21 Kleinfund — doppelter Memorial-Guard (Paket D):** Der wortgleiche Fehlercode
  `memorial_not_claimable` ist in zwei unabhängigen Repositories dupliziert
  (`member_claims_submit_repository.go:48-69` vs.
  `member_claim_invitations_repository.go:187-215`, Fachaufgabe 5 Befund 4) — auf eine Stelle
  zusammenführen.
- **D-22 Ausführungsregeln (verbindlich für alle Pakete):** Tests prüfen die Logik hinter dem
  Button (echte Verhaltens-/Handler-Assertions), keine reinen Render- oder
  Klick-Simulationstests ohne Prüfung eines tatsächlichen Effekts; UI-Punkte werden per Live-UAT
  abgenommen, nicht nur per Build/Typecheck; jede geänderte/neue Produktionsdatei bleibt unter der
  450-Zeilen-Grenze aus CLAUDE.md; ein Commit je Fix auf `main` mit exakten Pfaden (siehe D-14);
  kein `git stash` bei offenen Änderungen.
- **D-23 F-05 Bestandsdaten-Bereinigung (Nutzer-Entscheidung 3 aus `175-USER-DECISIONS.md` +
  Nutzer-Bestätigung Punkt 2, Paket C):** Die Bereinigung der bereits entstandenen fehlerhaften
  Bestandsdaten (bestehende doppelte `anime_contributions`-Zeilen) erfordert einen **expliziten
  blockierenden Nutzer-Checkpoint** vor der Ausführung (Freigabe nach Backup) — getrennt vom
  Code-Fix in D-02, da Code-Fix und Datenbereinigung unterschiedlichen Freigabe-Bedarf haben. Die
  Story-Entfernung (D-16) läuft dagegen ohne Checkpoint (0 Datenzeilen betroffen, bestätigt sicher
  — Nutzer-Bestätigung Punkt 2).

### Interne Paket-Reihenfolge (verbindlich getrennt, kein Überlappen)
Siehe `<packages>`-Block oben für die vollständige A–E-Zuordnung der D-01 bis D-23.

### Nicht in dieser Phase
- F-01, F-13, F-15, F-16, F-18, F-20 (größere Umbauten → eigene Folgephasen 177-183 gemäß
  `175-ROADMAP-PROPOSAL.md`)
- F-07/F-08/F-09/F-10/F-11/F-17 (Wartbarkeit, README, Inventur)
- Permission-Matrix-Zeilen 1.2/1.4/1.6 (Media-Upload-Rechte) → Phase 179 (Media-Backend/Rechte),
  NICHT Phase 176 — sie gehören zur F-15-Zusammenführung, nicht zur Bugfix-Sammelphase.
- **`ClaimManagementPanel.tsx`-Entscheidung:** absichtlich nicht gemountete
  Parallel-Implementierung zu einer aktiven Komponente (`135-RESEARCH.md` Open Question 2) — die
  Entscheidung über endgültige Entfernung oder Aktivierung bleibt bewusst offen und ist NICHT Teil
  dieser Phase (zu unklar für einen automatischen Bugfix, kein eigener Phasenvorschlag in
  `175-ROADMAP-PROPOSAL.md`).
- **Label-Gruppen 2+3 aus Fachaufgabe 11:** Gruppenmedien-Kategorie-Label
  (`old_website`/`irc_chat`-Textabweichungen) und Claim-Status-Label (`'verified'` →
  „Verifiziert" vs. „Genehmigt") benötigen laut Inventur eine Produktentscheidung, welcher Text
  korrekt ist, BEVOR ein Merge stattfinden kann — bewusst NICHT in dieser Phase, auch nicht in
  Phase 183 (die nur die bereits byte-identischen Gruppen 4/5 abdeckt).
</decisions>
