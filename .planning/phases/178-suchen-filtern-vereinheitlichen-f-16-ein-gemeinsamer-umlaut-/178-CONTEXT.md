# Phase 178: Suchen & Filtern vereinheitlichen (F-16) — Context

**Stand:** 2026-10-10, Entwurf.
**Quelle:** `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/175-ROADMAP-PROPOSAL.md`
(Abschnitt „Phase 178: Suchen & Filtern vereinheitlichen (F-16)" + Übersichtstabelle);
`.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/175-INVENTORY.md`
Fachaufgabe 7 „Suchen & Filtern"; `backend/internal/repository/search_anime.go` und
`database/migrations/0140_search_foundation.up.sql` (Faktencheck Umlaut-/Akzent-Toleranz der
globalen Suche, nur gelesen).

<domain>
## Phase Boundary

Ein gemeinsamer, umlaut-toleranter Filter-Helfer ersetzt die sechs unabhängig gebauten
`toLowerCase().includes()`-Filter aus Fachaufgabe 7 (`175-INVENTORY.md`), die laut Inventur 0/6
umlaut-tolerant sind und nur 2/6 über die `Input`-Primitive laufen. Die globale Suchbibliothek
(`/suche`, Fund #0 in der Inventur-Tabelle) ist eigene, bereits gehärtete Infrastruktur und bleibt
**unverändert** — sie liefert nur das Vorbild für die Normalisierungslogik.

**Umfang (Fachaufgabe 7, Filter #1–#6):**
- **#1 `AdminGroupsClient.tsx`** (`:343,352-356`) — Name/Slug-Filter, nutzt bereits die `Input`-
  Primitive, `getFansubList({per_page:500})` Pseudo-Vollabruf.
- **#2 `admin/fansubs/page.tsx`** (`:90,142,159-165`) — Name/Slug/Alias-Filter, nativer `<input>`
  (UI-Primitive-Verstoß), `getFansubList({per_page:500})` Pseudo-Vollabruf.
- **#3 `admin/fansubs/merge/page.tsx`** (`:46,81-113`) — Name/Slug-Filter **plus eigenes Scoring**
  (`:90-91,98-99`), nativer `<input>` (UI-Primitive-Verstoß), `getFansubList({per_page:500})`
  Pseudo-Vollabruf. Das Scoring ist fachlich bewahrenswert (Merge-Kandidaten-Rangfolge) und wird
  **nicht** durch den Filter-Helfer ersetzt, sondern bleibt als eigener Schritt nach dem
  gemeinsamen Filtern bestehen (siehe D-04).
- **#4 `GroupMediaReviewFilterBar.tsx`** (→ `GroupMediaReviewSection.tsx`, `:167-168,196-211,
  207-208`) — reichhaltigste 4-Felder-Suche im Cluster, nutzt bereits die `Input`-Primitive,
  einmaliger Voll-Abruf der (natürlich begrenzten, nicht paginierten) Gruppen-Medienliste — **kein**
  `per_page:500`-Pseudo-Vollabruf-Muster, da die Datenmenge strukturell klein ist.
- **#5 `useAnimePatchImpl.ts`** (Genre/Tag-Autocomplete, Edit-Flow, `:153,158,165,170,175,180,
  187,192`) — 4 strukturell identische Filterblöcke, nativer `<input>` in
  `AnimeEditGenreSection.tsx:93` (UI-Primitive-Verstoß), filtert über vollständig vorab geladene
  Genre-/Tag-Kataloge (kein Backend-Suchbezug möglich/nötig).
- **#6 `useAdminAnimeCreateControllerImpl.ts`** (Genre/Tag-Autocomplete, Create-Flow, `:403,408,
  415,420,425,430,437,442`) — strukturell **identische 1:1-Kopie** von #5, dieselbe Komponente.

**Explizit außerhalb des Umfangs:** Die globale Suchbibliothek (`/suche`, `SearchField.tsx`,
`SearchResults.tsx`, `SearchFilters.tsx`, `search.go`) — eigene, bereits F-unaccent/pg_trgm-
gehärtete Infrastruktur, legitim getrennt laut Inventur. `projectPageData.ts` gehört **nicht** zu
dieser Fachaufgabe (einziger `includes()`-Treffer dort ist eine Bildauswahl-Heuristik, keine
Nutzer-Sucheingabe — Korrektur gegenüber der ursprünglichen F-16-Annahme von 7 statt 6
Einzel-Filtern).

**Risiko: Niedrig bis mittel** — interne Admin-Filterung ohne Datenmutation, keine Rechte-
Beteiligung (siehe D-05); einziges Sorgfalts-Erfordernis ist die Bewahrung des Merge-Scorings
(#3) beim Zusammenführen auf den gemeinsamen Helfer.

**Aufwandsklasse: Mittel** — 6 Implementierungen, aber strukturell einfache Filterlogik; #5/#6
sind bereits eine 1:1-Kopie und damit der einfachste Merge-Fall.

**Vorbild/Altlast:** `GroupMediaReviewFilterBar.tsx` (#4, reichhaltigste Mehrfeld-Suche, nutzt
bereits die `Input`-Primitive) und `AdminGroupsClient.tsx` (#1, nutzt bereits die `Input`-
Primitive) sind die Vorbild-Kandidaten für die UI-Schicht. Die Normalisierungslogik der globalen
Suchbibliothek (`search_anime.go`) ist das Vorbild für die Filterlogik des neuen Helfers (siehe
Faktencheck unten). Zu entfernen: die Filterlogik in allen 6 genannten Dateien, ersetzt durch
Aufrufe des gemeinsamen Helfers; die strukturell identische Kopie in
`useAdminAnimeCreateControllerImpl.ts` entfällt vollständig zugunsten eines gemeinsamen
Autocomplete-Bausteins mit `useAnimePatchImpl.ts` (welche der beiden Dateien die kanonische Basis
wird, ist offen — siehe Offene Frage 5).
</domain>

<facts>
## Faktencheck: Umlaut-/Akzent-Toleranz der globalen Suche (verifiziert am Code, 2026-10-10)

Geprüft: `backend/internal/repository/search_anime.go` und
`database/migrations/0140_search_foundation.up.sql`.

- Die globale Suche ist **akzent-/diakritik-tolerant**: `f_unaccent()` (IMMUTABLE-Wrapper um
  PostgreSQLs `unaccent`-Extension mit explizitem `'unaccent'`-Dictionary, definiert in
  `0140_search_foundation.up.sql:19-27`) wird mit `pg_trgm`-Ähnlichkeitsvergleich (`%%`-Operator,
  Schwelle 0.30, `search_anime.go:17`) sowie in `tsvector`/`plainto_tsquery`-Rängen kombiniert
  (`search_anime.go:45,52,55,59,123-129,156-166`).
- **Tatsächliches Verhalten von `unaccent`:** Es entfernt Diakritika von der Buchstaben-Basis —
  `ä`→`a`, `ö`→`o`, `ü`→`u` (das Standard-`unaccent.rules`-Dictionary bildet Umlaute auf den
  nackten Basisbuchstaben ab, **nicht** auf ein Digraph). `ß` ist **kein** Akzent-Zeichen und wird
  vom `unaccent`-Dictionary **nicht** auf `ss` abgebildet — es bleibt `ß`.
- **Konsequenz für „ae" = „ä":** Die globale Suche behandelt „ae" **nicht** als Treffer für „ä" im
  strengen Sinn (da `f_unaccent('ä')` zu `'a'` wird, nicht zu `'ae'`). Ein Nutzer, der „ae" statt
  „ä" eintippt, bekommt nur dann einen Treffer, wenn die `pg_trgm`-Ähnlichkeit (Schwelle 0.30)
  trotz des fehlenden Buchstabens noch ausreicht — das ist ein Nebeneffekt der Trigram-Fuzzy-Suche,
  keine bewusste „ae=ä"-Digraph-Regel. Gleiches gilt für „oe"/„ue"/„ss" als Pendants zu „ö"/„ü"/„ß".
- **Bedeutung für diesen Phasenumfang:** „Umlaut-tolerant" im Sinne der globalen Suche heißt
  konkret: Akzent-/Umlaut-Normalisierung auf Basisbuchstaben (`ä`≈`a`, `ö`≈`o`, `ü`≈`u`) plus
  Fuzzy-Ähnlichkeit — **nicht** automatisch eine explizite ASCII-Digraph-Ersetzung (`ae`/`oe`/`ue`/
  `ss`). Ob der neue Frontend-Helfer über das Vorbild der globalen Suche hinausgeht und zusätzlich
  Digraphe explizit abbildet, ist eine offene Entscheidung (siehe Offene Frage 1) — es ist **kein**
  bereits bestehendes Verhalten, das einfach übernommen werden könnte.
</facts>

<decisions>
## Implementation Decisions

- **D-01:** Umfang — Fachaufgabe 7, Filter #1–#6 (`AdminGroupsClient.tsx`,
  `admin/fansubs/page.tsx`, `admin/fansubs/merge/page.tsx`, `GroupMediaReviewFilterBar.tsx`,
  Genre/Tag-Autocomplete in `useAnimePatchImpl.ts` und `useAdminAnimeCreateControllerImpl.ts`).
  Die globale Suchbibliothek (`/suche`, Fund #0) bleibt unverändert bestehen — eigene,
  bereits gehärtete Infrastruktur, legitim getrennt.
- **D-02:** Vorbild UI-Schicht — `GroupMediaReviewFilterBar.tsx` (#4, reichhaltigste
  Mehrfeld-Suche) und `AdminGroupsClient.tsx` (#1) sind die Vorbild-Kandidaten für die
  `Input`-Primitive-Anbindung; die noch nativen `<input>`-Felder in #2/#3/#5/#6 werden auf die
  `Input`-Primitive umgestellt.
- **D-03:** Vorbild Filterlogik — die Normalisierungslogik der globalen Suchbibliothek
  (`search_anime.go`, `f_unaccent`-Prinzip) ist das fachliche Vorbild für den neuen,
  wiederverwendeten gemeinsamen Filter-Helfer; der genaue Normalisierungsumfang (Digraphe ja/nein)
  ist über Offene Frage 1 zu klären, siehe Faktencheck oben.
- **D-04:** Scoring-Erhalt (`admin/fansubs/merge/page.tsx`, #3) — die eigene Scoring-/
  Rangfolge-Logik der Merge-Seite (`:90-91,98-99`) wird **nicht** durch den gemeinsamen
  Filter-Helfer ersetzt. Der Helfer liefert nur die Treffer-Prüfung (boolescher
  Match/Kein-Match); das Scoring bleibt ein eigener, nachgeschalteter Sortierschritt auf der
  Merge-Seite, der auf den vom Helfer gelieferten Treffern aufbaut.
- **D-05:** Rechte-Zuordnung — keine Permission-Matrix-Abweichung betrifft diese Fachaufgabe
  (laut `175-INVENTORY.md` Fachaufgabe 7 durchgängig `(d) Rechte: n/a`, bestätigter
  Negativbefund).
- **D-06:** Doppelte Autocomplete-Implementierung (#5/#6) — `useAdminAnimeCreateControllerImpl.ts`s
  strukturell identische Kopie der Genre/Tag-Filterblöcke aus `useAnimePatchImpl.ts` wird
  vollständig entfernt und durch einen gemeinsamen Autocomplete-Baustein ersetzt, der von beiden
  Flows (Edit und Create) genutzt wird. Welche der beiden Dateien die kanonische Basis für diesen
  Baustein liefert, ist offen (siehe Offene Frage 5).
- **D-07 (Projektregel):** Globale UI-Primitives aus `@/components/ui` sind Pflicht. Alle
  Sucheingabefelder (aktuell 4 native `<input>`-Stellen in #2/#3/#5/#6) laufen über die
  `Input`-Primitive, nicht über handgebautes Markup.
- **D-08 (Projektregel):** Globale Design-Tokens statt lokaler Hex-/Pixel-Werte für jede neue oder
  angepasste Filter-UI-Fläche.
- **D-09 (Projektregel):** Echte Umlaute (ä, ö, ü, Ä, Ö, Ü, ß) in jedem user-facing String
  (Platzhalter der Sucheingabefelder, Fehlermeldungen, aria-labels) — keine ASCII-Ersetzungen.
- **D-10 (Projektregel):** Tests prüfen die Logik hinter dem Button — der Filter-Helfer ist eine
  reine Funktion (Eingabe: Suchtext + Datensatz/Feldliste, Ausgabe: Treffer/Kein-Treffer bzw.
  gefilterte Liste) und wird direkt als Funktion getestet, nicht über Render-/Klick-
  Simulationstests der umgebenden Komponenten und nicht über Quelltext-Grep-Tests (vgl.
  Teststil-Regel in `CLAUDE.md`).
- **D-11 (Projektregel):** UI-Abnahme erfolgt per Live-UAT (echter Browser-Durchlauf über die
  konfigurierte Tunnel-Adresse), nicht nur über Typcheck/Testsuite.
- **D-12 (Projektregel):** 450-Zeilen-Limit pro Produktionscode-Datei gilt auch für den neuen
  gemeinsamen Filter-Helfer und den gemeinsamen Autocomplete-Baustein — bei Bedarf in mehrere
  Dateien aufteilen.
- **D-13 (Projektregel):** Ein Commit je Änderung auf `main` (kein Sammel-Commit über mehrere
  fachlich getrennte Schritte); kein `git stash` bei offenen Änderungen.
- **D-14 (Projektregel):** Keine doppelten Oberflächen/Implementierungen — die durch den
  gemeinsamen Helfer abgelöste Filterlogik wird in allen 6 Dateien vollständig entfernt, kein
  Nebeneinander von alter und neuer Filterlogik über das Ende der Phase hinaus.
</decisions>

<open_questions>
## Offene Fragen an den Nutzer

Die folgenden Fragen werden **nicht** in diesem Kontext-Entwurf entschieden, sondern sammeln
Optionen + Empfehlung für eine Nutzerentscheidung vor der Planung.

1. **Sollen „ae/oe/ue/ss" als Treffer für „ä/ö/ü/ß" zählen?** Laut Faktencheck oben tut die
   globale Suche das heute **nicht** als bewusste Regel (nur Akzent-Strip auf Basisbuchstaben +
   Trigram-Fuzzy als Nebeneffekt).
   - **Option A:** Nein — der neue Helfer repliziert exakt das Verhalten der globalen Suche
     (Akzent-Strip `ä`→`a`/`ö`→`o`/`ü`→`u`, `ß` bleibt `ß`, keine Digraph-Expansion). Vorteil:
     konsistentes Suchverhalten zwischen `/suche` und den Admin-Filtern, kein neuer
     Sonderfall-Code.
   - **Option B:** Ja — zusätzlich zur Akzent-Normalisierung bildet der Helfer `ae`→`ä`,
     `oe`→`ö`, `ue`→`ü`, `ss`→`ß` (und umgekehrt) explizit ab. Vorteil: deckt die verbreitete
     deutsche Tastatur-Ersatzschreibweise ab, die die globale Suche heute nur zufällig (Trigram-
     Schwelle) trifft.
   - **Empfehlung:** Option A (Konsistenz mit dem explizit genannten Vorbild „globale
     Suchbibliothek"), außer der Nutzer legt für die Admin-Filter bewusst eine großzügigere
     Regel fest.

2. **Sollen die größten Listen (Fansub-Liste #1, Merge #3, Gruppen — Anm.: Gruppen ist
   `AdminGroupsClient.tsx` = #1 selbst; `admin/fansubs/page.tsx` #2 und Merge #3 sind die beiden
   `per_page:500`-Pseudo-Vollabruf-Fälle) auf die Backend-Suchbibliothek umgestellt werden, oder
   bleiben sie clientseitig (nur der Filter-Helfer wird vereinheitlicht, der
   `per_page:500`-Vollabruf bleibt bestehen)?**
   - **Option A:** Migration auf serverseitige Suche für #1/#2/#3 — löst das
     Pseudo-Vollabruf-Muster auf, bringt echte Server-Paginierung.
   - **Option B:** Vorerst clientseitig bleiben, nur den Filter-Helfer vereinheitlichen; Migration
     auf Backend-Suche als separate Folgephase.
   - **Empfehlung:** Keine — abhängig vom tatsächlichen Datenvolumen (Anzahl Fansub-Gruppen) und
     davon, ob `GetFansubList` eine suchfähige Backend-Route ohne Scoring-Verlust für #3 anbietet;
     das sollte im Planungsschritt (`/gsd:plan-phase`) technisch geprüft werden, bevor eine
     Empfehlung sinnvoll ist. Die Roadmap-Vorlage selbst formuliert das als Prüfauftrag
     („sofern das Pseudo-Vollabruf-Muster dadurch entfällt"), nicht als feste Vorgabe.

3. **Treffer-Hervorhebung (visuelles Highlighting des gefundenen Textausschnitts) — ja oder
   nein?** Keine der 6 bestehenden Implementierungen hat das heute.
   - **Option A:** Ja — Hervorhebung ergänzen (neues UI-Merkmal, zusätzlicher Aufwand).
   - **Option B:** Nein — nur Filterung wie bisher, kein visuelles Highlighting.
   - **Empfehlung:** Option B — kein Merkmalszuwachs ohne expliziten Auftrag, hält den
     Phasenumfang auf die Vereinheitlichung beschränkt (passt zur „mittel"-Aufwandsklasse der
     Roadmap-Vorlage).

4. **Durchsucht der Fansub-Filter auch Aliase/Kürzel einheitlich über alle drei
   fansub-bezogenen Filter (#1/#2/#3)?** Laut Inventur sucht heute nur #2
   (`admin/fansubs/page.tsx`) zusätzlich über Aliase; #1 (`AdminGroupsClient.tsx`) und #3
   (`admin/fansubs/merge/page.tsx`) filtern nur über Name/Slug.
   - **Option A:** Ja — Alias-Suche wird auf #1 und #3 erweitert, alle drei Filter verhalten sich
     einheitlich (Merkmalszuwachs für #1/#3).
   - **Option B:** Nein — nur #2 behält die Alias-Suche, #1/#3 bleiben bei Name/Slug (kein
     Merkmalszuwachs, nur Vereinheitlichung der bestehenden Unterschiede über den gemeinsamen
     Helfer).
   - **Empfehlung:** Option B für den Kern-Scope dieser Phase (konsistent mit der
     „mittel"-Aufwandsklasse); Option A als mögliche Erweiterung, falls der Nutzer die
     Alias-Suche für wichtig genug hält, um sie explizit zu beauftragen.

5. **Welche der beiden strukturell identischen Dateien (`useAnimePatchImpl.ts` vs.
   `useAdminAnimeCreateControllerImpl.ts`) liefert die kanonische Basis für den gemeinsamen
   Genre/Tag-Autocomplete-Baustein (#5/#6)?** Die Roadmap-Vorlage lässt das ausdrücklich offen
   („je nach gewähltem Vorbild").
   - **Option A:** `useAnimePatchImpl.ts` (Edit-Flow) wird Basis, `useAdminAnimeCreateControllerImpl.ts`
     (Create-Flow) entfällt zugunsten eines gemeinsamen Hooks/Bausteins.
   - **Option B:** `useAdminAnimeCreateControllerImpl.ts` (Create-Flow) wird Basis,
     `useAnimePatchImpl.ts` entfällt entsprechend.
   - **Empfehlung:** Option A — der Edit-Flow ist der länger etablierte, breiter genutzte Pfad;
     ohne tieferen Code-Vergleich im Planungsschritt ist das aber eine schwache Empfehlung, keine
     feste Vorgabe.
</open_questions>

<references>
## Referenzen

- `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/175-ROADMAP-PROPOSAL.md`
  — Abschnitt „Phase 178: Suchen & Filtern vereinheitlichen (F-16)" (Zeilen 146–184) und
  Übersichtstabelle (Zeile 31).
- `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/175-INVENTORY.md`
  — Fachaufgabe 7 „Suchen & Filtern" (Zeilen 139–155).
- `backend/internal/repository/search_anime.go`, `database/migrations/0140_search_foundation.up.sql`
  — Faktencheck Umlaut-/Akzent-Toleranz der globalen Suche (nur gelesen).
- Phase 177 (`177-CONTEXT.md`) — Formatvorbild für D-NN und Offene-Fragen-Struktur.
- Phase 177 (Vorgänger-Phase in der Nummerierung) — keine harte fachliche Abhängigkeit, Phase 178
  hängt laut `phase.add` und Roadmap-Vorlage von Phase 177 ab (sequenzielle Reihenfolge der
  175-ROADMAP-PROPOSAL.md-Phasenkette 176→177→178→179...), nicht von dessen Viewer-Umfang selbst.
</references>
