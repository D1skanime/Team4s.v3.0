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

## Vorschlag Umsetzung

1. **F-23 zuerst (kleinstes Risiko, reiner Bonus):** Die 4 Literal-Stellen in
   `admin_content_release_version_media_upload_process.go` und `media_upload_image.go` auf
   `services.DisplayVariantFileName(originalPath, ext)` umstellen. Da der Upload-Pfad immer von
   einem frischen `original.<ext>` ausgeht, liefert der Helfer in diesen Fällen exakt
   `"display."+ext"` zurück — keine Verhaltensänderung, nur eine Stelle weniger.
2. **F-07:**
   - Pagination: `computePageWindow(currentPage, totalPages): number[]` als reine Funktion
     extrahieren (z. B. in `frontend/src/components/ui/`), beide Komponenten rufen sie auf.
   - formatDate: einen gemeinsamen Helfer (z. B. `frontend/src/lib/formatDate.ts`) für den
     byte-identischen Cluster A (4 Dateien) **und** Cluster B (3 Dateien, zwei unterschiedliche
     Implementierungen desselben Datumsformats) bereitstellen — siehe offene Frage unten, da beide
     Cluster leicht unterschiedlich implementiert sind (try/catch+`toLocaleDateString` vs.
     Null-Guard+`Intl.DateTimeFormat`), aber dieselbe Ausgabe liefern.
3. **F-12:** Den in den 16 Dateien bereits 16-fach kopierten Proxy-Code zu einem echten,
   exportierten Helfer machen (z. B. `frontend/src/lib/mergeModuleStyles.ts`,
   `mergeModuleStyles(own, shared)`), die 16 Dateien darauf umstellen (kein Verhaltensunterschied,
   nur Entduplizierung), und die 22 noch kaputten Stellen auf denselben Helfer umstellen (das ist
   eine echte Bugfix-Komponente — siehe Risiken).
4. **F-20:** Nach einem Vorher/Nachher-Bildvergleich der `admin/fansubs/[id]/edit`-Seite (alle
   Tabs) die ≈206 unreferenzierten Klassen entfernen, danach die verbliebenen Einzel-Nutzer-
   Klassen in die Module ihrer jeweiligen Komponente verschieben (wie 174-REPORT es für den
   "echten Kern" vorzeichnet).

Reihenfolge nach Risiko: F-23 (fast risikofrei) → F-07 (Unit-testbar, kein Rendering-Risiko) →
F-12 (behebt einen echten, bisher nur in Tests sichtbaren Bug — siehe Risiken) → F-20 (einzige
Änderung mit echtem visuellen Regressionsrisiko).

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
- **F-07 (formatDate-Vereinheitlichung):** Cluster A und Cluster B liefern für gültige Daten
  dieselbe Textausgabe, unterscheiden sich aber im Verhalten bei ungültiger/leerer Eingabe
  (Cluster A fällt auf den rohen ISO-String zurück, Cluster B auf einen Leerstring `''`) — das ist
  eine echte Entscheidung, siehe offene Frage unten.
- **Datei-Längen-Regel (CLAUDE.md):** Falls eine berührte Datei beim inhaltlichen Anfassen über
  450 Zeilen liegt, muss sie im selben Auftrag aufgeteilt werden. Keine der hier identifizierten
  Dateien liegt aktuell über dem Limit (größte Einzeldatei im Scope: `FansubEdit.module.css` ist
  CSS, keine Produktionscode-Datei im Sinn der Zeilenregel — die Regel gilt für Produktionsdateien;
  zu klären, ob CSS-Module in ihren Geltungsbereich fallen, ist für dieses Vorhaben irrelevant, da
  nach dem Entfernen toter Klassen die Datei kleiner, nicht größer wird).

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

## Offene Fragen an den Nutzer

### Frage 1: formatDate — Cluster A und Cluster B zu einem Helfer zusammenführen, oder getrennt lassen?

Cluster A (4 Dateien: `UserClaimsTab.tsx`, `ClaimsClient.tsx`, `ReviewQueue.tsx`,
`ContributionsReviewSection.tsx`) und Cluster B (3 Dateien: `GroupMediaReviewGrid.tsx`,
`GroupMediaReviewDetailDrawer.tsx`, `useGroupMediaReviewFilters.ts`) liefern für ein gültiges
ISO-Datum **dieselbe Ausgabe** (`TT.MM.JJJJ`), aber unterschiedliches Verhalten bei
Eingabe-Problemen:

| Eingabe | Cluster A (`try/catch` + `toLocaleDateString`) | Cluster B (Null-Guard + `Intl.DateTimeFormat`) |
|---|---|---|
| gültiges ISO-Datum, z. B. `"2026-10-15T00:00:00Z"` | `"15.10.2026"` | `"15.10.2026"` |
| leerer String `""` | `"15.10.2026"`-ähnlicher Fallback: `new Date('')` ist `Invalid Date`, `toLocaleDateString` wirft **nicht**, liefert `"Invalid Date"` als Text (kein catch-Fall, da keine Exception) | `if (!value) return ''` → leerer String |
| `null`/`undefined` | Typfehler zur Compile-Zeit vermieden durch TS-Signatur `string`; zur Laufzeit bei `any`-Durchreichung würde `new Date(null)` = Epoch 1970 liefern | von `if (!value)` abgefangen → `''` |

**Optionen:**
- **(a)** Zwei getrennte Helfer behalten (`formatDateDE` für Cluster A mit ISO-Fallback,
  `formatDateOrEmpty` für Cluster B mit Leerstring-Fallback) — löst nur die Duplikation
  *innerhalb* jedes Clusters, lässt die zwei unterschiedlichen Fallback-Philosophien bestehen.
- **(b)** Einen gemeinsamen Helfer mit dem robusteren Verhalten (Leerstring-Fallback, kein
  `"Invalid Date"`-Text) für beide Cluster — ändert Cluster A's Verhalten minimal bei kaputten
  Daten (aktuell theoretisch nie beobachtet, da alle 4 Cluster-A-Stellen echte DB-Timestamps
  rendern).
- **Empfehlung:** (a) — zwei Helfer, kein Verhaltensrisiko, passt zur "ohne sichtbare Änderung"-
  Vorgabe dieser Phase. Eine Vereinheitlichung der Fallback-Philosophie wäre eine eigene,
  bewusste Entscheidung außerhalb einer reinen Entduplizierungsphase.

### Frage 2: F-12 — welchen Umfang soll Phase 184 abdecken?

174-FOLLOWUPS.md nennt F-12 nur für die 16 Dateien im `admin/fansubs/[id]/edit/`-Ordner — die sind
bereits gefixt. Der Phasentitel ("latenten CSS-Modul-Merge-Fehler beheben (F-12)") impliziert aber
das Beheben des Fehlers an sich, nicht nur den ursprünglich genannten Dateikreis, und es wurden
22 weitere betroffene Produktionsdateien gefunden (siehe oben).

**Optionen:**
- **(a) Eng:** Nur den bereits gefixten 16-Dateien-Kreis bestätigen + den dort 16-fach kopierten
  Proxy-Code zu einem zentralen Helfer zusammenführen (reine Entduplizierung der Lösung, kein
  neuer Scope).
- **(b) Weit:** Zusätzlich die 22 neu gefundenen Stellen (AnimeBrowser/AnimeContext/EpisodeManager/
  fansubs-create/-merge/-page + ReleaseVersionNotesTab) auf denselben Helfer umstellen — behebt den
  latenten Fehler wirklich vollständig, ist aber mehr als der ursprüngliche 174-FOLLOWUPS-Wortlaut
  und deutlich mehr Dateien (22 statt 16).
- **Empfehlung:** (b) — der Phasentitel sagt "latenten Fehler beheben", nicht "die 16 bekannten
  Stellen bestätigen"; den Fehler nur teilweise zu beheben würde bedeuten, dass dieselbe Klasse von
  Bug in neuem Code (EpisodeManager, AnimeBrowser — beide erst nach 174 entstanden/erweitert)
  weiterhin unbemerkt bleibt. Kosten sind moderat (22 Dateien, mechanische Umstellung, kein
  Logikrisiko, da der Helfer bereits 16-fach erprobt im Code liegt).

### Frage 3: F-20 — wie weit beim Verschieben der Einzel-Nutzer-Klassen gehen?

174-REPORT.md schlägt vor, nach dem Löschen der toten Klassen auch die 37 (heute: ähnlich viele)
nur von einer einzigen Komponente genutzten Klassen aus `FansubEdit.module.css` in das CSS-Modul
ihrer jeweiligen Komponente zu verschieben.

**Optionen:**
- **(a)** Nur löschen, nicht verschieben — kleinerer, risikoärmerer Schnitt für diese Phase;
  Verschieben als eigener Folgepunkt.
- **(b)** Löschen UND verschieben in einem Zug — größerer Diff, aber vermeidet eine zweite
  Anfass-Runde derselben Datei.
- **Empfehlung:** (a) für diese Phase — das Löschen ist bereits die riskantere Teiloperation
  (visuelle Regression); das Verschieben in derselben Phase würde das Diff unnötig vergrößern und
  die Ursachensuche bei einem gefundenen Regressions-Screenshot erschweren. Verschieben kann ein
  kleiner, risikoarmer Folgeschritt sein, sobald die toten Klassen weg sind und die Datei
  übersichtlicher ist.
