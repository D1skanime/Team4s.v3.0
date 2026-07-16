---
status: partial
phase: 103-ffentliche-release-detailseite-als-fansub-story-mit-rechte-g
source: [103-VERIFICATION.md]
started: 2026-07-16
updated: 2026-07-16
---

## Current Test

Live-Prüfung der öffentlichen Release-Erfahrung über den echten Einstieg `/fansubs/[slug]` → Fansub-Projekt → Release-Detail.

## Tests

### 1. Hero ohne und mit Preview-Bild
expected: Ein Text-only-Release bleibt vollständig lesbar; ein freigegebenes `is_preview_candidate`-Bild erscheint als Hero, ohne ein beliebiges erstes Galeriebild hochzustufen.
result: pending

### 2. Vier Bildkapitel auf Desktop, Tablet und Mobil
expected: Je Kategorie sind initial 6/4/2 Bilder sichtbar; weitere Bilder werden im selben Kapitel aufgeklappt. Uploader, Kategorie und Beschreibung sind korrekt. Die Restanzahl im Button ist pro Breakpoint verständlich.
result: pending

### 3. Viele rollenbasierte Texte und exakte Beteiligte
expected: Texte sind nach Release-Rolle gruppiert und zeigen Autor, Rolle und Datum; die Beteiligtenliste enthält nur Personen dieser Release-Version.
result: pending

### 4. Kara als Gast und mit Refresh-only-Session
expected: Gäste sehen Timeline und Informationen ohne Abspielaktion. Eine eingeloggte Refresh-only-Session wird zentral erneuert und kann verfügbare Segmente starten; Segmentwechsel stoppt den vorherigen Stream. Autoplay-Blockaden lassen weiterhin eine nutzbare Play-Steuerung zu.
result: pending

### 5. Vollfolge mit und ohne Entitlement
expected: Nur berechtigte Nutzer mit bereitem Stream sehen die sekundäre Aktion. Der Dialog spielt ab und räumt beim Schließen die Quelle auf. Gäste, abgelehnte Nutzer und nicht bereite Streams sehen keine Aktion.
result: pending

### 6. Kooperation und Release-Navigation
expected: Kooperationsgruppen werden korrekt angezeigt. Vorher/Weiter bleibt in der aktuellen Fansubgruppe, bevorzugt dieselbe Versionsnummer und fällt andernfalls auf die öffentliche Standardversion zurück.
result: pending

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps

