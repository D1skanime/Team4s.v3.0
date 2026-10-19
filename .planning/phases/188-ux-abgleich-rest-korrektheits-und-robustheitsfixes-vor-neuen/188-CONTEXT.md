# Phase 188: UX-Abgleich-Rest — Korrektheits- und Robustheitsfixes vor neuen Features — CONTEXT

**Quelle des Auftrags:** `.planning/notes/2026-10-17-ux-findings-abgleich.md`. Vom Nutzer am
2026-10-19 entschieden: additiv an ROADMAP angehängt, kein neues Milestone. Dieses Dokument ist
reine Ist-Analyse + offene Fragen — **nicht geplant, nicht ausgeführt, keine
Produktcode-Änderung.**

## Problem (laut Auftrag)

Drei offene UX-Befunde aus dem Abgleich vom 2026-10-17 sollen vor neuen Features bereinigt werden:

- **#18** (hoch, Korrektheit): Projekt-Badge "vollständig mitgetragen" (Familie "Mitgetragene
  Projekte") nutzt einen Nenner, der mit der Anzahl bereits vergebener Credits mitwächst —
  theoretisch reicht eine einzige verlinkte Release-Version, um sofort "vollständig" zu gelten.
- **#27** (mittel, Datenkonsistenz): Bei Keycloak-Delete+Recreate entsteht ein verwaister
  `app_users`-Datensatz, der in der Admin-Mitgliedersuche als zweiter, nicht einloggbarer Treffer
  auftaucht.
- **#35.1** (mittel, Robustheit): Eine fehlerhafte `NEXT_PUBLIC_API_URL` lässt `new URL()` ohne
  try/catch werfen und reißt den gesamten Next.js-Config-Load mit.

## Nutzerentscheidungen (final gesetzt — nicht neu verhandeln)

### D-01 — Scope: genau drei Befunde, vor neuen Features
Diese Phase bearbeitet ausschließlich #18, #27, #35.1. Entschieden, weil diese Befunde
Korrektheits- bzw. Robustheitsprobleme sind (kein Design-Ermessen), die vor neuer Feature-Arbeit
geschlossen werden sollen.

### D-02 — #16 zusammengeführt, nicht Teil dieser Phase
"Release-Versionen ohne eigene Quelle" (#16) ist bereits Gegenstand von
`.planning/todos/pending/2026-10-19-releases-ohne-jellyfin-datei.md` (aus Phase 187 entstanden).
Umgesetzt: Querverweis im Todo ergänzt, #16 in der Abgleich-Notiz als "ZUSAMMENGEFÜHRT" markiert
(siehe `.planning/notes/2026-10-17-ux-findings-abgleich.md`, Zusammenfassungstabelle und Zeile #16).

### D-03 — #17 und #14 bleiben offen, außerhalb dieser Phase
#17 (Punktekatalog-Fairness) ist eine reine Designfrage ohne Code-Defekt, #14 (Transcoding) ist ein
eigenständig großes Feature. Beide bleiben unverändert als OFFEN in der Abgleich-Notiz stehen.

## Verbindliche Vorgaben für alle späteren Schritte (Planung + Ausführung)

- **Bestehende UI/Komponenten wiederverwenden:** `@/components/ui`-Primitives
  (`Button`, `Select`, `FormField`, `Modal`, `Input`, `Textarea`, …) statt handgebauter nativer
  Elemente — gilt für jede neue Fehlermeldung/UI-Oberfläche in dieser Phase.
- **Produktverhalten nie ändern, nur um Tests grün zu machen.**
- **Teststil:** Verhaltens-Assertions führen den geprüften Code tatsächlich aus (Handler via
  `httptest` gegen Fake-Repository mit Statuscode-/Body-Prüfung, oder reine Logik-Funktionen direkt
  aufrufen). Keine Render-/Klick-Simulationstests, kein Quelltext-Grep-Test (Ausnahmen: echte
  Abwesenheitsprüfungen oder SQL-Migrationen als Prüfgegenstand selbst).
- **Dateien ≤ 450 Zeilen:** Wer eine Produktdatei über dem Limit inhaltlich anfasst, teilt sie im
  selben Auftrag auf (reiner Umbau-Commit zuerst, Verhalten unverändert, Tests/Typecheck grün,
  danach erst die inhaltliche Änderung). Betroffene Kandidaten-Dateien dieser Phase liegen aktuell
  alle unter dem Limit (siehe Dateien-Inventur je Abschnitt unten).
- **Deutsche UI-Texte mit echten Umlauten** (ä/ö/ü/ß), keine ASCII-Ersetzungen.
- **Testdaten für spätere Live-UAT:** über die echten Anlegepfade bzw. vollständig wie ein
  vorhandener Bestandsdatensatz anlegen und vorher selbst im Browser/API prüfen.

## Ist-Zustand (Code- und Datenbestands-Inventur, Stand 2026-10-19)

### #18 — Badge "Mitgetragene Projekte" (interner Name: `contribution_projects`)

**Es gibt keinen wörtlichen UI-String "vollständig mitgetragen"** — das ist die interne
Backend-Bezeichnung des Konzepts. Das tatsächlich gerenderte Label ist **"Mitgetragene Projekte"**
mit Bronze/Silber/Gold-Stufen.

**Backend-Ort der Berechnung:**
`backend/internal/repository/member_profile_contribution_badges_repository.go`:
- `loadContribProjectsCount` (Zeile 68-105) — berechnet die Rohzahl "vollständig mitgetragener
  Projekte" für einen Member.
- `highestContribProjectsTier` (Zeile 25-27) — mappt Rohzahl auf Bronze/Silber/Gold.
- Schwellen: `backend/internal/badges/thresholds.go:62-67` (`ContributionProjects`: Bronze ab 1,
  Silber ab 5, Gold ab 15).

Aufrufstellen (beide genannten Seiten):
- `/me/profile` → `GetOwnDashboard` → `member_profile_dashboard_repository.go:202`
- `/members/[slug]` → `GetPublicMemberProfile` → `member_profile_public_repository.go:163,177`

**Exakte SQL-Logik** (`member_profile_contribution_badges_repository.go:70-101`, vereinfacht):

```sql
WITH project_versions AS (            -- alle Release-Versionen eines Anime+Gruppen-Paares,
    SELECT ep.anime_id, rvg.fansub_group_id, rv.id AS release_version_id   -- für die IRGENDWANN
    FROM release_versions rv                                               -- IRGENDJEMAND einen
    JOIN release_version_groups rvg ON rvg.release_version_id = rv.id      -- awarded-Credit hat
    JOIN fansub_releases fr ON fr.id = rv.release_id
    JOIN episodes ep ON ep.id = fr.episode_id
    WHERE EXISTS (SELECT 1 FROM release_role_credit_lifecycles l
                  WHERE l.release_version_id = rv.id
                    AND l.fansub_group_id = rvg.fansub_group_id
                    AND l.lifecycle_status = 'awarded')
),
member_covered AS (                   -- Release-Versionen, die GENAU DIESER Member abdeckt
    SELECT DISTINCT release_version_id, fansub_group_id
    FROM release_role_credit_lifecycles
    WHERE member_id = $1 AND lifecycle_status = 'awarded'
)
SELECT COUNT(*) FROM (
    SELECT pv.anime_id, pv.fansub_group_id
    FROM project_versions pv
    GROUP BY pv.anime_id, pv.fansub_group_id
    HAVING COUNT(*) > 0
       AND COUNT(*) = COUNT(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM member_covered mc
            WHERE mc.release_version_id = pv.release_version_id
              AND mc.fansub_group_id = pv.fansub_group_id))
) fully_carried
```

**Nenner heute:** Anzahl Release-Versionen dieses Anime+Gruppen-Paares, für die *irgendein*
Mitglied jemals einen `awarded`-Credit hat — **nicht** `anime.max_episodes`, **nicht** die
Gesamtzahl der tatsächlichen Episoden. "Vollständig" bedeutet im Code: Zähler == Nenner, d. h. der
Member deckt alle bisher jemals gutgeschriebenen Release-Versionen ab. Testbeweis:
`member_profile_contribution_badges_repository_test.go:329-345` — mit genau 2 vergebenen
Release-Versionen liefert die Query bereits `1` ("ein vollständig mitgetragenes Projekt").

**Bezug zu `anime.max_episodes`:** Spalte existiert (`database/migrations/0001_init_anime.up.sql:29`,
nullable `SMALLINT`), **taucht aber an keiner Stelle** in der Badge-/Profil-Query auf (grep-bestätigt
über `member_profile_contribution_badges_repository.go`, `member_profile_progress_repository.go`,
`member_profile_dashboard_repository.go`). Das Feld wird heute ausschließlich im
Admin-Content-/Jellyfin-Sync-Code verwendet.

**Episode/Special/OVA-Unterscheidung:** Existiert als Lookup-Tabelle `episode_types`
(`database/migrations/0031_add_episode_types_table.up.sql`), 10 Werte: `episode`, `special`, `ova`,
`ona`, `movie`, `recap`, `preview`, `prologue`, `epilogue`, `bonus`. Die Badge-Query filtert/gewichtet
**nicht** danach — alle Typen fließen gleichwertig ein.

**Umgang mit `max_episodes IS NULL`:** Kein Code-Pfad liest `max_episodes` für die Badge-Berechnung,
also auch kein expliziter NULL-Umgang. Etabliertes Vorbild existiert im Jellyfin-Sync-Code
(`backend/internal/handlers/jellyfin_helpers.go:141-144`): `maxEpisodes == nil` → Prüfung wird
übersprungen, kein Fehler (bestätigt durch Test `TestBuildJellyfinSyncMismatchReason_NilMaxEpisodes`).

**User→Release-Version-Verknüpfung:** Tabelle `release_role_credit_lifecycles`
(`database/migrations/0091_anime_contributions_release_version.up.sql`), Spalten
`release_version_id`, `fansub_group_id`, `member_id`, `role_code`, `lifecycle_status`
(`pending|awarded|reversed`). Nur `lifecycle_status='awarded'` zählt.

**Frontend-Rendering:**
- Badge-Label: `frontend/src/components/profile/memberBadgeLabels.ts:101-103` ("Mitgetragene
  Projekte · Bronze/Silber/Gold").
- Familie/Fortschrittstext: `frontend/src/components/profile/memberBadgeFamilies.ts:216-218`
  (`unitSingular: 'mitgetragenes Projekt'`, `unitPlural: 'mitgetragene Projekte'`).
- Gerendert in `frontend/src/components/profile/MemberBadgeChain.tsx`, eingebunden über
  `frontend/src/app/me/profile/components/AchievementBadgesCard.tsx` und
  `frontend/src/app/members/[slug]/MemberProfileContent.tsx`.

**Speicherung — kein Backfill nötig:** Diese Badge-Familie wird **live bei jedem Seitenaufruf
berechnet**, nicht aus der persistenten Tabelle `member_badges` gelesen (ausdrücklicher Code-
Kommentar `member_profile_dashboard_repository.go:159`: "nicht aus member_badges"). Eine
Logik-Korrektur wirkt also sofort beim nächsten Profilaufruf, ohne Migrations-/Backfill-Schritt.

**Live-Auswirkung auf Bestandsdaten (2026-10-19, nur lesende Abfragen, keine Änderung):**
- Aktuell hat **genau ein** Projekt überhaupt `awarded`-Credits: Anime 1 ("Buddy Complex",
  `max_episodes=13`, alle 13 Episoden vom Typ `episode`, keine Specials/OVAs), Fansub-Gruppe 1,
  mit 13 Release-Versionen (1:1 zu den 13 Episoden, keine Mehrfachversionen).
- 6 Mitglieder (IDs 2, 4, 5, 8, 10, 11) haben heute den "vollständig mitgetragen"-Status für dieses
  eine Projekt (13/13 Release-Versionen) und damit die Bronze-Stufe von "Mitgetragene Projekte".
  1 Mitglied (ID 7) deckt nur 12/13 ab — nicht vollständig.
- **Unter der vorgeschlagenen Umstellung auf `anime.max_episodes` als Nenner ändert sich für diese
  6 Badges aktuell NICHTS** — 13 Release-Versionen entsprechen zufällig exakt `max_episodes=13`,
  da dieses einzige Bestandsprojekt weder Specials/OVAs noch Mehrfachversionen pro Episode hat. Die
  Lücke ist aktuell nicht an echten Daten sichtbar, aber strukturell real: Ein Projekt mit z. B. nur
  3 von 24 Episoden released würde nach heutiger Logik bei 3/3 "vollständig" anzeigen, nach
  `max_episodes`-Logik korrekt bei 3/24.
- Kein Anime hat `max_episodes IS NULL` (0 von 12 Bestandsanime), die NULL-Frage ist also aktuell
  nicht akut, aber zukunftsrelevant.

### #27 — Verwaister `app_users`-Datensatz nach Keycloak-Delete+Recreate

**`EnsureAppUserForIdentity`:** `backend/internal/repository/app_auth_repository.go:45-188`. Matching
ausschließlich über `loadAppUserBySubject` (Zeile 270-298): `WHERE keycloak_subject = $1` — **kein**
E-Mail-Fallback. Findet sich kein Treffer (`found == false`), wird **immer** eine neue Zeile
eingefügt (Zeile 74-129), unabhängig davon, ob bereits eine Zeile mit derselben `email` existiert.

**Schema:** `app_users.email` ist `NOT NULL`, aber **nicht `UNIQUE`**
(`database/migrations/0072_keycloak_app_users_foundation.up.sql:7` vs. Zeile 17, wo nur
`keycloak_subject` ein `UNIQUE`-Constraint hat). Nichts in der DB verhindert zwei Zeilen mit
derselben E-Mail.

**Was beim Delete+Recreate passiert:** Neue `sub` → `loadAppUserBySubject` findet nichts → neue
`app_users`-Zeile mit neuer `keycloak_subject`, alte Zeile bleibt unverändert bestehen (nichts
markiert sie als "ersetzt"). Kein Code-Pfad merged oder deaktiviert sie.

**Admin-Mitgliedersuche:** `GET /api/v1/admin/fansubs/:id/app-member-candidates` →
`backend/internal/handlers/app_auth_group_members.go:57-100` →
`backend/internal/repository/fansub_group_app_members_repository.go:51-128` (`SearchCandidates`).
Einzige `WHERE`-Bedingung neben Textmatch (`display_name`/`email` ILIKE) ist
`fgm.id IS NULL` ("ist noch kein Mitglied dieser Fansub-Gruppe") — **kein** Filter auf
Keycloak-/Login-Gültigkeit. Jede `app_users`-Zeile, deren Name/E-Mail passt, erscheint, auch mit
veralteter `keycloak_subject`.

**E-Mail-Verifizierung:** Der `email_verified`-Claim wird aus dem Keycloak-Token geparst
(`backend/internal/auth/oidc.go:27,50,208`), aber beim Bau von `models.KeycloakIdentity`
(`backend/internal/middleware/current_user_auth.go:85-93`) **nicht übernommen** —
`KeycloakIdentity` (`backend/internal/models/app_auth.go:69-78`) hat kein `EmailVerified`-Feld, und
`app_users` hat keine entsprechende Spalte. Der Wert geht nach dem Verify verloren; es gibt heute
**keine** gespeicherte Information, ob eine `app_users`-E-Mail jemals verifiziert war.

**Keycloak-Realm-Konfiguration** (`infra/keycloak/realm-team4s.json`): `duplicateEmailsAllowed`,
`verifyEmail`, `loginWithEmailAllowed` sind nicht explizit gesetzt → Keycloak-Standardwerte gelten
(`duplicateEmailsAllowed=false`, `verifyEmail=false`). D. h. **zu einem gegebenen Zeitpunkt kann in
Keycloak nur ein aktives Konto eine bestimmte E-Mail besitzen** — das Risiko eines parallelen
Fremdkonto-E-Mail-Konflikts zum Zeitpunkt des Logins ist dadurch strukturell begrenzt. Das Risiko
läge eher darin, dass `verifyEmail=false` bedeutet: ein Nutzer könnte theoretisch ein Keycloak-Konto
mit einer fremden (nicht ihm gehörenden) E-Mail-Adresse anlegen, ohne dass Keycloak das verifiziert
— ein E-Mail-Match beim Re-Subjecting würde ein solches Konto dann an die bestehende
`app_users`-Identität (und deren Mitgliedschaften/Historie) binden.

**Hygiene-Skript:** Keines vorhanden (`scripts/`, `database/migrations*/` durchsucht — kein Treffer
für "orphan"/"verwaist"/"dangling"/"stale app_user").

**Tests:** `app_auth_repository_test.go:32-67` ist ein reiner Source-Invarianten-Test (kein Live-DB-
Test für dieses Package), prüft nur, dass `EnsureAppUserForIdentity` ausschließlich `app_users` +
Legacy-Bridge anfasst. Kein Test deckt das Delete+Recreate-/Re-Subjecting-Szenario ab.

**Live-Bestand an Waisen (2026-10-19, nur lesende Abfragen):**
- `app_users` enthält aktuell **9 Zeilen, alle Status `active`, keine doppelten E-Mail-Adressen**
  (`GROUP BY email HAVING count(*) > 1` → 0 Treffer).
- Cross-Check gegen Keycloak-`user_entity` (12 Zeilen in der Keycloak-DB): Alle 9 `app_users`-
  `keycloak_subject`-Werte haben eine exakte Entsprechung in Keycloak; 3 Keycloak-Nutzer
  (`csubs-leader`, `sheppert`, der reine Realm-Admin ohne E-Mail) haben noch keinen `app_users`-
  Datensatz (normal — wird beim ersten Login erzeugt, kein Waisen-Fall).
- **Aktueller Bestand: 0 verwaiste `app_users`-Zeilen.** Der Bug ist strukturell vorhanden und
  reproduzierbar (Code-Pfad bestätigt), aber in diesem Dev-Datenbestand bisher nicht eingetreten —
  ein Hygiene-Skript hätte heute nichts zu bereinigen, wäre aber als Vorsorge für künftige
  Produktionsfälle weiterhin sinnvoll.

### #35.1 — `next.config.mjs` / `publicImagePatterns.mjs` Robustheit

**Fundort bestätigt:** `frontend/src/lib/images/publicImagePatterns.mjs:43-55`,
`new URL(trimmed)` auf Zeile 47:

```js
export function configuredApiMediaPatterns(apiBaseURL) {
  const trimmed = (apiBaseURL || '').trim()
  if (!trimmed) return []
  const mediaOrigin = new URL(trimmed)          // <- Zeile 47, kein try/catch
  return [{
    protocol: mediaOrigin.protocol.slice(0, -1),
    hostname: mediaOrigin.hostname,
    port: mediaOrigin.port,
    pathname: '/api/v1/media/**',
  }]
}
```

Kein try/catch, kein Format-Check vor dem leeren-String-Check. Reproduziert: `new URL('not-a-valid-url')`
wirft `TypeError: Invalid URL`.

**Importpfad bestätigt:** `frontend/next.config.mjs:4-9` (Import),
Zeile 28: `...configuredApiMediaPatterns(process.env.NEXT_PUBLIC_API_URL)` — direkt im
`images.remotePatterns`-Objektliteral der `nextConfig`-Konstante, d. h. der Wurf passiert bereits
bei der Modul-Initialisierung, bevor Next.js irgendeine Config-Verarbeitung starten kann → reißt den
kompletten Config-Load mit (Build/Dev-Start bricht komplett ab).

**Weiterer ungeschützter Aufruf (gleiches Muster, aktuell kein Risiko):**
`next.config.mjs:27`: `...FIXED_REMOTE_IMAGE_URLS.map((url) => new URL(url))` — Werte stammen aus
hardcodierten Literalen (`publicImagePatterns.mjs:38-41`), nicht aus Env-Variablen, daher kein
akutes Laufzeitrisiko, aber strukturell dasselbe ungeschützte Muster.

**Bereits etabliertes Gegenbeispiel im selben Repo:** `frontend/src/lib/publicApiUrl.ts:18-22`
(`getBrowserApiBaseUrl`) behandelt exakt dasselbe Problem (NEXT_PUBLIC_API_URL als `new URL()`-Input)
bereits korrekt mit `try { ... } catch { return value }` — das Team kennt das Risiko und hat an
anderer Stelle schon eine Lösung, nur `publicImagePatterns.mjs` zieht sie nicht nach.

**Aktuelle Werte:** `.env:34` → `http://192.168.235.196:18092` (gültig), `.env.example:45` →
`http://127.0.0.1:8092` (gültig). Der Build bricht im Ist-Zustand also nicht ab — das Risiko besteht
nur bei künftiger Fehlkonfiguration.

**Tests:** Kein dedizierter Test für `publicImagePatterns.mjs`. `frontend/src/components/ui/
ResponsiveImage.config.test.ts:5,41-54` importiert `next.config.mjs` und prüft
`configuredApiMediaPatterns`-Resultate, aber **nur mit gültigen URL-Werten** — keine Abdeckung für
malformte/leere Werte. `frontend/src/lib/publicApiUrl.test.ts:52,59,68` deckt das Gegenstück
(`getBrowserApiBaseUrl`) ab, aber nicht den `publicImagePatterns.mjs`-Pfad.

## Offene Fragen an den Nutzer

### Zu #18 — Nenner-Korrektur

**Frage 1 — Was genau soll der neue Nenner zählen?**
`anime.max_episodes` zählt nach heutigem Schema unabhängig vom `episode_types`-Typ (die Spalte ist
reine Jellyfin-Sync-Metadatum ohne Typ-Bezug). Soll der neue Nenner (a) exakt `anime.max_episodes`
sein (so wie in der ursprünglichen Notiz vorgeschlagen, unabhängig vom tatsächlichen Episode-Typ-Mix
im Datenbestand), oder (b) nur Episoden vom Typ `episode` zählen und Specials/OVAs/Movies o. ä.
explizit ausschließen? Im einzigen Bestandsprojekt sind beide Zahlen identisch (13), daher lässt
sich das nicht an Live-Daten unterscheiden.
*Empfehlung:* (a), exakt `anime.max_episodes` — einfachste, am Finding orientierte Lösung; Specials/
OVAs fließen ohnehin heute schon ungefiltert ein, eine Typ-Filterung wäre ein zusätzlicher
Scope-Zuwachs ohne expliziten Auftrag dafür.

**Frage 2 — Umgang mit `anime.max_episodes IS NULL`?**
Aktuell betrifft das 0 von 12 Bestandsanime, ist aber strukturell möglich (nullable Spalte, z. B. bei
noch laufenden Serien ohne bekannte Gesamtzahl). Soll bei NULL (a) wie im Jellyfin-Sync-Vorbild die
Prüfung übersprungen werden — sprich: Rückfall auf die heutige Logik (Nenner = Anzahl jemals
vergebener Release-Versionen) — oder (b) soll das Projekt dann grundsätzlich nie als "vollständig"
gelten (kein Badge möglich ohne bekannte Gesamtzahl)?
*Empfehlung:* (a), Rückfall auf heutige Logik bei NULL — verhindert, dass ein Datenlücken-Fall
(fehlendes `max_episodes`) Mitgliedern rückwirkend einen bereits sichtbaren Status entzieht.

**Frage 3 — Mehrere Release-Versionen derselben Episode (z. B. v2/Re-Release)?**
Soll der Zähler (wie viele Episoden ein Member abdeckt) pro **Episode** einmal zählen (auch wenn
mehrere Versionen/Credits existieren), oder weiterhin pro **Release-Version**-Zeile? Bei Mehrfach-
versionen könnte ein Member sonst durch mehrere Credits auf dieselbe Episode den Zähler über die
Episodenzahl hinaus treiben (rein rechnerisch, aber unschön) oder bei Nenner=max_episodes nie 100 %
erreichen, wenn eine Episode zwei separate Release-Version-Zeilen hat und nur eine davon
gutgeschrieben wurde.
*Empfehlung:* Zähler auf `DISTINCT episode_id` umstellen, damit Mehrfachversionen nicht doppelt
zählen — passt zur Fragestellung "wie viele der `max_episodes` Episoden deckt dieser Member ab".

### Zu #27 — Re-Subjecting per E-Mail

**Frage 4 — E-Mail-Match nur bei verifizierter E-Mail, oder auch ungeprüft?**
Heute wird `email_verified` aus dem Keycloak-Token zwar geparst, aber nirgends gespeichert oder bis
zu `EnsureAppUserForIdentity` durchgereicht (`KeycloakIdentity` hat kein entsprechendes Feld). Ein
Re-Subjecting rein per E-Mail-String-Match (ohne Verifizierungsstatus) würde im Zweifel ein Konto
übernehmen, dessen E-Mail-Adresse bei der Registrierung nicht bestätigt wurde (Keycloak-Realm hat
`verifyEmail` nicht explizit aktiviert → Standard `false`). Soll diese Phase (a) das Durchreichen von
`email_verified` bis ins Re-Subjecting ergänzen und nur bei `true` matchen, oder (b) ohne
Verifizierungs-Gate matchen, weil das Risiko in der Praxis (interne Admin-only-Plattform, V1) als
gering eingeschätzt wird?
*Empfehlung:* (a) — Verifizierungs-Gate ergänzen. Der Mehraufwand ist überschaubar
(`EmailVerified`-Feld in `KeycloakIdentity`/`app_users` + Abfrage im Re-Subjecting-Zweig), und ohne
dieses Gate öffnet die Korrektur selbst einen neuen, kleinen Account-Übernahme-Pfad.

**Frage 5 — Soll das Hygiene-Skript trotz 0 aktueller Waisen gebaut werden?**
Der Live-Bestand zeigt heute **keine** verwaisten `app_users`-Zeilen — ein Hygiene-Lauf hätte
aktuell nichts zu tun. Soll das einmalige Hygiene-Skript trotzdem gebaut werden (Vorsorge für
Produktionsdaten/künftige Fälle, ggf. auch als wiederholbares Admin-Tool), oder reicht die reine
Code-Korrektur in `EnsureAppUserForIdentity` ohne begleitendes Skript, solange der Ist-Bestand leer
ist?
*Empfehlung:* Skript trotzdem bauen (einmalig lauffähig, idempotent) — der Befund wurde ursprünglich
aus einem konkreten Produktionsvorfall gemeldet, auch wenn der aktuell gespiegelte Datenbestand ihn
nicht zeigt; auf Produktionsdaten könnten bereits echte Waisen existieren.

### Zu #35.1 — Fehlerbehandlung

**Frage 6 — Welches Verhalten bei ungültiger `NEXT_PUBLIC_API_URL`?**
Soll bei ungültigem Wert (a) der Config-Load mit einer klaren deutschen Fehlermeldung beim Start
abbrechen (fail-fast, analog zur defensiven Env-Validierung in `backend/cmd/server/main.go`), oder
(b) soll der Fehler abgefangen und mit einem Fallback-Pattern (keine Remote-Media-Patterns,
Build läuft durch, aber Bilder laden ggf. nicht) weitergearbeitet werden, ähnlich wie
`getBrowserApiBaseUrl` heute bei einem Parse-Fehler den Rohwert zurückgibt statt zu werfen?
*Empfehlung:* (a) fail-fast mit klarer Meldung — bei einer Server-/Build-Konfiguration ist ein
stummer Fallback riskanter als ein lauter, sofort sichtbarer Abbruch mit verständlicher Ursache
(entspricht der bestehenden "fail-fast"-Konvention in `backend/internal/config/config.go`).
