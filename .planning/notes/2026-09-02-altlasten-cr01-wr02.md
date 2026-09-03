# Altlasten aus der Phase-144-Prüfung — CR-01 und WR-02

Beide Befunde stammen aus `144-REVIEW.md`, gehören aber **nicht** zu Phase 144: sie lagen
vorher schon im Bestand. Nachgemessen, nicht aus dem Bericht übernommen — der Review nennt
CR-01 fälschlich eine "Regression" dieser Phase.

## CR-01 — Upload-Fehler werden als Erfolg gemeldet

**Status: Behoben (2026-09-03, Quick-Task 260903-flw).** `runUpload` wirft im
catch-Block jetzt weiter (`throw uploadError`), genau wie `patchItem`/`replaceItem`/
`deleteItem`/`reorderItems`. Zusätzlich baut `runUpload` bei normalem Abschluss lokal
ein `UploadRunResult` (`{ items, allSucceeded }`) aus den tatsächlichen Pro-Datei-
Ergebnissen — nie aus einem nachträglichen State-Read — und gibt es über
`startUpload`/`retryUpload` an den Aufrufer weiter. `handleUploadClick` in
`ReleaseVersionMediaSection.tsx` zeigt den Erfolgs-Toast und schließt den Drawer nur
noch, wenn `result.allSucceeded === true` ist; bei hartem Fehlschlag (Netzwerk/5xx)
greift wieder der bestehende `catch`-Zweig mit Fehlerbanner, bei HTTP-200-mit-
Fehlerstatus (ganz oder teilweise) bleibt der Drawer offen und die betroffenen
Dateien bleiben mit Fehlermeldung und Retry-Button sichtbar. Ein neuer
`handleRetryClick`-Wrapper fängt abgelehnte `retryUpload`-Promises ab, sodass ein
erneuter Fehlschlag beim Retry nie als unhandled promise rejection auftaucht.
Siehe `.planning/quick/260903-flw-cr-01-fehlgeschlagene-uploads-duerfen-ni/` für
Plan und Summary.

**Dateien:**
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts` (`runUpload`, catch-Block)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx` (`handleUploadClick`)

**Beleg für Altbestand:** `git show 17cca9fb:...useReleaseVersionMedia.ts` — der
`catch (uploadError)` ohne `throw` steht dort bereits in Zeile 243, also im Stand *vor*
Phase 144. Die Phase hat an der Datei nur `replaceItem` ergänzt.

**Problem:** `runUpload` fängt jeden Fehler ab und wirft nicht weiter — anders als alle
Geschwistermethoden derselben Datei (`patchItem`, `replaceItem`, `deleteItem`,
`reorderItems` werfen alle). Das von `startUpload` gelieferte Promise kann daher nie
rejecten, wodurch der `catch`-Zweig in `handleUploadClick` toter Code ist. Folge: bei
Netzwerkfehler, 5xx oder wenn alle Dateien im Batch `status: 'failed'` zurückkommen (das
Backend liefert dafür bewusst HTTP 200), sieht der Admin "Upload abgeschlossen.", der
Drawer schließt, die Auswahl wird geleert. Beim erneuten Öffnen ruft `openUploadSheet()`
→ `resetUploadDraft()` → `clearUploadQueue()` und löscht die Fehlerliste samt
Retry-Button, bevor sie je sichtbar war.

Beim **Teilfehler** — einige Dateien fertig, einige gescheitert — wird `media.error` gar
nicht gesetzt, es gibt also nicht einmal das Fehlerbanner: ein reines Falsch-Positiv, die
gescheiterten Dateien gehen still verloren.

Verstößt gegen den Observability-Constraint in `CLAUDE.md` ("operational errors must be
visible immediately in the UI").

**Richtung:** `runUpload` im catch weiterwerfen (Muster der Geschwistermethoden), und
`handleUploadClick` die Einzelergebnisse prüfen lassen — Toast und Schließen nur, wenn
jedes Element `status === 'ready'` erreicht hat, sonst Drawer offen lassen, damit die
vorhandene Retry-UI greifen kann. Braucht einen Test, der den Fehlerfall wirklich
durchspielt; der bestehende Upload-Test mockt `startUpload` als immer erfolgreich.

**Abgrenzung:** Die Flows von Phase 144 selbst sind nicht betroffen — `replaceItem` und
`patchItem` werfen korrekt. Von der Phasen-Verifikation unabhängig bestätigt.

## WR-02 — Tests prüfen Quelltext-Substrings statt Verhalten

**Dateien:**
- `backend/internal/handlers/admin_content_release_version_media_replace_test.go:22-42`
  (`TestReplaceReleaseVersionMediaFileRequiresUpdatePermission`)
- `backend/internal/handlers/admin_content_release_version_media_test.go:279-310, 312-351, 424-446, 587-605`

**Problem:** Diese Tests rufen den geprüften Code nicht auf. Sie lesen per `os.ReadFile`
die `.go`-Quelldatei des Handlers und suchen mit `strings.Contains` nach Bezeichnern
oder Fehlercodes. `TestReleaseVersionMedia_InvalidCategoryRejectsUpload` sagt das im
eigenen Kommentar offen: "We test category validation via the structural code inspection
instead." Bewiesen wird damit nur, dass eine Zeichenkette irgendwo in der Datei vorkommt —
auch in einem Kommentar. Eine Regression, die die Prüfung verschiebt, die Bedingung
umdreht oder ihre Reihenfolge gegenüber anderen Guards ändert, bliebe unentdeckt.

Betrifft ausgerechnet zwei Invarianten, die diese Phase ausdrücklich schützen soll:
"PREVIEW_NOT_ALLOWED_FOR_CATEGORY bleibt nach der Kategorie-Freigabe scharf" und "kein
zweiter Permission-Action-Code".

**Sichtbar beim Nachmessen:** Diese Tests laufen in 0,00 s, während die echten
Postgres-Tests derselben Datei 0,10 s brauchen.

**Richtung:** Substring-Assertions durch `httptest`-Aufrufe gegen ein leichtgewichtiges
Fake-Repository ersetzen, sodass der Zweig wirklich ausgeführt und Status plus Body
geprüft werden — so wie `TestReplaceReleaseVersionMediaFileRejectsNoAuth` und die
Postgres-Tests derselben Phase es bereits machen.

**Umfang:** Größer als CR-01, betrifft auch vorbestehende Tests. Kandidat für die geplante
zweite externe Prüfrunde, die laut Handoff ohnehin evidenz-geführt bei dem ansetzen soll,
was nachweislich schwach ist.

**Tatsächlicher Umfang (nachgemessen):** Die obige Dateien-Liste nennt nur die zwei Dateien
aus der ursprünglichen CR-01/WR-02-Prüfrunde und unterschätzt damit den echten Umfang — sie
deckt lediglich das ab, was diese eine Prüfrunde zufällig aufgedeckt hat, nicht eine
codebase-weite Messung. Eine vollständige Messung ergibt: **49** Backend-Testdateien lesen
eine `.go`-Quelldatei als Text und beweisen Verhalten per `strings.Contains`, insgesamt
**236** solche Assertions, verteilt über drei Pakete: `internal/handlers`,
`internal/repository`, `internal/services`.

**Beleg für aktive Ausbreitung:** `admin_content_release_version_media_replace_test.go`, eine
brandneue Datei aus Phase 144, hat dasselbe Muster bereits übernommen —
`TestReplaceReleaseVersionMediaFileRequiresUpdatePermission` liest per `os.ReadFile` die
Quelldatei `admin_content_release_version_media_replace.go` und prüft anschließend eine Kette
von `strings.Contains`-Aufrufen, während die tatsächliche Response verworfen wird, ohne dass
der Handler je über `httptest` aufgerufen und eine echte Antwort geprüft würde. Das zeigt: das
Muster ist keine ruhende Altlast, sondern breitet sich aktiv in neuen Code aus.

**Weiteres Vorgehen:** Die Behebung der 49 Dateien ist eine separate, künftige Phase — nicht
dieser Quick-Task. Sie sollte evidenz-geführt erfolgen: zuerst die Dateien, deren Tests
tatsächlich wichtige Invarianten schützen (Permissions, Preview-Lock-Invarianten), statt
alphabetisch oder in Auffindungsreihenfolge vorzugehen.
