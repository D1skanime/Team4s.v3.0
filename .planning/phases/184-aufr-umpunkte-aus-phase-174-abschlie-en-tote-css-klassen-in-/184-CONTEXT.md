# Phase 184: Aufräumpunkte aus Phase 174 abschließen (F-07, F-12, F-20, F-23) — CONTEXT

## Ziel

Vier aus Phase 174 übernommene Wartbarkeits-Altlasten endgültig schließen — ohne sichtbare
Änderung für Nutzer:innen (D-01 von 174 gilt sinngemäß weiter):

- **F-20:** Toten CSS-Code aus `FansubEdit.module.css` entfernen.
- **F-07:** Doppelte `formatDate`-Implementierungen und die doppelte Pagination-Fensterberechnung
  auf je eine gemeinsame Implementierung zusammenführen.
- **F-12:** Den latenten Laufzeitfehler im Spread-Merge-Muster `{ ...sharedStyles, ...ownStyles }`
  für CSS-Module überall beheben (nicht nur in den 16 bereits gefixten Dateien).
- **F-23:** Die `original.<ext>`→`display.<ext>`-Regel vollständig an einer Stelle halten (den
  bereits konsolidierten Kern bestätigen, die verbliebenen Literal-Duplikate im Upload-Pfad auf
  den Helfer umstellen).

## Nutzerentscheidungen (final, verbindlich)

- **D-01 (F-12):** EIN gemeinsamer Helfer für den CSS-Modul-Merge (z. B.
  `frontend/src/lib/mergeCssModules.ts`, Proxy-basiert wie die 174-23/176-Reparatur:
  `mergeCssModules(own, shared)` → `new Proxy({}, { get: (_, p) => own[p] ?? shared[p] })`). Alle
  22 noch fehlerhaften Stellen UND die 16 bereits reparierten Kopien (inline-Proxy) werden darauf
  umgestellt — danach existiert die Merge-Logik nur noch an einer Stelle (38 Dateien insgesamt).
  Logik-Test des Helfers: Vorrang eigener Klassen vor geteilten, Fallback auf geteilte wenn eigene
  fehlt, unbekannte Keys liefern `undefined` (kein Fehler).
- **D-02 (F-07):** `formatDate` → ZWEI zentrale Helfer, je Verhaltens-Gruppe einer (identische
  Ausgabe wie heute, inkl. unterschiedlichem Fallback-Verhalten bei leeren/kaputten Daten
  zwischen Cluster A und Cluster B — siehe Ist-Zustand). Alle 7 Kopien (4× Cluster A + 3× Cluster
  B) werden auf die zwei Helfer umgestellt. Pagination-Fensterberechnung → ein gemeinsamer Helfer
  (`computePageWindow`) für beide Pagination-Komponenten. Logik-Tests für alle Fälle (gültiges
  Datum, leerer String, Grenzwerte der Pagination).
- **D-03 (F-20):** Nur unbenutzte Klassen aus `FansubEdit.module.css` löschen; die verbliebenen
  Einzel-Nutzer-Klassen werden NICHT in die Module ihrer Komponenten verschoben. Vor dem Löschen
  muss die Nutzungsprüfung belegt werden — dabei auch dynamische Klassennamen-Zugriffe
  (`styles[variable]`, Template-Strings, zusammengesetzte Keys) berücksichtigen, nicht nur
  `styles.literalName`. Visuelle Absicherung: Vorher/Nachher-Screenshots aller Tabs von
  `/admin/fansubs/1/edit` und `/admin/fansubs/create`, je Desktop und ~375px, per Playwright im
  Frontend-Container (`frontend/scripts/shot.mjs`; vor dem Lauf `docker restart
  team4sv30-frontend` gegen Zombie-Chromium-Prozesse), pixelweise verglichen — jede Abweichung
  zählt als Fehler und muss vor Abschluss geklärt sein.
- **D-04 (F-23):** Kernpunkt (zwei Implementierungen → eine) ist bereits erledigt, keine weitere
  Aktion dafür nötig. Die 4 Literal-Duplikate im Upload-Pfad
  (`admin_content_release_version_media_upload_process.go:110,284`,
  `media_upload_image.go:202,303`) werden auf `services.DisplayVariantFileName(...)` umgestellt,
  sofern risikoarm (Upload-Pfad geht immer von einem frischen `original.<ext>` aus, Helfer liefert
  denselben Literalwert zurück) — andernfalls wird das begründet weggelassen.
- **D-05 (Datei-Längen-Regel):** Keine sichtbare Änderung in der gesamten Phase. CLAUDE.md-Regel
  „Übergroße Dateien beim Anfassen aufteilen" gilt: Jede durch D-01/D-02/D-04 inhaltlich berührte
  Produktionsdatei über 450 Zeilen wird im selben Plan zuerst per reinem Umbau-Commit (ohne
  Verhaltensänderung, Tests/typecheck grün) aufgeteilt, danach erst inhaltlich geändert — als
  zweiter, separater Commit. Nur tatsächlich berührte Dateien, keine Nachbardateien.

**Datei-Längen-Inventur (Stand 2026-10-15, per `wc -l` über alle durch D-01/D-02/D-04 betroffenen
Dateien) — diese 5 Dateien liegen über 450 Zeilen und werden durch F-12 inhaltlich angefasst
(Spread-Merge → Helferaufruf), müssen also vor der Änderung aufgeteilt werden:**

| Datei | Zeilen | Betroffen durch |
|---|---|---|
| `frontend/src/app/admin/fansubs/merge/page.tsx` | 954 | F-12 |
| `frontend/src/app/admin/fansubs/page.tsx` | 760 | F-12 |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.tsx` | 743 | F-12 |
| `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx` | 657 | F-12 |
| `frontend/src/app/admin/episodes/page.tsx` | 637 | F-12 |

Alle übrigen durch F-07/F-12/F-23 berührten Dateien liegen unter 450 Zeilen (größte: `admin/fansubs/create/page.tsx` 426, `admin/anime/components/EpisodeManager/EpisodeManager.tsx` 367, `admin_content_release_version_media_upload_process.go` 296, `media_upload_image.go` 364) — keine weiteren Aufteilungen nötig. F-20 berührt nur die CSS-Datei selbst (3.306 Zeilen, keine Produktionscode-Datei im Sinn der Zeilenregel) und keine der konsumierenden `.tsx`-Dateien inhaltlich (D-03: nur Löschen in der CSS-Datei, kein Verschieben, keine Komponentenänderung).

## Ist-Zustand (neu verifiziert am Code vom 2026-10-15, per grep/Read — keine Schätzungen)

Seit Phase 174 liefen die Phasen 175–183. Zwei der vier Punkte haben sich dadurch bereits
**teilweise** oder **vollständig** erledigt — die ursprüngliche 174-FOLLOWUPS.md-Beschreibung ist
für F-12 und F-23 nicht mehr aktuell.

### F-20 — Tote CSS-Klassen in FansubEdit.module.css: **vollständig offen, Zahlen im Kern unverändert**

| Kennzahl | 174-Audit (174-REPORT.md) | Heute (2026-10-15) |
|---|---|---|
| Zeilen | 3.379 | 3.306 |
| Top-Level-Klassenselektoren | 301 | 286 (per `grep -oP '^\.[a-zA-Z0-9_-]+(?=\s*[,{])'`, dedupliziert) |
| Tatsächlich im Code referenziert (`styles.X`/`fansubEditStyles.X`) | 81 (9 breit geteilt + 35 Paar + 37 Einzel) | ≈79 |
| Unreferenziert | ≈220 (73 %) | ≈206 (72 %) |

Methode (reproduziert): Alle Top-Level-Selektoren per Regex extrahiert (Pseudo-Klassen, Media-
Queries und Kombinator-Selektoren ausgeschlossen), dann für jeden Namen per grep über alle
Dateien geprüft, die `FansubEdit.module.css` importieren (25 Dateien heute, vorher 23 — zwei
zusätzliche Importeure durch spätere Komponentenaufteilung, keine inhaltliche Verschiebung der
Kernzahl). Die Datei wurde seit 174 nur durch Bugfixes/kleine Verschiebungen angefasst (u. a.
Phase 176), nicht durch eine Dead-Code-Bereinigung. **Ergebnis: F-20 ist unverändert zu 174 —
nichts wurde seither entfernt.**

Exakte Abweichung zur alten "48 kommen nirgends im Frontend vor"-Zahl: Eine Neuzählung mit einer
gröberen Textsuche (statt der 174-Methode, die auch Kombinator-Selektoren einzeln klassifizierte)
kommt auf eine andere Teilzahl; das Gesamtbild (≈72–73 % tot, echter Kern ≈80 Klassen) ist davon
unberührt und die relevante Zahl für die Umsetzung.

### F-07 — Doppelte formatDate + Pagination-Fensterberechnung: **vollständig offen, formatDate-Teil seit 174 gewachsen**

**Pagination** — unverändert zu 174, byte-identische Fensterlogik:

| Datei:Zeile | Code |
|---|---|
| `frontend/src/components/ui/Pagination.tsx:17-23` | `from = Math.max(1, currentPage-2)`, `to = Math.min(totalPages, currentPage+2)`, `for`-Schleife füllt `values[]`, in `useMemo` |
| `frontend/src/components/anime/Pagination.tsx:35-41` | identische drei Zeilen, füllt `pages[]`, ohne `useMemo` |

Kein extrahierter Helfer vorhanden (`grep -rn "computePageWindow\|pageWindow\|buildPageWindow" frontend/src` → 0 Treffer).

**formatDate/formatDateTime** — die 4 aus 174 bekannten byte-identischen Kopien existieren
unverändert (nur Zeilen leicht verschoben); zusätzlich sind durch Komponentenaufteilungen in
Phase 180 **drei neue, untereinander identische Kopien** entstanden, die 174 noch nicht kennen
konnte:

| Datei:Zeile | Körper | Cluster |
|---|---|---|
| `frontend/src/app/admin/users/tabs/UserClaimsTab.tsx:30` | try/catch, `toLocaleDateString('de-DE',{day,month,year})` | Cluster A (bekannt aus 174, 4 Kopien) |
| `frontend/src/app/admin/claims/ClaimsClient.tsx:57` | ″ | Cluster A |
| `frontend/src/components/contributions/ReviewQueue.tsx:30` | ″ | Cluster A |
| `frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.tsx:34` | ″ | Cluster A |
| `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewGrid.tsx:62` | `if(!value) return ''`, `Intl.DateTimeFormat('de-DE',{day,month,year})` | Cluster B (**neu seit 174**, entstanden bei der Aufteilung von `GroupMediaReviewSection.tsx` in Phase 180) |
| `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewDetailDrawer.tsx:52` | ″ | Cluster B |
| `frontend/src/app/admin/fansubs/[id]/edit/useGroupMediaReviewFilters.ts:33` | ″ | Cluster B |

Abweichend (bewusst NICHT zu mergen — andere Semantik, wie schon 174 festgestellt):
`ChangesClient.tsx:38` (date+time), `ProjectMemberNoteEntry.tsx:14` (anderes Fallback-Verhalten).
Weitere Einzel-Implementierungen existieren (`UserMediaTab.tsx:58`, `GroupMembersHistTable.tsx:34`
+ 2 Geschwister, `ReleaseTechnicalDetails.tsx:10`, `VersionRow.tsx:21`, 4× `formatDateTime`) —
diese sind älter als 174 und fachlich uneinheitlich genug (unterschiedliche Fallbacks, Formate),
dass sie **nicht** Teil des engen F-07-Scopes sind (siehe Abgrenzung).

### F-12 — Spread-Merge-Muster: **zu ≈41 % geschlossen (16 von 39 betroffenen Dateien)**

Phase 176 (176-14, Commits `41031c52`/`d6e99290`) hat die 16 in 174-FOLLOWUPS genannten Dateien im
Verzeichnis `admin/fansubs/[id]/edit/` bereits auf ein echtes Merge-Muster umgestellt — verifiziert
per `grep -rln "new Proxy" frontend/src/app/admin/fansubs/\[id\]/edit/*.tsx` (18 Treffer, davon 2
Testdateien, 16 Produktionsdateien):

```ts
const styles = new Proxy({} as Record<string, string>, {
  get: (_target, prop: string) =>
    fansubEditStyles[prop as keyof typeof fansubEditStyles] ?? sharedStyles[prop as keyof typeof sharedStyles],
})
```

Jede der 16 Dateien kopiert diesen Proxy-Code **inline, eigenständig** — es gibt noch **keinen
zentralen, wiederverwendbaren Helfer** dafür (`grep -rn "mergeStyles\|mergeModuleStyles" frontend/src`
findet nur eine lokale CSS-Modul-Import-Variable in `admin/fansubs/merge/page.tsx:15`, keinen
echten Helfer).

**Aber: das kaputte Spread-Muster (`{ ...sharedStyles, ...ownStyles }`, unter Vitest/jsdom liefert
das NICHTS, weil CSS-Modul-Mocks keine enumerable eigenen Keys haben) existiert heute an 22
weiteren Produktionsstellen**, die der 174-Scope nicht erfasst hat (verifiziert per grep, 1
zusätzlicher Treffer war ein Test-Datei-Kommentar und kein echter Code — ausgeschlossen):

| Cluster | Dateien (Anzahl) | Betroffene CSS-Module |
|---|---|---|
| `admin/fansubs/`-Umfeld (nutzt dasselbe `FansubEdit.module.css` wie die 16 gefixten Dateien) | `page.tsx`, `create/page.tsx`, `create/AdminFansubCreateAliasesSection.tsx`, `create/AdminFansubCreateBasicInfoSection.tsx`, `create/AdminFansubCreateMediaSection.tsx`, `create/AdminFansubCreateLinksSection.tsx`, `merge/page.tsx` (7) | `sharedStyles`+`fansubStyles`/`fansubEditStyles`/`mergeStyles` |
| `admin/anime/components/AnimeBrowser/` | `AnimeBrowserList.tsx`, `AnimeBrowserFilters.tsx`, `AnimeRow.tsx` (3) + `admin/episodes/page.tsx` (1) | `sharedStyles`+`browserStyles` |
| `admin/anime/components/AnimeContext/` | `AnimeContextCard.tsx`, `AnimeContextFansubManager.tsx`, `AnimeContextFansubs.tsx` (3) | `sharedStyles`+`contextStyles` |
| `admin/anime/components/EpisodeManager/` | `EpisodeBulkBar.tsx`, `EpisodeCreateForm.tsx`, `EpisodeEditForm.tsx` (3-fach-Merge), `EpisodeFilters.tsx`, `EpisodeInlineEdit.tsx`, `EpisodeManager.tsx`, `EpisodeRow.tsx`, `EpisodeTable.tsx` (8) | `sharedStyles`+`contextStyles`+`episodeStyles` |
| `admin/episode-versions/[versionId]/edit/` | `ReleaseVersionNotesTab.tsx` (1) | `localStyles`+`editorScaffoldStyles` |

**Ergebnis: F-12 ist nur für den ursprünglich 174-benannten Dateikreis erledigt, der tatsächliche
Flächenbrand ist mehr als doppelt so groß wie 174 angenommen hat.**

### F-23 — original→display-Regel: **vollständig erledigt, ein naheliegender Nachzieh-Punkt offen**

Phase 176 (176-13, Commits `4b41463e2`/`e509027f5`) hat `rvmReplaceDisplayPath` bereits in
`DisplayVariantFileName` zusammengeführt — verifiziert: `grep -rn "rvmReplaceDisplayPath" backend/internal`
→ 0 Treffer, die Datei `admin_content_release_version_media_replace_display.go` existiert nicht
mehr. Einzige verbliebene, jetzt exportierte Implementierung:

```go
// backend/internal/services/media_service_display_variant.go:108-115
func DisplayVariantFileName(originalPath string, ext string) string {
	base := filepath.Base(originalPath)
	stem := strings.TrimSuffix(base, filepath.Ext(base))
	if stem == "" || stem == "original" {
		return "display." + ext
	}
	return stem + "_display." + ext
}
```

Aufrufer heute: 5× intern in derselben Datei, 1× extern in
`backend/internal/handlers/admin_content_release_version_media_replace.go:269`. **F-23 im
wörtlichen Sinn (zwei Implementierungen → eine) ist bereits erledigt, nichts zu tun.**

**Nachzieh-Fund (nicht der ursprüngliche F-23-Wortlaut, aber derselbe Geist: eine Regel, eine
Stelle):** Der Upload-Pfad für Release-Medien hartcodiert denselben Trivialfall der Regel
(`"display."+ext`) textuell doppelt, statt den Helfer zu rufen:

| Datei:Zeile | Code |
|---|---|
| `backend/internal/handlers/admin_content_release_version_media_upload_process.go:110` | `displayPath := filepath.Join(assetDir, "display."+displayExt)` |
| `backend/internal/handlers/admin_content_release_version_media_upload_process.go:284` | `displayRelPath := strings.Join([]string{"release-version", versionIDStr, assetUUID, "display."+displayExt}, "/")` |
| `backend/internal/handlers/media_upload_image.go:202` | `displayPath := filepath.Join(storagePath, "display."+displayExt)` |
| `backend/internal/handlers/media_upload_image.go:303` | `displayFilename := "display."+encExt` |

## Vorschlag Umsetzung (gemäß D-01..D-05)

1. **F-23 zuerst (kleinstes Risiko, reiner Bonus, D-04):** Die 4 Literal-Stellen in
   `admin_content_release_version_media_upload_process.go` und `media_upload_image.go` auf
   `services.DisplayVariantFileName(originalPath, ext)` umstellen. Da der Upload-Pfad immer von
   einem frischen `original.<ext>` ausgeht, liefert der Helfer in diesen Fällen exakt
   `"display."+ext"` zurück — keine Verhaltensänderung, nur eine Stelle weniger. Keine der beiden
   Dateien liegt über 450 Zeilen (296 bzw. 364) — kein Split nötig.
2. **F-07 (D-02):**
   - Pagination: `computePageWindow(currentPage, totalPages): number[]` als reine Funktion
     extrahieren (z. B. in `frontend/src/components/ui/`), beide Pagination-Komponenten rufen sie
     auf.
   - formatDate: ZWEI Helfer bereitstellen — einer für Cluster A (ISO-String-Fallback bei
     Exception, deckt `UserClaimsTab.tsx`, `ClaimsClient.tsx`, `ReviewQueue.tsx`,
     `ContributionsReviewSection.tsx` ab), einer für Cluster B (Leerstring-Fallback bei
     leerem/falsy Wert, deckt `GroupMediaReviewGrid.tsx`, `GroupMediaReviewDetailDrawer.tsx`,
     `useGroupMediaReviewFilters.ts` ab). Beide Helfer liefern für gültige Daten identische
     Ausgabe wie heute, ihr unterschiedliches Fallback-Verhalten bleibt erhalten (keine
     Vereinheitlichung der Philosophie, nur Entduplizierung je Gruppe).
3. **F-12 (D-01):** `frontend/src/lib/mergeCssModules.ts` mit `mergeCssModules(own, shared)`
   (Proxy-basiert) anlegen, Logik-Test dafür schreiben. Danach ALLE 38 betroffenen Dateien (16
   bereits reparierte inline-Proxy-Kopien + 22 noch kaputte Spread-Stellen) auf den Helfer
   umstellen. Die 5 Dateien über 450 Zeilen (siehe Datei-Längen-Inventur oben) zuerst in einem
   reinen Umbau-Commit aufteilen, dann erst den Helferaufruf einsetzen.
4. **F-20 (D-03):** Nutzungsprüfung alle Top-Level-Klassen in `FansubEdit.module.css` gegen alle
   25 importierenden Dateien — sowohl `styles.literalName`/`fansubEditStyles.literalName` als auch
   dynamische Zugriffe (`styles[variable]`, berechnete Keys, Template-Strings) grep-geprüft.
   Danach nur die als unbenutzt belegten Klassen löschen (kein Verschieben, D-03). Vor und nach
   dem Löschen Playwright-Screenshots aller Tabs von `/admin/fansubs/1/edit` und
   `/admin/fansubs/create` (Desktop + ~375px) über `frontend/scripts/shot.mjs`
   (`docker restart team4sv30-frontend` vorher gegen Zombie-Chromium), pixelweiser Vergleich als
   Live-Checkpoint am Ende der Phase.

Reihenfolge nach Risiko: F-23 (fast risikofrei) → F-07 (Unit-testbar, kein Rendering-Risiko) →
F-12 (behebt einen echten, bisher nur in Tests sichtbaren Bug, inkl. nötiger Datei-Splits) → F-20
(einzige Änderung mit echtem visuellen Regressionsrisiko, daher der Live-Checkpoint am Ende).

## Risiken

- **F-20 (CSS-Löschung → visuelle Regression):** Haupt-Risiko der Phase. Absicherung:
  Vorher/Nachher-Screenshot-Vergleich aller Tabs von `/admin/fansubs/<id>/edit` (wie in 174-24
  bereits für denselben Ordner praktiziert) vor UND nach dem Entfernen, plus laufende Dev-
  Session-Prüfung auf Konsolenfehler/kaputte Layouts. Nicht in einem Schritt alle ≈206 Klassen
  löschen, sondern nach Gruppen (pro Tab-Komponente) vorgehen, damit ein Fehlschlag lokal bleibt.
- **F-12 (Spread-Merge-Fix an 22 neuen Stellen):** Dieselbe Sorte Fehler, die 174-23 schon einmal
  gefixt hat — unter Vitest/jsdom liefert der kaputte Spread `undefined`-Klassennamen; im echten
  Produktions-Webpack-Build mit realen CSS-Modul-Objekten (enumerable Keys) funktioniert der
  Spread dagegen korrekt. Die Umstellung auf den Proxy-Helfer ändert daher production-seitig
  nichts Sichtbares, behebt aber ein latentes Test-/Edge-Case-Risiko. Nach Umstellung je Cluster
  den vorhandenen Komponenten-Test (falls vorhanden) laufen lassen; für Cluster ohne Tests
  (EpisodeManager, AnimeBrowser, AnimeContext) stichprobenhaft im Dev-Server rendern.
- **F-07 (formatDate, zwei Helfer statt einer, D-02):** Cluster A und Cluster B liefern für
  gültige Daten dieselbe Textausgabe, unterscheiden sich aber im Verhalten bei ungültiger/leerer
  Eingabe (Cluster A fällt auf den rohen ISO-String zurück, Cluster B auf einen Leerstring `''`).
  Entschieden: beide Fallback-Verhalten bleiben erhalten (zwei Helfer), keine Vereinheitlichung —
  dadurch keine Verhaltensänderung an den 7 Konsumenten.
- **Datei-Längen-Regel (CLAUDE.md, D-05):** 5 Dateien über 450 Zeilen werden durch F-12 inhaltlich
  angefasst (siehe Datei-Längen-Inventur oben) und müssen vor der eigentlichen Änderung in einem
  reinen Umbau-Commit aufgeteilt werden — zusätzlicher Aufwand und zusätzliches Regressionsrisiko
  pro Split (öffentliche Schnittstellen/Importe müssen stabil bleiben oder vollständig nachgezogen
  werden). Jeder Split braucht eine eigene Verifikation (Tests/typecheck grün), bevor der
  inhaltliche F-12-Commit folgt.

## Abgrenzung (explizit NICHT Teil dieser Phase)

- Die weiteren, fachlich uneinheitlichen `formatDate`/`formatDateTime`-Implementierungen
  (`UserMediaTab.tsx`, `GroupMembersHistTable.tsx`-Cluster, `FansubAliasSection.tsx`,
  `ReleaseTechnicalDetails.tsx`, `VersionRow.tsx`, die 4 `formatDateTime`-Varianten) — diese haben
  unterschiedliche Fallback-/Formatlogik und sind nicht der 174-FOLLOWUPS-Scope (F-07 benennt
  explizit nur die "4 identischen Kopien" plus die Pagination-Fensterberechnung).
- F-08, F-09, F-10, F-11, F-13 bis F-19, F-21, F-22, F-24 aus 174-FOLLOWUPS.md — eigene,
  unabhängige Folgephasen (teils bereits erledigt, teils noch offen), nicht Teil dieses
  Zuschnitts.
- Keine Schema-/API-/Verhaltensänderung außerhalb der in den offenen Fragen explizit zur
  Entscheidung gestellten Punkte.

## Entscheidungen final (vormals offene Fragen — durch Nutzer entschieden, siehe D-01..D-05 oben)

- **formatDate (D-02):** Zwei getrennte Helfer, je einer pro Verhaltens-Gruppe — kein
  Verhaltensrisiko, Fallback-Philosophien bleiben unverändert erhalten.
- **F-12-Umfang (D-01):** Weit — alle 38 betroffenen Dateien (16 bereits gefixte + 22 neu
  gefundene) werden auf den neuen zentralen Helfer umgestellt, nicht nur der ursprüngliche
  174-Dateikreis.
- **F-20-Verschieben (D-03):** Nur löschen, nicht verschieben — Einzel-Nutzer-Klassen bleiben an
  Ort und Stelle in `FansubEdit.module.css`.
