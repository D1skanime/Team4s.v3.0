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
