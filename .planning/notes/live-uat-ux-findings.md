# Live-UAT UX-Findings (laufende Liste)

Kleine UX-/UI-Verbesserungen, die beim Live-Testen der Admin-Flächen auffallen
(2026-08-17+). Backlog-Kandidaten. Größere Einzelfunde haben eigene Notizen
(z. B. `finding-asset-search-robustness.md`).

---

## 1. Datumseingabe "Mitglied hinzufügen" — Texteingabe zusätzlich zum Picker
**Entdeckt:** 2026-08-17 (historisches Fansub-Gruppen-Mitglied anlegen).

**Wunsch:** Beim Eintritts-/Austrittsdatum sollte man das Datum **auch per Text eingeben**
können (z. B. `15.03.2019` direkt tippen), nicht nur über den Kalender-/Jahr-Picker
(Jahr → Monat → Tag klicken).

**Symptom:** Das Feld zeigt den Placeholder `TT.MM.JJJJ` (suggeriert Texteingabe), öffnet aber
nur den Picker; direktes Tippen funktioniert nicht/nicht wirksam. Gerade für weit
zurückliegende Jahre ist Klicken durch den Jahr-Picker mühsam.

**Fix-Idee:** Das gemeinsame Primitive um **parsende Texteingabe** erweitern (Tippen im Format
TT.MM.JJJJ → parsen/validieren; Picker bleibt als Alternative). Da es das geteilte Primitive
ist, profitieren alle Datumsfelder.

**Betroffen:**
- `frontend/src/components/ui/DatePicker.tsx` (das Datums-Primitive)
- Dialog: `frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.tsx` /
  `GroupMemberFormModals.tsx` ("Mitglied hinzufügen", Felder Eintritts-/Austrittsdatum)

---

*Isolierte Backlog-Notiz — kein Commit, keine Shared-File-Edits.*

## 2. Import-Mapping "Ab hier" (Gruppe) — überschreibt alle Versionen mit EINER Gruppe
**Entdeckt:** 2026-08-17 (Mapping-Workbench, Anime "Rental magica").

**Symptom:** Episoden mit mehreren parallelen Versionen aus VERSCHIEDENEN Gruppen. Der Dateiname
encodiert die Gruppe (`…S01E02-NewSubs.mkv` vs `…S01E02-ShiroiFansub.mkv`). Klickt man auf einer
Zeile "Ab hier", wird die dort gewählte Gruppe für ALLE folgenden Versionen eingetragen — auch
für die ShiroiFansub-Datei stand dann "New-Subs". Falsch für den Normalfall.

**Nutzer-Erwartung:** Wenn eine Episode mehrere Versionen hat, ist pro Version meist eine ANDERE
Gruppe (steht ja im Dateinamen). Ausnahme v1→v2 (gleiche Gruppe, andere Version) — selten.

**Fakt aus dem Code:** Das Backend parst die Gruppe bereits PRO DATEI —
`backend/internal/handlers/admin_episode_import.go:427` ruft
`importutil.DeriveFansubGroupName(media.FileName, media.Path)` → `row.FansubGroupName`. Der Wert
ist im Frontend als `row.fansub_group_name` verfügbar. "Ab hier" =
`applyFansubGroupFromEpisode(episodeNumber, selectedFansubGroups)` macht dagegen einen
Blanket-Copy der aktuell gewählten Chips nach unten (überschreibt die pro-Datei-Info).

**Fix-Ideen:**
1. **Pro-Datei-Gruppe automatisch als Chip vorbelegen** (aus `row.fansub_group_name`) — dann ist
   "Ab hier" für Multi-Group-Episoden gar nicht mehr nötig.
2. **"Ab hier" nur LEERE Gruppen füllen** (bereits gesetzte/abgeleitete nicht überschreiben).
3. Alternativ "Ab hier" **per Versions-Position** anwenden statt eine-Gruppe-für-alle.

**Betroffen:**
- frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx ("Ab hier"-Button)
- frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts +
  episodeImportMapping.ts (`applyFansubGroupFromEpisode`, `fansub_group_name`-Handling)
- backend/internal/handlers/admin_episode_import.go (pro-Datei-Derive existiert bereits)

## 3. Import-Mapping: Sammel-Apply existiert ("Mapping anwenden"), aber Zeilen-"Übernehmen" verwirrt
**Entdeckt:** 2026-08-17 (Mapping-Workbench).

**Symptom:** Nach "Alle Vorschläge bestätigen" (alle grün) klickt der Nutzer jede Version einzeln
auf "Übernehmen" — es wirkt, als fehle ein "alle übernehmen".

**Fakt aus dem Code:** Es GIBT einen Sammel-Apply — der Header-Button "Mapping anwenden" =
`applyMappings()` (useEpisodeImportBuilder.ts:226) wendet ALLE Mappings auf einmal an. Die
Zeilen-"Übernehmen" = `applyRow()` (Z.243) wendet nur EINE Zeile an und entfernt sie danach.

**Problem:** Zwei überlappende Apply-Aktionen → nach dem Bestätigen ist nicht klar, dass
"Mapping anwenden" der Sammel-Apply für alle Bestätigten ist; der Nutzer greift zur
Zeilen-"Übernehmen".

**Fix-Ideen:**
1. "Mapping anwenden" klarer benennen/platzieren, z. B. **"Alle bestätigten übernehmen"**, direkt
   bei den Bestätigen-Aktionen.
2. Zeilen-"Übernehmen" reduzieren/entfernen, wenn der Sammel-Apply sie abdeckt (oder als
   "Nur diese Version" kennzeichnen).

**Betroffen:**
- frontend/src/app/admin/anime/[id]/episodes/import/page.tsx (Header-Buttons)
- .../EpisodeImportMappingRow.tsx (Zeilen-"Übernehmen")
- .../useEpisodeImportBuilder.ts (`applyMappings` vs `applyRow`)

## 4. Text-Bug: "Ubernehmen" → "Übernehmen" (fehlender Umlaut)
**Entdeckt:** 2026-08-17.
`frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx:297`:
`'Ubernehmen'` → muss `'Übernehmen'` heißen. Verletzt die CLAUDE.md-Umlaut-Regel
(ASCII-Ersatz in user-facing Strings verboten). Trivialer Ein-Zeilen-Fix.

## 5. Admin-Seiten verlieren Client-State bei Token-Refresh (PlatformAdminGate unmountet children) — HOHE PRIO
**Entdeckt:** 2026-08-17 (Import-Mapping-Workbench, aber betrifft ALLE Admin-Seiten).

**Symptom:** Während man im Import-Mapping arbeitet (Gruppen-Chips eintragen), fällt die Seite
nach kurzer Zeit plötzlich in den "Vorschau laden"-Zustand zurück — der komplette in-progress
State (preview, mappings, Chips) ist weg.

**Ursache:** `frontend/src/components/auth/PlatformAdminGate.tsx`. Der Gate umhüllt jede
Admin-Seite. Sein `useEffect(…, [hasAccessToken, hasRefreshToken, isClientInitialized])` setzt bei
jeder Re-Validierung `isLoading=true`, und
`if (isLoading || !isClientInitialized) return <p>Berechtigungen werden geladen…</p>` rendert dann
die Lade-Anzeige STATT der `children`. Bei jedem Token-Refresh (hasAccessToken/hasRefreshToken
ändern sich) → children **unmount** → Kind-State weg → beim Remount frisch/leer.

**Impact:** Datenverlust auf ALLEN Admin-Seiten mit Client-State, sobald ein Token-Refresh
passiert (Access-TTL ist zwar 86400s/24h, aber der Client rotiert zwischendurch —
Focus/Intervall/pre-expiry). Klassisches Auth-Gate-Anti-Pattern (unmountet Kinder bei jeder
Re-Validierung).

**Workaround (funktioniert, nicht blockierend):** Einzelne Episoden per Zeilen-"Übernehmen"
anwenden — die sind sofort im Backend persistiert und überleben den Remount. Nur noch nicht
angewendete Chips gehen verloren.

**Fix (klein, 1 Datei):** `children` während der Re-Validierung montiert lassen — Lade-Anzeige nur
beim ERSTEN Check zeigen (wenn `currentUser === null`), und nicht transient auf "nicht Admin"
fallen, wenn schon bestätigt. Z. B.:
`if (!isClientInitialized || (isLoading && currentUser === null)) return <Loading/>`.
Optional als Defense-in-Depth: Import-Mapping-Draft persistieren (localStorage), falls doch mal
remountet wird.

**Betroffen:** frontend/src/components/auth/PlatformAdminGate.tsx (+ PlatformAdminGate.test.tsx)

## 6. Claim-Einladungs-Button für historische Mitglieder NICHT im UI verdrahtet
**Entdeckt:** 2026-08-17 (Fansub Members, historische Mitglieder-Karte).

Der Claim-Link-Flow (Account mit historischem Mitglied verknuepfen) existiert im Backend
(`member_claim_invitations_handler.go`, `generateClaimInvitation`) und im Hook
(`useGroupMembersClaimActions.ts`), aber die `HistoricalMemberCard` in
`GroupMembersHistTable.tsx` rendert NUR Bearbeiten + Loeschen. Die Props
`onGenerateInvitation`/`canCreateClaimInvitation`/`generatedInvites` sind deklariert und
durchgereicht, werden in der Karte aber NIE benutzt → der Generieren-Button fehlt komplett
(kein Rechte-Problem; User war platform_admin). Toter/unfertiger Code.

**Fix:** In `HistoricalMemberCard` den Claim-Generieren-Button + Invite-Link-Anzeige rendern
(gated auf canCreateClaimInvitation), analog zum vorhandenen Hook.

**Betroffen:** frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.tsx (HistoricalMemberCard),
useGroupMembersClaimActions.ts.

## 7. Rollen-Picker (Einladung/Mitglied) zeigt nicht-zuweisbare Rollen (assignable=false)
**Entdeckt:** 2026-08-17 (App-Mitglied-Einladung, "Aufgaben nach Annahme").

Der Rollen-Picker im Einladungs-/Mitglied-hinzufuegen-Dialog zeigt AUCH Rollen mit
`assignable=false` an — z. B. "Administration" (`admin`, Kontext anime_contribution, eine
Contribution-/Credit-Rolle ohne Rechte). Diese gehoeren NICHT in den Gruppen-Rollen-Picker;
nur `assignable=true`-Gruppenrollen sollten waehlbar sein.

**Fix:** Picker auf `assignable=true` filtern (die App-Gruppenrollen). Nicht-zuweisbare
Credit-/Contribution-Rollen (Administration, ggf. Uebersetzung/Editing/... je nach
assignable-Flag) ausblenden.

**Hinweis:** platform_admin wird jetzt ueber Keycloak (IdP-Rolle -> JIT-Sync) definiert —
gehoert also ebenfalls nicht in den Gruppen-Rollen-Picker.

**Betroffen:** Einladungs-/Mitglied-hinzufuegen-Dialog (Rollen-Picker) unter
frontend/src/app/admin/fansubs/[id]/edit/ ; role_definitions.assignable ist die Filter-Quelle.

## 8. Invitation-Accept: kein Auto-Return nach Login
**Entdeckt:** 2026-08-17 (/invitations/accept).
Die Accept-Seite (`frontend/src/app/invitations/accept/page.tsx`) zeigt bei nicht-eingeloggtem
User nur `<Link href="/login">anmelden</Link>` OHNE returnTo → nach dem Login kein Auto-Redirect
zurueck zur Einladungs-URL (mit Token); der Nutzer muss manuell zurueck (Mail/Tab evtl. weg).
Fix: `?returnTo=/invitations/accept?token=...` mitgeben, nach Login zurueck + auto-accept.

## 9. Invitation-Accept: Text zu technisch fuer Endnutzer
**Entdeckt:** 2026-08-17.
Meldung "Keycloak bleibt fuer Login und Session zustaendig, Team4s prueft danach E-Mail-Match,
Ablauf und Gruppenmitgliedschaft" legt interne Architektur offen. Endnutzer-freundlicher:
"Bitte melde dich an, um die Einladung anzunehmen." (Technik-Detail gehoert in Docs.)
Betroffen: frontend/src/app/invitations/accept/page.tsx.

## 10. Invite-Onboarding fuer neue/kalt eingeladene Nutzer fehlt — HOEHERE PRIO
**Entdeckt:** 2026-08-17 (App-Mitglied-Einladung end-to-end).

Der Einladungs-Flow funktioniert nur fuer Nutzer, die Team4s bereits kennen + ein Konto haben.
Ein kalt eingeladener Fansubber (typischer Fall: Gruppen-Admin laedt 10 Leute ein) ist verloren:
- **Mail ohne Kontext:** "Du wurdest zu einer Fansub-Gruppe eingeladen" — kein Absender/Gruppe,
  keine Erklaerung was Team4s ist, was Annehmen bewirkt. Wirkt wie Spam.
- **Accept-Seite setzt Konto voraus:** nur "anmelden und zurueckkehren", KEIN Registrieren-Pfad
  → neue Nutzer landen in einer Sackgasse (kein Konto -> kein Login moeglich).
- **Technisch, keine Fuehrung** (vgl. #9).

**Fix-Richtung:**
1. Mail mit Kontext: wer laedt ein, welche Gruppe, 1 Zeile "Team4s ist...", was Annehmen bewirkt.
2. Accept-Seite: Kontext + BEIDE Wege (Anmelden UND Registrieren), Einladung durchreichen
   (returnTo + E-Mail vorbefuellen fuer den email_match) -> Auto-Accept + Bestaetigung.
3. Verifizieren, ob KC Self-Registration aktiv ist / einen Register-auf-Einladung-Pfad braucht.

**Betroffen:** Einladungs-Mail-Template (services/mailer.go / app_auth.go), Accept-Seite
(frontend/src/app/invitations/accept/page.tsx), Keycloak-Realm (registrationAllowed).

## 11. Kein Bulk-Apply fuer Fansub-Gruppe auf Episoden — nachtraeglich nur einzeln editierbar
**Entdeckt:** 2026-08-17 (/admin/anime/2/episodes).

**Symptom:** Wenn man Folgen gemappt/angelegt hat, OHNE dabei den Fansub-Gruppen-Chip zu setzen,
gibt es hinterher KEINE Moeglichkeit, die Gruppe fuer alle Episoden auf einmal nachzutragen. Man
muss jede Episode einzeln oeffnen und die Fansub-Gruppe eintragen — bei vielen Folgen sehr muehsam.

**Fakt aus dem Code:** Eine Bulk-Mechanik existiert bereits, aber nur fuer den STATUS:
`EpisodeManager` hat `EpisodeBulkBar` + `applyBulkStatus(bulkStatus)` / `isApplyingBulk`
(frontend/src/app/admin/anime/components/EpisodeManager/EpisodeManager.tsx, EpisodeBulkBar.tsx).
Die Fansub-Gruppe dagegen wird NUR pro Episode-Version gesetzt — im nativen `<select>` unter
frontend/src/app/admin/anime/[id]/episodes/[episodeId]/versions/page.tsx ("keine Gruppe"). Es gibt
kein Gegenstueck `applyBulkFansubGroup` und keinen Gruppen-Auswahl in der Bulk-Leiste.

**Fix-Ideen:**
1. Die bestehende Bulk-Leiste um eine **Fansub-Gruppen-Auswahl** erweitern (analog zum Bulk-Status):
   ausgewaehlte/alle Episoden bekommen die gewaehlte Gruppe zugewiesen (`applyBulkFansubGroup`).
2. Backend: Bulk-Endpoint oder serverseitige Schleife, die die Gruppe auf die Versionen der
   gewaehlten Episoden schreibt (Modus klaeren: ersetzen vs. hinzufuegen; Multi-Group beachten,
   vgl. Finding #2).
3. Nebenbefund: der Gruppen-Picker in versions/page.tsx ist ein natives `<select>` — verstoesst
   gegen die @/components/ui-Primitive-Pflicht (Select), sollte bei der Gelegenheit migriert werden.

**Betroffen:**
- frontend/src/app/admin/anime/components/EpisodeManager/EpisodeManager.tsx + EpisodeBulkBar.tsx
  (Bulk-Leiste erweitern)
- frontend/src/app/admin/anime/[id]/episodes/[episodeId]/versions/page.tsx (heutiger Einzel-Weg,
  natives <select>)
- Backend Episode-/Version-Update-Handler (Bulk-Gruppe schreiben).

## 12. Accept-Seite: dynamischer Invite-Kontext (Einlader/Gruppe/Rolle) fehlt — braucht Preview-Endpoint
**Entdeckt:** 2026-08-17 (waehrend execute-phase 135, Deferral aus 135-05).

**Kontext:** Die Content-Spec (D-11) wollte auf der Accept-Seite eine dynamische Kontextzeile
"{Einlader} hat dich als {Rolle} in die Fansub-Gruppe {Gruppe} eingeladen". Beim Ausfuehren von
135-05 zeigte sich: es gibt KEINEN Invite-Preview-Endpoint (kein GET invitation-by-token) — die
Accept-Seite kennt vor dem Annehmen nur das Token, nicht Gruppe/Einlader/Rolle. Der BLOCKER (#10)
ist trotzdem geloest (Dual-Login/Register + Auto-Accept); nur die kontextuelle Copy fehlt.

**Fix-Richtung (Follow-up, bewusst aus Phase 135 herausgehalten):**
1. Backend: GET-Endpoint "Invitation-Preview by token" (unauth, rate-limited), liefert nur
   anzeigbare Felder: Gruppenname, Einlader-Anzeigename (+Fallback), Rolle(n), Ablauf/Status —
   KEINE sensiblen Daten. E-Mail-Match bleibt serverseitig beim Accept autoritativ.
2. Frontend: InviteAcceptFlow um optionale Preview-Props erweitern; Accept-Seite fetcht die
   Preview und rendert die dynamische Titel-/Kontextzeile (D-11). Gilt fuer beide Invite-Typen.

**Betroffen:** backend app_auth.go / fansub_group_invitations_repository.go (neuer Preview-Read +
Route in main.go), frontend/src/components/auth/InviteAcceptFlow.tsx +
frontend/src/app/invitations/accept/page.tsx (+ claim-invitations/accept).

## 13. Milestone-Toast bei erreichten Meilensteinen (Discovery-Hinweis auf Gruppengeschichte)
**Entdeckt:** 2026-08-17 (Idee beim Anlegen einer frischen Gruppe).

**Wunsch:** Ein kleines Popup/Toast, das kurz aufpoppt, wenn ein Meilenstein erreicht/eingetragen
wird — z. B. "Gründungsjahr wurde eingetragen". Auto-Dismiss nach ~10 Sekunden. Zweck: gerade
frische Nutzer, die zum ersten Mal Daten anlegen, merken so "ah, da gibt es noch etwas" — die
Gruppengeschichte/Meilensteine sind aktuell unter dem separaten Tab **"Gruppengeschichte"**
(`notes`) versteckt und werden leicht übersehen.

**Fakten aus dem Code:**
- Es gibt KEIN Toast-/Snackbar-Primitive in `@/components/ui` — müsste als globales Primitive neu
  gebaut werden (Design-System-Pflicht beachten), inkl. Auto-Dismiss + a11y (role="status",
  aria-live="polite", schließbar, Reduced-Motion).
- "Gruppengeschichte" = Tab `notes` (`frontend/src/app/admin/fansubs/[id]/edit/mainTabRouting.ts`).
  Milestone-relevante Felder wie Gründungs-/Auflösungsjahr liegen im Basic-Tab
  (`FansubBasicInfoTab.tsx`), die Geschichte/Meilensteine aber im getrennten Tab.

**Fix-Richtung (Backlog):**
1. Globales Toast-Primitive in `@/components/ui` (mehrfach nutzbar, Queue, Auto-Dismiss ~10s,
   manuell schließbar, a11y-konform).
2. Beim Eintragen milestone-relevanter Daten (z. B. Gründungsjahr gespeichert) einen Toast
   auslösen: "Meilenstein 'Gründung {Jahr}' erfasst — sieh ihn in der Gruppengeschichte" mit
   direktem Sprung/Link in den Gruppengeschichte-Tab (Discovery).
3. Optional: dezenter Badge/Hinweis am Gruppengeschichte-Tab, wenn neue ableitbare Meilensteine
   vorliegen.

**Betroffen:** neues `@/components/ui`-Toast; `FansubBasicInfoTab.tsx` (Auslöser beim Speichern);
`mainTabRouting.ts` / Gruppengeschichte-Tab (Sprungziel).

## 14. Episode-Playback scheitert bei nicht-browserkompatiblen Containern (z. B. .wmv) — kein Transcoding
**Entdeckt:** 2026-08-18 (Segment-/Kara-Test, "Rental magica.S01E01-NewSubs.wmv", release_version 15).

**Symptom:** Beim Abspielen einer Episode erscheint "Die Episode konnte nicht abgespielt werden."
Betrifft WMV/VC-1-Dateien (vermutlich auch andere nicht-browserfaehige Container: .mkv mit
HEVC, .avi, etc.).

**Diagnose (belegt):**
- Backend-Log: `GET /api/v1/releases/15/stream` liefert 200 (~4,7 s) — Stream wird erfolgreich
  geproxied. Nicht der Fehler.
- Player = reines HTML5 `<video src="/api/releases/{id}/stream" onError=...>` in
  `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseEpisodePlayer.tsx`
  — kein Transcoding-Fallback; bei Decode-Fehler nur die generische Meldung.
- Backend `StreamRelease` (`backend/internal/handlers/episode_version_stream.go`) proxied 1:1 zu
  Jellyfin/Emby `/Videos/%s/stream` (`EMBY/JELLYFIN_STREAM_PATH_TEMPLATE=/Videos/%s/stream`) —
  Direct-Stream OHNE Transcode-Parameter.
- Ergebnis: rohe .wmv (VC-1/WMA) im Browser -> Browser kann nicht dekodieren -> onError.

**Root Cause:** Playback-Pfad setzt browser-kompatible Codecs (MP4/H.264/AAC) voraus; es gibt
keine Transkodierung fuer inkompatible Quellen.

**Fix-Richtung (Feature, Backlog):**
1. Jellyfin-Transkodierung nutzen: entweder HLS (`/Videos/{id}/master.m3u8?...&videoCodec=h264&
   audioCodec=aac`) mit `hls.js` im Player, ODER transkodiertes MP4
   (`/Videos/{id}/stream.mp4?...&videoCodec=h264&audioCodec=aac&container=mp4`). Sauber ueber die
   Jellyfin-PlaybackInfo-API (mediaSourceId/playSessionId/deviceProfile) verhandeln, nicht naiv
   Params anhaengen. Braucht ffmpeg/Transcoding in Jellyfin (Ressourcen).
2. Mindestens: erkennbare Fehlermeldung ("Format wird im Browser nicht unterstuetzt — Datei ist
   .wmv") statt generisch, ggf. mit Hinweis auf externen Player.
3. Optional: beim Import inkompatible Container flaggen/warnen.

**Betroffen:** ReleaseEpisodePlayer.tsx (+ ThemeTimeline.tsx Segment-Player, gleiche Klasse),
episode_version_stream.go / buildProviderStreamURL, Jellyfin-Transcode-Konfig.

**Workaround (sofort):** WMV extern in VLC/MPV oder Jellyfins eigener Web-UI (transkodiert)
abspielen, Timestamp dort finden.

## 15. Episode-Import-Mapper: Fansub-Tag-Format falsch geparst -> etablierten Parser (Anitomy) einbinden
**Entdeckt:** 2026-08-18 (Mapping, Anime "Rental magica", NEW-SUBS-Dateien).

**Symptom:** Jellyfin/IMDB-Format (`SxxExx`) wird korrekt gelesen, das klassische Fansub-Tag-Format
`[GRUPPE]Titel_NN[Aufloesung][Codec][Quali][CRC].ext` NICHT. Live:
- `[NEW-SUBS]Rental_Magica_02[704x480][h264][SD][E61CA0BA].mp4` -> Vorschlag **Episode 61** (statt 2!):
  die `E(\d)`-Regex matcht `E61` in der CRC `[E61CA0BA]`.
- `_01[...][EF56DE87]` und `_03[...][F49E561C]` -> "Ohne Episodenzuordnung" (echte NN nie geparst).

**Diagnose:** `episodeImportEvidenceEpisodeNumber` (admin_episode_import.go:506) nutzt nur
Jellyfin-IndexNumber -> `S(\d)E(\d)` -> `E(\d)`. Nackte NN vor Metadaten-Bracket wird verpasst;
`E(\d)` matcht faelschlich CRC-Hex. Handgeschriebene Regexes sind hier ein Fass ohne Boden.

**ENTSCHEIDUNG (Nutzer):** KEIN Regex-Quick-Fix, sondern eine etablierte, corpus-getestete
Parser-Bibliothek einbinden.

**Moderner Ansatz -- Anitomy-Familie (Industriestandard fuer Anime-Dateinamen):**
Token/Keyword-basiert (kein Regex-Soup), parst zehntausende Namen/s mit hoher Genauigkeit, liefert
in EINEM Schritt: Titel, Episodennummer, Release-Group, Aufloesung, Video-/Audio-Codec, **CRC32**.
Deckt damit sowohl den Bug als auch den CRC-Wunsch ("xdcc rauslesen und eintragen") ab.

Go-Integrationsoptionen:
1. **anitogo** (github.com/nssteinbrenner/anitogo) -- pure Go, kein CGo, 27+ Felder inkl. CRC.
   Einfachste Integration; ABER nur ~13 Commits/wenig Aktivitaet -> Version pinnen (vendoring) +
   gegen ein Korpus echter Dateien testen, bevor produktiv.
2. **anitomy-c** (github.com/Xtansia/anitomy-c) -- C-ABI-Wrapper der originalen C++-Anitomy via
   CGo. Robustester Kern, aber CGo-Build-Komplexitaet.
3. **anitopy** (Python) als kleiner Sidecar -- aktivster Anitomy-Port; sehr robust, aber Extra-Dienst.

**Architektur:** Parser hinter ein Interface `ReleaseFilenameParser` -> Struct {Title, Episode,
Group, Resolution, VideoCodec, CRC, ...}. Evidence-Kette: fuer Fansub-Format den Parser bevorzugen,
Jellyfin-Metadaten als Fallback (Jellyfin ist gut fuers eigene SxxExx). **Fixture-Korpus echter
Fansub-Namen** als Regressionstest (Genauigkeit gemessen, nicht geraten). CRC braucht ein Zielfeld
(Schema) + Entscheidung wofuer (XDCC/Pack-Zuordnung/Dedup).

**Scope:** eigene Phase (Eval/Auswahl Parser -> Integration -> Fixture-Tests -> optional CRC-Feld),
KEIN Quick-Fix. Betroffen: admin_episode_import.go (Episoden-Evidence ersetzen), neues
importutil-Parser-Wrapper, Schema fuer CRC, Frontend-Mapping-Anzeige.

## 16. Source-lose Release-Versionen erfassen (Gruppe hat released, Datei nicht im Besitz/Jellyfin)
**Entdeckt:** 2026-08-18 (Frage: Release-Version fuer Fansubgruppe ohne Jellyfin-Source anlegen).

**Use Case:** Eine Fansubgruppe sagt "wir haben Episode X released", aber man besitzt die Datei
nicht -> es gibt keine Jellyfin-Source zum Mappen. Trotzdem soll der Release als historischer/
Credit-Fakt erfassbar sein ("Gruppe X, Episode Y, v1").

**Befund:**
- **DB erlaubt es.** `release_versions` braucht nur `release_id`+`version`(+title); die Gruppe haengt
  ueber `release_version_groups (release_version_id, fansub_group_id)`; `fansub_releases.source/
  source_id` sind NULLABLE; ein `release_variant` (Datei-/CRC-Eintrag, `crc32`, `filename`) braucht
  KEINEN `release_stream`. `release_streams`/`stream_sources` (mit Jellyfin/direct/youtube/vimeo)
  sind NUR fuer Playback noetig. -> Source-loser Metadaten-Release ist strukturell moeglich.
- **Workflow erlaubt es NICHT.** Der einzige produktive Erstell-Pfad fuer release_versions ist der
  Jellyfin-Import-Mapper (`backend/internal/repository/episode_import_repository_release_helpers.go`,
  INSERT INTO release_versions) -- setzt ein gemapptes Jellyfin-Item voraus. Kein manueller
  "Release ohne Source erfassen"-Endpoint/UI.

**Fix-Richtung (spaeter, NICHT jetzt planen):**
- Manueller "Release-Version erfassen"-Flow (Admin/Leitung): Episode + Gruppe(n) + Version(+ optional
  Variant mit filename/crc32/Aufloesung) anlegen, OHNE Stream/Source. Playback bleibt leer
  ("keine Quelle hinterlegt").
- Konsequenzen bedenken: Public-Release-Detail/Player muss source-lose Versionen sauber darstellen
  (kein Play-Button / "nur Metadaten"), Segment-/Kara-Features setzen eine Source voraus.
- Spaeter ggf. Source nachtraeglich anfuegen (wenn Datei doch auftaucht) -> Version bleibt, Stream
  wird ergaenzt.

**Betroffen:** neuer manueller Create-Pfad (Handler + Repo, analog import-helper aber source-los),
release_version_groups, Frontend Admin-Release-Erfassung + Public-Release-Detail/Player.

## 17. Punktvergabe-Fairness: Gruppen ohne Karaoke (fehlende Contribution-Typen)
**Entdeckt:** 2026-08-18 (Design-Frage, KEIN Bug).

**Frage:** Es gibt Fansubgruppen, die kein Karaoke gemacht haben. Wie handhaben wir die
Punktvergabe, damit das fair ist?

**Ausgangslage (aus 260722-member-gamification-DECISION.md):**
- Modell ist **contribution-basiert**: Punkte kommen aus einem **zentralen, versionierten
  Punktekatalog** pro **bestaetigter Mitwirkung** eines Typs (Editing, Uebersetzung, Timing,
  Typesetting, Encoding, **Karaoke**, Projektleitung, ...). Nicht "pro erwarteter Rolle".
- Kein Kara gemacht -> keine Kara-Contribution -> keine Kara-Punkte. Das ist by-design korrekt auf
  Contribution-Ebene (Punkte spiegeln tatsaechliche Arbeit).
- Die **konkreten Zahlenwerte des Katalogs sind noch offen** (Decision-Doc: "bleiben fuer spaetere
  Diskussion und Planung offen") -> die Fairness-Frage gehoert genau in diese Katalog-Planung.

**Offene Design-Punkte (spaeter entscheiden, NICHT jetzt planen):**
1. **Gesamtscore-Vergleich:** Ist der Gesamt-Score-Vergleich zwischen Mitgliedern/Gruppen fair,
   wenn manche Rollen strukturell fehlen (Kara-Gruppe vs. keine-Kara-Gruppe)? Contribution-basiert
   sagt "ja, mehr Arbeit = mehr Punkte"; fuer Ranglisten-Optik ggf. Kategorie-Aufschluesselung
   sichtbar halten (Decision-Doc fordert das bereits).
2. **Nicht-anwendbar vs. nicht-gemacht:** Manche Episoden haben gar kein OP/ED -> Kara ist NICHT
   ANWENDBAR (nicht "vergessen"). Sicherstellen, dass fehlende Kara nicht als Luecke/Penalty
   erscheint, sondern legitim leer bleibt (0 Punkte, kein Malus).
3. **Badges/Rollen-Vollstaendigkeit:** Falls es "vollstaendige Crew"-artige Badges gibt, koennen
   Kara-lose Gruppen die nie erreichen -> Badges lieber an tatsaechliche Contributions knuepfen,
   nicht an eine erwartete Voll-Crew.
4. **Katalog-Design:** Beim Festlegen der Punktwerte definieren, ob Rollen unterschiedlich gewichtet
   werden und wie mit selten/optional vorkommenden Rollen (Kara, Encode-Only-Releases) umgegangen
   wird.

**Betroffen:** Punktekatalog-Planung (Zahlenwerte + Regeln), Ranking-/Score-Darstellung
(Kategorie-Aufschluesselung), Badge-Definitionen, Release-Crediting-UI (Kara als optional/nicht-
anwendbar kennzeichenbar).

## 18. Projekt-Badge "vollstaendig mitgetragen" hat falschen Nenner + ist gameable (DEFEKT)
**Entdeckt:** 2026-08-18 (Frage "wann gilt ein Anime-Projekt als abgeschlossen fuers Badge").

**Problem:** Das Badge `contribution_projects` (Familie 1, "vollstaendig mitgetragene Projekte",
Stufen 1/5/15 = Bronze/Silber/Gold) misst Vollstaendigkeit gegen den FALSCHEN Nenner.

**Aktuelle (fehlerhafte) Logik** (`loadContribProjectsCount`,
backend/internal/repository/member_profile_contribution_badges_repository.go:90):
- Ein Projekt (anime_id + fansub_group_id) zaehlt als "fully carried", wenn das Mitglied auf ALLEN
  aktuell **verlinkten crediteten** release_versions dieses Anime/dieser Gruppe einen awarded-Credit
  hat. Nenner = die zufaellig vorhandenen Release-Versionen, NICHT die Episodenzahl des Anime.

**Warum falsch (Nutzer):**
1. Muss gegen die **Gesamt-Episodenzahl des Anime** gehen (`anime.max_episodes`), nicht gegen die
   Anzahl aktuell verlinkter Release-Versionen. Beispiel: Anime hat 12 (bzw. 24) Episoden, Gruppe
   hat nur 8 (bzw. 3) gemacht -> Projekt ist NICHT abgeschlossen, darf NICHT zaehlen.
2. **Gameable:** Man koennte pro Anime nur EINE Release verlinken, sich darauf creditlen lassen ->
   Projekt gilt sofort als "vollstaendig" -> schnell 50 Projekte ertricksen. Muss verhindert werden.

**Verfuegbare Daten (Fix machbar):** `anime.max_episodes` existiert und ist befuellt (Anime 2 = 24,
24 Episoden-Zeilen; 2/2 Anime mit max_episodes). `episodes` haelt eine Zeile je Episode 1..N.

**Fix-Richtung (spaeter, gehoert in Badge-/Punktekatalog-Arbeit):**
- "Projekt abgeschlossen (durch Gruppe)" = die Gruppe hat **alle** Episoden 1..max_episodes des
  Anime als creditete/awarded Release-Versionen abgedeckt (nicht nur die zufaellig verlinkten).
- "Mitglied hat Projekt vollstaendig mitgetragen" = Mitglied hat awarded-Credit auf allen diesen
  Episoden (oder klar definierter Coverage-Schwelle) -> erst dann Badge-Zaehlung.
- Anti-Trick: Einzel-Release-Verlinkung darf NIE ein volles Projekt ergeben; Nenner ist
  anime.max_episodes / die vollstaendige Episodenmenge.
- Edge Cases klaeren: laufende Anime (max_episodes noch offen/0), Specials/Movies (max_episodes=1),
  Multi-Gruppen-Releases, Episoden noch nicht importiert (dann kann Projekt noch nicht "complete"
  sein). Verwandt mit [[Finding #17]] (Fairness Kara/fehlende Rollen).

**Betroffen:** member_profile_contribution_badges_repository.go (loadContribProjectsCount-Query neu
gegen anime.max_episodes), evtl. badge_service.go (COUNT(DISTINCT anime_id) an anderer Stelle
pruefen), Badge-Tests/Fixtures.

## 19. Rollen-Taxonomie: Typesetting und Karaoke/FX muessen zwei eigene Rollen sein
**Entdeckt:** 2026-08-18 (Rollen-Finding).

**Problem:** Aktuell gibt es nur EINE Rolle `typesetter` mit Label "Typesetting / FX"
(role_definitions, contexts {anime_contribution, group_history}, assignable=false, sort_order 40).
Im Fansubbing sind das aber zwei verschiedene Gewerke:
- **Typesetting** = Schrift/Signs/Dialog-Styling.
- **Karaoke / FX** = animierte OP/ED-Effekte (KFX).

**Zusatz-Inkonsistenz:** Das gamification-Decision-Doc (260722-member-gamification-DECISION.md)
listet **"Karaoke" explizit als eigenen Contribution-Typ** ("Editing, Uebersetzung, Timing,
Typesetting, Encoding, Karaoke oder Projektleitung") -- es gibt aber KEINE Karaoke-Rolle in
role_definitions. Punkte-/Badge-Modell referenziert also einen Rollentyp, den die Taxonomie nicht
kennt.

**Fix-Richtung (spaeter; gehoert in den Rollenmodell-Rework, vgl. project_role_model_rework):**
- Neue role_definitions-Zeile fuer **Karaoke/FX** (z. B. code `karaoke` bzw. `kfx`, Label
  "Karaoke / FX"), contexts {anime_contribution, group_history}, assignable/sort_order analog den
  anderen Arbeitsrollen, + role_capabilities falls noetig.
- `typesetter` auf reines **"Typesetting"** umlabeln (FX wandert zu Karaoke/FX).
- Append-only Migration (Rolle hinzufuegen) + Re-Label als UPDATE; append-only Trigger beachten.
- Konsequenzen: Rollen-Picker (vgl. Finding #7 / Fix eabc8afd -- der contexts-Filter zieht die
  neue Rolle automatisch mit), Credits/Contributions, Punktekatalog (Karaoke als eigener gescorter
  Typ -> deckt sich dann mit dem Decision-Doc), Badges, historische Rollenanzeige.
- Entscheidung: genauer Code/Label; bestehende typesetter-Altdaten, die eigentlich Kara waren,
  bleiben vermutlich unveraendert (keine Rueckwirkende Umdeutung) -- klaeren.

**Neuer Rollen-Badge + volle Verdrahtung (Nutzer-Ergaenzung):** Es gibt eine Badge-Gruppe `'roles'`
(frontend/src/components/profile/memberBadgeLabels.ts, `MemberBadgeGroup='roles'`, per-Rolle ueber
`roleCode` zusammengefuehrt). Fuer die neue Karaoke/FX-Rolle also:
- Rollen-Badge-Praesentation (Label/Variant/Palette/roleCode) in memberBadgeLabels.ts ergaenzen,
  ggf. Badge-Artwork.
- Ende-zu-Ende sauber verdrahten -- die ganze Kette: role_definitions -> Credit/Contribution ->
  Punktekatalog (Karaoke als eigener gescorter Typ) -> Badge-Ableitung -> Anzeige (MemberBadgeChain,
  roles-Gruppe) -> Rollen-Picker. Nichts darf die neue Rolle "verlieren".

**Betroffen:** role_definitions (neue Rolle + Re-Label), ggf. role_capabilities, Rollen-Picker,
Credits-/Contribution-UI, Punktekatalog, memberBadgeLabels.ts (roles-Badge + roleCode) + Badge-
Artwork, MemberBadgeChain-Anzeige.

## 20. Keycloak-Registrierung auf "Fansubname" umbauen (First/Last-Name optional)
**Entdeckt:** 2026-08-18 (erweitert Phase 135 / 135-08 KC-Register-Arbeit).

**Wunsch:** Bei der KC-Registrierung soll man einen **Fansubname** eintragen koennen (primaeres
Identitaetsfeld). Aktuell fragt KC **Vorname + Nachname** ab -- das verwirrt. First/Last-Name sollen
**freiwillig** sein (nur wer will). Zukuenftig muss Keycloak diesen Wert als **Fansubname** fuehren/
lesen, und er soll **editierbar** sein.

**Ist-Zustand:**
- Realm nutzt firstName/lastName (OIDC-Mapper vorhanden, im Register-Formular Standard-Pflichtfelder).
- Team4s hat AM PROFIL bereits ein editierbares `fansub_name` (backend/internal/handlers/app_profile.go
  DisplayName+FansubName als OptionalString, UpdateOwnProfile) + `members.nickname`/`public_slug`.
  -> Fansubname existiert Team4s-seitig, ist aber von der KC-Registrierung entkoppelt.

**Kern-Entscheidung (Doppelquelle vermeiden!):** Wo ist der Fansubname autoritativ?
- KC (`username` oder Custom-Attribut `fansubName`) -> per Token gelesen -> seedet Team4s
  members.nickname/fansub_name; ODER
- Team4s (`members`) bleibt autoritativ, KC haelt nur Login-Credentials.
Der Nutzer will KC als lesende/haltende Quelle ("bei Keycloak als Fansubname gelesen"). Sync-Richtung
+ Konfliktregeln festlegen, sonst Drift mit dem bestehenden members.nickname/public_slug.

**Fix-Richtung (spaeter; zusammen mit 135-08 register.ftl):**
- KC 10.11 **Declarative User Profile**: firstName/lastName auf NICHT erforderlich; Attribut fuer
  Fansubname (username-basiert ODER Custom-Attribut) als Pflicht bei Registrierung.
- register.ftl (team4s-Theme, 135-08) mit klarem Label "Fansubname" statt Vor-/Nachname; optionale
  Namensfelder ausblenden/als optional markieren.
- OIDC-Protocol-Mapper: Fansubname in den Token, damit JIT-Sync ihn liest und members.nickname/
  fansub_name seedet.
- Editierbarkeit: via KC-Account-Console UND/ODER Team4s-Profil (heute schon editierbar) --
  konsistent halten (eine Schreibrichtung als Master).
- public_slug-Regeln (unique/immutable) beim Fansubname-Setzen beachten (vgl. members-CHECKs).

**Betroffen:** infra/keycloak/realm-team4s.json (User-Profile/Attribute/Mapper), register.ftl
(135-08), JIT-Sync (SyncGlobalRolesFromKeycloak-Umfeld / Identity-Seed), app_profile.go
(fansub_name-Editier-/Sync-Logik), members (nickname/public_slug).

## 21. Segment-Editor fehlt komplett im Projekt-Weg (Release-Projektbereich /me/releases)
**Entdeckt:** 2026-08-18 (als D1sk ueber Meine Projekte -> Projekt oeffnen).

**Symptom:** Ueber den **Projekt-Weg** (Meine Projekte -> Projekt oeffnen -> Release-Projektbereich)
gibt es nur die Tabs **"Bilder & Medien"** und **"Notizen"** -- KEIN "Segmente"-Tab. Der Segment-
Editor existiert nur im separaten **Contributor Editor** (Admin-Episode-Version-Edit-Weg).

**Diagnose (Code):**
- `frontend/src/app/me/releases/[versionId]/workspace/page.tsx` baut tabItems nur aus
  "Bilder & Medien" (media, Z.149) + "Notizen" (notes, Z.165). Kein Segmente-Tab.
- Der Segment-Editor liegt unter `frontend/src/app/admin/episode-versions/[versionId]/edit/`
  (SegmenteTab.tsx / SegmentEditPanel.tsx).
- -> Ein Projekt-Mitglied (z. B. D1sk, Encoder), das ueber den Meine-Projekte-Workspace arbeitet,
  erreicht die Segment-Bearbeitung dort NICHT.

**Fix-Richtung:** Segmente-Tab auch im /me/releases-Workspace anbieten (SegmenteTab/SegmentEditPanel
wiederverwenden), gated auf die entsprechende Capability. Vgl. Finding #16 (source-lose Releases)
und #22.

**Betroffen:** frontend/src/app/me/releases/[versionId]/workspace/page.tsx (tabItems),
Segmente-Komponenten unter admin/episode-versions/[versionId]/edit/, Capability-Gate.

## 22. "segment nicht gefunden"-Fehlerbanner obwohl Segmente existieren + Release gemappt
**Entdeckt:** 2026-08-18 (Contributor Editor -> Segmente-Tab, Buddy Complex Ep 1).

**Symptom:** Der Segmente-Tab zeigt ein rotes Banner **"segment nicht gefunden"**, obwohl OP- und
ED-Segmente korrekt gelistet sind (OP 00:00:00-00:02:12, ED 00:22:23-00:23:44) UND die Release-
Version gemappt ist (Quelle "Episode-Version / Jellyfin-Stream"). Segmente stehen auf
"Nicht vorbereitet".

**Diagnose (Verdacht):** Der Text "segment nicht gefunden" wird von mehreren Backend-Handlern als
404 geliefert -- u. a. `backend/internal/handlers/segment_stream.go` (Segment-Stream/Preview) und
`admin_content_anime_theme_segment_assignments.go`. Da die Segmente "Nicht vorbereitet" sind, feuert
vermutlich ein sekundaerer Stream-/Preview-Call 404 -> wird als generisches "nicht gefunden" im
Editor angezeigt, obwohl das Segment sehr wohl existiert (nur der Stream ist nicht vorbereitet /
keine abspielbare Source, vgl. Finding #14 wmv/Transcoding).

**Fix-Richtung:** (1) Fehlerursache eingrenzen (welcher Call 404t) via Netzwerk/Backend-Log. (2)
"Nicht vorbereitet" NICHT als "segment nicht gefunden" darstellen -- korrekte, nicht alarmierende
Meldung (oder gar kein Banner, wenn die Segmentliste erfolgreich lud). (3) haengt mit der
Source-/Playback-Vorbereitung zusammen (#14/#16).

**Betroffen:** frontend Segmente-Tab (Fehlerbanner-Logik), backend segment_stream.go /
admin_content_anime_theme_segment_assignments.go (404-Faelle unterscheiden).

**#22 Praezisierung (Nutzer, 2026-08-18):** Die Release-Version IST vorhanden; beim Vorbereiten/Abspielen eines Segments SOLLTE Jellyfin einen Encode/Transcode starten -- das passiert aber offenbar NICHT (Segment bleibt "Nicht vorbereitet"). Also kein reines Anzeige-Problem: die Segment-Stream-Vorbereitung (Jellyfin-Encode-Trigger) startet nicht. Eng mit Finding #14 (Jellyfin-Transcoding) verbunden -- Segment-Clip-Erzeugung braucht denselben Transcode-Pfad.

## 23. Oeffentliche Gruppenseite: App-Member nicht klickbar (falscher Member-Join)
**Entdeckt:** 2026-08-18 (oeffentliche Fansub-Gruppe, aktive Mitglieder).

**Symptom:** Member auf der oeffentlichen Gruppenseite sind NICHT anklickbar (kein Link zum Profil), obwohl profile_visibility=public und public_slug existieren.

**Root Cause:** frontend FansubTeamActiveGroup.tsx verlinkt nur wenn member.member_slug != null. Backend domain_projection_repository.go (Z.127) joint members via LEFT JOIN members m ON m.user_id = au.legacy_user_id -- ABER members.user_id ist bei allen NULL. Die echte app_user<->member-Verknuepfung liegt in member_claims (verified). -> Join scheitert -> member_slug=NULL -> kein App-Member klickbar. Sichtbarkeitsgate (m.profile_visibility=public) ist korrekt und erfuellt.

**Fix:** Member-Join in domain_projection_repository.go ueber member_claims (claim_status=verified: mc.app_user_id=au.id -> m.id=mc.member_id) fuehren statt ueber members.user_id. Historischen Pfad (hfgm.member_id) unveraendert lassen.

**Betroffen:** backend/internal/repository/domain_projection_repository.go (member-Join in der App-Member-Projektion).

## 24. Profil-Avatar-Upload: neues Bild erst nach Tab-Wechsel sichtbar
**Entdeckt:** 2026-08-18 (Mein Profil, Avatar zuschneiden -> Ausschnitt uebernehmen).

**Symptom:** Nach dem Hochladen/Zuschneiden eines Avatars zeigt die aktuelle Ansicht weiter das alte/kein Bild; erst beim Wechsel in den Tab "Sichtbarkeit" (frischer Mount) erscheint der neue Avatar.

**Analyse (Code):** frontend/src/app/me/profile/page.tsx handleAvatarSelected (Z.463) ruft nach uploadOwnProfileAvatar korrekt applyProfile(response.data) -> setProfile; avatarURL=useMemo an profile.avatar.public_url (Z.341). State wird also aktualisiert. Trotzdem kein In-Place-Refresh -> Verdacht: (a) Browser-Image-Cache bei gleicher/aehnlicher URL, ODER (b) die Avatar-Karte auf der Upload-Oberflaeche liest die neue URL nicht neu / Instanz re-rendert nicht, waehrend der Tab-Wechsel remountet und die neue URL laedt.

**Fix-Richtung:** Cache-Busting-Query am Avatar-URL (z. B. ?v=updated_at/media_id) nach Upload, ODER sicherstellen, dass die anzeigende Avatar-Karte auf profile.avatar.public_url-Aenderung re-rendert (key/prop). Konsistent fuer Banner/Hintergrund (handleBackgroundSelected, gleiche Struktur).

**Betroffen:** frontend/src/app/me/profile/page.tsx (avatarURL/applyProfile), MemberAvatarCard.tsx / ProfileBackgroundCard.tsx.

## 25. Historisch-Mitglied-Selbst-Claim: Approval-Routen fehlen (Leader kann Antrag nicht bestaetigen)
**Entdeckt:** 2026-08-18 (Extro als his. Mitglied -> Extro loggt ein + SubmitClaim -> Leader d1sk hat keine Pruef-/Bestaetigungs-UI).

**Symptom:** Ein Nutzer beantragt selbst, ein historisches Mitglied zu sein (SubmitClaim, claim_status=pending). Der Gruppen-Leader hat NIRGENDS eine Oberflaeche, den Antrag zu bestaetigen/ablehnen.

**Root Cause:** Backend-Handler EXISTIEREN (member_claims_handler.go: VerifyClaim:136, RejectClaim:161, ListPendingClaimsForGroup:117) UND Frontend-UI existiert (api.ts listPendingMemberClaims:4191, GroupMembersTab pendingClaimsByMember, useGroupMembersClaimActions approve/reject) -- ABER die Routen sind in backend/cmd/server/main.go NICHT registriert (nur /me/member-claim[s] + /claim-invitations/accept). -> listPendingMemberClaims 404 -> keine pending Claims geladen -> keine Approval-UI.

**Fix:** Fehlende Routen in main.go verdrahten (Pfade an die Frontend-api.ts-URLs anpassen), member-scoped/permission-gated (Leader/platform_admin): List pending claims (group), Verify claim, Reject claim. Handler + Repo + UI sind schon da.

**Betroffen:** backend/cmd/server/main.go (Routen), member_claims_handler.go (bereits vorhanden), frontend GroupMembersTab/useGroupMembersClaimActions (bereits vorhanden). Verwandt mit #6 (Claim-Invite-Button) und Member-Registrierung/Onboarding.

**#25 KORREKTUR (2026-08-18):** Diagnose "Routen fehlen" war FALSCH -- die Routen existieren in backend/cmd/server/admin_routes.go (Z.225-227), Permission (ActionFansubGroupHistoricalMembersLink) hat der Leader, und der Endpoint GET /admin/fansubs/1/member-claims liefert als d1sk korrekt den pending Claim {id:2, member_id:2 Extro, pending}. ECHTER BUG: FRONTEND-Render-Luecke -- GroupMembersHistTable.tsx bekommt pendingClaimsByMember + onVerifyClaim + onRejectClaim durchgereicht, nutzt sie aber NIE im Render (nur 3x = die Typ-Deklarationen; keine .get()/onVerifyClaim()-Aufrufe). Genau das #6-Muster (deklariert+durchgereicht, aber ungerendert). FIX: In der HistoricalMemberCard pro Member pendingClaimsByMember.get(member.id) rendern -- Antrag anzeigen + Bestaetigen/Ablehnen-Buttons (onVerifyClaim/onRejectClaim). Backend/Daten/Handler sind fertig. Betroffen: frontend GroupMembersHistTable.tsx (HistoricalMemberCard-Render). Route-Wiring/KC NICHT betroffen.

## 26. Historischer Claim verifiziert != aktives Mitglied (UX unklar, kein Aktivieren-Pfad)
**Entdeckt:** 2026-08-18 (Extro claimt historisches Mitglied -> Leader bestaetigt -> Extro hat trotzdem keinen Gruppenzugriff / erscheint nicht als aktives Mitglied).

**Verhalten (by design, aber unklar):** VerifyClaim (member_claims_repository.go:176) markiert claim_status=verified + verknuepft app_user<->historisches Mitglied. Es legt KEINE fansub_group_members-Zeile an (0 aktive Membership). Der historische Eintrag hat einen abgeschlossenen Zeitraum (Extro: Editing 2013-2015 = ausgetreten) -> Credit fuer Vergangenes, kein aktueller Zugriff. Korrekt, aber der Nutzer erwartet ein echtes Mitglied.

**UX-Luecke:** (1) Keine Rueckmeldung nach Verify, dass dies nur historische Verknuepfung ist, nicht aktive Mitgliedschaft. (2) Kein direkter Pfad, ein verifiziertes historisches Mitglied zum AKTIVEN Mitglied zu machen (aktuell nur separat via Mitglied-hinzufuegen). (3) Ggf. Sonderfall: historisches Mitglied OHNE End-Datum (noch aktiv) -> soll Verify dann aktive Membership anlegen? Entscheiden.

**Fix-Richtung (Design):** Nach Verify klare Meldung (historisch verifiziert vs aktiv); optional Aktion "Als aktives Mitglied uebernehmen" (legt fansub_group_members + Rollen aus den historischen Rollen an); Semantik historisch(ended) vs aktiv sauber definieren.

**Betroffen:** member_claims (Verify-Flow), fansub_group_members (aktive Membership), GroupMembersHistTable/GroupMembersTab (UX/Aktion), Member-Onboarding-Design.

## 27. Member-Suche (Mitglied hinzufuegen) zeigt Duplikate: historisches Mitglied + verknuepfter Account + verwaister app_user
**Entdeckt:** 2026-08-18 (Mitglied hinzufuegen -> Suche zeigt 2x Extro: Extro + extro).

**Root Cause (zwei Ebenen):**
1. **Verwaister app_user:** zwei app_users extro -- id=4 (KC-Subject b53faa4f, aktuell) + id=1 (Subject 93662416, in KC NICHT mehr vorhanden). Entstanden durch KC-User loeschen+neu-anlegen (neuer Subject) beim Testen; Team4s keyt app_users nach keycloak_subject, nicht E-Mail -> alte Zeile verwaist. Edge case, aber real (KC-Identitaet neu = Duplikat + Leiche).
2. **Suche dedupliziert claim-verknuepfte Person nicht:** zeigt historisches Mitglied members.nickname (Extro) UND den verknuepften Account (extro) als getrennte Treffer, obwohl member_claims sie verbindet. Case-Unterschied aus offener Case-Preservation (D-15).

**Fix-Richtung:** (a) Suche dedupliziert ueber member_claims (verified): ein Eintrag pro Person (historisches Mitglied + verknuepfter Account = 1). (b) Verwaiste app_users (Subject nicht mehr in KC) bereinigen/ignorieren -- ggf. bei Recreate per E-Mail den bestehenden app_user re-subjecten statt neu anlegen. (c) haengt an D-15 (Case).

**Betroffen:** member-search (member_archive_repository SearchMembers + ggf. app_user-Quelle), app_user-JIT (EnsureAppUserForIdentity, Subject-vs-Email), Mitglied-hinzufuegen-Dialog.

**#26 KORREKTUR (2026-08-18):** KEIN Bug. Der Claim->aktiv-Pfad EXISTIERT und funktioniert: VerifyClaim ruft ResolvePendingRolesToActive (member_claims_role_activation_repository.go:18), das historische Rollen mit ended_date IS NULL (noch offen) + ohne fansub_lead/founder als AKTIVE Membership+Rollen uebernimmt. Extro wurde nicht aktiv, weil seine einzige Rolle editor ein End-Datum hat (2013-08-15 bis 2015-09-26 = ausgetreten) -> korrekt ausgeschlossen. Design: beendete historische Rollen = Credit fuer Vergangenes, keine aktive Mitgliedschaft; offene Rollen -> automatisch aktiv beim Claim. Test-Daten-Verwirrung, nicht Code-Bug. OFFENE Produkt-Entscheidung falls gewuenscht: (a) Leader-Override-Aktion Als-aktives-Mitglied-uebernehmen (auch fuer beendete), ODER (b) so lassen (offene Rolle -> aktiv).

## 28. Post-Aktivierung: Historisch-Mitglied bleibt doppelt + Gruppenzugehörigkeit leer
**Entdeckt:** 2026-08-19 (Claim -> "Als aktives Mitglied übernehmen" Live-UAT, Yuzzie).

**Symptom:**
1. Nach "Als aktives Mitglied übernehmen" erscheint die Person DOPPELT: aktiv in der
   Mitgliederübersicht UND weiterhin in "Historische Mitglieder" mit dem jetzt sinnlosen
   "Als aktives Mitglied übernehmen"-Button.
2. Das öffentliche Member-Profil (/members/<slug>) zeigt "Gruppenzugehörigkeit: Keine
   Gruppen eingetragen", obwohl die Person real aktives Mitglied (fansub_group_members
   status=active) ist.

**Root-Cause (verifiziert an DB + Code):**
- Öffentliche Membership-Query `backend/internal/repository/member_profile_memberships_repository.go`:
  Hist-Join hat `AND ($3 OR hgm.visibility = public)` mit `$3=false` (Public-Aufruf
  `loadMemberships(ctx, memberID, 0, false, false)`). Yuzzies hist_fansub_group_members-Zeile
  hat `visibility=internal` -> herausgefiltert.
- Die AKTIVE App-Mitgliedschaft wird auf Public-Profilen gar nicht herangezogen
  (`fgm.app_user_id = $2` mit `$2=0`, und interne Details nur bei `$4=true`).
- Die Historisch-Liste (GroupMembersHistTable) blendet aktiv gewordene Mitglieder nicht aus.

**Entscheidung (Nutzer, 2026-08-19): Option 1 – eine Person = eine Karte.**
Sobald das verknüpfte Konto aktives App-Mitglied der Gruppe ist:
- die separate Historisch-Karte aus der "Historische Mitglieder"-Liste ausblenden;
- die dokumentierten Rollen-Perioden (z. B. 2012-2015) als Historie/Zeitleiste an der
  AKTIVEN Mitglieder-Karte bzw. am öffentlichen Profil zeigen;
- Rollen-Historie bleibt in ALLEN Fällen in der DB erhalten (kein Löschen).
- Damit ist die Gruppenzugehörigkeit auf dem Public-Profil korrekt (aktive Gruppe + Historie).

**Scope:** Eigener Post-Aktivierungs-Fix, NICHT Teil von Phase 135 (135-10 = D-15 Case +
D-16 Claim-Render). Non-KC, Frontend + Backend. Betrifft mind.:
- member_profile_memberships_repository.go (Public zeigt aktive App-Mitgliedschaft + Historie)
- Historisch-Listen-Endpoint/Query (aktive Mitglieder ausschliessen)
- Frontend GroupMembersHistTable / FansubAppMembersOverview / MembershipsSection
  (Historisch-Karte ausblenden wenn aktiv; Rollen-Historie an aktiver Karte/Profil).

*Backlog-Notiz — noch kein Commit.*

### #28 Nachtrag (2026-08-19): Increment A entschaerft statt komplett ausblenden
Nutzer-Entscheidung revidiert: aktive Mitglieder NICHT komplett aus "Historische Mitglieder"
ausblenden (Admin verliert sonst Sicht/Edit auf die dokumentierten Rollen), sondern:
- aktive Mitglieder bleiben in der Historisch-Liste sichtbar (Rollen-Badges),
- der redundante "Als aktives Mitglied uebernehmen"-Button entfaellt fuer aktive Member
  (Bedingung `!member.active_app_member_id`), stattdessen schlanker Marker
  "Aktives Mitglied dieser Gruppe",
- der gruene "Account verknuepft · bereit zur Uebernahme"-Block zeigt nur noch fuer
  verknuepft-aber-noch-nicht-aktive Member,
- Rollen-Editieren laeuft weiter ueber den "Rolle hinzufuegen"-Dialog (volle Mitgliederliste).
Increment B (Public-Profil Gruppe+Historie) + #3 (Linked-Karte) bleiben wie umgesetzt.

## 29. Capability-Verwaltung (Milestone-Vorbereitung): OR-Kombination + fehlende Effektiv-Rechte-Sicht
**Entdeckt:** 2026-08-20 (Capability-Verwaltung-UI, Live-Test D1sk als New-Subs-Leader).

**Kein Bug — Enforcement funktioniert** (roleAllows liest DB-`role_capabilities` ueber Cache,
`canForContext` in backend/internal/permissions/permissions.go). Aber die UI fuehrt zu
Fehlinterpretationen:

**Beobachtung:** "Gruppe bearbeiten" bei Rolle *Administration* abgewaehlt, D1sk (kein
platform_admin, nur Leader) kann die Gruppe trotzdem bearbeiten.

**Ursache (verifiziert):**
- Nur `fansub_lead` + `project_lead` haben `fansub_group.edit` (role_capabilities).
- D1sk hat in New-Subs die Rollen: fansub_lead, project_lead, co_leader, encoder, timer,
  typesetter, raw_provider.
- Rechte werden OR-verknuepft ueber ALLE Rollen des Users: eine erlaubende Rolle genuegt.
- Es wurde die falsche Rolle (Administration) getoggelt; D1sks Recht kommt aus
  fansub_lead/project_lead, die weiterhin aktiv sind.
- platform_admin (nur `admin`) umgeht alles by-design (ReasonPlatformAdmin in canForContext).

**Punkte fuer den Capability-Verwaltung-Milestone:**
1. OR-Kombination ueber mehrere Rollen ist in der UI unsichtbar -> braucht eine
   "Effektive Rechte fuer User X"-Ansicht (was kann dieser konkrete User wirklich, gegeben
   ALLE seine Rollen) statt nur Pro-Rolle-Toggles.
2. Bei einer Capability-Aenderung anzeigen, welche User/ Rollen betroffen sind (Impact).
3. Cache-Reload-Delay sichtbar/robuster machen (UI sagt es bereits).
4. Klarstellen, dass platform_admin alles darf (Bypass) und Toggles ihn nicht betreffen.
5. Capability-Zuordnung ist datengetrieben (role_capabilities, Migration 0108) - editierbar;
   Basis fuer die geplante daten-getriebene Capability-Registry
   (siehe Memory project_capability_registry_planned + project_role_model_rework).

*Backlog-Notiz fuer den kuenftigen Milestone - kein Commit.*

### #29 Nachtrag (2026-08-20): Kernproblem = pro-Rolle statt pro-User, "X darf Y nicht" ist nicht ausdrueckbar
Nutzer-Feedback: das aktuelle Modell macht es "extrem kompliziert zu verstehen und zu
erkennen, was man genau machen muss, wenn User X etwas NICHT koennen soll".

Wurzel: Berechtigung = ROLLE -> Capability (OR ueber alle Rollen des Users). Es gibt KEINE
User-Ebene. "User X darf Aktion Y nicht" ist damit nicht sauber ausdrueckbar:
- Capability an der Rolle abwaehlen trifft ALLE Rolleninhaber, nicht nur X.
- X aus allen erlaubenden Rollen nehmen ist grob + man muss die Rollen erst finden.

Vorgeschlagene Milestone-Richtung (Capability-Verwaltung), um es beherrschbar zu machen:
1. **Effektive-Rechte-Inspektor pro User**: "Was kann User X?" mit WARUM (welche Rolle gewaehrt
   jede Capability) - volle Transparenz statt Pro-Rolle-Raten.
2. **Pro-User Allow/Deny-Overrides** ueber den rollen-abgeleiteten Rechten: der saubere Weg,
   einem konkreten User eine Aktion gezielt zu entziehen/zu geben, ohne Rollen/andere User
   anzufassen. (Deny gewinnt vor rollen-Allow.)
3. **Gefuehrter Entzugs-Flow**: "X soll Y nicht koennen" -> UI zeigt alle Rollen von X, die Y
   geben, + bietet an: per-User-Deny setzen (chirurgisch, empfohlen) ODER aus Rollen nehmen
   (mit Impact-Vorschau, wie viele andere betroffen waeren).
4. Ergaenzt die bereits gelisteten Punkte 1-5 oben; daten-getriebene Basis role_capabilities
   bleibt, Overrides kommen als zusaetzliche user_capability_overrides-Ebene dazu.

### #29 Nachtrag 2 (2026-08-20): Effektiv-Rechte-Sicht existiert bereits in Ansaetzen -> darauf aufbauen
Die User-Detail-Ansicht (frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx, Tab
frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx) zeigt schon PRO USER:
- "Gruppenmitgliedschaften" (Gruppen + Rollen des Users, read-only)
- "Gruppenrechte (read-only)": pro Gruppe die Rollen + effektive Spalten (z.B. "Inhalte
  bearbeiten: Ja", "Mitglieder einsehen: Ja") + pro Rolle Link "Was darf diese Rolle?".

Das ist die Keimzelle von Milestone-Punkt #1 (Effektiv-Rechte-Inspektor). Der Milestone sollte
diese Ansicht AUSBAUEN statt neu bauen:
- volle effektive Capability-Liste statt nur 2 Beispiel-Spalten, mit WARUM (welche Rolle gibt es);
- die Ansicht EDITIERBAR machen (heute read-only + Verweis "in der Gruppenansicht bearbeiten")
  -> genau HIER der per-User Allow/Deny-Override (#2) und der gefuehrte Entzugs-Flow (#3);
- so wird "X darf Y nicht" ein Ein-Klick-Vorgang direkt in der User-Ansicht.

## 30. User-Detail-Ansicht: read-only Flach-Listen pro Release-Version skalieren nicht (Milestone)
**Entdeckt:** 2026-08-20 (admin/users/[id], Tabs Beitraege + Medien + Gruppenrechte; D1sk).

Gemeinsamer Schmerz ueber mehrere Tabs der User-Detail-Ansicht: alles sind read-only
Flach-Listen, die PRO RELEASE-VERSION eine Zeile zeigen -> bei einem Anime mit 13 Versionen
schon eine volle Seite; bei 10 Animes x N Versionen unbrauchbar.

Betroffen:
- Tab "Beitraege" (frontend/src/app/admin/users/tabs/UserContributionsTab.tsx): "Projektweite
  Beitraege (Standard)" (1) + "Release-spezifische Overrides" (13x "encoder" fuer Buddy
  Complex/New-Subs, Version 1..13). Problem: es werden ALLE Versionen als "Override" gelistet,
  auch wenn die Rolle identisch zum Projekt-Standard ist (kein echter Override) -> reines
  Rauschen. Sinnfrage vom Nutzer: "ist das einfach eine Anzeige, was ist der Sinn?"
- Tab "Medien" (Mediauploads nach Release-Version, read-only, D-15): Uploads pro Version, je
  Datei "Berechtigung aktiv" + "Arbeitsflaeche oeffnen".
- Tab "Gruppenrechte" (read-only, UserGroupRightsTab.tsx, siehe #29).

Milestone-Richtung:
- Nur ECHTE Abweichungen zeigen (Release-Override nur wenn != Projekt-Standard); identische
  Versionen zusammenfassen ("Version 1-13: encoder = Projekt-Standard").
- Nach Anime gruppieren + einklappbar + paginieren/filtern; Projekt-Standard als Zusammenfassung.
- Klarer Zweck je Tab: was soll der Admin damit TUN? (nur Anzeige -> mind. gruppiert/kompakt;
  oder actionable machen).
- Zusammen mit #29 (Effektiv-Rechte + per-User-Override) Teil des Capability-/User-Admin-Milestones.

*Backlog-Notiz fuer den Milestone - kein Commit, nichts fixen.*

## 31. Per-Mitglied-Review-Delegation ist halb gebaut (kein Endpoint/UI) — Milestone
**Entdeckt:** 2026-08-20 (Frage: "Wo stelle ich ein, dass Extro Medien+Notizen pruefen/freigeben kann?").

Antwort: gar nicht gezielt. Review/Freigabe = `review.image.decide` (Medien/Bilder),
`review.text.decide` (Notizen/Texte), `review.contribution.decide` (Mitwirkungen). Diese
Caps haben in role_capabilities NUR die Rolle `fansub_lead`. Extro (editor) hat sie nicht.
Einziger Weg heute: Extro `fansub_lead` geben = volle Leiter-Rechte (zu breit).

WICHTIG: Der chirurgische Mechanismus EXISTIERT im Backend, ist aber nicht angebunden:
- Tabelle `fansub_group_member_review_capabilities` (fansub_group_member_id, action_code).
- `review_delegation_repository.go`: GrantAction (INSERT) + RevokeAction (DELETE) vorhanden.
- Enforcement liest es (CanReviewForFansubGroup -> ResolveActorReviewGrantContext).
- ABER: ReviewDelegationRepository ist an KEINEN Handler/Route gebunden (grep in main.go/handlers
  leer, nur Tests); Tabelle ist leer. -> nicht bedienbar, kein UI.

Milestone-Aufgabe: die per-Mitglied-Review-Delegation verdrahten:
- Endpoint(s) POST/DELETE zum Grant/Revoke einer Review-Action fuer ein Gruppenmitglied.
- UI: im "Mitglied bearbeiten"-Panel (FansubAppMemberEditorPanel.tsx, hat schon Tabs
  Rolle/Medienrechte/Historische Rollen) einen Abschnitt "Pruef-/Freigabe-Rechte" mit Toggles
  je Review-Action (Medien pruefen, Notizen pruefen, Mitwirkungen pruefen).
- Damit: "Extro darf Medien+Notizen freigeben" = 2 Toggles, ohne ihn zum fansub_lead zu machen.
- Passt zur per-User-Override-Idee aus #29 (Review-Delegation ist bereits eine per-Mitglied-Ebene).

## 32. Pruefliste zeigt Eintraege, die der User nicht entscheiden darf (Milestone)
**Entdeckt:** 2026-08-20 ("Offene Pruefungen der Fansubgruppe", eingeloggt als D1sk).

Nutzer-Anforderung: "Sachen wo ich gar keine Rechte habe zu pruefen duerfen mir nicht
angezeigt werden."

Symptom: Die Pruefliste ("Offene Pruefungen der Fansubgruppe", release_review queue) zeigt
Eintraege, die der eingeloggte User NICHT entscheiden kann:
- eigene Einreichungen (Vier-Augen: Selbst-Review verboten) -> hier alle 5 Eintraege von D1sk,
  D1sk kann keinen davon freigeben -> reines Rauschen, oeffnet -> "das ist dein eigener Beitrag".
- generell alles, wofuer der User keine Review-Rechte hat.

Milestone-Aufgabe: Die Queue serverseitig (nicht nur clientseitig) auf "vom aktuellen User
ENTSCHEIDBAR" filtern:
- Selbst eingereichte ausblenden (bzw. klar getrennt als "eigene, warten auf Fremd-Review"),
- nur Typen zeigen, fuer die der User die Review-Capability hat (review.text/image/contribution.decide),
- optional Badge-Counts (Texte/Bilder/Mitwirkungen) entsprechend auf das Entscheidbare beziehen.
Haengt mit #31 (Review-Delegation) + #29 (effektive Rechte) zusammen.

*Backlog-Notiz fuer den Milestone - kein Commit.*

## 33. Plattform-weite Dokumenten-/Initiativen-Bibliothek (Feature-Idee, spaeter stark ausbauen)
**Entdeckt:** 2026-08-20 (Nutzer will gruppenuebergreifende historische Doku/Abstimmung als PDF ablegen).

Bedarf: gruppenUEBERGREIFENDE Dokumente (Initiativen ALLER Gruppen, z.B. eine "Abstimmung
v0.99c") auf Team4s zugaenglich machen + speichern. NICHT an eine Gruppe koppelbar -> braucht
eine PLATTFORM-Ebene. Direkt als PDF (kein Rich-Text-Umbau noetig).

Team4s hat noch KEINE Plattform-Dokumenten-Bibliothek, aber die Infrastruktur ist da:
- media_assets + statisches /media-Serving (StaticFS von MediaStorageDir) -> PDF as-is speichern+ausliefern.
- Rich-Text-Muster (member_story tiptap json/html) waere Alternative fuer native Docs, hier aber PDF gewuenscht.

Feature-Skizze (klein starten, laut Nutzer spaeter stark ausbauen):
1. Upload: platform_admin (oder neue Capability platform.documents.manage) laedt PDF + Metadaten
   (Titel, Beschreibung, Version z.B. v0.99c, Datum) -> media_assets + neue Tabelle platform_documents.
2. Anzeige: globale Seite "Dokumente / Community-Initiativen" (oeffentlich oder eingeloggt) mit
   PDF-Vorschau (Embed) + Download.
3. Zugriff: plattformweit lesbar; Verwaltung gated.
4. Versionierung (v0.99c -> spaeter), "aktuelle Version"-Markierung - das Abstimmungs-Dokument
   entwickelt sich weiter.
"Muss noch viel weiter ausgebaut werden" (Nutzer) -> eigener Milestone/Feature-Track, nicht nur ein Task.

*Backlog-/Feature-Idee - kein Commit.*

## 34. Badge-Sektionen inkonsistent: Rollen + Punkte-Meilensteine auf Anime-Projekte-Layout vereinheitlichen
**Entdeckt:** 2026-08-20 (Public-Profil, Live-UAT 134-06).

3 Badge-Fortschritts-Sektionen, aber 2 verschiedene Layouts:
- ANIME-PROJEKTE (family.key "progress"): HORIZONTAL - Artwork links, Info (Tier-Label, Titel,
  Progressbar, "Noch X bis Y") rechts. Eigenes Layout via AnimeProjectStage.module.css.
- ROLLENFORTSCHRITT (groupKey "roles") + PUNKTE-MEILENSTEINE: ZENTRIERT/vertikal - grosses Artwork
  oben mittig, Label+Progressbar darunter, Tier-Kette unten. Aelteres Fokus-Layout
  (FocalCarousel/ContributionAchievementStage).

Nutzer-Wunsch: Rollen + Punkte auf DAS GLEICHE Design wie Anime-Projekte (horizontal) bringen -
Konsistenz. (Zwei separate Nachfragen: erst Rollen, dann Punkte-Meilensteine.)

Einordnung: groesserer visueller Vereinheitlichungs-Refactor (3 Sektionen -> 1 Layout in
MemberBadgeChain.tsx), eher Polish als v1.3-Hardening -> Kandidat fuer eigenen Follow-up-Task
NACH dem v1.3-Abschluss, damit der laufende 134-06-UAT auf die Responsive/A11y-Fixes
(Mobile-Hero, Rollen-Strich-Alignment) fokussiert bleibt. Hinweis: MemberBadgeChain hat bereits
zurueckgestellte Test-Failures (Phase 119/120/127) - beim Refactor mitbehandeln.

*Backlog-Notiz - kein Commit.*

### #34 Nachtrag (2026-08-20): Approved EINHEITLICHES Badge-Fortschritts-Design (Mockup abgestimmt)
Es gibt noch mehr inkonsistente Varianten: MITGETRAGENE PROJEKTE (horizontal + Karussell +
Tier-Thumbnails + "1 von 3 Sammlungen"), MITGLIEDSDAUER (zentriert), zusaetzlich zu Rollen/
Punkte/Anime-Projekte. Nutzer will EIN Design fuer ALLE, responsive je Mobile/Tablet/Desktop.

Approved Design (per visualize-Mockup mit Nutzer abgestimmt) - EINE Badge-Fortschritts-Karte
fuer alle Sektionen (Rollen, Punkte, Anime-Projekte, Mitgetragene Projekte, Mitgliedsdauer):
- Struktur: Section-Eyebrow (z.B. "MITGLIEDSDAUER"); Artwork; Info (Tier-Pills inkl.
  "Aktuell", grosser Titel z.B. "8 Jahre Mitgliedschaft", Progress X/Y + Prozent + Balken,
  Hinweis "Noch X bis Y"); darunter Tier-Kette (Nodes mit Connector, aktuell hervorgehoben,
  gesperrte grau); bei Multi-Item Karussell-Controls "X von N Sammlungen".
- DESKTOP + TABLET: Artwork LINKS, Info RECHTS (horizontal), Tier-Kette darunter vollbreit.
- MOBILE: Artwork OBEN zentriert, Info vollbreit darunter, Tier-Kette darunter (horizontal
  scrollbar), Karussell-Controls "X von N" unten.
Status: Design abgestimmt, Umsetzung offen. Empfehlung: eigener Follow-up-Task NACH v1.3
(groesserer MemberBadgeChain.tsx-Refactor, inkl. der dort zurueckgestellten Test-Failures
Phase 119/120/127). Nutzer hat die "wann"-Entscheidung noch offen gelassen (erst Design wollte er sehen).

## 35. Drei Code-Review-Warnings aus Phase 134 (134-REVIEW.md) — bewusst zurueckgestellt

**Entdeckt:** 2026-08-20 (Phase-134-Abschluss, `/gsd:code-review 134`, Warning-Severity, nicht Critical).

1. `frontend/next.config.mjs:7-19` — `configuredApiMediaPatterns()` ruft `new URL(publicApiURL)`
   ohne try/catch auf. Eine fehlerhafte `NEXT_PUBLIC_API_URL` crasht den gesamten Next.js-Config-
   Load, nicht nur die Bild-Optimierung.
2. `frontend/src/components/profile/RoleBadgeCard.stages.module.css` — mehrfach doppelt
   deklarierte Regeln (`.roleProgression` 5x, `.roleStageEarned`/`.roleStageLocked` 3x,
   `.roleStageMarker` 2x, je die frueheren Bloecke komplett tot ueberschreibend) plus 5 separate
   doppelte `@media (max-width: 520px)`-Bloecke statt einem. Aktuelle Kaskade wirkt beabsichtigt,
   aber Wartungsfalle.
3. `backend/internal/testsupport/phase134_postgres.go:74-76` — Sicherheits-Check in
   `DropAndCreatePhase134FreshDatabase` vergleicht eine hartkodierte Konstante gegen eine Regex,
   die aus genau dieser Konstante gebaut wird — tautologisch, kann nie fehlschlagen, taeuscht
   Sicherheit vor.

Einordnung: alle drei Warning-, nicht Critical-Severity; keines blockiert Phase 134 oder
Milestone v1.3. Der einzige Critical-Fund (green-gate.sh grepte nur nach FAIL-Markern statt
Exit-Codes zu pruefen) wurde direkt gefixt (`$?`-Capture wie in der npm-run-build-Sektion,
Commit siehe Phase-134-History), diese drei bleiben als Follow-up offen.

*Backlog-Notiz - kein Commit noetig ausser dieser Datei.*

## 36. Zwei react-hooks/set-state-in-effect ESLint-Errors — beim ersten echten Gate-Lauf gefunden

**Entdeckt:** 2026-08-20 (Phase-134-Abschluss, erster echter `bash scripts/phase134-green-gate.sh`-
Lauf nach dem Exit-Code-Fix aus #35).

Betroffene Dateien, beide ausserhalb von Phase 134 und nicht Teil irgendeines 134-0X-Plans:
1. `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeNeighborNavigation.ts`
   (aus quick-260820-600, Commit `d2ffbfa6`, 2026-08-20).
2. `frontend/src/app/admin/fansubs/[id]/edit/GroupMemberFormModals.tsx`
   (aus quick-260819-ipu, Commit `e9becb14`, 2026-08-19).

**Kontext:** Beide rufen `setState` synchron im BLOSSEN `useEffect`-Body auf (kein Guard, keine
Bedingung, die den Effekt zu einer reinen Subscription macht) — z. B.
`useEpisodeNeighborNavigation.ts:44` (`setIsLoading(false); setError(null); ...`) und
`GroupMemberFormModals.tsx:96` (`setDuplicateConfirmed(false)`). Das ist die neue React-Hooks-
ESLint-Regel `react-hooks/set-state-in-effect`. Risiko: kaskadierende Re-Renders und im
React-StrictMode-Doppel-Invoke potenziell doppelt ausgefuehrte State-Updates innerhalb desselben
Effekts — funktional bisher nicht als Bug aufgefallen, aber ein echter Codepfad-Fund, kein reines
Stil-Lint.

Beide wurden bewusst NICHT in diesem Zug gefixt (Scope-Disziplin: nur der Gate-Exit-Code-Bug und
die 3 in #35 genannten Warnings waren fuer Phase 134 autorisiert). Stattdessen in
`scripts/phase134-green-gate.sh`s `LINT_KNOWN_DEFERRED` mit Zitat (Datei + Regel + Ursprungs-Commit
+ Out-of-scope-Vermerk) eingetragen, damit das Gate ehrlich GREEN meldet statt auf unrelated Debt
haengen zu bleiben.

**Fix-Richtung (eigener Follow-up-Task, mit Live-UAT):** `setState`-Aufruf aus dem bloßen
Effekt-Body entfernen — je nach Fall entweder in einen Event-Handler verschieben, oder den Effekt
so umbauen, dass er nur bei einer echten externen Synchronisation (Subscription/Cleanup) State
setzt statt bei jedem Render/Dependency-Wechsel unbedingt. Nach dem Fix: kurze Live-UAT beider
betroffenen Flows (Folgen-Navigation im Contributor-Editor bzw. Gruppen-Mitglied-Formular-Modals),
da beides interaktive Navigation/Formular-States sind, wo ein falsch getimter State-Reset
UX-Bugs verursachen koennte.

*Backlog-Notiz - kein Commit noetig ausser dieser Datei.*

## 37. Fehlende VERIFICATION.md fuer Phasen 128/133/135 — dokumentierte Verifikations-Schuld beim v1.3-Abschluss

**Entdeckt:** 2026-08-20 (v1.3-Milestone-Abschluss-Vorbereitung, ROADMAP-Reconciliation nach
Phase-134-Abschluss).

Beim Abgleich der ROADMAP-Progress-Tabelle gegen den tatsaechlichen Datei-Stand (Plan- vs.
SUMMARY-Zaehlung per `gsd-sdk query phase-plan-index`) zeigte sich: Phasen 128, 133 und 135 hatten
veraltete/inkonsistente Progress-Zeilen (128: "19/22", 133: "11/12" trotz 12/12 vorhandener
SUMMARYs, 135: "7/8" trotz 10/10 vorhandener SUMMARYs — Plan-Zaehlung selbst ist korrekt reconciled
worden, siehe Commit `59d75d1c`). Alle drei Phasen haben tatsaechlich fuer jeden Plan ein
SUMMARY.md, aber **keine** `VERIFICATION.md` — sie wurden nie durch den goal-backward
`gsd-verifier`-Schritt gelaufen, im Unterschied zu Phase 134 (die als Teil dieser Session frisch
`134-VERIFICATION.md` mit 7/7 must-haves bekommen hat).

**Einordnung:** Der v1.3-Milestone-Abschluss stuetzt sich damit transparent NICHT auf eine formale
Goal-Backward-Verifikation fuer 128/133/135, sondern auf: (a) alle Plan-SUMMARYs vorhanden und
gruen, (b) Phase 134s eigenen bundled Live-UAT-Sign-off (CONTEXT.md D-09) als das milestone-weite
Verifikations-Vehikel, das genau fuer diesen Zweck entworfen wurde (inkl. der 133-12-Resolution,
siehe #36-Nachbareintrag / 133-12-SUMMARY.md), und (c) Phase 134s eigenen `phase134-green-gate.sh`
GREEN-Lauf, der Phase12*/Phase13*-Contract-Suiten uebergreifend mitprueft. Das ist eine bewusste,
dokumentierte Luecke — keine verschwiegene.

**Fix-Richtung (Follow-up, kein v1.3-Blocker):** Fuer 128/133/135 nachtraeglich `gsd-verifier`
laufen lassen (goal-backward gegen die jeweiligen ROADMAP-Success-Criteria), analog zu Phase 134s
frischer `134-VERIFICATION.md`. Kandidat fuer `/gsd:validate-phase` (retroactive Nyquist-Validation)
oder eine dedizierte Nachtrags-Session pro Phase.

*Backlog-Notiz - kein Commit noetig ausser dieser Datei.*
