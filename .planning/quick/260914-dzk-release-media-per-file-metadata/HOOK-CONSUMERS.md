# Uploadhook- und Transport-Consumer (vor Änderung)

- `ReleaseVersionMediaSection.tsx` ist der einzige Runtime-Aufrufer von `startUpload`; dieselbe Section wird im Admin-Editor und Member-Release-Workspace eingebunden. Hier wird die Signatur auf pro-Datei-Drafts und einen optionalen Preview-Key umgestellt.
- `ReleaseVersionMediaDrawerSummary.tsx` nutzt den Hook nur lesend; die Listen-/Capabilities-Schnittstelle bleibt erhalten.
- `ReleaseVersionMediaSection.helpers.tsx` nutzt `UploadQueueItem` für Statusanzeige und baut den bestehenden Replace-Request. Neue Queue-Felder bleiben additiv; der bestehende Replace-Builder erhält `title`.
- `ReleaseVersionMediaSection.test.tsx`, der Editor-`page.test.tsx` sowie Fansub-Editor-`page.test.tsx` stellen Hook-Ergebnisse als Fixtures bereit; keine parallele Uploadimplementierung.
- `frontend/src/lib/api.ts`: `uploadReleaseVersionMedia` sendet unverändert `category` und geordnete `files[]` über `authorizedUploadXhr` mit zentralem Refresh vor dem Upload und ohne blindes 401-Replay. `patchReleaseVersionMediaItem` ergänzt das vorhandene JSON-Patchfeld `title`. `replaceReleaseVersionMediaFile` ergänzt optionales Multipartfeld `title` (ausgelassen = unverändert; null = leeren).
- `ReleaseVersionMediaItem` und `ReleaseVersionMediaPatchRequest` erhalten ein optionales nullable Titelfeld; Listen-/Detail-/öffentliche Consumer werden vom UI-/Backend-Executor konsolidiert.

## Belegte Ergebniszuordnung

`backend/internal/handlers/admin_content_release_version_media.go`, `UploadReleaseVersionMedia`: liest `form.File["files[]"]` (bestehender Fallback `files`), iteriert `for i, fileHeader := range files`, ruft `processOneRVMFile` sequenziell auf und fügt für jede Datei genau einen `rvmFileResult` an `results` an. Reihenfolge und Kardinalität entsprechen den Eingaben, auch bei Teilfehlern. Deshalb Zuordnung nach Position; `client_file_name` allein ist ausdrücklich kein Schlüssel. Fixtures umfassen gleiche Dateinamen mit unterschiedlichem Inhalt/Key.

## Änderungen / Sicherheitsinvarianten

Genau ein ausgewählter `fileKey(file)` darf `is_preview_candidate=true` senden. Andere Dateien senden das Feld nicht, sodass sie die bestehende Vorschau nicht entfernen. Kategoriegrenzen werden mit der bestehenden `CATEGORY_ALLOWS_PREVIEW`-Registry respektiert. Queue behält Titel, Text, Previewentscheidung, Result-ID und Source-Revision; Retry nach erfolgreichem Binärupload wiederholt nur das fehlgeschlagene PATCH. Upload-/Metadatenfehler übertragen die Vorschau niemals auf andere Bilder. Bestehende Auth-/Requestseams bleiben Eigentümer der Sitzung.

## Gezielte Verifikation des Hook-/Transport-Slices

- Neue Hookregressionen zuerst gegen alten Hook: 6 fehlgeschlagen, 9 bestanden. Nach Implementierung: 15/15 bestanden.
- `docker exec team4sv30-frontend npx vitest run src/lib/api.auth-refresh.test.ts src/lib/api.no-token-boundary.test.ts 'src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.test.ts' --reporter=dot`: 56 Tests in 3 Dateien bestanden.
- Abgedeckt: drei verschiedene Titel/Texte bei identischen Dateinamen; positional result binding; genau eine Previewwahl; keine neue Wahl; fehlgeschlagene ausgewählte Datei und Retry; Metadatenfehler und Retry auf derselben ID/Revision ohne Binärduplikat; nicht previewfähige Kategorien; fehlender/abgelaufener Access mit gültigem Refresh vor Upload + Metadaten-PATCH; Replace-Titel absent/null/set; zentrale Authgrenze.
- Scoped ESLint über Hook/Test/Typ/API/Auth-Test: genau ein bereits in HEAD vorhandener `react-hooks/set-state-in-effect`-Fehler im unveränderten `versionId === null`-Ladeeffect (`setItems([])`, alte Zeile 398, neue Zeile 352). Gegenprobe: HEAD-Datei über `git show` direkt an denselben ESLint-Prozess mit `--stdin --stdin-filename` übergeben; identische Diagnose. Keine neuen Lintdiagnosen im Slice.
- `git diff --check`: bestanden. Keine Daten/Uploads für diese Tests erzeugt.
