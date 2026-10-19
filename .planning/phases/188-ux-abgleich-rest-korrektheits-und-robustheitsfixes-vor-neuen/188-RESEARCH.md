# Phase 188: UX-Abgleich-Rest — Korrektheits- und Robustheitsfixes vor neuen Features - Research

**Researched:** 2026-10-19
**Domain:** Interne Korrektheits-/Robustheitsfixes (Go-Repository-SQL, Go-Auth-Repository + Middleware, Go-cmd-Hygieneskript, Next.js-Config-Robustheit) — kein neues Framework, keine neue externe Library.
**Confidence:** HIGH für alle drei Befunde (jeder Fund ist durch direktes Lesen des betroffenen Codes und seiner Tests belegt, keine Websuche nötig).

## Summary

Dies ist ein schmales, rein internes Korrektheits-/Robustheitspaket ohne neue Abhängigkeiten. Alle drei
Fixes sind lokal begrenzte Änderungen an bereits bekannten Dateien, für die das Repo bereits etablierte
Analog-Muster besitzt: (1) die Badge-Nenner-Korrektur folgt exakt dem bestehenden `anime.max_episodes
IS NULL`-Rückfall-Vorbild aus `jellyfin_helpers.go`, getestet mit dem bereits vorhandenen, DB-basierten
Fixture-Muster derselben Datei; (2) die `EnsureAppUserForIdentity`-E-Mail-Fallback-Korrektur plus
Hygiene-Skript folgt dem `backend/cmd/<purpose>/main.go` + `<purpose>.go` (importierbare Funktion) +
`<purpose>_test.go`-Muster aus `migrate-preview-backfill`, benötigt aber eine **neue** Postgres-Test-
Fixture (es existiert aktuell keine Live-DB-Testinfrastruktur für `app_auth_repository.go`, und keine
bestehende Fixture modelliert die volle `app_users`/`users`-Schema-Kombination); (3) die
`publicImagePatterns.mjs`-Fail-Fast-Korrektur ist eine reine, lokal direkt testbare Funktionsänderung
(kein Node-Prozess-Exit nötig, da die Funktion bereits ihren Input als Parameter statt über `process.env`
erhält) mit einem bereits im selben Repo vorhandenen Gegenbeispiel-Muster (`publicApiUrl.ts`s
`try/catch`), das aber bewusst NICHT 1:1 übernommen werden darf (anderes Zielverhalten: Fallback vs.
Fail-Fast).

**Primary recommendation:** Alle drei Fixes als unabhängige, kleine Plan-Einheiten behandeln — sie
teilen keine Dateien und keine Risikokopplung. Für #27 zuerst die Testbarkeits-Lücke schließen (neue
Postgres-Fixture + pure Entscheidungsfunktion extrahieren), bevor Produktionscode geändert wird, sonst
verstößt die Umsetzung gegen die Teststil-Pflicht des Projekts (keine Quelltext-Grep-Tests für neues
Verhalten).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Badge-Nenner-Berechnung (#18) | API / Backend (Repository-SQL) | — | Reine Lese-Aggregation, live pro Request berechnet, keine Persistenz, kein Frontend-Logikanteil |
| E-Mail-Re-Subjecting + `email_verified`-Durchreichung (#27) | API / Backend (Middleware + Repository) | — | Token-Claim-Parsing (bereits vorhanden) → Modell → Repository-Transaktion; reine Server-Logik |
| Hygiene-Report-Skript (#27, D-08) | API / Backend (`backend/cmd/`-Subkommando) | Database / Storage (liest zusätzlich die separate Keycloak-Postgres-DB) | Eigenständiges Offline-Tool, kein HTTP-Pfad; braucht lesenden Zugriff auf ZWEI Postgres-Instanzen (Team4s-DB + Keycloak-DB) |
| `NEXT_PUBLIC_API_URL`-Validierung (#35.1) | Frontend Server (Next.js Build-/Config-Zeit) | — | Läuft bei Node-Modul-Initialisierung von `next.config.mjs`, vor jeder Request-Verarbeitung — kein Browser-/Client-Code betroffen |

## Standard Stack

Kein neues externes Paket für diese Phase. Alle drei Fixes nutzen ausschließlich bereits im Projekt
vorhandene Abhängigkeiten (`pgx/v5`, `testify`, Go-Stdlib, Node-Stdlib `URL`, Vitest). Daher:

- **Core / Supporting / Alternatives Considered:** entfällt — kein neues Paket.
- **Installation:** entfällt.

## Package Legitimacy Audit

**Nicht anwendbar.** Diese Phase installiert kein einziges neues Paket (weder Go-Modul noch
npm-Paket). Der Package-Legitimacy-Gate-Schritt wird deshalb übersprungen; alle drei Fixes sind reine
Änderungen an bestehendem, bereits auditiertem Code mit bestehenden Importen.

## Architecture Patterns

### System-Architektur-Diagramm (betroffene Datenflüsse)

```
#18 Badge-Nenner
  Browser (GET /me/profile ODER /members/:slug)
     -> Go Handler (GetOwnDashboard / GetPublicMemberProfile)
        -> MemberProfileRepository.loadContribProjectsCount(memberID)
           -> SQL: project_versions CTE (ep.anime_id, rvg.fansub_group_id, rv.id, ep.id NEU)
              JOIN anime a ON a.id = ep.anime_id   <- NEU (liefert a.max_episodes)
           -> member_covered CTE (unveraendert: DISTINCT release_version_id, fansub_group_id
              WHERE member_id=$1 AND lifecycle_status='awarded')
           -> Gruppierung je (anime_id, fansub_group_id):
                denominator = a.max_episodes  WENN NOT NULL
                              SONST COUNT(*) ueber project_versions-Zeilen (heutiges Verhalten)
                numerator   = COUNT(DISTINCT ep.id) der durch member_covered abgedeckten Zeilen
                "vollstaendig" wenn numerator >= denominator (bzw. == bei Rueckfall-Modus)
        <- highestContribProjectsTier(count) -> Bronze/Silber/Gold
     <- Live-Projektion, keine Persistenz (kein member_badges-Write)

#27 Re-Subjecting + Hygiene-Report
  Keycloak-Token (email_verified-Claim, bereits von oidc.go geparst)
     -> current_user_auth.go: claims.EmailVerified NEU durchreichen
        -> models.KeycloakIdentity.EmailVerified (NEUES Feld)
           -> AppAuthRepository.EnsureAppUserForIdentity
              -> loadAppUserBySubject(subject)  [unveraendert, Pfad 1: Treffer -> wie bisher]
              -> WENN kein Treffer UND identity.EmailVerified == true:
                   loadAppUserByEmail(email)  <- NEU
                   WENN Treffer: UPDATE dieser Zeile (keycloak_subject = neues sub, ...)
                                 statt INSERT einer neuen Zeile (Re-Subjecting)
                   SONST: heutiges Verhalten (INSERT neue Zeile)
              -> WENN identity.EmailVerified == false: immer heutiges Verhalten (INSERT neue Zeile)

  backend/cmd/report-orphaned-app-users (neues, eigenstaendiges Offline-Tool, D-08)
     -> liest Team4s-Postgres: SELECT id, keycloak_subject, email FROM app_users
     -> liest Keycloak-Postgres (ZWEITE DSN, Container keycloak-db): SELECT id FROM user_entity
     -> Report (stdout, keine Mutation): app_users-Zeilen, deren keycloak_subject
        in keiner user_entity.id-Zeile vorkommt

#35.1 next.config.mjs Fail-Fast
  Node-Prozessstart (next dev / next build)
     -> next.config.mjs (Modul-Top-Level-Auswertung, VOR jeder Next.js-eigenen Verarbeitung)
        -> configuredApiMediaPatterns(process.env.NEXT_PUBLIC_API_URL)
           -> NEU: try { new URL(trimmed) } catch { throw new Error(<deutsche Meldung
              mit Variablenname UND Wert>) }
           -> bei gueltigem Wert: identisches Verhalten wie heute (kein Verhaltenswechsel
              fuer .env/.env.example, beide aktuell gueltig)
```

### Empfohlene Umsetzungs-Struktur je Befund (kein neuer Ordner)

```
backend/internal/repository/
├── member_profile_contribution_badges_repository.go       # #18: loadContribProjectsCount SQL ändern
├── member_profile_contribution_badges_repository_test.go  # #18: bestehende Postgres-Fixture erweitern
├── app_auth_repository.go                                  # #27: EnsureAppUserForIdentity + loadAppUserByEmail
backend/internal/models/app_auth.go                         # #27: KeycloakIdentity.EmailVerified NEU
backend/internal/middleware/current_user_auth.go             # #27: Claim durchreichen
backend/internal/testsupport/
└── phase188_postgres.go                                     # #27: NEUE Fixture (app_users+users-Vollschema)
backend/cmd/report-orphaned-app-users/
├── main.go                                                  # #27 D-08: CLI-Einstieg, zwei DSNs
├── report.go                                                # #27 D-08: importierbare runReport-Funktion
└── report_test.go                                           # #27 D-08: Test gegen Fixture(n)

frontend/src/lib/images/publicImagePatterns.mjs              # #35.1: try/catch + deutsche Fehlermeldung
frontend/src/lib/images/publicImagePatterns.test.(m)ts        # #35.1: NEUE Testdatei (existiert noch nicht)
```

### Pattern 1 (#18): NULL-Rückfall nach Jellyfin-Sync-Vorbild
**Was:** `anime.max_episodes IS NULL` → bestehende Prüfung/Logik überspringen statt Fehler oder
pauschales "nie vollständig".
**When to use:** Jede Stelle, die `anime.max_episodes` als Vergleichsgröße nutzt.
**Example:**
```go
// Source: backend/internal/handlers/jellyfin_helpers.go:141-144 (bestehendes Vorbild)
func buildJellyfinSyncMismatchReason(maxEpisodes *int16, acceptedUniqueEpisodes int32) *string {
    if maxEpisodes == nil || *maxEpisodes <= 0 || acceptedUniqueEpisodes <= 0 {
        return nil // NULL/0 => Prüfung übersprungen, kein Fehler
    }
    // ...
}
```
Für #18 bedeutet das: Die SQL muss den Rückfall-Zweig (heutige Logik: Nenner = `COUNT(*)` der
`project_versions`-Zeilen je Gruppe) als Alternative zum `max_episodes`-Zweig behalten, nicht ersetzen
— per `CASE WHEN a.max_episodes IS NOT NULL THEN a.max_episodes ELSE <alte COUNT(*)-Formel> END` in der
äußeren Aggregation, oder äquivalent über zwei getrennte `HAVING`-Zweige.

### Pattern 2 (#18): `DISTINCT episode_id` statt `DISTINCT release_version_id` für den Zähler
**Was:** D-06 verlangt, dass Mehrfachversionen derselben Episode nicht mehrfach zählen.
**Wichtig:** Die bestehende `project_versions`-CTE selektiert aktuell `ep.anime_id` (nicht `ep.id`).
Für den neuen Zähler muss `ep.id AS episode_id` zusätzlich selektiert werden, damit
`COUNT(DISTINCT ep.id) FILTER (WHERE ... member_covered ...)` möglich ist. Die bestehende
`member_covered`-CTE (Zeilen 84-88) bleibt unverändert (sie bildet weiterhin `release_version_id` +
`fansub_group_id` ab — das ist die korrekte Granularität für "hat dieser Member einen awarded-Credit
auf dieser Version").

### Pattern 3 (#27): `backend/cmd/<purpose>`-Tool mit importierbarer Kernfunktion
**What:** CLI-Einstieg (`main.go`) bleibt dünn (Env lesen, Pool öffnen, Ergebnis ausgeben); die
eigentliche Logik lebt in einer separaten, von `main()` entkoppelten Funktion, die direkt gegen eine
Postgres-Fixture testbar ist.
**When to use:** Jedes neue Offline-/Hygiene-/Backfill-Tool.
**Example:**
```go
// Source: backend/cmd/migrate-preview-backfill/main.go + backfill.go (bestehendes Vorbild im Repo)
func main() {
    config := Config{DBConnString: getEnv("DATABASE_URL", "..."), DryRun: getEnvBool("DRY_RUN", false)}
    dbpool, _ := pgxpool.New(ctx, config.DBConnString)
    stats, err := runBackfill(ctx, dbpool, config) // <- importierbar, in backfill_test.go gegen echte PG-Fixture geprüft
    // ... Zusammenfassung ausgeben
}
```
Für das Hygiene-Skript (D-08) bedeutet das: `runReport(ctx, teamPool, keycloakPool) (OrphanReport, error)`
als Kernfunktion, in `report_test.go` mit zwei Test-Postgres-Pools (oder einem Fake für die
Keycloak-Seite, falls eine zweite Live-Fixture zu aufwändig wäre) geprüft — **kein** automatisches
Löschen, nur Rückgabe/Ausgabe der Liste (D-08).

### Pattern 4 (#35.1): Fail-fast als geworfener `Error`, nicht `process.exit`
**What:** `configuredApiMediaPatterns` erhält den Rohwert bereits als Funktionsparameter (nicht über
`process.env` direkt) — ein geworfener `Error` mit klarer deutscher Meldung reicht als Fail-Fast-Signal,
weil der Aufruf in `next.config.mjs` bereits bei der Modul-Top-Level-Auswertung passiert (jeder Fehler
dort bricht den gesamten Config-Load/Build/Dev-Start ab, ganz ohne `process.exit`).
**When to use:** Immer wenn die fehlerhafte Eingabe aus einer Server-/Build-Zeit-Umgebungsvariable
stammt (kein Client-Code, kein Request-Handler).
**Example (Zielzustand, NICHT der heutige Code):**
```js
export function configuredApiMediaPatterns(apiBaseURL) {
  const trimmed = (apiBaseURL || '').trim()
  if (!trimmed) return []

  let mediaOrigin
  try {
    mediaOrigin = new URL(trimmed)
  } catch {
    throw new Error(
      `Ungültige Umgebungsvariable NEXT_PUBLIC_API_URL="${trimmed}": kein gültiges URL-Format. ` +
      `Next.js-Konfiguration kann nicht geladen werden.`
    )
  }
  return [{ protocol: mediaOrigin.protocol.slice(0, -1), hostname: mediaOrigin.hostname, port: mediaOrigin.port, pathname: '/api/v1/media/**' }]
}
```
**Bewusst NICHT verwendet:** das `try { new URL(value) } catch { return value }`-Fallback-Muster aus
`frontend/src/lib/publicApiUrl.ts:18-22` (`getBrowserApiBaseUrl`) — das ist Browser-/Request-Zeit-Code
mit explizit anderem Zielverhalten (Fallback statt Fail-Fast, D-09 widerspricht dem ausdrücklich für
diesen Pfad).

### Anti-Patterns to Avoid
- **#18:** Den Nenner NICHT auf Episoden vom Typ `episode` filtern (D-04 ist explizit: alle
  `episode_types` zählen gleichwertig, keine zusätzliche Typ-Filterung einführen).
- **#27:** E-Mail-Match NICHT als alleinige Bedingung verwenden — ohne das `EmailVerified==true`-Gate
  öffnet die Korrektur selbst einen Account-Übernahme-Pfad (D-07 ist hier hart).
- **#27 Tests:** KEIN neuer Quelltext-Grep-Test nach dem Vorbild von
  `TestEnsureAppUserForIdentityStaysAppUserOnly` für das NEUE Verhalten — dieser bestehende Test ist
  laut Projektkonvention ("Teststil"-Abschnitt in CLAUDE.md) eine dokumentierte Altlast/Ausnahme
  (Source-Invarianten-Test), kein Vorbild zum Weiterkopieren für neue Fälle. Für D-07 ist eine echte
  Postgres-Fixture (oder zumindest eine pure, DB-freie Entscheidungsfunktion) erforderlich.
- **#35.1:** NICHT `process.exit(1)` in einem ES-Modul verwenden, das auch von Vitest importiert wird
  (`ResponsiveImage.config.test.ts` importiert `next.config.mjs` direkt) — ein `process.exit` würde den
  Testrunner-Prozess selbst beenden. Ein geworfener `Error` ist das korrekte, testbare Fail-Fast-Mittel.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Keycloak-Subject-Liste beziehen (#27 Hygiene-Skript) | Eigenes HTML-Scraping/Admin-Konsolen-Klicken | Direkter lesender SQL-Zugriff auf die bereits laufende `keycloak-db`-Postgres-Instanz (`user_entity`-Tabelle) ODER die Keycloak Admin REST API (Credentials bereits in `.env`: `KEYCLOAK_ADMIN`/`KEYCLOAK_ADMIN_PASSWORD`) | Beide Zugänge existieren bereits containerisiert/credentialed; kein neuer Integrationspunkt nötig |
| Badge-Tier-Schwellen (#18) | Eigene 1/5/15-Literale erneut inline schreiben | `badges.ContributionProjects` (bereits die autoritative Registry, `backend/internal/badges/thresholds.go:64-68`) | Phase 150 hat genau das bereits zentralisiert; ein Duplikat wäre ein Rückschritt |

**Key insight:** Beide o.g. "Nicht selbst bauen"-Fälle sind keine neuen Libraries, sondern bereits im
Repo vorhandene kanonische Quellen/Zugänge — das eigentliche Risiko dieser Phase ist nicht fehlendes
Tooling, sondern das Nicht-Wiederverwenden bereits vorhandener Strukturen.

## Common Pitfalls

### Pitfall 1: `project_versions`-CTE liefert `ep.anime_id`, aber (noch) nicht `ep.id`
**What goes wrong:** Ein naiver Patch fügt `a.max_episodes` per JOIN hinzu, vergisst aber, dass der
GROUP-BY/HAVING-Vergleich für den NEUEN Zähler `COUNT(DISTINCT ep.id)` statt `COUNT(*)` braucht — ohne
`ep.id` in der CTE-Projektion ist das nicht möglich.
**Why it happens:** Die bestehende Query zählt heute Zeilen (`release_version_id`), nicht Episoden;
die Umstellung auf episodenbasiertes Zählen (D-06) ist ein struktureller Wechsel der Gruppierungsebene,
nicht nur ein zusätzliches `JOIN anime`.
**How to avoid:** `ep.id AS episode_id` explizit in die `project_versions`-CTE aufnehmen (zusätzlich zu
`ep.anime_id`), bevor die Zähler-/Nenner-Logik umgebaut wird.
**Warning signs:** Der neue Test mit einem Anime mit `max_episodes > Anzahl ledger-erfasster
Release-Versionen` und einer Episode mit zwei Release-Versionen (v1 + v2 Re-Release) liefert einen
falschen (zu hohen) Zähler, wenn `DISTINCT episode_id` fehlt.

### Pitfall 2: `EmailVerified` nur in `oidc.go` geparst, aber nirgends gespeichert
**What goes wrong:** `oidc.go` liest `email_verified` bereits korrekt in `KeycloakTokenClaims`
(Zeile 27, Feld bereits vorhanden), aber `current_user_auth.go:85-93` baut `models.KeycloakIdentity`
OHNE dieses Feld — ein naiver Fix könnte versucht sein, den Wert direkt aus einem neu geparsten Token
in `app_auth_repository.go` zu lesen, was eine zweite, inkonsistente Parse-Stelle erzeugen würde.
**Why it happens:** `KeycloakIdentity` (Modell-Grenze zwischen Middleware und Repository) hat aktuell
kein `EmailVerified`-Feld — der Wert "verschwindet" strukturell an dieser Schnittstelle.
**How to avoid:** `EmailVerified bool` zu `models.KeycloakIdentity` hinzufügen UND in
`current_user_auth.go:85-93` aus `claims.EmailVerified` (bereits vorhanden) durchreichen — eine einzige,
bereits etablierte Parse-Stelle bleibt die einzige Quelle.
**Warning signs:** Zwei verschiedene Stellen im Code lesen `email_verified` aus dem rohen JWT.

### Pitfall 3: Fehlende Live-DB-Testinfrastruktur für `app_auth_repository.go` wird mit einem
Grep-Test "gelöst"
**What goes wrong:** Der einzige bestehende Test für `EnsureAppUserForIdentity`
(`TestEnsureAppUserForIdentityStaysAppUserOnly`) ist ein `os.ReadFile` + `strings.Contains`-Test ohne
echten Funktionsaufruf — ein neuer Entwickler könnte versucht sein, den neuen E-Mail-Match-Fall nach
demselben Muster "abzudecken" (z. B. `strings.Contains(body, "loadAppUserByEmail")`).
**Why it happens:** Es gibt aktuell keine Postgres-Fixture, die das volle `app_users`+`users`-Schema
(inkl. `UNIQUE(keycloak_subject)`-Constraint, Legacy-Bridge-Insert) nachbildet — der Weg des geringsten
Widerstands ist ein weiterer Grep-Test.
**How to avoid:** Dies verstößt explizit gegen die projektweite Teststil-Pflicht (Verhaltens-Assertions,
die den Code wirklich ausführen). Stattdessen: (a) eine pure, DB-freie Entscheidungsfunktion extrahieren
(z. B. `shouldResubjectByEmail(emailVerified bool, emailMatchFound bool) bool`) und direkt unit-testen
(deckt D-07s Positiv-/Negativ-Fall exakt, ohne DB), UND (b) eine neue, dedizierte Postgres-Fixture
(`testsupport.OpenPhase188Postgres`, Migration-0072-Schema: `app_users` mit allen Spalten +
`UNIQUE(keycloak_subject)` + `users`-Legacy-Tabelle) für den vollen Transaktionspfad.
**Warning signs:** Ein neuer Test, der eine `.go`-Datei per `os.ReadFile` liest, ohne eine Funktion
tatsächlich aufzurufen.

### Pitfall 4: Hygiene-Skript braucht zwei getrennte Postgres-Instanzen
**What goes wrong:** Ein naiver Entwurf nimmt nur die Team4s-`DATABASE_URL` und versucht, Keycloak-Daten
aus der Team4s-DB zu lesen — es gibt dort keine solche Tabelle. Keycloaks `user_entity` liegt in einer
komplett separaten Postgres-Instanz (Container `keycloak-db`, eigene DB `keycloak`, Host-Port
`${KEYCLOAK_POSTGRES_PORT:-5434}`, siehe `docker-compose.yml:27-39`).
**Why it happens:** Der Live-Cross-Check in `188-CONTEXT.md` ("Cross-Check gegen Keycloak-`user_entity`")
wurde manuell gegen beide DBs gefahren — das Skript muss diesen manuellen Schritt automatisieren, nicht
nur die Team4s-Seite.
**How to avoid:** Zweite Env-Var für die Keycloak-DSN einführen (z. B. `KEYCLOAK_DATABASE_URL`, analog
zum bestehenden `DATABASE_URL`-Muster in `migrate-preview-backfill/main.go`), ODER alternativ die
Keycloak Admin REST API nutzen (Credentials bereits vorhanden: `KEYCLOAK_ADMIN`/`KEYCLOAK_ADMIN_PASSWORD`
in `.env`). Direkter DB-Zugriff ist der schlankere, bereits vom Nutzer selbst verwendete Weg.
**Warning signs:** Das Skript meldet "0 Waisen" in jedem Lauf, auch wenn man testweise eine
`app_users`-Zeile mit offensichtlich falschem `keycloak_subject` einfügt — ein Zeichen, dass die
Keycloak-Seite nie wirklich geprüft wurde (z. B. weil die zweite DSN fehlt und der Code committed,
aber niemals ausgeführt wird).

## Code Examples

### #18 — Zielform der SQL (konzeptionell, exakte Spaltennamen gegen das reale Schema prüfen)
```sql
-- Quelle: Weiterentwicklung von member_profile_contribution_badges_repository.go:70-101,
-- ergänzt um anime.max_episodes (D-04) und episode_id-Projektion (D-06).
WITH project_versions AS (
    SELECT ep.anime_id, ep.id AS episode_id, rvg.fansub_group_id, rv.id AS release_version_id,
           a.max_episodes
    FROM release_versions rv
    JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
    JOIN fansub_releases fr ON fr.id = rv.release_id
    JOIN episodes ep ON ep.id = fr.episode_id
    JOIN anime a ON a.id = ep.anime_id          -- NEU (D-04)
    WHERE EXISTS (
        SELECT 1 FROM release_role_credit_lifecycles l
        WHERE l.release_version_id = rv.id
          AND l.fansub_group_id = rvg.fansub_group_id
          AND l.lifecycle_status = 'awarded'
    )
),
member_covered AS (                              -- unveraendert
    SELECT DISTINCT release_version_id, fansub_group_id
    FROM release_role_credit_lifecycles
    WHERE member_id = $1 AND lifecycle_status = 'awarded'
)
SELECT COUNT(*) FROM (
    SELECT
        pv.anime_id,
        pv.fansub_group_id,
        COALESCE(MAX(pv.max_episodes), COUNT(*)) AS denominator,   -- D-05 Rueckfall
        COUNT(DISTINCT pv.episode_id) FILTER (                     -- D-06
            WHERE EXISTS (
                SELECT 1 FROM member_covered mc
                WHERE mc.release_version_id = pv.release_version_id
                  AND mc.fansub_group_id = pv.fansub_group_id
            )
        ) AS numerator
    FROM project_versions pv
    GROUP BY pv.anime_id, pv.fansub_group_id
    HAVING COUNT(*) > 0
) fully_carried
WHERE numerator >= denominator
```
**Hinweis:** `COALESCE(MAX(pv.max_episodes), COUNT(*))` ist eine Illustration der Rückfall-Idee, keine
geprüfte finale Formel — `MAX()` über eine pro-Gruppe konstante Spalte ist zulässig, aber der Planer
sollte prüfen, ob `anime.max_episodes` tatsächlich je `(anime_id, fansub_group_id)`-Gruppe konstant ist
(ja, da es direkt von `anime_id` abhängt, nicht von der Gruppe) — und ob eine einfachere
`JOIN anime a ON a.id = pv.anime_id` AUSSERHALB der Aggregation (statt in der CTE) lesbarer ist.

### #27 — `KeycloakIdentity`-Erweiterung
```go
// Source: backend/internal/models/app_auth.go:70-79 (Zielzustand)
type KeycloakIdentity struct {
    Subject           string
    Email             string
    EmailVerified     bool // NEU (D-07) -- aus claims.EmailVerified (oidc.go:27, bereits geparst)
    DisplayName       string
    PreferredUsername string
    GivenName         string
    FamilyName        string
    SessionID         string
    ExpiresAt         time.Time
}
```
```go
// Source: backend/internal/middleware/current_user_auth.go:85-94 (Zielzustand, ein Feld ergänzt)
currentUser, err := r.appAuthRepo.ResolveCurrentUser(ctx, models.KeycloakIdentity{
    Subject:           claims.Subject,
    Email:             strings.TrimSpace(claims.Email),
    EmailVerified:     claims.EmailVerified, // NEU
    DisplayName:       displayName,
    // ... unveraendert
}, nil)
```

### #35.1 — bestehendes Gegenbeispiel im selben Repo (NICHT 1:1 übernehmbar, siehe Anti-Patterns)
```ts
// Source: frontend/src/lib/publicApiUrl.ts:15-22 (Fallback-Muster, anderes Zielverhalten als D-09)
try {
  const parsed = new URL(value)
  if (LOOPBACK_HOSTS.has(parsed.hostname)) { return '' }
} catch {
  return value // Fallback statt Fail-Fast -- hier bewusst NICHT das Vorbild für #35.1
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Badge-Nenner = Anzahl jemals vergebener Release-Versionen | Badge-Nenner = `anime.max_episodes` (NULL-Rückfall auf alte Logik) | Diese Phase (D-04/D-05) | 6 bestehende Bronze-Badges auf Anime 1 "Buddy Complex" bleiben laut Live-Datenprüfung unverändert (13 Release-Versionen == `max_episodes=13` zufällig identisch) |
| `email_verified`-Claim wird geparst, aber verworfen | `email_verified` fließt bis `EnsureAppUserForIdentity` durch und gated das Re-Subjecting | Diese Phase (D-07) | Kein bestehendes Verhalten ändert sich für aktuell 9 `app_users`-Zeilen (0 Waisen im Live-Bestand) — reine Vorsorge für künftige Keycloak-Delete+Recreate-Fälle |
| Ungeschütztes `new URL()` auf `NEXT_PUBLIC_API_URL` | Try/catch mit deutscher Fail-Fast-Fehlermeldung | Diese Phase (D-09) | Kein Verhaltenswechsel bei aktuell gültigen `.env`/`.env.example`-Werten; nur der Fehlerfall ändert sich (von unlesbarem `TypeError: Invalid URL` zu klarer deutscher Meldung) |

**Deprecated/outdated:** Keines — alle drei Fixes sind additive Korrekturen an weiterhin aktivem,
produktivem Code.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Das Hygiene-Skript (D-08) sollte per direktem lesenden SQL-Zugriff auf die separate `keycloak-db`-Postgres-Instanz (Tabelle `user_entity`) implementiert werden, nicht über die Keycloak Admin REST API. | Don't Hand-Roll, Pitfall 4, Architecture Patterns | Falls der Nutzer/Planer eine API-basierte Lösung bevorzugt (z. B. weil direkter DB-Zugriff auf die Keycloak-interne Schema-Struktur als zu eng gekoppelt gilt), ändert sich die Implementierung grundlegend (HTTP-Client + Admin-Token statt zweiter pgxpool). D-08 selbst legt den Mechanismus nicht fest — nur "Prüf-/Report-Modus, keine automatische Löschung". |
| A2 | Für #27 ist eine komplett neue Postgres-Test-Fixture (`testsupport.OpenPhase188Postgres`) nötig, weil keine bestehende Fixture das volle `app_users`+`users`-Schema inkl. `UNIQUE(keycloak_subject)`-Constraint abbildet. | Pitfall 3, Recommended Structure | Falls eine bestehende Fixture (z. B. eine noch nicht gefundene) doch wiederverwendbar ist, spart das Aufwand — aber eine gezielte Suche (`grep CREATE TABLE app_users` über alle `testsupport/*.go`) fand nur Minimal-Stubs (`CREATE TABLE app_users (id BIGINT PRIMARY KEY)`), keine Vollschema-Fixture. |
| A3 | Die SQL-Beispielformel `COALESCE(MAX(pv.max_episodes), COUNT(*))` im Code-Beispiel ist eine korrekte Umsetzung von D-04/D-05/D-06 — die exakte Formulierung (insbesondere ob `max_episodes` per CTE oder per äußerem JOIN eingebunden wird) ist nicht gegen eine echte Postgres-Instanz getestet worden. | Code Examples #18 | Eine falsch verschachtelte Aggregation könnte den NULL-Rückfall (D-05) oder die DISTINCT-episode_id-Zählung (D-06) silently brechen; der Plan MUSS diese Query gegen die bestehende Postgres-Fixture (`openContributionBadgesPostgres`) verifizieren, bevor sie als fertig gilt. |

**Wenn diese Tabelle leer wäre:** Sie ist es nicht — drei Annahmen oben benötigen Bestätigung während
der Planung/Ausführung, keine davon ist eine vom Nutzer bereits gesperrte Entscheidung.

## Open Questions (RESOLVED)

Alle drei Fragen sind während der Planung (Orchestrator-Entscheidung bzw. Planer-Umsetzung,
2026-10-19) wie empfohlen aufgelöst — siehe `RESOLVED:`-Zeile je Frage.

1. **Mechanismus des Hygiene-Skript-Zugriffs auf Keycloak-Daten (direkte DB vs. Admin-API)?**
   - What we know: Beide Zugänge existieren bereits (Keycloak-DB-Container mit offenem Host-Port,
     Admin-Credentials in `.env`). Der Nutzer hat seinen eigenen manuellen Cross-Check per direkter
     DB-Abfrage gemacht (CONTEXT.md).
   - What's unclear: Ob der Planer eine neue `KEYCLOAK_DATABASE_URL`-Env-Var einführen darf/soll
     (Kopplung an Keycloaks internes Schema `user_entity`, das sich bei Keycloak-Upgrades ändern
     könnte) oder ob die Admin-REST-API (stabilere Außenschnittstelle) vorzuziehen ist.
   - Recommendation: Direkter DB-Zugriff für den ersten Wurf (schneller, kein HTTP-Client-Aufbau nötig,
     passend zum "einmalig lauffähig"-Charakter aus D-08) — mit explizitem Kommentar im Code, dass dies
     an Keycloaks internes Schema (`user_entity.id = subject`) gekoppelt ist und bei einem
     Keycloak-Major-Upgrade neu zu prüfen wäre.
   - **RESOLVED:** Direkter DB-Zugriff (`KEYCLOAK_DATABASE_URL`, zweite Postgres-Verbindung),
     wie empfohlen — Orchestrator-Entscheidung, da reine Implementierungsdetail-Frage. Umgesetzt in
     `188-03-PLAN.md`.

2. **Exakte SQL-Formulierung für #18 (CTE- vs. äußere JOIN-Platzierung von `anime.max_episodes`)?**
   - What we know: Die konzeptionelle Formel (siehe Code Examples) erfüllt D-04/D-05/D-06 auf dem
     Papier.
   - What's unclear: Ob Postgres mit `MAX(pv.max_episodes)` über eine pro-Gruppe konstante Spalte
     genauso performant/korrekt ist wie ein zusätzlicher äußerer `JOIN anime` direkt in der
     finalen Aggregation — reine Stilfrage, kein Korrektheitsrisiko, aber die Planung sollte das
     festlegen, bevor Tasks geschrieben werden.
   - Recommendation: Während der Planung direkt gegen `openContributionBadgesPostgres` (bestehende
     Fixture) prototypisieren, dann die lesbarere Variante committen.
   - **RESOLVED:** Expliziter äußerer `JOIN anime a ON a.id = ep.anime_id` in der finalen
     Aggregation, mit `COALESCE(a.max_episodes, COUNT(DISTINCT pv.episode_id))` für den
     NULL-Rückfall. Umgesetzt in `188-01-PLAN.md`, Task 2.

3. **Soll die neue `shouldResubjectByEmail`-Pure-Funktion (Pitfall 3) in `app_auth_repository.go`
   selbst leben oder in einer neuen, kleineren Datei?**
   - What we know: `app_auth_repository.go` ist mit aktuell ~348 Zeilen klar unter dem 450-Zeilen-Limit;
     eine kleine Ergänzung (neue Funktion + `loadAppUserByEmail`) sprengt das Limit voraussichtlich
     nicht.
   - What's unclear: Ob der Planer dennoch eine Trennung bevorzugt (z. B. `app_auth_resubject.go`), um
     die reine Entscheidungslogik von der SQL-Transaktionslogik zu trennen (leichter pur zu testen).
   - Recommendation: In derselben Datei belassen, solange die 450-Zeilen-Grenze nicht überschritten
     wird — die CLAUDE.md-Regel verlangt Aufteilung nur bei tatsächlicher Überschreitung, keine
     vorsorgliche Trennung.
   - **RESOLVED:** In `app_auth_repository.go` belassen (bleibt mit Ergänzung bei 347 Zeilen klar
     unter dem Limit). Umgesetzt in `188-02-PLAN.md`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Team4s-Postgres (`team4sv30-db`) | Alle drei Fixes (Live-Verhalten + Tests via `TEAM4S_PHASE*_TEST_DSN`) | ✓ | Postgres 16 (laut CLAUDE.md-Stack) | — |
| Keycloak-Postgres (`keycloak-db`, DB `keycloak`) | Hygiene-Skript (#27, D-08) | ✓ (Container läuft laut `docker-compose.yml`, Host-Port `${KEYCLOAK_POSTGRES_PORT:-5434}`) | Postgres (Keycloak-intern, Version an Keycloak 26.7.2 gekoppelt) | Keycloak Admin REST API (`KEYCLOAK_ADMIN`/`KEYCLOAK_ADMIN_PASSWORD` bereits in `.env`) |
| Go 1.25 / `pgx/v5` / `testify` | Alle Backend-Fixes | ✓ | laut `backend/go.mod` | — |
| Node/Next.js/Vitest | #35.1 | ✓ | laut `frontend/package.json` | — |

**Missing dependencies with no fallback:** keine.

**Missing dependencies with fallback:** Keycloak-DB-Direktzugriff hat die Admin-API als Fallback
(siehe Open Question 1).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (Backend) | Go `testing` + `testify` (require/assert), Postgres-Fixtures über `backend/internal/testsupport` |
| Framework (Frontend) | Vitest 3 |
| Config file (Backend) | kein separates Config-File — Fixtures sind opt-in über `TEAM4S_PHASE<N>_TEST_DSN`-Env-Vars, sonst `t.Skip`/`t.Fatalf` |
| Config file (Frontend) | `frontend/vitest.config.ts` |
| Quick run command (Backend, #18/#27 gezielt) | `go test ./internal/repository/... -run TestLoadContributionBadges` bzw. `-run TestEnsureAppUserForIdentity` (im Backend-Testcontainer mit gesetzten `TEAM4S_PHASE106_TEST_DSN`/`TEAM4S_PHASE188_TEST_DSN`) |
| Quick run command (Frontend, #35.1 gezielt) | `npm run test -- publicImagePatterns` (im `frontend/`-Verzeichnis bzw. Container) |
| Full suite command (Backend) | `scripts/test-backend.sh` |
| Full suite command (Frontend) | `npm run test` (Vitest, volle Suite) |

### Phase Requirements → Test Map
> Diese Phase hat laut Auftrag **keine zugeordneten REQ-IDs** (additiv, TBD in ROADMAP). Die Tabelle
> bildet stattdessen die drei Befunde + ihre Nutzerentscheidungen (D-04 bis D-09) als Prüfgegenstände ab.

| Bezug | Verhalten | Test-Art | Automatisierter Befehl | Datei existiert bereits? |
|-------|-----------|----------|-------------------------|---------------------------|
| D-04/D-05/D-06 (#18) | Neuer Nenner `max_episodes`, NULL-Rückfall, `DISTINCT episode_id`-Zähler | Integration (echte Postgres-Fixture) | `go test ./internal/repository/... -run TestLoadContributionBadgesPostgres` | ✅ Datei existiert, Testfälle müssen ERWEITERT werden (neues Anime mit `max_episodes != 13`, NULL-Fall, Mehrfachversion-Fall) |
| D-07 Positiv (#27) | Verifizierte E-Mail → Re-Subjecting (bestehende Zeile wird wiederverwendet) | Integration (neue Postgres-Fixture) | `go test ./internal/repository/... -run TestEnsureAppUserForIdentityResubjects` | ❌ Wave 0 (neue Fixture + neue Testdatei nötig) |
| D-07 Negativ (#27) | Unverifizierte E-Mail → KEIN Re-Subjecting (neue Zeile wie heute) | Integration (dieselbe neue Fixture) | `go test ./internal/repository/... -run TestEnsureAppUserForIdentityDoesNotResubjectUnverified` | ❌ Wave 0 (gleiche Fixture wie oben) |
| D-08 (#27) | Hygiene-Skript listet Waisen, löscht nichts | Integration (Team4s-Fixture + Keycloak-Fixture ODER Fake für Keycloak-Seite) | `go test ./cmd/report-orphaned-app-users/...` | ❌ Wave 0 (komplett neues Paket) |
| D-09 (#35.1) | Ungültiger `NEXT_PUBLIC_API_URL`-Wert wirft klare deutsche Fehlermeldung | Unit (reine Funktion, kein DOM/Browser) | `npm run test -- publicImagePatterns` | ❌ Wave 0 (neue Testdatei, Funktion existiert bereits aber ungetestet für den Fehlerfall) |

### Sampling Rate
- **Per task commit:** jeweils die oben genannten gezielten Befehle für den gerade geänderten Befund.
- **Per wave merge:** volle Backend-Fixture-Suite (`go test ./internal/repository/... ./cmd/...` mit
  allen gesetzten `TEAM4S_PHASE*_TEST_DSN`) + `npm run test` (Frontend).
- **Phase gate:** `scripts/test-backend.sh` (volles Gate, reproduziert alle `*_TEST_DSN`-Fixtures frisch)
  UND volle Frontend-Suite grün, bevor `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `backend/internal/testsupport/phase188_postgres.go` — `OpenPhase188Postgres` mit vollem
      Migration-0072-Schema (`app_users` inkl. `UNIQUE(keycloak_subject)`, `users`-Legacy-Tabelle)
- [ ] `backend/internal/repository/app_auth_repository_postgres_test.go` (oder gleichnamig erweitert)
      — Positiv-/Negativ-Fall D-07
- [ ] `backend/cmd/report-orphaned-app-users/` — komplettes neues Paket (main.go, report.go,
      report_test.go)
- [ ] `frontend/src/lib/images/publicImagePatterns.test.ts` (oder `.mjs`, je nach Vitest-TS-Handling
      für `.mjs`-Quelldateien im Projekt prüfen) — Fail-Fast-Testfall für D-09
- Framework-Install: keines nötig — alle Test-Frameworks sind bereits vorhanden.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | **Ja** (#27) | Keycloak-OIDC bleibt alleinige Quelle der Wahrheit; das neue E-Mail-Re-Subjecting darf NIEMALS ohne `email_verified==true`-Gate greifen (D-07) — kein Hand-Rolling einer eigenen Verifizierungslogik, der Claim kommt direkt vom bereits verifizierten Token |
| V3 Session Management | Nein | Diese Phase ändert keine Session-/Token-Lebensdauer-Logik |
| V4 Access Control | Nein | Keine neuen Rollen/Capabilities, kein neuer Endpunkt mit Autorisierungsbedarf (das Hygiene-Skript ist ein Offline-CLI-Tool, kein HTTP-Endpunkt) |
| V5 Input Validation | **Ja** (#35.1) | `new URL()`-Parsing bleibt die Validierungsquelle (Stdlib), nur die Fehlerbehandlung wird robuster — kein eigener URL-Parser |
| V6 Cryptography | Nein | Keine kryptografischen Operationen in dieser Phase |

### Known Threat Patterns für diesen Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Account-Übernahme über unverifizierte E-Mail beim Re-Subjecting | Spoofing | `email_verified==true`-Gate (D-07) — ein Angreifer, der ein Keycloak-Konto mit fremder, nicht verifizierter E-Mail anlegt, kann nie ein bestehendes `app_users`-Konto übernehmen |
| Information Disclosure durch das Hygiene-Skript (E-Mail-Adressen im Klartext-Report) | Information Disclosure | Reiner CLI-Report (stdout/Logdatei), kein HTTP-Endpunkt, kein Zugriff durch normale Nutzer — Zugriff ist bereits durch Shell-/Container-Zugang beschränkt (gleiche Vertrauensstufe wie `migrate-preview-backfill` heute) |
| SQL-Injection über den neuen `loadAppUserByEmail`-Query | Tampering | Ausschließlich parametrisierte `pgx`-Queries (`$1`-Platzhalter), wie im gesamten bestehenden Repository-Code durchgängig praktiziert — kein String-Concat |

## Sources

### Primary (HIGH confidence — direktes Lesen des betroffenen Codes in diesem Repo)
- `backend/internal/repository/member_profile_contribution_badges_repository.go` (Zeilen 1-208, vollständig gelesen)
- `backend/internal/repository/member_profile_contribution_badges_repository_test.go` (vollständig gelesen, Postgres-Fixture-Muster bestätigt)
- `backend/internal/repository/app_auth_repository.go` (vollständig gelesen)
- `backend/internal/repository/app_auth_repository_test.go` (vollständig gelesen, Source-Invarianten-Test-Charakter bestätigt)
- `backend/internal/models/app_auth.go` (vollständig gelesen)
- `backend/internal/middleware/current_user_auth.go` (vollständig gelesen)
- `backend/internal/auth/oidc.go` (vollständig gelesen, `EmailVerified` bereits vorhanden bestätigt)
- `backend/internal/badges/thresholds.go` (Zeilen 1-80 gelesen, `ContributionProjects`-Registry bestätigt)
- `backend/internal/testsupport/phase106_postgres.go`, `phase128_postgres.go`, `phase187_postgres.go` (Fixture-Muster-Konventionen bestätigt)
- `backend/internal/testsupport/*` grep nach `CREATE TABLE app_users` (bestätigt: nur Minimal-Stubs, keine Vollschema-Fixture vorhanden)
- `backend/cmd/migrate-preview-backfill/main.go`, `backend/cmd/migrate-display-backfill/` (Verzeichnislisting, `cmd/`-Tool-Konvention bestätigt)
- `frontend/src/lib/images/publicImagePatterns.mjs` (vollständig gelesen)
- `frontend/next.config.mjs` (vollständig gelesen)
- `frontend/src/lib/publicApiUrl.ts` (vollständig gelesen)
- `frontend/src/lib/publicApiUrl.test.ts` (Zeilen 1-80 gelesen, `vi.stubEnv`-Testmuster bestätigt)
- `frontend/src/components/ui/ResponsiveImage.config.test.ts` (bestätigt: importiert `next.config.mjs` direkt, aktuell nur gültige Werte getestet)
- `database/migrations/0072_keycloak_app_users_foundation.up.sql` (vollständiges Schema gelesen)
- `database/migrations/0001_init_anime.up.sql` (Zeile 29, `max_episodes SMALLINT` bestätigt)
- `docker-compose.yml` (Zeilen 27-91, Keycloak-DB-Container-Konfiguration bestätigt)
- `.env.example` (Keycloak-Env-Var-Namen bestätigt)
- `.planning/phases/188-.../188-CONTEXT.md` (vollständig gelesen — Ist-Analyse und alle Nutzerentscheidungen D-01 bis D-09)
- `.planning/config.json` (Workflow-Flags gelesen: `nyquist_validation: true`, `security_enforcement` nicht gesetzt → aktiv)

### Secondary / Tertiary
- Keine — diese Recherche kam vollständig ohne Websuche aus, wie im Research-Scope gefordert (reines
  internes Korrektheitspaket, kein externes Framework-Wissen nötig).

## Metadata

**Confidence breakdown:**
- Standard stack: entfällt (kein neues Paket)
- Architecture: HIGH — alle Muster direkt aus bestehendem, funktionierendem Code dieses Repos abgeleitet
- Pitfalls: HIGH — jeder Pitfall ist durch konkrete Code-/Test-Stellen belegt, nicht spekulativ
- Offene Punkte (Keycloak-DB-Zugriffsmechanismus, exakte SQL-Formulierung): MEDIUM — technisch lösbar,
  aber nicht vom Nutzer vorab final festgelegt (siehe Assumptions Log A1/A3)

**Research date:** 2026-10-19
**Valid until:** Stabil, solange `#18`/`#27`/`#35.1`-Code nicht durch andere Phasen zwischenzeitlich
verändert wird — da diese Phase direkt nach Erstellung des CONTEXT.md geplant wird, keine
Ablaufgefahr vor Planungsbeginn.

---

## Nachtrag: Bug "Leader/Projektleiter kann Projektzeitraum nicht setzen" (Plan 188-05, 2026-10-19)

**Confidence:** HIGH — alle Fundstellen direkt gelesen (zwei unabhängige Explore-Durchläufe plus
eigene Live-DB-Abfragen, siehe `188-CONTEXT.md`-Abschnitt "Erweiterung: Bug …" für die vollständigen
Zitate und Live-Daten). Dieser Nachtrag ergänzt ausschließlich Architektur-Vorlage, Code-Beispiele,
Datei-Split- und Testfixture-Strategie für Plan 188-05 — die Ist-Analyse selbst steht in
`188-CONTEXT.md` (D-10 bis D-14).

### Architecture Pattern: `CanForReleaseVersion` als Vorlage für eine neue `CanForAnimeProject`

Das gesuchte "Gruppe + Projektkontext"-Muster existiert bereits für die Release-Version-Ebene und ist
1:1 auf die Anime-Projekt-Ebene übertragbar:

| Release-Version-Ebene (existiert) | Anime-Projekt-Ebene (neu zu bauen) |
|---|---|
| `Resolver.ListActorContributionRolesForVersion(ctx, appUserID, releaseVersionID) ([]string, error)` (`permissions.go:354`, impl. `authz_permissions.go:507-588`) | `Resolver.ListActorContributionRolesForAnimeProject(ctx, appUserID, animeID, fansubGroupID) ([]string, error)` — neue Interface-Methode auf demselben `Resolver`-Interface |
| `Service.CanForReleaseVersion(ctx, actor, action, releaseVersionID) (Result, error)` (`permissions.go:626-707`) | `Service.CanForAnimeProject(ctx, actor, action, animeID, fansubGroupID) (Result, error)` — neue Methode auf demselben `Service` |
| Schritt 1: `ResolveReleaseVersion` liefert `FansubGroupIDs` | Entfällt — `fansubGroupID` ist hier bereits bekannter Eingabeparameter (kommt aus der Route), kein Resolve nötig |
| Schritt 2: `canForReleaseVersionGroupRole` → `ResolveGroupRights(actor, fansubGroupID)` je Gruppe | Direkt: `ResolveGroupRights(ctx, actor, fansubGroupID)` (bereits existierende, wiederverwendbare Methode, `permissions.go`, von `CanForFansubGroup`/`canForContext` ebenfalls genutzt) |
| Schritt 3: `ListActorContributionRolesForVersion` + `roleAllows(code, action)`-Schleife | Identisches Muster: `ListActorContributionRolesForAnimeProject` + dieselbe `roleAllows`-Schleife (öffentliche Package-Funktion, bereits vorhanden) |

**Wichtiger Unterschied zur bestehenden Methode (bewusst, laut Nutzervorgabe D-12):** Die neue
`ListActorContributionRolesForAnimeProject`-Query MUSS `anime_contributions.status = 'confirmed'`
filtern — die bestehende `ListActorContributionRolesForVersion` tut das NICHT (sie akzeptiert jeden
Status). Das ist eine neue, eigenständige Methode, keine Parametrisierung der bestehenden — die
bestehende Methode bleibt für die Release-Version-Ebene unverändert (andere Anrufer, andere
Entscheidung, nicht Teil dieses Bugfixes).

**Konzeptionelle SQL (Vorlage, exakte Spalten/Join-Reihenfolge gegen das reale Schema prüfen):**
```sql
-- Analog zu authz_permissions.go:553-570 (Schritt 2 / anime-weiter Fallback-Zweig dort),
-- aber direkt ueber (animeID, fansubGroupID) parametrisiert statt ueber eine Release-Version
-- abgeleitet, UND mit status='confirmed'-Filter (D-12, bewusster Unterschied zur
-- bestehenden Methode).
SELECT DISTINCT acr.role_code
FROM anime_contributions ac
JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
JOIN fansub_group_members fgm ON fgm.member_id = ac.member_id
  AND fgm.fansub_group_id = ac.fansub_group_id
WHERE ac.anime_id = $1
  AND ac.fansub_group_id = $2
  AND ac.status = 'confirmed'
  AND fgm.app_user_id = $3
  AND fgm.status = 'active'
ORDER BY acr.role_code
```

**Aufrufstellen, die auf die neue `CanForAnimeProject`-Methode umgestellt werden:**
1. `requireAnimeProjectTimelineWriteAccess` (`admin_content_anime_project_timeline.go:62-90`) — muss
   zusätzlich `animeID` aus `c.Param("animeId")` parsen (Validierung analog zu
   `UpdateAnimeFansubProjectTimeline`s eigenem Parsing, Zeile 103-106) und
   `CanForAnimeProject(ctx, actor, ActionAnimeFansubProjectTimelineUpdate, animeID, fansubID)` statt
   `CanForFansubGroup(...)` aufrufen.
2. `GetFansubGroupCapabilities` (`app_auth_capabilities.go:44-...,116-120`) — Route
   `GET /admin/fansubs/:id/capabilities` braucht einen **optionalen** Query-Parameter `anime_id`
   (`admin_routes.go:221`, Route-Signatur selbst muss nicht geändert werden, nur der Handler liest
   `c.Query("anime_id")` zusätzlich). Ist `anime_id` gesetzt und gültig (`> 0`), wird
   `CanEditProjectTimeline` über `CanForAnimeProject` berechnet; ist der Parameter leer/fehlt, bleibt
   das bestehende gruppenweite `CanForFansubGroup`-Verhalten exakt erhalten (Abwärtskompatibilität für
   alle anderen Capability-Felder und für Aufrufer ohne `anime_id`).
3. Frontend: `AnimeProjectTimelineSection.tsx` (hat `animeId`/`fansubId`/`expanded` bereits als Props,
   lädt den Timeline-Inhalt bereits lazy nur bei `expanded`, Zeilen 36-59) bekommt denselben
   lazy-`useEffect`-Aufruf für ein neues `getFansubGroupCapabilities(fansubId, { animeId })` (oder
   äquivalent erweiterter API-Client-Aufruf in `frontend/src/lib/api.ts`/`frontend/src/lib/api/`), statt
   die gruppenweite `canEdit`-Prop aus `AnimeReleasesCockpit.tsx` ungefiltert durchzureichen. Die
   bestehende `canEditProjectTimeline`-Prop-Kette (`FansubEditClient.tsx:159-160` →
   `AnimeReleasesCockpit.tsx:294-303` → `AnimeProjectTimelineSection`) kann als **Fallback/Default**
   erhalten bleiben (z. B. während das projektspezifische Capability noch lädt), muss aber durch das
   projektspezifische Ergebnis überschrieben werden, sobald es vorliegt.

### Datei-Split-Pflicht (D-14) — konkrete Kandidaten

| Datei | Aktuell | Betroffen durch | Hinweis für den Split |
|---|---|---|---|
| `backend/internal/permissions/permissions.go` | 970 Zeilen | Neue `CanForAnimeProject`-Methode | Datei enthält bereits klar abgrenzbare thematische Blöcke (Typen/Constants, `CanForFansubGroup`/`canForContext`, `CanForRelease*`-Familie, Cache-Loading `LoadCache`/`ReloadCache`). Ein Split entlang dieser Linien (z. B. `permissions_types.go`, `permissions_group.go`, `permissions_release.go`, `permissions_cache.go`) ist naheliegend — Planer muss konkrete Grenzen anhand der tatsächlichen Code-Struktur ziehen, reiner Umbau-Commit zuerst. |
| `backend/internal/repository/authz_permissions.go` | 588 Zeilen | Neue `ListActorContributionRolesForAnimeProject`-Methode | Enthält bereits mehrere unabhängige Resolver-Methoden (`ListActorGroupRoles`, `LoadRoleCapabilities`, `LoadFansubGroupRoles`, `LoadCapabilityRoles`, `ListActorContributionRolesForVersion`) — Split entlang Loader- vs. Resolver-Zuständigkeit möglich. |
| `frontend/src/app/admin/fansubs/[id]/edit/AnimeReleasesCockpit.tsx` | 507 Zeilen | Capability-Wiring pro Projekt-Zeile ändert sich | Datei rendert bereits mehrere unabhängige Akkordeon-Abschnitte pro Anime-Projekt (Timeline, Notes, Contributors) — Extraktion der Projekt-Zeilen-Rendering-Logik in eine eigene Komponente ist ein naheliegender Schnitt. |

Alle drei Splits folgen der bereits etablierten CLAUDE.md-/Phase-184/187-Konvention: reiner
Umbau-Commit zuerst (Verhalten unverändert, Tests/Typecheck grün, öffentliche
Schnittstellen/Importe bleiben stabil oder werden im selben Commit vollständig nachgezogen), danach
erst der inhaltliche Fix als separater Commit.

### Test-Strategie (echte Postgres-Fixture, kein Mock/Stub-Only)

Der bestehende Handler-Test (`admin_content_anime_project_timeline_test.go`) nutzt einen reinen
In-Memory-Stub-Resolver (`permissionResolverStub` aus `app_auth_test.go:170-201`), dessen
`ListActorContributionRolesForVersion`-Implementierung immer `nil, nil` liefert — für die neuen
Fälle ("Leader ohne Projektrolle", "Gruppenmitglied ohne Rechte aber Projekt-project_lead
bestätigt", "Projektrolle unbestätigt → kein Recht", "Projektrolle bei anderem Anime → kein Recht",
"typesetter → kein Recht mehr") reicht ein Stub, der auch `ListActorContributionRolesForAnimeProject`
simulieren kann (einfache Erweiterung desselben Stub-Patterns um ein konfigurierbares
Rückgabe-Feld) — für `Service.CanForAnimeProject`-Unit-Tests (reine Entscheidungslogik, kein
SQL) ist das ausreichend und schnell.

Für die SQL-Query selbst (`ListActorContributionRolesForAnimeProject`-Resolver-Implementierung in
`authz_permissions.go`) braucht es eine **echte Postgres-Fixture**, da hier genau die
`status='confirmed'`-Filterung bewiesen werden muss (Teststil-Pflicht: Verhaltens-Assertion, die den
Code wirklich ausführt). Es existiert aktuell **keine** Fixture, die `anime_contributions` +
`anime_contribution_roles` + `fansub_group_members` gemeinsam mit den exakten, für diese Phase
relevanten Spalten (`status`, `anime_id`, `fansub_group_id`, `member_id`, `role_code`) bereitstellt.
Nächstliegendes Vorbild: `backend/internal/testsupport/phase150_postgres.go` (`OpenPhase150Postgres`,
`createPhase150Prerequisites`) — baut spaltengetreue Minimal-Stand-ins für `anime_contributions` u. a.
nach, explizit **ohne** die volle Migrationskette zu laden (Begründungskommentar Zeilen 20-27 dort:
vermeidet unnötige `role_definitions`/`anime`/`fansub_groups`-Stand-ins nur für FK-Zwänge). Für Plan
188-05 empfiehlt sich ein neuer `backend/internal/testsupport/phase188_permissions_postgres.go` nach
exakt diesem Muster, mit Stand-ins für `anime_contributions` (inkl. `status`), `anime_contribution_roles`
(`anime_contribution_id`, `role_code`), `fansub_group_members` (`member_id`, `fansub_group_id`,
`app_user_id`, `status`). `role_capabilities`/`role_allows` selbst muss NICHT aus der DB gelesen
werden — das läuft über den In-Memory-Cache (`permissions.LoadCache`/`roleAllows`), der in Tests
direkt über einen einfachen Test-`CacheLoader` (Map-Literal) befüllt werden kann, ohne eine
`role_capabilities`-Tabelle in der Fixture zu benötigen.

### Migrations-Hinweis

Nächste freie Nummer: **0185**. Zwei getrennte Migrationsdateien empfohlen (eine je Rolle/Richtung,
analog zum bestehenden `0157`-Einzelzweck-Muster), oder eine kombinierte Datei mit zwei klar
kommentierten Blöcken — Planer entscheidet, beide additiv/gezielt wie in `188-CONTEXT.md` D-10/D-11
festgelegt (kein `DELETE FROM role_capabilities;` ohne `WHERE`).

### Live-UAT-Reproduktionsschritte (Referenz für den blockierenden Checkpoint)

1. Backend neu bauen/starten (`docker compose up -d --build team4sv30-backend` oder äquivalent) und
   Frontend neu starten, damit Migration + Permission-Cache-Reload wirken.
2. Login als `app_user 6` (Leader, Strawhat Subs).
3. `/admin/fansubs/26/edit` → Projekt „11eyes: Pink Phantasmagoria“ (Anime 3) aufklappen.
4. Projektzeitraum-Datumsfelder müssen jetzt editierbar sein (heute: gesperrt) — Speichern muss
   erfolgreich sein.
