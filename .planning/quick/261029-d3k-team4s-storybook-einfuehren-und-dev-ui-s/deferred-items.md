# Deferred Items — Quick 261029-d3k (Storybook einfuehren)

Diese Funde liegen ausserhalb des Scopes dieses Quick-Tasks (nicht durch die
Storybook-Einfuehrung verursacht, in Dateien, die kein Task dieses Plans anfasst) und
werden deshalb NICHT behoben, nur dokumentiert.

## 1. `npm run lint` hat vier vorbestehende Fehler, unabhaengig von diesem Auftrag

Bei der Regressionspruefung in Task 12 (`npm run lint`) traten vier Fehler auf, die
bereits vor diesem Quick-Task auf `main` in exakt diesem Zustand vorhanden sind
(verifiziert per `git show main:<datei>` gegen den aktuellen Dateiinhalt — byte-identisch):

- `frontend/capture-responsive.cjs:1-2` — `@typescript-eslint/no-require-imports`
  (zwei `require()`-Importe statt ESM).
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts:249`
  — `Compilation Skipped: Existing memoization could not be preserved` (React-Compiler-
  Warnung/Fehler, unabhaengig von Storybook).
- `frontend/src/app/anime/[id]/group/[groupId]/releases/ReleasesFilterBar.tsx:69` —
  natives `<input>` nicht in der `LEGACY_NO_RESTRICTED_SYNTAX_FILES`-Ratchet-Liste
  gelistet, dadurch `error` statt `warn`.

Keiner dieser drei Dateien wurde von irgendeinem Task dieses Plans angefasst oder
verschoben. `npm run lint` lief demnach schon vor diesem Auftrag mit Exit-Code 1.
`npm run typecheck`, `npm test -- --run` und `npm run build` laufen alle drei weiterhin
fehlerfrei (siehe 261029-d3k-SUMMARY.md, Abschnitt Verifikation) — die Storybook-
Migration selbst hat keine neue Regression verursacht.

**Empfehlung:** Separater, kleiner Folge-Auftrag ausserhalb dieses Storybook-Scopes, der
gezielt diese drei vorbestehenden Lint-Fehler behebt (bzw. `ReleasesFilterBar.tsx` in die
Ratchet-Liste aufnimmt oder auf `<Input>` umstellt).

## 2. `npm run build` via `docker compose exec team4sv30-frontend` braucht `NODE_ENV=production`

Der laufende `team4sv30-frontend`-Dev-Container setzt `NODE_ENV: development` (bewusst so
in `docker-compose.override.yml` fuer `npm run dev`). Wird `npm run build` ohne
Ueberschreibung in genau diesem laufenden Container per `docker compose exec` ausgefuehrt,
erbt der Build-Prozess dieses geerbte `NODE_ENV=development` und bricht beim Prerendering
von `/_not-found` bzw. `/_global-error` mit `TypeError: Cannot read properties of null
(reading 'useEffect'/'useContext')` ab (klassisches Symptom einer inkonsistenten
Dev-/Prod-Build-Pipeline, keine doppelte React-Version — `npm ls react --all` zeigt
durchgehend deduplizierte `react@18.3.1`). Ein voellig frischer Checkout mit `npm ci`
in einem eigenstaendigen Container (ohne das geerbte `NODE_ENV`) baut denselben Codestand
hingegen sofort fehlerfrei durch — der Fehler liegt nachweislich an der geerbten
Containerumgebung, nicht am Code oder an den Story-Dateien dieses Auftrags.

**Workaround (in diesem Auftrag angewendet):** `docker compose exec -e NODE_ENV=production
team4sv30-frontend sh -c "cd /app && npm run build"` — mit explizit ueberschriebenem
`NODE_ENV` laeuft der Build sofort fehlerfrei durch (siehe 261029-d3k-SUMMARY.md).

**Empfehlung:** Diese Umgebungs-Eigenheit gehoert in `AGENTS.md` "## Validation" oder in
eine dedizierte Build-Doku vermerkt, da sie jeden zukuenftigen `npm run build`-Lauf im
laufenden Dev-Container betrifft — unabhaengig von Storybook. Liegt aber ausserhalb des
Scopes dieses Storybook-Auftrags (betrifft den bestehenden Compose-/Build-Prozess, nicht
die hier eingefuehrten Stories) und wird daher hier nur dokumentiert, nicht behoben.
