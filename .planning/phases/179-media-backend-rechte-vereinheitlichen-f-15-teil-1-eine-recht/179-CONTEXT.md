# Phase 179: Media-Backend & Rechte vereinheitlichen (F-15 Teil 1) — Context

**Stand:** 2026-10-10, alle 5 offenen Fragen beantwortet (D-10 bis D-14, durchgängig Option A).
**Quelle:** `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/175-ROADMAP-PROPOSAL.md`
(Abschnitt „Phase 179: Media-Backend/Rechte (F-15 Teil 1)" + Übersichtstabelle + Abschnitt
„Zuordnung der Permission-Matrix-Abweichungen");
`.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/175-PERMISSION-MATRIX.md`
(Zeilen 1.2, 1.4, 1.6); `175-INVENTORY.md` Fachaufgabe 1 (Wege 1–8) und Fachaufgabe 8 (#5/#6);
Live-Code-Faktencheck in `backend/internal/handlers/fansub_media_upload.go`,
`backend/internal/handlers/fansub_media_delete.go`,
`backend/internal/handlers/admin_content_release_theme_assets.go`,
`backend/internal/repository/media_repository.go`,
`backend/internal/repository/release_version_media_repository.go`,
`backend/internal/permissions/permissions.go`; Live-DB-Prüfung per `psql` gegen `team4sv30-db`
(Datenbank `team4s_v2`).

<domain>
## Phase Boundary

Diese Phase ist der **Backend-/Rechte-Anteil** der ursprünglich einheitlichen F-15-Vorschlagsphase
„Medien-Upload". Auf Nutzerentscheidung vom 2026-10-07 wurde F-15 in zwei Phasen aufgeteilt: diese
Phase (179, Backend/Rechte) und Phase 180 (Frontend/Workflow, gemeinsamer Upload-Baustein). **Der
Upload-Frontend-/Workflow-Anteil ist ausdrücklich nicht Teil dieser Phase.**

**Umfang (laut 175-ROADMAP-PROPOSAL.md Abschnitt „Phase 179" + Permission-Matrix-Zuordnung):**

- **Permission-Matrix-Zeile 1.2 — Gruppenmedien-Upload (Weg 2 der Fachaufgabe-1-Inventur):** Zwei
  parallele Rechte-Ebenen beim Hochladen von Gruppenmedien — die reguläre Capability-Prüfung
  `ActionFansubGroupMediaUpload` **plus** eine zusätzliche Custom-Permission-Fallback-Prüfung über
  `GetFansubGroupMediaPermissionsForAppUser` (`fansub_media_upload.go:63-78`). Weg 1
  (Release-Medien-Upload) hat diese zweite Ebene nicht und ist laut Roadmap-Vorlage (D-06) das
  Rechte-Vorbild. Ziel: eine einzige Capability-Ebene statt zwei.
- **Permission-Matrix-Zeile 1.4 — Anime-Assets-Upload (Weg 4):** Die Durchsetzung
  (Plattform-Admin-Guard, bei `asset_type=segment_preview` eine eigene Segment-Berechtigung —
  `media_upload_segment_preview.go:37-51`) hat **kein** entsprechendes Anzeige-Capability-Flag;
  `AnimeJellyfinAssetUploadControls.tsx` verlässt sich rein auf Seitenzugriff, keine
  Capability-Prüfung im UI-Code gefunden. Ziel: ein neues granulares Anzeige-Capability-Flag.
  **Weg 4 bleibt laut Inventur strukturell eigenständig** (zweistufiger Upload → Zuweisung,
  anders als die galerieartigen Wege 1–3/6) — nur dieser Rechte-Fix wird hier nachgezogen, keine
  Zusammenführung mit anderen Wegen.
- **Permission-Matrix-Zeile 1.6 — Release-Theme-Assets-Upload (Weg 6, zwei Einstiege):** Beide
  Handler (`UploadReleaseThemeAsset` für die Anime-Ebene, `admin_content_release_theme_assets.go:
  148,196`, und `UploadReleaseThemeAssetForRelease` für die Release-Ebene, `:333,376`) nutzen die
  fremde, release-version-media-spezifische Aktion `ActionReleaseVersionMediaUpload` statt einer
  eigenen Aktion. Der Persistenz-Codeblock zwischen beiden Handlern
  (`SaveReleaseThemeVideoUpload` → `CreateMediaAsset` → `InsertMediaFile` →
  `CreateReleaseThemeAsset`, verifiziert `:266-329` und die äquivalente Fortsetzung ab `:386`
  der zweiten Funktion) ist nahezu wortgleich kopiert. Ziel: eine eigene
  `ActionReleaseThemeAssetUpload`-Aktion plus ein gemeinsamer Persistenz-Helfer.
- **Fachaufgabe 8, #5/#6 — Soft-Delete-Duplikat-Rest:** `SoftDeleteFansubGroupMedia`
  (`media_repository.go:1040-1058`) und `SoftDeleteReleaseVersionMedia`
  (`release_version_media_repository.go:374-391`) haben ein nahezu identisches SQL-Skelett
  (`UPDATE ... SET deleted_at = NOW(), deleted_by_user_id = (SELECT id FROM users WHERE id = $N)
  WHERE ... AND deleted_at IS NULL`), unterscheiden sich nur im Tabellennamen und dem
  Schlüsselprädikat (`group_id`+`media_id` vs. einzelne `relation_id`). Ziel: ein gemeinsamer
  Soft-Delete-Helfer. Fachlich Teil derselben Medien-Domäne wie der Upload-Umbau, deshalb hier und
  nicht in der separaten Bugfix-Sammelphase (176) eingeordnet.

**Explizit außerhalb des Umfangs (laut Inventur „legitim getrennt", nur 1.4 wird an Weg 4
nachgezogen):** Weg 3 (Fansub-Logo/Banner, grobe Gruppen-Edit-Berechtigung, legitim), Weg 5
(Segment-Assets/Kara-Video, konsistent), Weg 7 (Profil-Avatar/-Hintergrund/-Story, Self-Service
ohne Capability, legitim), Weg 8 (Medien-Vorschläge, `requireMeIdentity`, legitim). Diese vier
Wege werden **nicht** angefasst. Der globale Upload-Baustein/-Workflow (Frontend) wird in dieser
Phase **nicht** neu gebaut (Nutzerregel) — das ist Phase 180.

**Risiko: Hoch** — laut Roadmap-Vorlage, weil die Rechte-Vereinheitlichung echten
Produktionsdaten-Zugriff betrifft (wer darf was hochladen). Siehe Faktencheck unten für den
tatsächlichen Umfang des Migrationsrisikos.

**Aufwandsklasse: Groß** — 11 Backend-Upload-Handler sind laut Fachaufgabe-1-Summenzeile vom
Rechte-Modell betroffen (auch wenn nur 3 Wege inhaltlich geändert werden, berührt die
Capability-Registry-Umstellung die gemeinsame Prüfinfrastruktur), plus Soft-Delete-Helfer und
Theme-Asset-Persistenz-Extraktion.
</domain>

<facts>
## Faktencheck: Custom-Permission-Fallback-Migration (Live-DB-Prüfung, 2026-10-10)

Geprüft gegen `team4sv30-db` (Postgres, Datenbank `team4s_v2`), Tabelle
`fansub_group_member_media_permissions` (die Tabelle hinter
`GetFansubGroupMediaPermissionsForAppUser`, `media_repository.go:718-754`):

- **0 von 0 Datensätzen gesamt.** Die Tabelle ist aktuell komplett leer — `count(*) = 0`,
  `count(*) FILTER (can_upload OR can_delete_own OR can_delete_all OR can_reorder) = 0`. **Kein
  einziger Nutzer hat heute einen individuellen Custom-Permission-Datensatz**, weder für Upload
  noch für Delete.
- **Zusätzlicher Befund (Rollen-Capability-Prüfung, `role_capabilities`):** Die reguläre Capability
  `fansub_group_media.upload` ist bereits an **jede** aktive Gruppenrolle vergeben, inklusive der
  Basis-Rolle `group_member` (Teil von `MembershipBaselineActionCodes`,
  `permissions.go:425`). Der SQL-Filter der Fallback-Abfrage selbst schränkt zusätzlich auf
  `fgm.status = 'active'` ein — **jedes aktive Gruppenmitglied, für das der Fallback überhaupt
  greifen könnte, hat die Upload-Capability also bereits über die reguläre Rollenprüfung.** Der
  Upload-Fallback ist damit schon heute strukturell unerreichbar (Allow-Pfad), unabhängig von der
  leeren Tabelle.
- **Wichtige Einschränkung — der Fallback ist NICHT nur Upload:** Dieselbe Tabelle und dieselbe
  Abfrage (`GetFansubGroupMediaPermissionsForAppUser`) werden auch von
  `deleteFansubGroupMedia` (`fansub_media_delete.go:70-98`) für `can_delete_own`/`can_delete_all`
  verwendet. Für Delete gibt es — anders als bei Upload — **keine** Baseline-Rollen-Capability:
  `role_capabilities` enthält nur `fansub_group_media.delete` für die Rolle `fansub_lead`, kein
  `fansub_group_media.delete_own` oder `.delete_all` für andere Rollen. Der Fallback ist beim
  Delete also die **einzige** bestehende Möglichkeit, einzelnen Mitgliedern (z. B. Designer,
  Encoder) granular eigenes oder alles Löschen zu erlauben — auch wenn aktuell 0 Datensätze
  existieren, die das tun. Permission-Matrix-Zeile 1.2 benennt nur den **Upload**-Fallback als
  Abweichung; der Delete-Fallback ist keine eigene Matrix-Zeile und damit nicht explizit im
  Roadmap-Umfang genannt — aber beide Fallbacks hängen an derselben Tabelle/Funktion.
- **Bedeutung für diese Phase:** Das Entfernen des **Upload**-Fallbacks betrifft laut Datenlage
  heute **niemanden** (0 Datensätze, strukturell bereits redundant durch Baseline-Rolle). Das
  Entfernen oder Anfassen der **gesamten** Tabelle/Funktion (z. B. weil sie „jetzt überflüssig
  aussieht") würde dagegen den einzigen bestehenden granularen Delete-Opt-in-Mechanismus für
  Nicht-Lead-Rollen kappen — auch ohne aktuelle Datensätze ist das eine Architekturentscheidung,
  keine reine Aufräumarbeit. Siehe Offene Frage 1 unten.

## Faktencheck: Theme-Asset-Rollen (für 1.6)

`role_capabilities` für `release_version_media.upload` (die aktuell fremd wiederverwendete Aktion):
`designer, editor, encoder, fansub_lead, karaoke_fx, project_lead, quality_checker, raw_provider,
timer, translator, typesetter`. Eine neue `ActionReleaseThemeAssetUpload` müsste diese Rollenliste
entweder 1:1 übernehmen oder bewusst enger fassen — siehe Offene Frage 3.
</facts>

<decisions>
## Implementation Decisions

- **D-01:** Umfang — Permission-Matrix-Zeilen 1.2 (Gruppenmedien-Upload, Weg 2), 1.4
  (Anime-Assets-Upload, Weg 4, nur der Rechte-Fix) und 1.6 (Release-Theme-Assets-Upload, Weg 6);
  plus Fachaufgabe 8 #5/#6 (Soft-Delete-Duplikat) und der Theme-Asset-Persistenz-Block. Wege 1, 3,
  5, 7, 8 bleiben unverändert (laut Inventur legitim getrennt). Der Upload-Frontend-/
  Workflow-Anteil von F-15 ist Phase 180, nicht Teil dieser Phase.
- **D-02 (Verbindlicher Rahmen):** Rechte werden daten-getrieben über `action_definitions` +
  `role_capabilities` (Capability-Registry) modelliert — keine neuen hartkodierten Rollenchecks im
  Handler-Code. Der Plattform-Admin-Bypass bleibt per Design erhalten (betrifft Weg 4 nicht, da
  dort bereits Plattform-Admin-Guard die Durchsetzung ist, nicht Capability-basiert — das
  Anzeige-Flag aus 1.4 ergänzt nur die fehlende UI-Seite).
- **D-03 (Verbindlicher Rahmen):** Wege 3, 4, 5, 7, 8 bleiben laut Inventur legitim getrennte
  Implementierungen — keine Zusammenführung dieser Wege in dieser Phase, auch wenn sie
  fachlich zur selben Fachaufgabe „Medien hochladen" gehören. Nur der Rechte-Fix aus 1.4 wird an
  Weg 4 nachgezogen.
- **D-04 (Nutzerregel):** Der globale Upload-Baustein/-Workflow wird in dieser Phase **nicht** neu
  gebaut — das ist ausdrücklich Phase 180. Diese Phase liefert nur die Backend-/Rechte-Basis, auf
  der Phase 180 aufsetzt.
- **D-05 (Projektregel):** Tests sind echte Verhaltenstests — `httptest` gegen ein
  Fake-Repository oder echte Postgres-Instanz, mit Prüfung von Statuscode und Response-Body.
  Keine Quelltext-Grep-Tests (`os.ReadFile` + `strings.Contains`), die behaupten, etwas existiere
  oder greife, ohne den Code aufzurufen (vgl. Teststil-Regel in `CLAUDE.md`).
- **D-06 (Projektregel):** 450-Zeilen-Limit pro Produktionscode-Datei gilt auch für den neuen
  Soft-Delete-Helfer und die extrahierte Theme-Asset-Persistenzfunktion — bei Bedarf aufteilen.
- **D-07 (Projektregel):** Ein Commit je fachlich abgeschlossener Änderung auf `main` (kein
  Sammel-Commit über mehrere getrennte Schritte); kein `git stash` bei offenen Änderungen.
- **D-08 (Projektregel):** Nicht pushen — Arbeit bleibt lokal auf `main`, bis der Nutzer explizit
  das Pushen anfragt.
- **D-09 (Risiko-Leitplanke, aus Faktencheck):** Jede Änderung, die bestehenden Nutzern ein
  Upload- oder Delete-Recht nimmt oder neu gibt, ist eine Nutzerentscheidung — auch wenn die
  Live-Datenbank aktuell 0 Custom-Permission-Datensätze zeigt (siehe Faktencheck). Die
  Entscheidung, ob der Delete-Fallback (`can_delete_own`/`can_delete_all`) erhalten, in die
  Capability-Registry überführt oder entfernt wird, obwohl er nicht Teil der offiziellen
  Matrix-Zeile 1.2 ist, wird nicht automatisch mitentschieden — siehe Offene Frage 1.
- **D-10:** Delete-Fallback bleibt bestehen (Nutzer 2026-10-10, beantwortet Offene Frage 1,
  Option A) — nur der Upload-Custom-Permission-Fallback wird entfernt (0 Datensätze, redundant
  zur Baseline-Capability `fansub_group_media.upload`). Der Delete-Fallback
  (`can_delete_own`/`can_delete_all`) bleibt unverändert bestehen; eigene Delete-Capabilities
  (`.delete_own`/`.delete_all`) sind **nicht** Teil dieser Phase. Löst D-09s offene Frage auf.
- **D-11:** Rollenkreis Gruppenmedien-Upload unverändert (Nutzer 2026-10-10, beantwortet Offene
  Frage 2, Option A) — jedes aktive Gruppenmitglied behält das Upload-Recht über die
  Baseline-Capability `fansub_group_media.upload`; Uploads landen weiterhin in der Prüfung
  (`review_status=in_pruefung`). Keine Verengung oder Erweiterung des Rollenkreises im Zuge der
  Rechte-Vereinheitlichung.
- **D-12:** Theme-Asset-Rollenliste identisch übernehmen (Nutzer 2026-10-10, beantwortet Offene
  Frage 3, Option A) — die neue `ActionReleaseThemeAssetUpload` erhält dieselbe Rollenliste wie
  `ActionReleaseVersionMediaUpload` (`designer, editor, encoder, fansub_lead, karaoke_fx,
  project_lead, quality_checker, raw_provider, timer, translator, typesetter`), daten-getrieben in
  `action_definitions` + `role_capabilities` per Migration eingetragen. Ersetzt die fremd genutzte
  Aktion; faktisch keine Rechteänderung für bestehende Nutzer.
- **D-13:** Anzeige-Capability für Anime-Assets exakt an Plattform-Admin gebunden (Nutzer
  2026-10-10, beantwortet Offene Frage 4, Option A) — die neue Anzeige-Capability für den
  Anime-Asset-Upload (Cover/Banner/Logo/Hintergrund auf der Anime-Bearbeitungsseite) spiegelt 1:1
  die bestehende Durchsetzung: Plattform-Admin; der Sonderfall `segment_preview` behält sein
  eigenes Segment-Recht. Reine UI-Sichtbarkeitskorrektur — die Upload-Controls verschwinden für
  Nicht-Admins, keine Rechteerweiterung. Verhaltenstest-Pflicht (D-05-konform): Nicht-Admin → Flag
  `false`, Admin → Flag `true`.
- **D-14:** Löschverhalten bleibt getrennt, nur SQL vereinheitlicht (Nutzer 2026-10-10, beantwortet
  Offene Frage 5, Option A) — Gruppenmedien behalten ihr Review-Verhalten, Release-Medien bleiben
  ohne; nur das duplizierte Soft-Delete-SQL-Skelett (`SoftDeleteFansubGroupMedia` vs.
  `SoftDeleteReleaseVersionMedia`) wird in einen gemeinsamen Helfer zusammengeführt. Verhalten
  bleibt für beide Domänen unverändert — belegt durch Verhaltenstests beider Pfade (D-05-konform).
</decisions>

<open_questions>
## Offene Fragen an den Nutzer — beantwortet

Alle fünf ursprünglich offenen Fragen wurden am 2026-10-10 vom Nutzer entschieden — durchgängig
Option A; die Entscheidungen sind oben als D-10 bis D-14 festgehalten. Keine offenen Fragen mehr
ausstehend.

1. ~~**Soll der Custom-Permission-Fallback (`fansub_group_member_media_permissions`) nur beim
   Upload entfernt werden, oder auch beim Delete?**~~ → beantwortet mit Option A, siehe D-10.
   Laut Faktencheck ist der Upload-Fallback
   schon heute strukturell redundant (jede aktive Rolle hat die Upload-Capability über die
   Baseline). Der Delete-Fallback (`can_delete_own`/`can_delete_all`) ist dagegen der einzige
   bestehende Mechanismus, um Nicht-Lead-Rollen granulares Löschrecht zu geben — aktuell nutzt ihn
   niemand (0 Datensätze), aber er ist technisch noch die einzige Option dafür.
   - **Option A:** Nur der Upload-Fallback wird entfernt (Permission-Matrix-Zeile 1.2, exakter
     Roadmap-Umfang). Der Delete-Fallback bleibt unverändert bestehen, auch wenn er nicht in die
     neue vereinheitlichte Capability-Ebene überführt wird — zwei Rechte-Mechanismen für dieselbe
     Medien-Domäne bleiben damit teilweise erhalten (nur für Delete, nicht mehr für Upload).
   - **Option B:** Beide Fallbacks (Upload und Delete) werden entfernt bzw. in die
     Capability-Registry überführt — dafür müssten neue Rollen-Capabilities
     `fansub_group_media.delete_own`/`.delete_all` (oder eine äquivalente granulare Modellierung)
     ergänzt werden, damit das heute nur über die Custom-Permission-Tabelle erreichbare
     granulare Delete-Recht nicht ersatzlos wegfällt.
   - **Empfehlung:** Option A für den Kern-Scope dieser Phase — die Roadmap-Vorlage benennt explizit
     nur Zeile 1.2 (Upload); Option B wäre ein sinnvoller, aber über den benannten Matrix-Befund
     hinausgehender Zusatzschritt, der im Planungsschritt (`/gsd:plan-phase`) separat beauftragt
     werden sollte, falls gewünscht.

2. ~~**Wer soll künftig Gruppenmedien hochladen dürfen, und landet das weiterhin in Prüfung?**~~ →
   beantwortet mit Option A, siehe D-11. Heute hat jede aktive Gruppenrolle (inkl. `group_member`)
   die Upload-Capability, und ein Upload
   löst `review_status=in_pruefung` aus (`175-INVENTORY.md` Weg 2, Spalte „Verhalten"). Die
   Vereinheitlichung auf eine Capability-Ebene ändert an sich nichts an diesem Rollenkreis — die
   Frage ist, ob der Nutzer diese Gelegenheit nutzen möchte, den Rollenkreis zu überprüfen.
   - **Option A:** Rollenkreis unverändert übernehmen (alle aktuell berechtigten Rollen bleiben
     berechtigt, Review-Gate bleibt wie heute).
   - **Option B:** Rollenkreis im Zuge der Vereinheitlichung enger fassen (z. B. nicht mehr jede
     Rolle, sondern nur produktionsnahe Rollen).
   - **Empfehlung:** Option A — die Phase ist als Rechte-**Konsolidierung**, nicht als
     Rechte-**Neuausrichtung** beauftragt; eine Änderung des Rollenkreises ist eine separate
     fachliche Entscheidung, keine technische Notwendigkeit der Konsolidierung.

3. ~~**Wer darf Theme-Assets hochladen — wie Release-Medien (`release_version_media.upload`-
   Rollenliste) oder enger?**~~ → beantwortet mit Option A, siehe D-12. Die neue
   `ActionReleaseThemeAssetUpload` braucht eine eigene
   Rollenliste in `role_capabilities`. Aktuell übernimmt der Code implizit die
   `release_version_media.upload`-Rollen (`designer, editor, encoder, fansub_lead, karaoke_fx,
   project_lead, quality_checker, raw_provider, timer, translator, typesetter`), weil die fremde
   Aktion wiederverwendet wird.
   - **Option A:** Identische Rollenliste übernehmen — keine Verhaltensänderung für bestehende
     Nutzer, nur die technische Aktion wird korrekt benannt.
   - **Option B:** Engere Rollenliste für Theme-Assets (z. B. nur `designer`/`karaoke_fx` als die
     fachlich naheliegenden Rollen für Theme-Videos) — würde bestehenden Nutzern mit anderen
     Rollen das Recht entziehen.
   - **Empfehlung:** Option A — Verhaltenserhalt bei reiner Aktions-Umbenennung ist der sichere
     Standardfall; eine Verengung ist eine bewusste fachliche Entscheidung, die der Nutzer separat
     treffen sollte, falls gewünscht.

4. ~~**Soll die neue Anzeige-Capability für Anime-Assets (Weg 4, Matrix-Zeile 1.4) an dieselben
   Rollen gehen wie die Durchsetzung, oder breiter/enger?**~~ → beantwortet mit Option A, siehe
   D-13. Die Durchsetzung ist heute ein
   Plattform-Admin-Guard (außer `segment_preview`, das eine eigene Segment-Berechtigung hat). Es
   gibt aktuell keine granulare Rollenliste dafür — nur „ist Plattform-Admin" oder „darf dieses
   Segment bearbeiten".
   - **Option A:** Anzeige-Capability exakt an Plattform-Admin binden (1:1 zur bestehenden
     Durchsetzung) — reine UI-Sichtbarkeits-Korrektur ohne neue Berechtigungsebene.
   - **Option B:** Anzeige-Capability granularer fassen (z. B. eigene Capability pro Rolle,
     unabhängig vom Plattform-Admin-Status), was eine Vorstufe zu einer künftigen
     Rechte-Erweiterung über Plattform-Admin hinaus wäre.
   - **Empfehlung:** Option A — die Matrix-Abweichung 1.4 ist „Anzeige fehlt", nicht „Durchsetzung
     ist zu eng"; die einfachste korrekte Lösung spiegelt die bestehende Durchsetzung, ohne den
     tatsächlichen Berechtigungskreis zu erweitern.

5. ~~**Soll gruppen- und release-medienbezogenes Löschen im Review-Verhalten weiterhin getrennt
   bleiben, auch nachdem der Soft-Delete-SQL-Helfer zusammengeführt wurde?**~~ → beantwortet mit
   Option A, siehe D-14. Der gemeinsame
   Helfer betrifft nur das SQL-Skelett (Spalten/Tabelle parametrisiert); die beiden Domänen haben
   unterschiedliche Lösch-Rechte-Modelle (Gruppenmedien: `fansub_lead`-only plus Custom-Fallback,
   siehe Frage 1; Release-Medien: `fansub_lead`/`project_lead` plus breite `delete_own`-Rollenliste).
   - **Option A:** Nur das SQL vereinheitlichen, die unterschiedlichen Rechte-Modelle beider
     Domänen bleiben bestehen — kein Verhaltensunterschied für Nutzer.
   - **Option B:** Im Zuge der Vereinheitlichung auch die Rechte-Modelle beider Domänen
     angleichen (z. B. `delete_own`-Capability auch für Gruppenmedien einführen).
   - **Empfehlung:** Option A — die Roadmap-Vorlage benennt den Soft-Delete-Fund als reines
     Implementierungs-Duplikat (Fachaufgabe 8 #5/#6), nicht als Rechte-Abweichung; eine
     Rechte-Angleichung der Lösch-Modelle wäre ein eigenständiger, hier nicht beauftragter Schritt
     (vgl. Frage 1 für den verwandten, aber nicht identischen Delete-Fallback-Fall).
</open_questions>

<references>
## Referenzen

- `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/175-ROADMAP-PROPOSAL.md`
  — Abschnitt „Phase 179: Media-Backend/Rechte (F-15 Teil 1)" (Zeilen 187–240), Übersichtstabelle
  (Zeile 32) und „Zuordnung der Permission-Matrix-Abweichungen" (Zeilen 416–422).
- `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/175-PERMISSION-MATRIX.md`
  — Zeilen 1.2, 1.4, 1.6 (Zeilen 25, 27, 29).
- `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/175-INVENTORY.md`
  — Fachaufgabe 1 „Medien hochladen" (Zeilen 12–33), Fachaufgabe 8 „Löschen/Aufräumen" #5/#6
  (Zeilen 169–170, 176).
- `backend/internal/handlers/fansub_media_upload.go:42-110` — Weg 2, Custom-Permission-Fallback.
- `backend/internal/handlers/fansub_media_delete.go:70-98` — derselbe Fallback-Mechanismus beim
  Löschen (Faktencheck).
- `backend/internal/handlers/admin_content_release_theme_assets.go:148-440` — Weg 6, beide
  Upload-Einstiege, duplizierter Persistenz-Block.
- `backend/internal/repository/media_repository.go:718-754,1040-1058` — Custom-Permission-Lookup
  und `SoftDeleteFansubGroupMedia`.
- `backend/internal/repository/release_version_media_repository.go:374-391` —
  `SoftDeleteReleaseVersionMedia`.
- `backend/internal/permissions/permissions.go:21-252,425` — Aktionsdefinitionen und
  `MembershipBaselineActionCodes`.
- Live-DB-Prüfung (2026-10-10, `team4sv30-db`, Datenbank `team4s_v2`): `SELECT count(*) ...
  FROM fansub_group_member_media_permissions` und `SELECT action_code, role_code FROM
  role_capabilities WHERE action_code IN (...)` — siehe Faktencheck oben für Ergebnisse.
- Phase 178 (`178-CONTEXT.md`) — Formatvorbild für Domain/Facts/Decisions/Offene-Fragen-Struktur.
- Phase 178 (Vorgänger-Phase in der Nummerierung, Abhängigkeit laut `phase.add`).
</references>
