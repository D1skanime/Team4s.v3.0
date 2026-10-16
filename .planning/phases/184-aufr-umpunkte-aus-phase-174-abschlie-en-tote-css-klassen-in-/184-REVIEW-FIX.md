# Phase 184 — Review-Fix (2026-10-16)

Nutzerentscheidung zu den 4 Befunden aus dem Phase-184-Code-Review: Punkte 1–3 jetzt beheben,
Punkt 4 (mergeCssModules-Proxy-Overhead) bleibt als reiner Hinweis ohne Aktion.

## Befund 1 — Animierte GIF/WebP-Display-Varianten hartcodierten "display.webp"

**Vorher:** `generateAnimatedDisplayVariant` und `generateAnimatedWebPDisplayVariant` in
`backend/internal/handlers/media_upload_image.go` (Zeilen 325, 352) setzten
`displayFilename := "display.webp"` literal, statt wie der statische Zweig (Zeile 202, bereits
in 184-01/D-04 umgestellt) `services.DisplayVariantFileName(originalPath, ext)` zu rufen.

**Fix:** Beide Funktionen erhalten einen neuen Parameter `originalPath string` (die beiden
Aufrufstellen in `processImage` übergeben das bereits vorhandene lokale `originalPath`, das für
den GIF-Zweig `original.gif` und für den animierten-WebP-Zweig `original.webp` ist). Beide
Funktionen rufen jetzt `services.DisplayVariantFileName(originalPath, "webp")`. Da der Stamm in
beiden Fällen immer `"original"` ist, liefert der Helfer exakt denselben Dateinamen
(`"display.webp"`) wie vorher — keine Verhaltensänderung. Kein aktives Kollisionsrisiko bestand
ohnehin nicht (dieser Handler speichert pro `mediaID` in einem isolierten Verzeichnis,
`resolveUploadStoragePath`), der Fix schließt ausschließlich die Konsistenzlücke zum
D-01/D-04-Grundsatz „eine Regel, eine Stelle".

**Tests:** Zwei neue Verhaltenstests in `backend/internal/handlers/media_upload_test.go`:
`TestMediaUploadHandler_AnimatedGIFDisplayUsesDisplayVariantFileName` und
`TestMediaUploadHandler_AnimatedWebPUploadDisplayUsesDisplayVariantFileName` — beide laden
echte animierte Dateien über den vollen HTTP-Upload-Pfad hoch und prüfen, dass der resultierende
Dateiname exakt `services.DisplayVariantFileName(...)`s Ausgabe entspricht (nicht nur zufällig
denselben String). Alle bereits bestehenden `TestMediaUploadHandler_AnimatedDisplay*`-Tests
bleiben unverändert grün (Regressionsbeweis).

**Datei-Längen-Regel:** `media_upload_image.go` liegt bei 368 Zeilen (vorher 365) — unter dem
450-Zeilen-Limit, kein Split nötig.

## Befund 2 — `handleCoverImgError` doppelt (useAdminEpisodesPage.ts / anime-helpers.ts)

**Vorher:** Beide Dateien hatten eine eigene, fast identische Implementierung — einziger
Unterschied: `img.alt = ""` (useAdminEpisodesPage.ts) vs. `img.alt = 'Cover nicht verfügbar'`
(anime-helpers.ts). Diese Dopplung existierte bereits vor Phase 184 (verifiziert per
`git show a79b42b90:...`) — 184-07s reiner D-05-Split hat sie nur unverändert mitverschoben,
nicht neu eingeführt.

**Fix:** Die lokale Kopie in `useAdminEpisodesPage.ts` entfernt. `episodes/page.tsx` importiert
jetzt `handleCoverImgError` direkt aus `@/app/admin/anime/utils/anime-helpers` (bereits
Single-Source für `AnimeRow.tsx` und `AnimeContextCard.tsx`).

**Sichtbare Änderung (klein, bewusst in Kauf genommen gemäß Nutzerauftrag):** Ein defektes
Cover-Bild auf `/admin/episodes` zeigt jetzt den Alt-Text „Cover nicht verfügbar" statt eines
leeren Alt-Texts — nur sichtbar/hörbar, wenn ein Cover-Bild tatsächlich nicht lädt UND ein
Screenshot-Reader/Tooltip den Alt-Text anzeigt. Keine Layout-/Verhaltensänderung sonst
(`img.src`-Fallback und die `fallbackApplied`-Einmal-Guard-Logik sind identisch).

**Tests:** Bestehende Suite (`anime-helpers.test.ts`, 45 Tests; `AnimeBrowser`-Komponententests)
bleibt grün — kein neuer Test nötig, da keine neue Logik entstanden ist, nur ein Importpfad
geändert wurde.

## Befund 3 — Such-Debounce als 4. Kopie im Repo

**Vorher:** `useAdminFansubsList.ts` (300ms), `useUserListFilters.ts` (300ms) und
`useDiscoveryLibraryFilters.ts` (300ms) implementierten je ihre eigene
`setTimeout`/`clearTimeout`-Debounce-Logik — vorbestehend, teils schon vor Phase 184, teils (bei
`useAdminFansubsList.ts`) durch den 184-05-Split unverändert aus `fansubs/page.tsx`
mitverschoben.

**Fix:** Neuer gemeinsamer Hook `frontend/src/hooks/useDebouncedValue.ts`
(`useDebouncedValue<T>(value: T, delayMs: number): T`) — generische Werte-Debounce, Verzögerung
als Parameter (keine Vereinheitlichung der 300ms/250ms-Werte). Angewendet an 3 der 4 Stellen:

- **`useAdminFansubsList.ts`** (300ms): direkter, risikofreier Ersatz — `queryInput` wird per
  `useDebouncedValue` debounced, `query` daraus per `useMemo` abgeleitet (`.trim().toLowerCase()`
  wie vorher). Byte-identisches Zeitverhalten.
- **`useUserListFilters.ts`** (300ms) und **`useDiscoveryLibraryFilters.ts`** (300ms): hier
  debounced das Original einen *Callback* (`writeParams`-Aufruf inkl. Router-Schreiben), nicht
  nur einen Wert — ein naiver Ersatz durch „Wert debouncen, dann in einem Effekt reagieren"
  hätte eine echte Regression eingeführt: Der externe URL-Sync-Effekt (Browser-Zurück) hätte über
  denselben debouncten Wert nach Ablauf der Verzögerung erneut `writeParams` ausgelöst und dabei
  `offset`/`cursor` fälschlich zurückgesetzt. Behoben durch ein entkoppeltes `pendingSearch`-Signal
  (nur von `handleSearchChange` gesetzt, nie vom URL-Sync-Effekt) plus einen `appliedSearchRef`-
  Wächter, der den reaktiven Effekt nur bei einem tatsächlich NEUEN debouncten Wert auslöst (nicht
  bei jeder `writeParams`-Identitätsänderung, die sonst eine Endlosschleife ausgelöst hätte).
  Dieselbe Struktur in beiden Dateien.

**Bewusst NICHT angefasst: `frontend/src/app/suche/useDebouncedSearch.ts` (250ms).** Analyse
ergab einen echten (wenn auch minimalen) Zeitverhaltens-Unterschied: Das Original verzögert auch
die ALLERERSTE Ausführung (URL-Schreiben + Suche/Vorschläge-Fetch) nach dem Mount um 250ms, weil
der `useEffect` dort einen `setTimeout` plant statt synchron zu feuern. Ein naiver Ersatz durch
`useDebouncedValue(state, 250)` + reagierender Effekt hätte die erste Ausführung SOFORT bei Mount
feuern lassen (da der Hook den Anfangswert unverzögert zurückgibt) — eine echte, wenn auch kleine
sichtbare Zeitverhaltens-Änderung (Suchergebnisse ~250ms früher beim ersten Laden). Da die Phase
durchgehend „ohne sichtbare Änderung" verlangt und diese vierte Stelle structurell UND im
Mount-Verhalten von den anderen drei abweicht, wurde sie bewusst ausgeklammert statt riskant
vereinheitlicht. Bleibt eine Kopie — kann bei Bedarf in einer eigenen, risikobewussten Folgephase
behandelt werden.

**Tests:** Neuer Logik-Test `frontend/src/hooks/useDebouncedValue.test.ts` (5 Tests, Fake-Timer
via `vi.useFakeTimers()`/`vi.advanceTimersByTime()`): Sofortiger Anfangswert, kein Update vor
Ablauf der Verzögerung, Update nach Ablauf, Timer-Reset bei Zwischenwerten (nur der letzte Wert
überlebt), unterschiedliche Verzögerung pro Aufrufstelle. Bestehender Test
`useDiscoveryLibraryFilters.test.ts` (11 Tests, inkl. des namentlich debounce-spezifischen Tests
„changing the search value writes q after the debounce and clears an existing cursor") bleibt
unverändert grün — Regressionsbeweis für die Callback-Debounce-Umstellung. Keine dedizierte
Testdatei existierte vorher für `useUserListFilters.ts`; die volle `admin/users`-Suite (19
Testdateien, 105 Tests) bleibt grün.

## Befund 4 — mergeCssModules-Proxy-Overhead (kein Fix, nur Hinweis)

Bleibt wie vom Nutzer entschieden unverändert — reiner Laufzeit-Hinweis ohne Handlungsbedarf,
bei aktuellen Listengrößen (≤20 Zeilen) voraussichtlich nicht messbar.

## Verifikation (gesamt)

- Backend: `go build ./...`, `go vet ./...` clean. `go test ./internal/handlers/...`
  (alle `TestMediaUploadHandler_*`/`TestDisplayVariant*`) grün, inkl. beider neuer Tests.
  Voller `go test ./...`: dieselben vorbestehenden, umgebungsbedingten Fehlschläge wie vor diesem
  Fix (Keycloak-Live-Netzwerktests Phase134/137/141 — fehlende externe Dienste in dieser
  Testumgebung, nichts mit diesem Fix zu tun).
- Frontend: `npx tsc --noEmit`, `npx eslint .` (nur vorbestehende Warnungen, 0 neue Fehler) clean
  für alle berührten Dateien. Voller `npx vitest run`: 3544 von 3550 Tests grün; die 3
  Fehlschläge (`src/app/members/[slug]/not-found.test.tsx`) sind ein vorbestehender, timing-
  bedingter Flake unter Volllast — isoliert erneut ausgeführt: 2/2 grün, unberührt von diesem Fix.
- Backend neu gebaut, `/health` geprüft; `docker restart team4sv30-frontend` nach allen
  Frontend-Änderungen ausgeführt.
- Datei-Längen-Regel geprüft: keine der berührten Dateien liegt über 450 Zeilen (größte:
  `media_upload_image.go` 368, `useUserListFilters.ts` 147).
