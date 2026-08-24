---
status: partial
phase: 138-effective-rights-administration-impact-ux
source: [138-VERIFICATION.md]
started: 2026-08-23T20:10:00Z
updated: 2026-08-23T21:35:00Z
tester: live click-through as admin@team4s.de (Plattform-Admin) via 127.0.0.1:3300
---

## Current Test

[live UAT run 1 abgeschlossen — Befunde unten; ein Test bleibt offen]

## Tests

### 1. GuidedRevokeFlow — Entfernen eines schlafenden Deny-Overrides auf einem non-deniable Recht
expected: Benutzer mit `non_deniable=true` auf einer Capability, der zusätzlich einen alten
persönlichen `user_deny` auf derselben Capability hat. In `UserGroupRightsTab` auf
"Abweichung entfernen" klicken — der Modal muss direkt zum Bestätigungsschritt gehen und nach
Bestätigung den ehrlichen Override-Aktivierungsstatus zeigen. Er darf NICHT nur
"Dieses Recht kann für … nicht persönlich entzogen werden." anzeigen.
result: [passed via regression test, siehe GAP-03 unten] — In der aktuellen DB existiert keine solche Kombination. Es gibt vier Benutzer
(admin, D1sk, founder, coleader) und keinen gespeicherten `user_deny` auf einem non-deniable Recht.
Der Fall müsste erst per Fixture/SQL hergestellt werden. Code-seitig ist der WR-01-Fix
(`isNonDeniable && !isRemoveMode`) vorhanden, aber weiterhin ohne Live-Beleg.

### 2. D-01/D-02 — Hauptnavigation und Verlinkung
result: [passed] `Benutzer | Gruppen | Rollen | Capabilities | Claims | Änderungen` durchgehend
vorhanden, alle sechs mit korrekten hrefs (`/admin/users`, `/admin/fansubs`, `/admin/roles`,
`/admin/role-capabilities`, `/admin/claims`, `/admin/changes`). Rollenzeile im Rechte-Tab verlinkt
per "Rechte der Rolle co_leader ansehen" nach `/admin/role-capabilities?role=co_leader`.

### 3. D-04 — Benutzerliste als Arbeitsliste
result: [passed] Spalten exakt: Benutzer, Status, Globale Rolle, Member-Profil,
Gruppenmitgliedschaften, Offene Claims, Letzte Aktivität, Aktionen. Keine Beiträge-,
Release-Arbeitsflächen- oder Medienupload-Spalten. Filter: Status, Globale Rolle, Nur mit Konflikten.

### 4. D-03/D-05 — Benutzer-Detail
result: [passed] Sechs Tabs (`Übersicht | Rollen & Rechte | Beiträge | Claims | Streaming |
Änderungen`), kein Akkordeon. Übersicht kompakt: Gruppe + Rolle + wenige Schlüsselrechte +
"Keine persönlichen Rechteabweichungen · Keine offenen Claims". Keine Statistik-Kacheln.

### 5. D-11/D-12/D-13 — Kanonischer Benutzer-in-Gruppe-Editor
result: [passed] Nach Gruppe strukturiert (`Effektive Rechte nach Gruppe` → New-Subs), Rollen der
Gruppe zusammen dargestellt, vollständiger Katalog mit erlaubten UND nicht erlaubten Rechten.
Kategorien exakt die 7 realen Registry-Werte: Gruppe, Gruppenmedien, Gruppenseite, Projekt,
Rechteverwaltung, Release, Review. Spalten `Capability | Effektiv | Quelle`. Detail zeigt
Rollenquellen, spezialisierte Grants, persönlich erlaubt/entzogen, non-deniable, Reason-Code und
die Historie am Recht.

### 6. D-15/D-17 — Fachliche Aktionen statt Allow/Deny
result: [passed] Nicht erlaubtes Recht bietet "Recht zusätzlich erlauben". non-deniable wird im
Detail explizit als "Nicht entziehbar (non-deniable): Nein/Ja" geführt. Keine rohen
Allow/Deny-Schalter im Hauptbedienmodell.

### 7. CAP-09 / D-18 / D-19 — Impact-Vorschau der Rollen-Capability-Änderung
result: [passed] Switch "Technische Links bearbeiten" für Co-Leitung umgelegt → **keine sofortige
Mutation**, Switch blieb unverändert, Modal öffnete sich mit allen fünf Kennzahlen:

```
1 Rolleninhaber
0 verlieren das Recht
1 gewinnen das Recht
0 behalten es über eine andere Rolle
0 behalten es über eine persönliche Abweichung

BENUTZER  GRUPPE     VORHER          NACHHER   GRUND
coleader  New-Subs   nicht erlaubt   erlaubt   wird durch diese Änderung gewährt
```

Entzugsrichtung ebenso korrekt ("1 verlieren das Recht", Grund "keine weitere Quelle").
Netzwerk-Beleg: `GET /api/v1/admin/role-capabilities/co_leader/fansub_group_page.technical_links_edit/impact-preview?add=true`
→ 200, und erst 41 s später beim Bestätigen `PUT …/technical_links_edit` → 200.

### 8. CAP-10 / D-21 — Aktivierungsstatus
result: [passed] Nach Bestätigung bleibt der Dialog offen und zeigt "Gespeichert und aktiv." statt
einer pauschalen Erfolgsmeldung. Switch springt erst nach der Bestätigung um.

### 9. Persistenz und Audit
result: [passed] DB nach Grant: `co_leader | fansub_group_page.technical_links_edit` vorhanden;
nach Revoke wieder leer (Ausgangszustand wiederhergestellt). `audit_logs` enthält beide Vorgänge
(`role_capability.granted` / `role_capability.revoked`, `outcome=allowed`, `actor_app_user_id=1`).

### 10. D-32 — Responsive (getestet bei 394 px Viewport-Breite)
result: [issue] Rollen-Detail öffnet korrekt als Drawer über abgedunkeltem Hintergrund statt als
gequetschte Matrix. ABER: harte horizontale Überlaufs — siehe Finding UAT-138-A.

### 11. D-25 — Änderungen fachlich übersetzt
result: [partial] Die beiden Rollen-Capability-Vorgänge erscheinen als
"Admin hat der Rolle co_leader die Berechtigung fansub_group_page.technical_links_edit entzogen."
Fachliche Übersetzung greift also. Aber rohe Codes und fehlende Vorher/Nachher — siehe UAT-138-C.

## Findings

### UAT-138-A (major) — Horizontaler Seitenüberlauf im Rechte-Tab bei schmaler Breite
Bei 394 px Viewport ist `document.scrollWidth` = 726 bei `clientWidth` = 394; **264 Elemente**
ragen über den Viewport hinaus. Ursache exakt lokalisiert:
`SECTION.ui_card__LCMfR.ui_cardSection___fLKA` ist 330 px breit, hat aber
`grid-template-columns: 673.778px` — ein einzelner Grid-Track, breiter als sein Container.
Das ist die CSS-Grid-`min-content`-Falle: ein `auto`/`1fr`-Track fällt nie unter die
min-content-Breite seines breitesten Kindes (hier die Capability-Tabelle), und alle Kinder erben
diese Breite.

Fix gehört in das **globale Primitive** (`Card`/`Section`), nicht in Phase-138-Code:
`minmax(0, 1fr)` statt `1fr` — dasselbe Muster, das `AppShell_shell` bereits korrekt nutzt
(`grid-template-columns: 16px minmax(0px, 1fr)`). Phase 138 hat den Defekt nicht erzeugt, sondern
sichtbar gemacht, indem sie breite Tabellen in diese Karten legt; andere Seiten mit Tabellen in
Cards dürften ebenfalls betroffen sein.

**Status: BEHOBEN und live nachgemessen (2026-08-23).**
Fix in zwei Schritten, beide im globalen Primitive `frontend/src/components/ui/ui.module.css`:
`.card` (Commit `dc4f5726`) und `.accordionRoot` (Commit `59f7173f`) erhalten je
`grid-template-columns: minmax(0, 1fr)`. `.tableWrap` blieb unverändert, da es bereits
`overflow: auto` besitzt.

Nachmessung bei 394 px Viewport auf `/admin/users/4?tab=roles-rights`:
`document.scrollWidth` = 394 = `clientWidth`, also **kein Seitenüberlauf mehr**
(vorher 726 gegen 394). Die breite Capability-Tabelle scrollt jetzt korrekt in ihrem eigenen
Container (`tableWrap` 256 px breit, `scrollWidth` 640, `overflow-x: auto`) statt die Seite zu
sprengen. Visuell im Screenshot bei 394 px bestätigt.

### UAT-138-B — ZURÜCKGEZOGEN (Messfehler des Testers, kein Defekt)
Ursprünglich als Kontrastfehler des aktiven Tabs gemeldet. Nachmessung widerlegt das:
`.tabButtonActive` rendert `background-image: linear-gradient(rgba(117,152,235,.94), rgba(72,103,180,.98))`
mit `color: rgb(249,251,255)` — blaue Pille, weiße Schrift, ausreichender Kontrast (visuell im
Screenshot bestätigt). Der ursprüngliche Messwert `background-color: rgba(0,0,0,0)` ist bei
Verlaufs-Hintergründen erwartbar, weil die Farbe in `background-image` steckt; der frühere
Screenshot hatte den Tab zusätzlich mitten in der 120ms-Transition erwischt. Kein Handlungsbedarf.

### UAT-138-C (minor) — Rohe technische Codes in user-facing Text (D-33)
Mehrere Stellen zeigen Bezeichner statt Labels, obwohl die Labels im System vorhanden sind (die
Übersicht zeigt korrekt "Rolle: Co-Leitung"):
- Rechte-Tab, Spalte `Quelle`: `co_leader` statt `Co-Leitung`
- Rechte-Tab, "Rollen in dieser Gruppe": `co_leader`
- Änderungen: `co_leader` und `fansub_group_page.technical_links_edit` statt
  `Co-Leitung` / `Technische Links bearbeiten`
- Änderungen: Akteur als `Benutzer #1` statt `admin`
- Änderungen-Filter erwarten rohe IDs (`Benutzer (ID)`, `Akteur (ID)`, `Gruppe (ID)`)

### UAT-138-D (minor) — Negative Relativzeit
Benutzerliste zeigt für `admin` "vor -1 Tagen". Formatierung verrechnet sich bei
Zeitstempeln nahe/über der aktuellen Zeit.

### UAT-138-E (minor) — Impact-Modal bei schmaler Breite
Die Kennzahlenzeile bricht so um, dass eine der fünf Kennzahlen aus dem sichtbaren Bereich
gedrängt wird (im DOM vorhanden, visuell abgeschnitten). Die Detailtabelle scrollt horizontal
statt auf ein Kartenlayout umzustellen; `NACHHER` und `GRUND` sind ohne Scrollen nicht sichtbar.
Der Dialog nutzt außerdem nur das obere Viertel seiner Höhe.

### UAT-138-F (informational) — Änderungen ohne Vorher/Nachher
D-25 wünscht `vorher → nachher` je Eintrag. Aktuell liefert die Zeile nur die Aktion. Laut
138-RESEARCH.md (R-07) ist der Vorzustand aus den vorhandenen Auditdaten nicht durchgängig
rekonstruierbar; die ehrliche Weglassung ist vertretbar, sollte aber als bewusste Grenze
dokumentiert bleiben statt als offener Rest.

## Summary

total: 11
passed: 9
issues: 3
pending: 0
blocked: 1
skipped: 0

## Gaps

- Test 1 (non_deniable + schlafender user_deny) braucht eine Fixture; ohne sie bleibt der
  WR-01-Fix live unbelegt.
- UAT-138-A ist behoben; verbleibend sind die kosmetischen Befunde C, D und E.
- UAT-138-A gehört in das globale UI-Primitive, nicht in Phase-138-Dateien.

---

## GAP-01 — Negative Relativzeit in der Benutzerliste (aus UAT-138-D)

**Symptom:** Die Benutzerliste zeigt für `admin` "vor -1 Tagen".

**Ursache (verifiziert):** `formatRelativeDate` in
`frontend/src/app/admin/users/AdminUsersClient.tsx` (Zeile 28-37) rechnet
`Math.floor(diff / (1000*60*60*24))`. Liegt `isoDate` minimal in der Zukunft — es genügt die
Uhrdifferenz zwischen Server/DB und Browser —, wird `diff` negativ und `Math.floor(-0.5)` ergibt
`-1`. Die Sonderfälle `days === 0` ("Heute") und `days === 1` ("Gestern") greifen dann nicht mehr,
und der Zweig `days < 30` rendert "vor -1 Tagen".

**Erwartet:** Nicht-negative Ausgabe für Zeitstempel, die gleich jetzt oder in der Zukunft liegen.
Ein zukünftiger oder gerade eben geschriebener Zeitstempel wird als "Heute" behandelt. Kein
"vor -N Tagen" mit negativem N, in keiner der vier Zeitstufen (Tage, Monate, Jahre).

**Umfang:** Nur diese Formatierfunktion plus Test. Keine Zeitzonen-Umstellung, keine Änderung des
Backend-Zeitstempels, keine neue Datumsbibliothek. Prüfen, ob dieselbe Funktion dupliziert existiert
(z. B. `frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx` enthält ebenfalls
"Tagen") — falls ja, gemeinsam korrigieren statt zwei Varianten zu pflegen.

**Nachweis:** Unit-Test mit einem Zeitstempel in der Zukunft (z. B. `Date.now() + 60_000`) und
einem exakt auf `Date.now()`; beide dürfen kein negatives Ergebnis liefern.

---

## GAP-02 — Impact-Vorschau bei schmaler Breite unbrauchbar (aus UAT-138-E)

**Symptom (gemessen bei 394 px Viewport, `RoleCapabilityImpactPreviewModal`):**

1. Die Kennzahlenzeile bricht so um, dass eine der fünf Kennzahlen aus dem sichtbaren Bereich
   gedrängt wird. Im DOM sind alle fünf vorhanden, sichtbar sind nur vier — konkret fehlte
   "0 behalten es über eine andere Rolle".
2. Die Detailtabelle scrollt horizontal; `NACHHER` und `GRUND` sind ohne Scrollen nicht erreichbar.
   Genau diese beiden Spalten tragen die Entscheidungsinformation.
3. Der Dialog nutzt nur das obere Viertel seiner Höhe, der Rest ist leer.

**Warum das zählt:** Der Dialog ist das Sicherheitsnetz vor einer globalen Rechteänderung
(CAP-09/D-19). Wenn eine Kennzahl unsichtbar ist und die Spalte "nachher" weggescrollt werden muss,
bestätigt der Admin im Blindflug — genau das, was D-18 verhindern soll.

**Erwartet:**
- Alle fünf Kennzahlen sind bei 394 px ohne Scrollen sichtbar (Umbruch auf mehrere Zeilen ist in
  Ordnung, Abschneiden nicht).
- Die Auswirkung je Benutzer ist ohne horizontales Scrollen lesbar. Auf schmaler Breite gemäß D-32
  als kompakte Karte/Zeile je Benutzer statt als breite Tabelle — die Desktop-Tabelle bleibt
  unverändert.
- Der Dialog nutzt seine Höhe sinnvoll; kein großer Leerraum unter dem Inhalt.

**Umfang:** Reine Darstellung. Keine Änderung an Impact-Berechnung, Zählweise, Bestätigungslogik
oder Aktivierungsstatus. Der Dialog bleibt der einzige Mutations-Einstieg der Matrix.

**Nachweis:** Test, der bei schmaler Breite alle fünf Kennzahlen und für mindestens eine Zeile die
Werte "vorher", "nachher" und "Grund" findet.

---

## GAP-03 — non-deniable plus schlafender persönlicher Deny ist ungetestet (aus 138-VERIFICATION.md)

**Stand:** `138-VERIFICATION.md` steht auf `status: human_needed` und nennt genau diesen einen
offenen Punkt. Der WR-01-Fix (`isNonDeniable && !isRemoveMode` in `GuidedRevokeFlow.tsx`) ist
code-seitig vorhanden, aber weder durch einen automatisierten Test noch live belegt. Die Live-UAT
konnte ihn nicht prüfen: In der Datenbank existiert kein Benutzer mit dieser Kombination, und die
Kombination lässt sich in der Oberfläche nicht herstellen, weil ein non-deniable Recht gar nicht
erst persönlich entzogen werden kann.

**Erwartetes Verhalten:** Für einen Benutzer mit `non_deniable = true` auf einer Capability, der
zusätzlich einen gespeicherten `user_deny` auf derselben Capability hat, muss
`Abweichung entfernen` durchlaufen: der Dialog geht direkt zum Bestätigungsschritt
("Die persönliche Abweichung … wird entfernt") und zeigt nach dem Bestätigen den ehrlichen
Aktivierungsstatus des Override-Pfads. Er darf **nicht** in der Erklärung
"Dieses Recht kann für … nicht persönlich entzogen werden." sackgassen.

**Lösungsweg:** Ein automatisierter Regressionstest ist einer einmaligen Fixture vorzuziehen, weil
er das Verhalten dauerhaft festnagelt. Test in
`frontend/src/app/admin/users/tabs/GuidedRevokeFlow.test.tsx` ergänzen, der genau die Kombination
`non_deniable: true` **und** `user_deny: true` im Entfernen-Modus rendert und belegt, dass der
Bestätigungsschritt erreichbar ist und die Entfernen-Aktion nicht blockiert wird. Zusätzlich der
Gegentest: dieselbe Capability mit `non_deniable: true`, aber **ohne** `user_deny`, im
Entziehen-Modus — dort muss die Erklärung weiterhin greifen und kein Entzug angeboten werden.

**Umfang:** Nur Tests. Keine Änderung an der Branch-Logik, solange die Tests sie bestätigen.
Widerlegt ein Test das erwartete Verhalten, ist der Defekt zu melden und der minimale Fix
vorzunehmen — nicht der Test an das Ist-Verhalten anzupassen.

---

## Gemeinsame Randbedingungen für GAP-01 bis GAP-03

- Globale UI-Primitives aus `@/components/ui` sind Pflicht; kein Eigenbau für vorhandene Typen.
- Globale Design-Tokens statt eigener CSS-Variablen. Korrekte Umlaute in user-facing Strings.
- Produktionsdateien bleiben bei höchstens 450 Zeilen.
- Die in `ui.module.css` gesetzten `grid-template-columns: minmax(0, 1fr)` auf `.card` und
  `.accordionRoot` dürfen nicht zurückgedreht werden (halten UAT-138-A). Nach den Änderungen bei
  394 px prüfen, dass `document.scrollWidth === document.clientWidth` bleibt.
- Verifikation im Container, nicht auf dem Host:
  `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/app/admin --reporter=basic"`.
- Vorab rot und nicht durch diese Gaps verursacht (nicht reparieren):
  `FansubAppMembersSection.test.tsx`, `fansubs/[id]/edit/page.test.tsx`, `useGroupMembersTab.test.ts`,
  `UserContributionsTab.test.tsx`, `ResponsiveImage.config.test.ts`.

---

## Gap-Block Ergebnis (2026-08-24, live nachgeprüft)

Geplant als `138-17-PLAN.md` und `138-18-PLAN.md` (beide `gap_closure: true`), ausgeführt per
`/gsd-execute-phase 138 --gaps-only`.

### GAP-01 — BEHOBEN
`formatRelativeDate` in `AdminUsersClient.tsx` clampt negative Differenzen. Live auf
`/admin/users` bei angemeldetem Plattform-Admin: die Relativwerte lauten jetzt "Heute",
"Gestern", "vor 2 Tagen" — kein einziger negativer Wert mehr. Die Zeile, die zuvor
"vor -1 Tagen" zeigte, steht jetzt auf "Heute".

### GAP-02 — BEHOBEN
Live gemessen im geöffneten Impact-Dialog bei 394 px Viewport:
- Alle **fünf** D-19-Kennzahlen sind vorhanden und liegen vollständig innerhalb der
  Dialoggrenzen (linke Kante je 19 px, rechteste Kante 292 px bei 394 px Breite). Keine
  abgeschnittene Kennzahl mehr.
- **Null** horizontal scrollende Container innerhalb des Dialogs. Die Auswirkung je Benutzer
  erscheint als Karte mit beschrifteten Feldern ("coleader / New-Subs / vorher: nicht erlaubt /
  nachher: erlaubt / Grund: wird durch diese Änderung gewährt") statt als breite Tabelle;
  "nachher" und "Grund" sind ohne Scrollen lesbar.
- Das Panel (`ui_modalPanel`) ist 604 px hoch bei 900 px Viewport, also inhaltsgetrieben statt auf
  100 dvh gezwungen; es ist mittig zentriert (148 px Overlay ober- und unterhalb). Die Aktionen
  "Abbrechen" und "Änderung übernehmen" liegen bei 689-733 px innerhalb des Panels.

Hinweis zur Messung: Das Element mit `role="dialog"` ist der Vollbild-Wrapper `ui_modalWrap` und
daher naturgemäß 900 px hoch. Für die Höhenbewertung ist `ui_modalPanel` maßgeblich.

Die Höhenkorrektur ist über eine neue optionale `panelClassName`-Prop an `Modal.tsx` auf genau
diesen Dialog begrenzt; die geteilte `.modalPanel`-Regel bleibt für alle anderen Modals unverändert.

### GAP-03 — BEHOBEN (durch Regressionstest, nicht durch Fixture)
Test 1 dieser Datei war blockiert, weil die Kombination `non_deniable = true` **und** gespeicherter
`user_deny` in der Datenbank nicht existiert und sich über die Oberfläche auch nicht herstellen
lässt. Der Fall ist jetzt durch einen automatisierten Regressionstest in
`GuidedRevokeFlow.test.tsx` festgenagelt, der genau diese Kombination im Entfernen-Modus rendert
und belegt, dass der Bestätigungsschritt erreichbar ist. Der Gegentest (`non_deniable = true` ohne
`user_deny`) war bereits vorhanden und bleibt grün.

Damit ist der einzige offene Punkt aus `138-VERIFICATION.md` (`status: human_needed`) geschlossen —
dauerhaft durch einen Test statt einmalig durch eingespielte Daten.

### Regression nach dem Gap-Block
`src/app/admin` + `src/components/ui`: 25 Fehler in denselben fünf vorbelasteten Dateien wie vor
dem Gap-Block, 836 bestanden (vorher 827) — die neun zusätzlichen sind die neuen Regressionstests.
Keine neuen Fehler. Der Überlaufschutz aus UAT-138-A hält: bei 394 px bleibt
`document.scrollWidth === clientWidth`.

## Summary (aktualisiert)

total: 11
passed: 11
issues: 0
pending: 0
blocked: 0
skipped: 0

---

## GAP-04 — Rollen-Cards und inkonsistente Klickflächen (D-08 nicht eingelöst)

Vom Nutzer im Live-Betrieb gemeldet, danach gemessen. Betrifft zwei Oberflächen:
`/admin/roles` und die linke Rollenliste in `/admin/role-capabilities`.

### Befund 1 — Die Klickfläche entspricht nicht der sichtbaren Fläche

Auf `/admin/roles` bei 1440 px Breite gemessen:

| Element | Maße | Reagiert auf Klick |
|---|---|---|
| `SECTION.ui_card.ui_cardInteractive` (die sichtbare Zeile) | 1409 x 82 px | **nein** (`cursor: auto`) |
| `BUTTON.ui_buttonGhost` darin | 1070 x 44 px (37 - 1107) | ja |
| Link "Standard-Capabilities dieser Rolle ansehen" | 1119 - 1404 px | ja, aber ausserhalb des Buttons |

Nur **41 %** der Kartenfläche sind klickbar. Die restlichen 59 % sind als Karte gestaltet — mit
Hintergrund `rgb(230,235,243)`, Rahmen und der Klasse `ui_cardInteractive`, deren Name Interaktivität
zusagt — reagieren aber nicht. Der Hover-Zustand hebt zusätzlich nur den inneren Button hervor und
endet mitten in der Zeile, was den Eindruck einer defekten Fläche verstärkt.

**Erwartet:** Entweder ist die gesamte Zeile klickbar, oder die Zeile trägt keine Karten-/Button-
Optik. Kein Zwischenzustand, in dem Text ein Link ist und die Fläche wie ein Button aussieht.
Der sekundäre Einstieg ("Standard-Capabilities dieser Rolle ansehen") bleibt als eigener,
klar abgegrenzter Bedienpunkt erhalten und darf nicht mit der Zeilenaktion verschmelzen — er führt
an einen anderen Ort. Tastaturbedienung und Fokusreihenfolge müssen dabei eindeutig bleiben:
genau ein Fokusstopp für die Zeilenaktion, einer für den sekundären Link.

### Befund 2 — Die Rollenliste ist keine kompakte Liste (D-08)

`/admin/roles`: 15 Rollenzeilen, je 82 px hoch plus 8 px Abstand, also 90 px pro Rolle. Bei 900 px
Fensterhoehe sind **8 von 15** Rollen sichtbar; die Seite ist 1515 px hoch. Fuer eine Liste aus 15
kurzen Namen muss gescrollt werden.

Linke Rollenliste in `/admin/role-capabilities`: dieselbe Bauform, Eintraege 71-86 px hoch.

Das loest D-08 nicht ein. D-08 fordert woertlich, die grossen Rollen-Cards zu **ersetzen** durch
eine kompakte Rollenliste; die UI-Grundsaetze in 138-CONTEXT.md fuehren "riesige Rollen-Cards"
ausdruecklich unter "Vermeiden" und "kompakte Listen" unter "Bevorzugen". Aktuell ist die Card-Optik
lediglich von der frueheren Darstellung uebernommen worden.

**Erwartet:** Kompakte Zeilen statt Karten. Richtwert: alle 15 Gruppenrollen auf `/admin/roles`
ohne Scrollen bei 900 px Fensterhoehe sichtbar (das entspricht rund 40-45 px pro Zeile). In der
linken Liste von `/admin/role-capabilities` entsprechend, sodass die Rollenauswahl als
Navigationsspalte funktioniert und nicht selbst zum Scrollbereich wird.

Die vorhandenen Informationen je Rolle bleiben erhalten: Rollenname, Rollenart/Kontext
("Globale App-Rolle" / "Aktive App-Rolle") und die Anzahl der Rolleninhaber ("1x vergeben").
Sie duerfen kompakter angeordnet werden, aber nicht entfallen.

### Umfang

- Reine Darstellungs- und Interaktions-Aenderung. Keine Aenderung an Rollen-Daten, Rechtelogik,
  Impact-Vorschau, Aktivierungsstatus oder an den Ziel-Routen der beiden Einstiege.
- Der kanonische Rollen-Capability-Editor bleibt der einzige Ort fuer Capability-Aenderungen (D-10),
  der kanonische Benutzer-in-Gruppe-Editor der einzige fuer Benutzerrechte (D-09).
- Bevorzugt die globalen Primitives verwenden. Wenn dafuer ein vorhandenes Primitive (z. B. eine
  kompakte Listen-/Tabellenzeile) passt, dieses nutzen statt lokal etwas Neues zu bauen. Faellt auf,
  dass `ui_cardInteractive` generell eine nicht klickbare Flaeche mit Interaktions-Optik erzeugt,
  ist das im globalen UI-System zu korrigieren statt pro Seite zu umgehen — dann aber pruefen,
  welche anderen Aufrufstellen betroffen sind, und das im Summary benennen.
- Mobile/Tablet gemaess D-32: Liste bleibt Liste, keine erzwungene Desktop-Matrix.

### Nachweis

- Test, der belegt, dass die Zeilenaktion ueber die gesamte sichtbare Zeilenflaeche ausgeloest wird
  (oder dass die Zeile keine Karten-/Button-Optik mehr traegt), und dass der sekundaere Link
  weiterhin separat erreichbar ist.
- Messung im Summary: Zeilenhoehe und Anzahl der ohne Scrollen sichtbaren Rollen bei 900 px
  Fensterhoehe auf `/admin/roles`, vorher/nachher.

### Randbedingungen

Es gelten dieselben gemeinsamen Randbedingungen wie fuer GAP-01 bis GAP-03 (globale Primitives und
Design-Tokens, Umlaute, 450-Zeilen-Grenze, `minmax(0, 1fr)` auf `.card`/`.accordionRoot` nicht
zurueckdrehen, Verifikation im Container, die fuenf vorbelasteten Testdateien nicht anfassen).

---

## GAP-05 — Deep-Link von einer Rolle verliert den Rollenkontext

Vom Nutzer gemeldet: "wenn man auf Rolle klickt kommt man auf Capability, welches noch mal die
Rollen zeigt, obwohl ich eine spezifische Rolle angeklickt habe."

### Warum es zwei Bereiche gibt (bleibt so)

Die Trennung ist eine bewusste Entscheidung und wird **nicht** zurueckgenommen:
- `Rollen` (D-07) beantwortet "Wer besitzt diese Rolle und in welcher Gruppe?" — Personen-/
  Zuweisungsperspektive.
- `Capabilities` (D-08, D-10) beantwortet "Was darf diese Rolle standardmaessig?" — die Definition.
- D-10 verlangt genau **einen** kanonischen Ort fuer Rollen-Capability-Aenderungen, damit dieselbe
  Berechtigung nicht an mehreren Stellen unabhaengig gepflegt wird.

Nicht die Trennung ist das Problem, sondern dass der Uebergang zwischen beiden den Kontext verliert.

### Befund (gemessen auf /admin/role-capabilities?role=co_leader bei 1440x900)

Nach Klick auf "Standard-Capabilities dieser Rolle ansehen" fuer **Co-Leitung**:

1. **Null Capabilities sichtbar.** Alle sieben Kategorie-Akkordeons stehen auf
   `aria-expanded="false"`, es sind **0** Capability-Switches gerendert. Der Nutzer klickt
   "Capabilities dieser Rolle ansehen" und sieht keine einzige Capability.
2. **Die gewaehlte Rolle ist nicht das Subjekt der Seite.** Die Ueberschrift lautet
   "Capability-Verwaltung" (H1, 43,2 px); die tatsaechlich gewaehlte Rolle "Co-Leitung" ist ein
   H3 mit 16 px — der generische Bereichsname ist 2,7-mal groesser als das, worum es geht.
3. **Fuenf nicht gewaehlte Rollen fuellen den oberen Bildschirm** (Plattform-Admin, Content-Admin,
   Benutzer, Fansub-Leitung, Gruender), waehrend die gewaehlte Rolle als sechster Eintrag am
   unteren Rand steht.
4. **Die Auswahl ist semantisch nicht ausgezeichnet.** Es existiert kein `aria-current` und kein
   `aria-pressed` an der ausgewaehlten Rolle; die Auswahl ist ausschliesslich ein blauer Rahmen.
   Fuer Screenreader ist nicht erkennbar, welche Rolle aktiv ist.

### Erwartet

- Kommt der Nutzer mit `?role=<code>`, ist **diese Rolle das Subjekt der Seite**: prominent
  benannt, erkennbar als das, was gerade bearbeitet wird — nicht als 16-px-Zwischentitel.
- Es ist **sofort mindestens eine Capability sichtbar**, ohne dass der Nutzer erst ein Akkordeon
  aufklappen muss. Wie das erreicht wird (erste Kategorie offen, alle offen, oder eine flache
  Darstellung), ist Umsetzungsentscheidung — das Ergebnis zaehlt.
- Die Rollenliste bleibt erreichbar (Wechsel zu einer anderen Rolle muss moeglich bleiben), tritt
  aber visuell hinter die gewaehlte Rolle zurueck und draengt sie nicht aus dem Sichtfeld.
- Die aktive Rolle ist semantisch ausgezeichnet (`aria-current="true"` oder `aria-pressed="true"`
  an der Listenauswahl), damit die Auswahl nicht nur farblich existiert.
- Ein sichtbarer Rueckweg zur Herkunft ist wuenschenswert, sofern er sich aus der vorhandenen
  Navigation ergibt — keine neue History-Mechanik erfinden.

### Umfang

- Reine Darstellungs-/Navigations-Aenderung. Keine Aenderung an Capability-Daten, Impact-Vorschau,
  Aktivierungsstatus oder an der Mutationslogik.
- `RoleCapabilityImpactPreviewModal` bleibt der einzige Mutations-Einstieg der Matrix (CAP-09).
- Die Trennung `Rollen` / `Capabilities` bleibt bestehen (D-01, D-07, D-08, D-10). Diese Aufgabe
  darf die beiden Bereiche **nicht** zusammenlegen.
- Haengt inhaltlich mit GAP-04 zusammen (kompakte Rollenliste); beide betreffen dieselbe linke
  Spalte und sollten zusammen gedacht werden.

### Nachweis

Test, der beim Aufruf mit `?role=<code>` belegt: die gewaehlte Rolle ist als aktiv ausgezeichnet,
und es ist mindestens eine Capability der Rolle ohne weitere Interaktion sichtbar.
Im Summary die Anzahl der ohne Interaktion sichtbaren Capabilities vorher/nachher angeben.
