# Abgleich: Live-UAT UX-Findings vs. aktueller Code (2026-10-17)

Quelle: `.planning/notes/live-uat-ux-findings.md` (37 Befunde, #1–#37, erfasst ab
2026-08-17). Seitdem liefen die Phasen 128–185, u. a. Mitgliedschafts-/
Rollen-Registry, Capability-/Rechte-Verwaltung, Badge-Design-Konsolidierung,
öffentliche Fansub-/Member-Seiten, Episode-Import, Bild-Viewer, Suche,
Uploader, Release-Editor, Status-Labels, Testsuite-Grünschaltung.

Reine Analyse — kein Produktcode wurde für diesen Abgleich geändert. Methode:
pro Befund Code-Grep/Read, `git log -- <pfad>`, sowie `.planning/phases/*/
SUMMARY.md|VERIFICATION.md|CONTEXT.md` wo einschlägig. Ohne handfesten Beleg
(Commit, Phase-Doku, Datei:Zeile) wurde ein Befund als UNKLAR eingestuft,
nicht als ERLEDIGT.

Hinweis zur Zählung: Befund #35 ("Drei Code-Review-Warnings aus Phase 134")
und #36 ("Zwei ESLint-Errors") bündeln je mehrere Einzelpunkte mit
unterschiedlichem Status. Diese wurden als #35.1–#35.3 bzw. #36.1–#36.2
aufgeschlüsselt. Dadurch ergeben sich 40 bewertete Einzelpunkte aus 37
Befund-Überschriften.

## Zusammenfassung nach Kategorie

| Kategorie | Anzahl |
|---|---|
| ERLEDIGT | 23 |
| GEGENSTANDSLOS | 1 |
| OFFEN | 14 |
| UNKLAR | 2 |
| **Gesamt** | **40** |

Von den 14 OFFENEN Punkten: 3× Priorität hoch, 7× mittel, 4× niedrig.
Von den 2 UNKLAREN Punkten: beide mittel.

## Tabelle: OFFEN und UNKLAR (nach Priorität)

| # | Priorität | Status | Seite/Route | Was der Nutzer/Admin erlebt | Vorschlag |
|---|---|---|---|---|---|
| #14 | hoch | OFFEN | `/anime/[id]/group/[groupId]/releases/[releaseVersionId]` | Episoden in nicht-browserkompatiblen Containern (z. B. WMV/VC-1) spielen nicht ab; nur generische Fehlermeldung, kein Transcoding. | Jellyfin-PlaybackInfo/HLS-Transkodierung integrieren oder spezifische Fehlermeldung statt generischer Meldung. |
| #15 | hoch | OFFEN | `/admin/anime/[id]/episodes` Import-Mapper | Fansub-Tag-Muster wie `[E61CA0BA]` wird fälschlich als Episode 61 erkannt (Regex-Fallback statt echtem Parser). | Etablierte Parser-Bibliothek (z. B. anitogo) hinter `ReleaseFilenameParser`-Interface einbinden, mit Regressionstests. |
| #18 | hoch | OFFEN | `/me/profile`, `/members/[slug]` (Badges) | Projekt-Badge "vollständig mitgetragen" nutzt falschen Nenner; eine einzige verlinkte Release-Version reicht schon für "vollständig" (gameable). | Nenner auf `anime.max_episodes` umstellen, Einzel-Release-Verlinkung vom "vollständig"-Status ausschließen. |
| #2 | mittel | OFFEN | `/admin/anime/[id]/episodes/import` | "Ab hier" (Gruppe) überschreibt bei bewusstem Klick über gemischten Zeilen weiterhin blind abweichende pro-Datei-Gruppen (Hauptfall durch Auto-Vorbelegung entschärft, Konfliktfall bleibt). | Nur leere Zeilen füllen oder Bestätigung bei Konflikt einholen. |
| #12 | mittel | OFFEN | `/invitations/accept`, `/claim-invitations/accept` | Vor dem Annehmen gibt es keinen Hinweis, welche Gruppe/Rolle/Einlader dahintersteckt — nur statischer Text. | GET-Preview-Endpoint (unauth, rate-limited) ergänzen, `InviteAcceptFlow` um Kontextzeile erweitern. |
| #16 | mittel | OFFEN | kein UI-Pfad vorhanden | Release-Versionen ohne eigene Quelle (Gruppe hat released, Datei nicht in Jellyfin/Besitz) lassen sich nicht erfassen — einziger Schreibpfad ist der Jellyfin-Import. | Manuellen Create-Flow (Handler+Repo) ergänzen, wenn priorisiert — laut Original-Finding bewusst zurückgestellt. |
| #27 | mittel | OFFEN | "Mitglied hinzufügen"-Dialog, `/admin/fansubs/[id]/edit` | Bei Keycloak-Delete+Recreate entsteht ein verwaister `app_users`-Datensatz, der in der Mitgliedersuche als zweiter, nicht einloggbarer Treffer auftaucht. | `EnsureAppUserForIdentity` optional per E-Mail-Match re-subjecten statt immer neu anzulegen; einmaliges Hygiene-Skript für bestehende Waisen. |
| #35.1 | mittel | OFFEN | `frontend/next.config.mjs` (Build/Deploy) | Eine fehlerhafte `NEXT_PUBLIC_API_URL` lässt `new URL()` ohne try/catch werfen und reißt den gesamten Next.js-Config-Load mit — Build/Start bricht komplett ab. | try/catch um `new URL()` in `publicImagePatterns.mjs:47` mit klarer Fehlermeldung ergänzen. |
| #17 | mittel | UNKLAR | Punktekatalog-Planung, `/me/dashboard` | Gruppen ohne Karaoke-Beitragstyp könnten bei der Punktevergabe benachteiligt sein — reine Fairness-/Designfrage, kein Code-Defekt; offene Designentscheidung seit `260722-member-gamification-DECISION.md` unverändert. | Punktekatalog-Entscheidung nachholen (nicht per Code-Grep klärbar). |
| #24 | mittel | UNKLAR | `/me/profile` (Avatar-Upload) | Ursprünglich: neues Avatarbild erst nach Tab-Wechsel sichtbar. Code-Struktur (neue UUID pro Upload, synchroner State-Update) spricht gegen einen bestehenden Bug, aber ohne Live-Test nicht ausschließbar. | Live nachstellen: Avatar hochladen/zuschneiden, prüfen ob Vorschau ohne Tab-Wechsel aktualisiert. |
| #1 | niedrig | OFFEN | `/admin/fansubs/[id]/edit` (Mitglied hinzufügen / Historische Rolle) | Datumseingabe nur per Klick-Picker (Jahr→Monat→Tag), keine Texteingabe TT.MM.JJJJ möglich. | DatePicker-Trigger um parsendes Text-Input ergänzen, Picker bleibt Alternative. |
| #3 | niedrig | OFFEN | `/admin/anime/[id]/episodes/import` | Header-Button "Mapping anwenden" und Zeilen-Button "Übernehmen" bleiben verwirrend ähnlich benannt (Umlaut-Bug selbst ist behoben, siehe #4). | Header-Button umbenennen (z. B. "Alle bestätigten übernehmen"), Zeilen-Button als "Nur diese Version" kennzeichnen. |
| #13 | niedrig | OFFEN | `/admin/fansubs/[id]/edit` (Basic-Tab vs. Tab "Gruppengeschichte") | Kein Hinweis/Toast beim Erreichen eines Meilensteins (z. B. Gründungsjahr) — Discovery-Lücke zum Tab "Gruppengeschichte" bleibt; es existiert weiterhin kein Toast-Primitive im Design-System. | Globales Toast-Primitive bauen, bei milestone-relevanten Feldern auslösen. |
| #33 | niedrig | OFFEN | kein UI-Pfad vorhanden | Plattform-weite Dokumenten-/Initiativen-Bibliothek ist reine Feature-Idee, nichts gebaut — unverändert Backlog. | Kein akuter Vorschlag; bleibt Backlog-Idee für spätere Priorisierung. |
| #35.3 | niedrig | OFFEN | `backend/internal/testsupport/phase134_postgres.go:74-76` | Tautologische Sicherheitsprüfung in Testcode (Regex wird aus derselben Konstante gebaut, die sie prüft) — kann nie fehlschlagen, aber nur Testinfrastruktur betroffen. | Regex-Vergleich durch eine unabhängige Validierungsquelle ersetzen oder Check entfernen, falls obsolet. |
| #37 | niedrig | OFFEN | `.planning/phases/128-*`, `133-*`, `135-*` | Fehlende `VERIFICATION.md` für Phasen 128/133/135 — dokumentierte Verifikations-Schuld seit v1.3-Abschluss unverändert offen. | Retroaktive Verifikation für die drei Phasen nachholen oder bewusst als Altlast abschließen/dokumentieren. |

## ERLEDIGT (23) — kompakt mit Beleg

- **#4** Umlaut-Bug "Übernehmen" — `EpisodeImportMappingRow.tsx:150` korrekt.
- **#5** PlatformAdminGate unmountet nicht mehr bei Token-Refresh — Commit `37859778c`.
- **#6** Claim-Einladungs-Button verdrahtet — Commit `38bc136f4` (Phase 135-04).
- **#7** Rollen-Picker filtert `assignable=false` — Commit `bff0cec60` (Phase 136-04).
- **#8** Invitation-Accept Auto-Return nach Login — Commit `8c5d576ad` (Phase 135-05).
- **#9** Invitation-Accept-Text endnutzerfreundlich — selber Commit `8c5d576ad`.
- **#10** Invite-Onboarding (Mail + Accept-Seite) — Commits `628c25727`, `d01ce78a8`.
- **#11** Bulk-Apply Fansub-Gruppe auf Episoden — Commit `d3bd1c2bd`; Restpunkt niedrig (natives `<select>` im Einzel-Formular).
- **#19** Typesetting/Karaoke-FX als eigene Rollen — Migration `0146_capability_policy_catalog.up.sql`; Restpunkt niedrig (generisches Fallback-Icon statt eigenem).
- **#20** Keycloak-Registrierung auf Fansubname — Phase 135-09/135-10, `infra/keycloak/...`.
- **#22** "Segment nicht gefunden" vs. "noch nicht vorbereitet" getrennt + echter Render-Worker — Phasen 171/172, `segment_stream.go`.
- **#23** Öffentliche Gruppenseite: App-Member klickbar via `member_claims` — Commit `ea77b9fc1`.
- **#25** Approval-Routen für historische Claims gerendert — Phase 135-10, `GroupMembersHistTable.tsx`.
- **#26** "Als aktives Mitglied übernehmen" (Leader-Override) verdrahtet — `member_claims_handler.go:192-205`.
- **#28** Post-Aktivierung: Gruppenzugehörigkeit-Leere behoben, Doppel-Anzeige final über `aa5abc17d` gelöst (Nachtrag in Findings-Datei ist gegenüber letztem Commit veraltet, aber Endzustand konsistent).
- **#29** Capability-Verwaltung mit Effektiv-Rechte-Sicht, Guided-Grant/Revoke — Phasen 136–138, alle VERIFICATION.md `passed`.
- **#30** User-Detail-Ansicht skaliert (Range-Collapse statt Flach-Liste) — Phase 139, `admin_users_contributions_query.go`.
- **#31** Review-Delegation UI/Endpoint existiert — Phase 140 (Platzierung bewusst anders als im Finding vorgeschlagen: `/admin/users/[id]` statt Fansub-Member-Editor, siehe `140-CONTEXT.md`).
- **#32** Prüfliste zeigt nur entscheidbare Einträge, eigene "Fremdprüfung"-Lane — Phase 141, VERIFICATION.md 12/12.
- **#34** Badge-Sektionen einheitliches Layout (`@container`-Breakpoints identisch über alle Familien) — Phase 151, VERIFICATION.md.
- **#35.2** Doppelte CSS-Regeln in `RoleBadgeCard.stages.module.css` bereinigt — Phase 151.
- **#36.1** `useEpisodeNeighborNavigation.ts` set-state-in-effect behoben (Render-Zeit-Anpassung) — Commits `ebdc5b14f`, `30ffab0c5`.
- **#36.2** `GroupMemberFormModals.tsx` set-state-in-effect behoben — Commit `81098d852`. (Kleiner Nachtrag: `scripts/phase134-green-gate.sh` führt beide Dateien noch als `LINT_KNOWN_DEFERRED`, harmlos aber veraltet.)

## GEGENSTANDSLOS (1)

- **#21** Segment-Editor im Projekt-Weg fehlte — der alte separate Workspace-Pfad (`/me/releases/[versionId]/workspace`) existiert nicht mehr; Phase 181 hat den Member-Projektweg auf den gemeinsamen Editor (`/admin/episode-versions/[versionId]/edit`, inkl. Segmente-Tab) umgestellt. Damit ist der ursprüngliche Befund durch Umbau erledigt/gegenstandslos.

## Vorschlag: Bündelung offener Punkte zu Phasen/Paketen

1. **Episode-Import-Mapper nachschärfen** (#2, #3, #15) — Parser-Austausch (Anitomy/anitogo) löst #15 strukturell und erleichtert #2; #3 ist eine kleine Begleitkorrektur (Button-Benennung). Gemeinsame Phase sinnvoll, da alle drei im selben Mapper-Code hängen.
2. **Badge-Fairness & -Korrektheit** (#18, #17) — #18 ist ein klarer Defekt im Nenner (fix), #17 eine offene Designfrage zum Punktekatalog. Lassen sich in einer Phase "Badge-/Punkte-Nacharbeit" zusammenfassen, #17 ggf. nur als Entscheidung ohne Code.
3. **Mitglieder-Identität & Einladung, Rest** (#27, #12) — beide hängen an Identitäts-/Matching-Logik rund um Keycloak/App-User bzw. Invite-Flow; passen zusammen mit der bestehenden Mitgliedschafts-Registry-Historie (Phasen 135–140).
4. **Episode-Playback/Streaming** (#14) — eigenständig groß genug (Transcoding/HLS) für eine eigene Phase, nicht bündeln.
5. **Release-Erfassung ohne Source** (#16) — bewusst zurückgestelltes Feature, eigene spätere Phase bei Priorisierung.
6. **Kleine UI-Lücken** (#1, #13, #33) — DatePicker-Texteingabe, Toast-Primitive, Dokumenten-Bibliothek-Idee sind unabhängig und niedrig priorisiert; eignen sich für eine Sammel-Phase "UI-Kleinteile" oder einzelne Quick-Tasks statt eigener Phasen.
7. **Tech-Debt/Doku-Schuld** (#35.1, #35.3, #37) — gehören in ein Aufräum-Paket ähnlich Phase 184/185 (Konfig-Robustheit, Test-Infra-Hygiene, nachträgliche Verifikationsberichte).
8. **Live-Check nötig vor Einordnung** (#24) — vor jeder Bündelung erst live auf `/me/profile` nachstellen; je nach Ergebnis entweder schließen oder in Paket 6 einsortieren.
