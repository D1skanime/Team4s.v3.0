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
result: [blocked] — In der aktuellen DB existiert keine solche Kombination. Es gibt vier Benutzer
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
