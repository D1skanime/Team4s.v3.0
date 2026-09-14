# Frontend-Verifikation — Quick 260914-dzk

- 128/128 Tests in 9 Dateien am finalen UI-/Hook-/API-/Consumer-Code bestanden. Exakter Aufruf in frontend-test-command.json; `--maxWorkers=1 --no-file-parallelism`, NODE_OPTIONS max-old-space-size=640. Umfasst Mehrfachdateien, individuelle Titel/Texte, eindeutige Vorschau, Entfernen/Abbruch, Retry ohne Binärduplikat, gleiche Dateinamen, Metadaten-/Replace-Payloads und zentrale Access-/Refresh-Grenze.
- Globales ESLint: 13 bestehende Fehler, 329 Warnungen (Ausgang 13/331; globale Uploadcheckbox und doppelte native Bildvorschau entfallen). Neue UploadQueue: 0 Diagnosen; Hook-Effect-Fehler gegen HEAD als identisch nachgewiesen. Keine Ratchet-/Regel-Ausnahmen hinzugefügt.
- Finaler Typecheck (`npm run typecheck`, max-old-space-size=1024) besteht. Der frühere Lauf vor Devserverneustart meldete den bekannten AnimePageProps.searchParams-Fehler in generierten .next/dev/types; kein Anime-Quellcode wurde verändert.
- Produktionsbuild in eigener temporärer Kopie, ohne .env/.next-Veränderung des Devservers: Compile erfolgreich (21.6s), danach bekannter ungültiger Pageexport `formatEditLoadError` in admin/anime/[id]/edit/page.tsx. Keine neue Builddiagnose. Temporärverzeichnis automatisch entfernt.
- git diff --check bestanden.

## Upload-Browser

Echter Workspace `/me/releases/28/workspace?return_to=%2Fme%2Fprojects%2F1%2Fgroup%2F1` mit ausschließlich isolierten API-Antworten; Upload/PATCH nur in Memory, sonstige Writes blockiert. 390x844 Touch, 768x1024 Tastatur und 1440x900 Maus: drei Bilder, drei Titel/Texte, keine globale Checkbox, eine native Radioauswahl über gemeinsame Input-Primitive, ausgewählte Datei entfernen hebt Auswahl auf, übrige Entwürfe bleiben, danach erneute Auswahl. Titel/Text werden nach Reload getrennt geladen und Titel allein nachbearbeitet.

Simulierter500-Fehler genau beim gewählten Vorschaubild lässt alte Vorschau bestehen. Retry sendet PATCH für exakt dieselbe ID und Revision; kein zweiter Upload. Je Viewport: 1 Batchupload, 3 Metadaten-PATCHes, 1 gezielter PATCH-Retry, 1 späterer Bearbeitungs-PATCH. Nicht gewählte Bilder schicken kein Previewfeld. Keine ungewollten Backendwrites, keine PageErrors. Rootbreiten exakt390/768/1440; Textfelder mobil unter Thumbnail, breiter daneben. Eigene Vorschau-URLs werden am DOM-Element im Effect gebunden, bei Dateiänderung/Unmount widerrufen und beim Tippen nicht erneuert.

Repro: browser-check.cjs. Zahlen: browser-results.json. Screenshots: {390,768,1440}-upload-{drafts,retry}.png. Das Dialog-Roleelement enthält die gesamte Overlayfläche; die gemessene Dialogbreite ist daher die Overlaybreite, nicht die sichtbare Sheetbreite.

## Öffentliche Galerie

Zusätzlicher echter Pretty-Release-SSR-/Hydration-/Viewerflow in isolierter Next-Kopie (API_INTERNAL_URL auf privaten Readfixture-Server),390/1440: HTTP200, getrennte Titel/Caption,3 Bilder inkl. titellosemFallback, Escape/Fokusrückgabe,0 Viewer-APIrequests,0 Writes,0 PageErrors,Root exaktViewport. Repro browser-public-check.cjs; Belege public-browser-evidence. Desktop-Viewer-Screenshot zeigt Bild noch im Ladezwischenstand, Titel/Caption sichtbar; DOM-Verhalten grün. Zweiter reiner Screenshotlauf unter VM-Ressourcenmangel abgebrochen. Nach Erholung /proc im Frontendcontainer geprüft: nur Haupt-Next-Prozesse vorhanden, kein separater33187-/Browser-/Vitest-Prozess mehr.

## Live-Grenze und Umgebung

Codex-In-App-Browser zeigt auf der echten Workspace-URL korrekt „Bitte einloggen, um deinen Projektbereich zu öffnen“. Eine angemeldete menschliche UAT oder echte Uploads wurden nicht simuliert oder als Sign-off behauptet. Phasen156/157/158/159 bleiben menschlich offen.

Parallel gestartete Prüfungen brachten die8GB-VM vorübergehend in RAM-/Swapdruck (4GB Swap voll, SSH-Zeitüberschreitungen). Go-Testcontainer gezielt gestoppt, fremde Prozesse unverändert. Eigene zusätzlichen Testprozesse beendet. Haupt-Frontenddevserver anschließend einmal kontrolliert neugestartet, da sein Next-Prozess4.2GB belegt hatte; danach5.7GB verfügbar. Finale Tests/Builds laufen einzeln mit Speicher-/Parallelitätslimits. Keine .env-, Medienoriginal-, Volumen- oder Livezeilenänderung durch Browserprüfungen.
