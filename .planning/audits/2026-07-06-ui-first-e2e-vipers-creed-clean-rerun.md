# UI-first E2E Viper's Creed - Clean Rerun

Datum: 2026-07-06
Status: COMPLETED WITH GAPS

## Auftrag

Sauberer UI-first E2E-Test fuer Phase 98 / Viper's Creed nach `98-05-PLAN.md` und dem bisherigen Fresh-Rerun-Audit.

Regeln fuer diesen Lauf:
- Fachliche Aktionen laufen ueber die echte Web-UI im In-App-Browser.
- Keine App-API fuer fachliche Testschritte.
- CLI/SQL sind nur fuer Reset, Auth-Seed, Runtime-Smoke, Diagnose und Verifikation erlaubt.

## Reset / Runtime

- Docker-Compose-Stack mit Volumes heruntergefahren: `down -v`.
- Media-Ordner `C:\Users\admin\Documents\Team4s\media` kontrolliert und geleert.
- Stack mit E2E-Port-Override frisch gebaut und gestartet:
  - Frontend: `http://127.0.0.1:3000`
  - Backend: `http://127.0.0.1:18092`
  - Keycloak: `http://127.0.0.1:18081`
- Backend Health: `{"status":"ok"}`.
- Migrationstatus: `schema_migrations` bis Version `122 theme_segment_render_cache`.
- Backend-Runtime: `ffmpeg` und `ffprobe` vorhanden, Version `6.1.1`, Build mit `libass`.

## Auth Seed

Keycloak-Testuser angelegt, Passwort jeweils `123`:
- `platform-admin`
- `csubs-leader`
- `sheppert`
- `sokolada`

Team4s-App-User fuer `platform-admin` wurde durch echten Browser-Login erzeugt.
Globale Rolle per SQL-Seed gesetzt:
- `platform-admin` -> `platform_admin`

## Laufprotokoll

### 1. Platform-Admin Login

UI-Schritte:
- `/login` im In-App-Browser geoeffnet.
- `Erneut anmelden` genutzt, um Keycloak `prompt=login` zu oeffnen.
- `platform-admin` / `123` in Keycloak eingegeben.
- App kehrte nach `/me/profile` zurueck.
- Nach SQL-Rollenseed `/admin` geoeffnet.

Ergebnis:
- Admin-Dashboard sichtbar.
- Links sichtbar: `Studio (Anime + Episoden)`, `Benutzer & Rechte`, `Capability-Verwaltung`, `Fansubs`.

### 2. Anime-Anlage und Jellyfin-Gate

UI-Schritte:
- `/admin/anime/create` ueber Admin/Anime geoeffnet.
- Basisdaten fuer `Viper's Creed` gepflegt: Jahr `2009`, Max. Episoden `12`.
- AniSearch-ID `5132` geladen.
- Jellyfin-Suche zuerst mit `Vipers Creed` ausgefuehrt: kein Treffer sichtbar.
- Jellyfin-Suche mit `Viper` ausgefuehrt: Treffer `Viper's Creed 2009` unter `/media/Anime/Serie/Anime.TV.Sub/Vipers Creed TV` sichtbar.
- `Jellyfin uebernehmen` geklickt.
- UI bestaetigte: `Viper's Creed ist jetzt als Quelle gesetzt`.
- Cover/Assets wurden aus Jellyfin sichtbar uebernommen.
- `Anime erstellen` wurde aktiv und im Browser geklickt.

Ergebnis:
- App leitete auf `/admin/anime?created=1#anime-1` weiter.
- Erfolgsmeldung sichtbar: `Anime #001 Viper's Creed wurde erstellt und ist jetzt in der Uebersicht verankert.`
- Anime-Karte sichtbar mit Cover, `#001 | TV | 2009 | 12 Episoden`, Status `ONGOING`.

Beobachtung:
- Die konkrete Suche `Vipers Creed` findet im UI keinen Kandidaten, waehrend `Viper` denselben Jellyfin-Ordner findet. Das ist kein Blocker fuer diesen Lauf, aber ein Such-/Fuzzy-Gap.

### 3. Episodenimport / Mapping

UI-Schritte:
- Aus `/admin/anime/1/edit` dem sichtbaren Link `Zu Episoden wechseln` gefolgt.
- `/admin/anime/1/episodes` geoeffnet; leerer Zustand nach Reset sichtbar.
- `Import & Mapping` geoeffnet.
- Import-Kontext sichtbar:
  - AniSearch ID `5132`
  - Jellyfin Serie `7896cbc2ebd598fbca5f1b4df08cc871`
  - Ordnerpfad `/media/Anime/Serie/Anime.TV.Sub/Vipers Creed`
  - Quelle `jellyfin:7896cbc2ebd598fbca5f1b4df08cc871`
- `Vorschau laden` geklickt.
- Mapping-Workbench geladen.
- In Zeile 1 `C-Subs, Honto` eingegeben und mit `Als Chip` in getrennte Chips `C-Subs` und `Honto` umgewandelt.
- `Ab hier` genutzt, um beide Gruppen auf alle folgenden Mapping-Zeilen zu uebernehmen.
- `Alle Vorschlaege bestaetigen` geklickt.
- `Mapping anwenden` geklickt.

Ergebnis:
- App leitete auf `/admin/anime/1/episodes` zurueck.
- UI zeigt `Episoden 12` und `Versionen gesamt 12`.
- Sichtbare erste Episoden: `EP 01 -Cyclops-`, `EP 02 Neuer Rekrut -unknown-`.

Diagnose-SQL nach UI-Import:
- `anime=1`
- `episodes=12`
- `fansub_releases=12`
- `release_versions=12`
- `release_version_groups=24`
- Gruppenlinks: `C-Subs=12`, `Honto=12`

Persistierte Versionen:

| Episode | Titel | Version | Release-Datum | Aufloesung | CRC | Gruppen |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | -Cyclops- | v1 | leer | 720p | leer | C-Subs, Honto |
| 2 | Neuer Rekrut -unknown- | v1 | leer | 720p | leer | C-Subs, Honto |
| 3 | Kanonenschuss | v1 | leer | 720p | leer | C-Subs, Honto |
| 4 | Hexe | v1 | leer | 720p | leer | C-Subs, Honto |
| 5 | Todesgott | v1 | leer | 720p | leer | C-Subs, Honto |
| 6 | Holzpuppe | v1 | leer | 720p | leer | C-Subs, Honto |
| 7 | Chaos -riot- | v1 | leer | 720p | leer | C-Subs, Honto |
| 8 | Paradiese | v1 | leer | 720p | leer | C-Subs, Honto |
| 9 | Verschwoerung -intrigue- | v1 | leer | 720p | leer | C-Subs, Honto |
| 10 | Gegenschlag -counterattack- | v1 | leer | 720p | leer | C-Subs, Honto |
| 11 | Wahrheit -truth- | v1 | leer | 720p | leer | C-Subs, Honto |
| 12 | Ein Auge -blindness- | v1 | leer | 720p | leer | C-Subs, Honto |

Beobachtungen / Gaps:
- Release-Datum und CRC werden durch den aktuellen UI-Import nicht gefuellt.
- EP03-EP06 und EP08 fehlen gegenueber der aelteren Referenz die englischen Zusatzteile (`-shot-`, `-sorceress-`, `-grim reaper-`, `-golem-`, `Paradies -eden-`).

### 4. App-Accounts und C-Subs-Mitglieder

UI-Schritte:
- Platform Admin ueber Drawer `Abmelden` abgemeldet.
- `/login` wurde direkt angezeigt; kein alter Keycloak-Codefehler.
- `csubs-leader` / `123` per Keycloak im Browser angemeldet.
- Profil-Vorzustand sichtbar: `Dieser Login ist noch keinem verifizierten Member-Eintrag zugeordnet.`
- `sheppert` / `123` und `sokolada` / `123` ebenfalls per Browser angemeldet, damit echte App-Accounts existieren.
- Wieder als `platform-admin` angemeldet.
- `/admin/fansubs/1/edit?tab=collaboration` geoeffnet.
- `csubs-leader` ueber `Mitglied hinzufuegen -> App-Mitglied / Einladung` gesucht, gefunden und mit Rolle `Gruppenleitung` hinzugefuegt.
- `sheppert` gesucht, gefunden und mit Rollen `admin`, `Encoding`, `Timing`, `Uebersetzung`, `Typesetting / FX` hinzugefuegt.
- `sokolada` gesucht, gefunden und mit Rollen `Design`, `Editing`, `Grafik`, `Qualitaetspruefung` hinzugefuegt.

UI-Ergebnis:
- Members-Tab zeigt `3 Mitglieder`, `3 aktiv, 0 deaktiviert`.
- Sichtbare Mitglieder:
  - `csubs-leader` mit `Gruppenleitung`
  - `sheppert` mit `admin`, `Encoding`, `Timing`, `Uebersetzung`, `Typesetting / FX`
  - `sokolada` mit `Design`, `Editing`, `Grafik`, `Qualitaetspruefung`

Diagnose-SQL:

| Username | group_member_id | member_id | Status | Rollen |
| --- | ---: | ---: | --- | --- |
| csubs-leader | 1 | 1 | active | fansub_lead |
| sheppert | 2 | 2 | active | admin, encoder, timer, translator, typesetter |
| sokolada | 3 | 3 | active | designer, editor, gfxler, quality_checker |

Member-Claims:
- `csubs-leader`, `sheppert`, `sokolada` haben jeweils `claim_status=verified`, `verification_method=manual_review`, `verified_at` gesetzt.

### 5. Leader Login / Rechte

UI-Schritte:
- Nach der C-Subs-Mitgliederpflege wieder ueber den Drawer abgemeldet.
- Als `csubs-leader` / `123` ueber Keycloak angemeldet.
- `/me/profile` zeigte nun `CSubs Leader` mit Badge `Verifiziert`; der vorherige Hinweis `noch keinem verifizierten Member-Eintrag zugeordnet` war verschwunden.
- Drawer geoeffnet.

Ergebnis:
- App wechselte auf `Member Hub`.
- Drawer zeigt unter `Meine Gruppen` den Link `C-Subs -> /admin/fansubs/1/edit`.
- Klick auf diesen sichtbaren Link oeffnete `/admin/fansubs/1/edit` als Leader.
- Direkter Negativtest `/admin/fansubs/2/edit` fuer `Honto` zeigte korrekt:
  - `Du hast fuer diese Fansub-Gruppe keinen Zugriff auf den Arbeitsbereich.`
  - `keine berechtigte gruppenmitgliedschaft gefunden`

### 6. Segment Encode / Preview / Zeitkorrektur

UI-Schritte:
- Als `csubs-leader` `/admin/fansubs/1/edit?tab=releases` geoeffnet.
- `Viper's Creed` sichtbar, `Releases: 12/12`.
- EP1 ausgeklappt und ueber `Notizen & Medien oeffnen` den Release-Version-Editor `/admin/episode-versions/1/edit?tab=notizen` geoeffnet.
- In den Tab `Segmente` gewechselt.
- `Segment hinzufuegen` geoeffnet.
- Wichtig: Die sichtbaren Werte `1`, `12`, `0:00`, `1:20` im neuen Drawer waren Platzhalter, keine echten Feldwerte. Erster Speicherversuch ohne explizite Eingabe legte ein Segment ohne Zeitfenster an.
- Klick auf `Segment vorbereiten` mit leerem Zeitfenster zeigte korrekt den Fehler `segment hat kein vollstaendiges Zeitfenster`.
- Danach im Bearbeiten-Drawer explizit eingetragen:
  - Episoden: `1` bis `12`
  - Zeit: `0:00` bis `1:20`
- Nach dem Speichern zeigte die Tabelle:
  - Episoden `1 - 12`
  - Zeitbereich `00:00:00 - 00:01:20 (00:01:20)`
  - Quelle `Episode-Version / Jellyfin-Stream`
  - Status `Wird vorbereitet`
- Render wurde automatisch eingereiht und wechselte zu `Bereit`.
- Segment-Vorschau im Drawer zeigte ein Video mit `0:00 / 1:20`.

Diagnose:
- Render-Cache nach erstem gueltigem Save:
  - `status=ready`
  - `output_path=theme-segment-2ea50aac9bcdc79487276d83fde0fb769088c10bb60e2e0afff7a09286491207.mp4`
  - physisch vorhanden unter `media/derived/segments`, Groesse `19,569,363` Bytes.

Zeitkorrektur:
- Im Browser Ende von `00:01:20` auf `00:00:45` geaendert und gespeichert.
- UI zeigte erneut `Wird vorbereitet`, danach `Bereit`.
- Neuer Cache:
  - `id=2`
  - `status=ready`
  - `output_path=theme-segment-3de9f77477c0e8cd390de77babc5fbb38772d9d368731564a86a0d27345c58cd.mp4`
  - physisch vorhanden, Groesse `10,339,922` Bytes.
- Alter Cache/alte Datei `theme-segment-2ea50...91207.mp4` war nach der Korrektur nicht mehr vorhanden.
- Segment-Vorschau zeigte danach `0:00 / 0:45`.

Antwort auf die Laufzeitfrage:
- Ja: Sobald nach einem Speichern mit vollstaendigem Zeitfenster `Wird vorbereitet` steht, wird serverseitig ein Encode vorbereitet/ausgefuehrt. Das ist kein reiner UI-Status.
- Wenn nur Platzhalter sichtbar sind und keine echten Werte im Feld stehen, wird kein brauchbares Zeitfenster gespeichert; dann blockiert `Segment vorbereiten` mit `segment hat kein vollstaendiges Zeitfenster`.

## Offene Checkliste

- [x] Reset, Build, Runtime-Smoke
- [x] Keycloak-Testuser und Platform-Admin-Seed
- [x] Platform-Admin UI-Login und Admin-Dashboard
- [x] Anime `Viper's Creed` per UI anlegen
- [x] Jellyfin-Pflicht-Gate vor Episodenmapper pruefen
- [x] 12 Episoden importieren und Gruppen-Chips `C-Subs`/`Honto` pruefen
- [ ] Release-Version-Daten EP01-EP12 per UI pflegen
- [ ] C-Subs Grunddaten/Geschichte per UI pflegen
- [x] Leader/Mitglieder im Browser testen
- [ ] Historische Mitglieder/Rollen testen
- [x] Segment erstellen, vorbereiten, Preview abspielen
- [x] Segment-Sicherheit/Rechte/Refresh-Verhalten pruefen
- [x] Media-Ownership-Invarianten verifizieren
- [x] Abschlussbericht mit Gaps

## Checks

- `go test ./internal/repository ./internal/handlers` in `backend`: PASS
- `npm test -- --run src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx src/components/layout/AppShell.test.tsx src/app/me/profile/page.test.tsx` in `frontend`: PASS, 102 Tests
- `npm run typecheck` in `frontend`: PASS
- `git diff --check`: PASS mit bestehenden CRLF-Warnungen, keine Whitespace-Fehler

## Ergebnis

Bestanden:
- Clean Reset, Stack, Browser-Login, Anime-Anlage, Jellyfin-Gate, Import, Gruppenlinks, Leader-Login, C-Subs-Rechte, Honto-Negativtest, Segment-Encode, Preview und Zeitkorrektur mit physischer Cache-Ersetzung.

Nicht vollstaendig abgeschlossen:
- Release-Version-Datum/CRC und einige Titel-Metadaten fehlen.
- C-Subs-Grunddaten/Geschichte/historische Rollen wurden nicht vollstaendig nachgepflegt.

## Gaps / Muss gefixt oder nachgepflegt werden

1. Release-Datum und CRC fehlen nach UI-Import.
   - Erwartung aus Referenz: EP01-EP12 sollten fansub.de-Datum/CRC tragen.
   - Ist-Zustand: `release_versions.release_date` leer, `release_variants.crc32` leer.

2. Einige Episodentitel sind nicht vollstaendig gegenueber der Referenz.
   - Beispiele: EP03 `Kanonenschuss` statt `Kanonenschuss -shot-`, EP08 `Paradiese` statt `Paradies -eden-`.

3. Segment-Drawer-Platzhalter sind leicht mit echten Defaults zu verwechseln.
   - Der erste Speicherversuch ohne explizite Eingabe erzeugte ein Segment ohne Zeitfenster.
   - Empfehlung: Entweder sinnvolle echte Defaults setzen oder Save deaktivieren/validieren, solange kein Zeitfenster vorhanden ist.

4. Reload im Release-Version-Editor fiel nach Reload wieder auf `Notizen / Beitraege` zurueck.
   - Der Segmenttab kann danach manuell wieder geoeffnet werden.
   - Empfehlung: aktiven Tab in URL/State sauber halten.

5. C-Subs-Grunddaten/Geschichte und historische Mitglieder wurden in diesem Rerun noch nicht vollstaendig gepflegt.
   - Der kritische App-Member-/Leader-Pfad ist bestanden.
   - Historische Rollen/Story bleiben als Nachpflegepunkt offen.
