# Phase 138 — Effective-Rights Administration & Impact UX

## Status

Die Produktdiskussion für Phase 138 ist **abgeschlossen** (extern geführt, 2026-08-23).

Dieses Dokument ist das autoritative Discuss-/Context-Ergebnis für Phase 138 und dient GSD als
Grundlage für Research, UI-Spec und Planung.

`/gsd:discuss-phase 138` **nicht erneut ausführen.**

### Quellen und Präzedenz

Die Rohdiskussion liegt unverändert unter `discuss/` in diesem Phasenverzeichnis:

| Datei | Inhalt |
|---|---|
| `phase-138-discuss-benutzer-rechteverwaltung.md` | Basisdokument (Gesamtbild, §1–§27) |
| `phase-138-discuss-01-admin-architektur-navigation.md` | Admin-Architektur, Navigation, kanonische Bearbeitungsorte |
| `phase-138-discuss-02-effective-rights-user-overrides.md` | Effective Rights, Benutzer-in-Gruppe-Editor, persönliche Abweichungen |
| `phase-138-discuss-03-rollen-capabilities-impact-activation.md` | Rollen, Capability-Matrix, Impact Preview, Aktivierungsstatus |
| `phase-138-discuss-04-claims-aenderungen-adjacent-context.md` | Claims, Änderungen, Beiträge-Kontext, Filter/Suche |

**Präzedenzregel:** Wo das Basisdokument und die Dateien 01–04 sich unterscheiden, gelten
**01–04** (sie sind der jüngere, konkretisierende Diskussionsstand). Beispiel: Der Navigationsbegriff
lautet verbindlich `Änderungen`, nicht `Audit / Änderungen`.

**Code-Präzedenz:** Wo diese Diskussion generische Beispielnamen nennt (Capability-Bezeichner,
Claim-Status, Kategorien, Rollenlisten), ist **immer die reale Registry / der reale Code maßgeblich**.
Es dürfen keine Capability-Namen, Status oder Kategorien erfunden werden.

---

## Phase-Ziel

Phase 138 macht das in Phase 136 (Policy/Katalog/Schema) und Phase 137 (zentraler Effective-Rights-Resolver,
Provenienz, scoped User-Overrides, Audit) geschaffene Rechtemodell **sichtbar, erklärbar und
administrierbar**.

Phase 138 ist damit primär eine **Admin-UX-Phase auf bestehender Backend-Substanz** — plus genau
den gezielten Vertragserweiterungen, die für Impact-Vorschau und echten Aktivierungsstatus fehlen.

Die Oberfläche muss folgende Fragen beantwortbar machen:

- Was darf ein bestimmter Benutzer — und **warum**?
- In welcher Gruppe gilt das?
- Welche Rolle oder welche persönliche Abweichung ist dafür verantwortlich?
- Wer besitzt eine bestimmte Rolle?
- Was darf eine Rolle standardmässig?
- Wer ist von einer Rollen-/Capability-Änderung **tatsächlich effektiv** betroffen?
- Welche Claims sind offen?
- Was wurde administrativ geändert, von wem, und was galt vorher/nachher?

### Verbindliche Roadmap-Erfolgskriterien (Gate)

Aus `ROADMAP.md`, Phase 138 — diese vier Kriterien sind das harte Abnahme-Gate:

1. Der bestehende Gruppenrechte-Tab im Benutzer-Detail zeigt den vollständigen effektiven
   Capability-Satz samt Provenienz und ist der kanonische Ort für scoped User-Allow/Deny-Änderungen.
2. Ein geführter „Benutzer darf das nicht"-Flow listet jede gewährende Quelle und empfiehlt einen
   scoped User-Deny, bevor breitere Mitgliedschafts- oder Rollenmatrix-Änderungen angeboten werden.
3. Vor einer Rolle-zu-Capability-Änderung sieht der Admin betroffene Rolleninhaber und wer die
   Capability tatsächlich gewinnt, verliert oder über eine andere Quelle behält.
4. Nach einer Rollenmatrix-Mutation unterscheidet die UI persistiert / cache-aktiv / ausstehend /
   fehlgeschlagen und meldet niemals veraltete Enforcement als finalen Erfolg.

**Requirements:** CAP-08, CAP-09, CAP-10, UADM-01.

Die in diesem Dokument beschriebene Informationsarchitektur ist der **Zielzustand des Moduls**;
die vier Kriterien oben sind die **nicht verhandelbare Untergrenze**. Sollte die Planung zu dem
Ergebnis kommen, dass der volle IA-Umbau die Phase überdehnt, ist der IA-Umbau in Wellen zu
schneiden — aber CAP-08/09/10 und UADM-01 müssen in dieser Phase vollständig geliefert werden.

---

# 1. Phasengrenze

## In scope

- Gemeinsame Admin-Informationsarchitektur für Benutzer, Gruppen, Rollen, Capabilities, Claims, Änderungen
- Bidirektionale Navigation zwischen diesen Perspektiven
- Kanonischer Benutzer-in-Gruppe-Rechteeditor (genau einer)
- Kanonischer Rollen-Capability-Editor (genau einer)
- Erklärbare Effective Rights inkl. Provenienz/entscheidender Quelle (Daten aus Phase 137)
- Geführter Rechte-Entzug und geführtes Zusätzlich-Erlauben (persönliche Abweichungen)
- Impact Preview vor Rollen-Capability-Änderungen **und** vor Rollenzuweisung/-entzug am Benutzer
- Persistierungs-/Aktivierungsstatus als sichtbarer UX-Zustand
- Claims als zentraler Arbeitsbereich plus Claim-Kontext in Benutzer und Gruppe
- Claim-Entscheidung mit Auswirkungs-Vorschau
- Zentraler „Änderungen"-Bereich plus kontextbezogene Historien
- Bereichsspezifische Filter
- Responsive Umsetzung Desktop / Tablet / Mobile
- Ablösung der heutigen grossen Rollen-Cards und der read-only Gruppenrechte-Zusammenfassung
- Punktuelle Backend-/Vertragserweiterungen für Impact-Preview und Aktivierungsstatus
- Der Beitrags-Darstellungsfehler `Version {release_version_id}` (siehe D-29, eng begrenzt)

## Explizit out of scope

- **Keine zweite Permission-Engine.** Der Resolver aus Phase 137 bleibt die einzige Wahrheit.
- **Keine vereinfachte Rechtehierarchie im Frontend.**
- Kein vollständiges Beitrags-/Media-Projektions-Redesign → **Phase 139** (UADM-02…UADM-08).
  Insbesondere serverseitige Gruppierung, Range-Kollaps, Filter/Count/Pagination-Kohärenz gehören dorthin.
- Keine Review-Delegations-Verwaltung → **Phase 140**.
- Keine Review-Queue-Arbeit → **Phase 141**.
- Keine fachliche Streaming-Implementierung (nur IA-Platzhalter, siehe D-30).
- Keine neue komplexe Lösch-Architektur für Benutzer (siehe D-31).
- Keine Änderung der in Phase 136/137 festgelegten Precedence-Semantik (inkl. D01-Ausnahme
  „Contribution Roles sind override-blind" und des non-deniablen IdP-Platform-Admin-Bypass).

---

# 2. Bindende Entscheidungen

## Informationsarchitektur & Navigation

### D-01 — Hauptnavigation

Verbindlich:

```text
Benutzer | Gruppen | Rollen | Capabilities | Claims | Änderungen
```

Diese Bereiche sind unterschiedliche Perspektiven auf dasselbe Identitäts-, Gruppen-, Rollen- und
Berechtigungsmodell — keine getrennten Verwaltungswelten.

### D-02 — Bidirektionale Navigation, keine Sackgassen

Mindestens diese Wege müssen funktionieren:

```text
Benutzer → Gruppe → Rolle → Recht
Rolle → Benutzer → Gruppe
Gruppe → Benutzer → Rolle
Capability → Rolle → betroffene Benutzer
Änderung → Benutzer / Gruppe / Rolle / Capability
```

Benutzer, Gruppen und Rollen sind in Tabellen direkt anklickbar. Der Administrator soll die
technische Datenstruktur nicht kennen müssen.

### D-03 — Benutzer-Detailnavigation

```text
Übersicht | Rollen & Rechte | Beiträge | Claims | Streaming | Änderungen
```

Die heutige lange Akkordeon-Seite wird nicht weiter ausgebaut, sondern durch diese Navigation ersetzt.

### D-04 — Benutzerliste ist eine Arbeitsliste

Spalten: Name, E-Mail, Status (aktiv/deaktiviert), globale Rolle, Member-Profil (aktiv/nicht aktiv),
Anzahl Gruppenmitgliedschaften, offene Claims, letzte Aktivität, Aktionen.

**Nicht** als Hauptspalten: Anzahl Beiträge, Anzahl Release-Arbeitsflächen, Anzahl Media-Uploads,
Summen effektiver Rechte, Summen von Overrides.

Grundregel: Keine Kennzahl prominent anzeigen, wenn der Admin erst weiterklicken muss, um ihre
fachliche Bedeutung zu verstehen.

### D-05 — Benutzerübersicht kompakt, keine Statistik-Kacheln

Zeigt: Benutzername, E-Mail, Accountstatus, globale Rolle, Member-Profil,
Gruppenmitgliedschaften kompakt, Rollen je Gruppe, offene Claims, relevante Auffälligkeiten,
letzte Aktivität, letzte wichtige administrative Änderungen.

Verboten als grosse Kacheln: „18 effektive Rechte", „13 Beiträge", „1 Gruppe", „1 Rolle" u. ä.

Je Gruppe kompakt darstellbar, z. B.:

```text
New-Subs — Rolle: Co-Leitung
✓ Gruppe bearbeiten  ✓ Mitglieder verwalten  ✕ Review freigeben
Keine persönlichen Rechteabweichungen · Keine offenen Claims
```

### D-06 — Gruppenansicht

Tabs: `Benutzer | Rollen | Claims | Änderungen`, Standardtab `Benutzer`.

Je Benutzer sichtbar: Benutzer, Rolle(n), Status, relevante Rechteabweichungen, letzte Aktivität,
direkte Navigation in den Benutzer-in-Gruppe-Kontext. Keine reine Rechteanzahl als Hauptinformation.

### D-07 — Rollenansicht beantwortet zuerst „Wer besitzt diese Rolle?"

Standardansicht: `Benutzer | Gruppe | Status | Rechte-Abweichungen | letzte Aktivität`.

Benutzer und Gruppe direkt anklickbar. Der Eintrag `Benutzer + Gruppe` führt in den kanonischen
Benutzer-in-Gruppe-Editor. Die Standard-Capabilities der Rolle sind erreichbar, aber nicht die
erste Information.

### D-08 — Capabilities-Hauptansicht als Split-View

Desktop: links kompakte Rollenliste (gegliedert nach globalen Rollen und Gruppenrollen), rechts die
Capability-Matrix der ausgewählten Rolle. Die heutigen grossen Rollen-Cards werden **ersetzt**, nicht
beibehalten.

Frage dieser Oberfläche: „Was darf diese Rolle standardmässig?"

### D-09 — Genau ein Benutzer-in-Gruppe-Editor

Alle Einstiege führen zum **selben** Editor:

```text
Benutzer → Max → Rollen & Rechte → New-Subs
Gruppen → New-Subs → Benutzer → Max
Rollen → Co-Leitung → Benutzer → Max / New-Subs
```

Es dürfen keine getrennten Bearbeitungsoberflächen mit eigener Logik unter Benutzer, Gruppe und
Rolle entstehen. (Deckt UADM-01.)

### D-10 — Genau ein Rollen-Capability-Editor

Die Capability-Detailansicht ist **Analyseperspektive**, kein zweiter Editor.

Capability-Detail (`release.edit` o. ä.) zeigt: welche Rollen gewähren sie, welche Benutzer besitzen
sie effektiv, in welchem Gruppen-/Kontext, welche persönlichen Allows/Denies existieren, welche
Änderungshistorie es gibt — und **verlinkt** zur Bearbeitung in den kanonischen Rollen-Capability-Editor.

Grundregel: Analyse aus mehreren Perspektiven, Bearbeitung an genau einem kanonischen Ort.

### D-34 — Keine redundante Rechtepflege

Klare Trennung:

- **Rollen-/Capability-Verwaltung** definiert: „Was darf diese Rolle standardmässig?"
- **Benutzer-Rechteverwaltung** definiert ausschliesslich: „Welche individuelle Abweichung gilt für
  diesen Benutzer in dieser Gruppe?"

Dieselbe Capability darf nicht an mehreren Stellen unabhängig als Standardrecht gepflegt werden.

---

## Effective Rights & persönliche Abweichungen

### D-11 — Benutzer-Rechte zuerst nach Gruppe strukturiert

```text
coleader
└── Rollen & Rechte
    └── New-Subs
        ├── Rollen
        ├── persönliche Abweichungen
        └── effektive Rechte
```

Nicht zuerst nach Capability-Kategorie über alle Gruppen hinweg — ein Benutzer kann in verschiedenen
Gruppen völlig unterschiedliche Rollen und effektive Rechte besitzen.

Mehrere Rollen in derselben Gruppe (z. B. `Co-Leitung` + `Encoder`) werden **gemeinsam** im selben
Gruppenkontext dargestellt. Es gibt keine getrennte Effective-Rights-Welt pro Rolle; die effektive
Ansicht zeigt den zusammengeführten Zustand (Quelle z. B. `Co-Leitung + Encoder`).

### D-12 — Vollständiger relevanter Capability-Katalog

Im Benutzer-in-Gruppe-Editor werden nicht nur aktuell erlaubte Rechte angezeigt, sondern der
vollständige für diesen Kontext relevante Katalog mit Zustand:

- erlaubt
- nicht erlaubt
- persönlich entzogen
- persönlich zusätzlich erlaubt
- non-deniable (falls im Modell vorhanden)

Nur so kann ein Admin ein derzeit fehlendes Recht gezielt zusätzlich erlauben.

Capabilities werden nach den **realen** fachlichen Kategorien der Registry gruppiert (Beispiele nur
als Struktur: Gruppe, Projekt, Release, Review, Medien, Claims, Beiträge). Sektionen sind einklappbar,
wichtige Bereiche standardmässig offen; für grosse Kataloge zusätzlich Suche/Filter.

### D-13 — Kompakte Standarddarstellung, progressive Details

Standard pro Capability:

| Capability | Effektiv | Quelle |
|---|---|---|
| Gruppe bearbeiten | Erlaubt | Co-Leitung |
| Mitglieder verwalten | Verweigert | persönliche Abweichung |
| Release bearbeiten | Erlaubt | Co-Leitung + Encoder |

Standardmässig **keine** technische Matrix aus Allow/Deny/Reason-Code/Resolver-Feldern.

Beim Öffnen einer Capability werden die vollständigen Provenienzdetails gezeigt, soweit im
Phase-137-Modell vorhanden: alle Rollenquellen, persönlicher Allow, persönlicher Deny, spezialisierte
Grants, entscheidende Quelle, Reason/Provenienz, non-deniable, Override-Historie, aktueller
effektiver Zustand.

### D-14 — Keine parallele Permission-Logik im Frontend

Das Frontend darf keine vereinfachte Rechtehierarchie erfinden, die dem Resolver widerspricht.
Die tatsächliche Semantik des Phase-137-Modells ist verbindlich. **Die UI erklärt die Daten des
Resolvers, sie ersetzt ihn nicht.**

### D-15 — Fachliche Aktionen statt technischer Schalter

Keine Hauptschalter `Allow | Deny | kein Override`. Stattdessen:

```text
Recht entziehen
Recht zusätzlich erlauben
Abweichung entfernen
```

Das System übersetzt die Absicht intern in den passenden scoped User-Override. Technische
Allow-/Deny-Begriffe dürfen in Detailansichten sichtbar sein, sind aber nicht das Bedienmodell.

### D-16 — Geführter Entzug (CAP-08)

Bei `Recht entziehen` muss **zuerst** erklärt werden, woher das Recht aktuell kommt:

```text
Dieses Recht wird aktuell gewährt durch:
- Co-Leitung
- Webmaster

Das Entfernen nur einer dieser Rollen würde das Recht nicht vollständig entziehen.

Empfohlen:
Persönliche Abweichung für diesen Benutzer in New-Subs setzen.
```

Erst danach bestätigen. Der resultierende Zustand muss **vor** dem Speichern verständlich angezeigt
werden. Ein Admin darf nicht glauben, das Entfernen einer Rolle entziehe das Recht, wenn eine zweite
Quelle existiert.

Bestehende Abweichungen werden fachlich als `persönlich entzogen` / `persönlich zusätzlich erlaubt`
dargestellt; primäre Aktion darauf ist `Abweichung entfernen`, danach fällt der Benutzer auf den
normalen Resolver-Zustand zurück.

### D-17 — Non-deniable klar gekennzeichnet

Wenn ein Recht nicht persönlich entziehbar ist:

- `Recht entziehen` wird nicht angeboten oder eindeutig deaktiviert
- die UI erklärt, warum
- die Quelle bleibt sichtbar
- keine Überraschung erst beim Speichern

### D-13b — Historie direkt am Recht

Die Capability-Detailansicht im Benutzerkontext zeigt eine kompakte Historie (Rolle zugewiesen,
Capability dadurch erhalten, persönlicher Deny gesetzt/entfernt, relevante Rollen-Capability-Änderung,
Zeitpunkt, ausführender Admin). Der zentrale Bereich `Änderungen` bleibt zusätzlich bestehen.

---

## Impact Preview & Aktivierungsstatus

### D-18 — Kein sofortiges Speichern eines Switches

Der heutige Ablauf `Switch → sofort PUT/DELETE → fertig` ist nicht ausreichend. Neuer Ablauf:

```text
Switch ändern
→ Impact Preview
→ Auswirkungen prüfen
→ bestätigen
→ persistieren
→ Aktivierungsstatus verfolgen
```

### D-19 — Impact Preview als Dialog über der Matrix (CAP-09)

Die Impact Preview erscheint als **Modal/Dialog** über der Matrix; der Admin bleibt im Kontext der
ausgewählten Rolle.

Kompakter Kopf zeigt:

- Anzahl Rolleninhaber
- Anzahl Benutzer, die das Recht effektiv **verlieren**
- Anzahl Benutzer, die es **gewinnen**
- Anzahl Benutzer, die es **durch andere Rollen behalten**
- Anzahl Benutzer, die es **durch persönliche Abweichungen behalten**

Darunter eine aufklappbare Detailtabelle:

| Benutzer | Gruppe | vorher | nachher | Grund |
|---|---|---|---|---|
| Sorata | Anime no Sekai | erlaubt | erlaubt | Webmaster gewährt ebenfalls |
| Mika | Anime no Sekai | erlaubt | nicht erlaubt | keine weitere Quelle |
| Kenji | Moonlight Subs | erlaubt | erlaubt | persönliche zusätzliche Erlaubnis |

Die Vorschau muss den **effektiven** Zustand zeigen, nicht nur Rollenmitgliedschaften zählen.

### D-20 — Impact-Berechnung auf dem bestehenden Resolver

Die Impact-Berechnung beruht auf dem bestehenden Permission-/Effective-Rights-Modell aus Phase 137.
**Keine zweite vereinfachte Berechnungslogik nur für die UI.**

Fehlt dafür eine Backend-Projektion/Preview-API, darf Phase 138 eine **gezielte Vertragserweiterung**
planen (OpenAPI + DTO + Frontend-Typ + zentraler API-Helper, konsistent zur 136/137-Vertragskette).
Das ist ausdrücklich **keine neue Permission-Engine**.

### D-21 — Persistiert ist nicht automatisch aktiv (CAP-10)

Nach Bestätigung bleibt der Dialog offen und verfolgt:

```text
gespeichert → wird aktiviert → aktiv
```

Fehlerzustand: `fehlgeschlagen`.

Die UI muss fachlich unterscheiden können zwischen: persistiert/gespeichert, Aktivierung bzw.
Cache-Reload läuft, aktiv, fehlgeschlagen.

**Keine Erfolgsmeldung nur deshalb, weil die Datenbankmutation HTTP 200 geliefert hat.** Endgültiger
Erfolg erst, wenn die Änderung im aktiven Permission-Zustand angekommen ist. Die genauen technischen
Statuswerte sind aus dem **realen Backendvertrag** abzuleiten (Research-Auftrag R-05).

### D-22 — Impact Preview auch bei Rollenzuweisung/-entzug

Auch `Rolle zuweisen` / `Rolle entfernen` für einen konkreten Benutzer bekommt eine Auswirkungs-Vorschau:
welche effektiven Rechte gewonnen/verloren werden, welche über andere Rollen erhalten bleiben, welche
persönlichen Abweichungen weiterwirken, welcher Zustand danach effektiv gilt.

Keine weitreichende Rollenänderung im Blindflug — dasselbe Sicherheitsprinzip für globale und
individuelle Rechteänderungen.

---

## Claims

### D-23 — Claims sind Teil der Hauptnavigation und der Kontexte

- **Zentral** (`Claims`): Arbeitsqueue mit Status, Benutzer, Gruppe, Claim-Typ, beantragter Rolle bzw.
  Zielobjekt, Datum, direkter Aktion, Navigation zu Benutzer und zu Gruppe.
- **Im Benutzer** (`Claims`-Tab): Claim-Historie dieser Person. Offene Claims dürfen bereits in der
  Benutzerübersicht und Benutzerliste als Handlungsbedarf erscheinen.
- **In der Gruppe** (`Claims`-Tab): Claims im Kontext genau dieser Gruppe.

Filter mindestens nach real vorhandenen Feldern: offen, genehmigt, abgelehnt, Claim-Typ, Gruppe,
Benutzer, Zeitraum. **Reale Status aus dem Code verwenden** — keine erfundenen Status.

### D-24 — Claim-Entscheidungen mit Auswirkungs-Vorschau

Erzeugt das Genehmigen eines Claims eine Gruppenmitgliedschaft, Rolle oder sonstige
berechtigungsrelevante Zuordnung, muss vor der Bestätigung sichtbar sein: welche Zuordnung entsteht,
welche Rolle entsteht, welche effektiven Rechte sich verändern, welcher Benutzerzustand danach gilt.

Keine Rechtewirkung verstecken. Bei Ablehnung entsprechend zeigen, dass die Zuordnung nicht entsteht.

---

## Änderungen (Audit)

### D-25 — „Änderungen" ist der Navigationsbegriff, nicht „Audit"

Technisch bleibt das Audit-Log die Datenquelle; die Admin-Oberfläche übersetzt Ereignisse fachlich.

Ein Eintrag zeigt verständlich: `wer → was → in welchem Kontext → vorher → nachher`.

```text
Admin X hat Benutzer Y in New-Subs die Rolle Co-Leitung entzogen.
Vorher:  Co-Leitung — Release bearbeiten erlaubt
Nachher: keine Co-Leitung — Release bearbeiten nicht mehr erlaubt
```

```text
Admin X hat Benutzer Y „Release bearbeiten" in New-Subs persönlich entzogen.
Vorher:  ERLAUBT durch Co-Leitung
Nachher: NICHT ERLAUBT durch persönliche Abweichung
```

Vorher/Nachher-Zustand ist zu zeigen, **soweit technisch aus den vorhandenen Auditdaten ableitbar**
(Research-Auftrag R-07). Wo er nicht belastbar rekonstruierbar ist, wird das ehrlich weggelassen,
nicht geraten.

Filter im zentralen Bereich: Benutzer, Gruppe, Rolle, Capability, Claim, Zeitraum, Akteur.

### D-26 — Aktivität und Änderungen nicht vermischen

- **Aktivität** = was ein Benutzer fachlich getan hat (Release bearbeitet, Beitrag erstellt, Projekt
  bearbeitet, Claim gestellt).
- **Änderungen** = was administrativ an Identität, Rollen, Rechten oder Claims verändert wurde
  (Rolle zugewiesen/entfernt, persönliches Recht entzogen, Capability einer Rolle geändert, Claim
  genehmigt, Account deaktiviert).

Die UI darf diese Konzepte nicht unklar vermischen.

### D-27 — Historie auch kontextbezogen

Kontextbezogene Historie für: Benutzer, Gruppe, Rolle, Capability, einzelnes Recht. Der zentrale
Änderungen-Bereich bleibt zusätzlich die Gesamtansicht.

---

## Querschnitt

### D-28 — Bereichsspezifische Filter statt globaler Suche

Jeder Hauptbereich bekommt eigene fachlich passende Filter:

| Bereich | Filter |
|---|---|
| Benutzer | Status, Gruppe, Rolle, offene Claims, globale Rolle |
| Rollen | Rollenart, Scope |
| Capabilities | Bereich, Scope, Status (soweit real vorhanden) |
| Claims | Status, Typ, Gruppe, Benutzer, Zeitraum |
| Änderungen | Zeitraum, Benutzer, Gruppe, Rolle, Capability, Claim, Akteur |

Eine globale Suche kann später zusätzlich existieren, ist aber nicht die primäre Bedienlogik.

Beiträge und Claims erscheinen nicht als nackte Kennzahlen („13 Beiträge", „4 Claims") ohne Kontext.
Offene Claims dürfen prominent sein, weil daraus Arbeit entsteht; Beiträge werden in der Übersicht
nur als verständlicher Kontext angeteasert.

### D-29 — Beiträge: nur der Darstellungsfehler, kein Redesign

`Beiträge` bleibt als Benutzerbereich sichtbar. Das vollständige skalierbare Beitrags-Redesign
(serverseitige Gruppierung, Range-Kollaps, Filter/Count/Pagination-Kohärenz) gehört zu **Phase 139**
und wird hier **nicht** vorgezogen.

In Phase 138 wird ausschliesslich der bekannte Darstellungsfehler behoben: eine interne
`release_version_id` darf nicht als fachliche Versionsnummer dargestellt werden.

Falsch:

```text
Episode 1 → Version 1
Episode 2 → Version 2
...
Episode 13 → Version 13
```

Richtig:

```text
Buddy Complex · Episode 1 · Version 1
Buddy Complex · Episode 2 · Version 1
...
Buddy Complex · Episode 13 · Version 1
```

Research muss klären, ob die korrekte fachliche Versionsnummer bereits im vorhandenen Contract
geliefert wird oder ob eine minimale Feld-Ergänzung nötig ist (R-08). Falls die Behebung zwingend
eine Projektionsänderung erfordert, die in Phase 139 gehört, ist der Konflikt zu melden statt
still 139 vorzuziehen.

### D-30 — Streaming nur als IA-Platzhalter

`Streaming` erscheint in der Benutzer-Navigation. Phase 138 implementiert **keine** Streaming-Funktion:
keine Fake-Daten, keine Fake-Funktionen. Ziel ist nur, dass späterer Streaming-Ausbau ohne erneuten
grundlegenden Umbau der Benutzeransicht möglich ist. Der bestehende
`UserStreamingGrantsTab` darf dabei nicht funktional beschädigt werden.

### D-31 — Benutzer löschen

Reguläre Admin-Aktionen sind `deaktivieren` und `reaktivieren`. Löschen nur, wenn der bestehende Code
bereits eine fachlich sichere Löschregel besitzt und keine Claims, Beiträge, Audit-/Änderungshistorie
oder Referenzen unverständlich beschädigt werden. Phase 138 erzwingt **keine** neue Lösch-Architektur.

### D-32 — Responsive

- Desktop darf Split-Views verwenden.
- Tablet/Mobile nutzt gestapelte Navigation: erst Liste, dann Detailansicht bzw. Drawer.
- Grosse Desktop-Tabellen werden als kompakte Cards oder Zeilen umgesetzt.
- Keine horizontale Desktop-Matrix auf kleinen Screens erzwingen, keine zusammengedrückte Matrix.

### D-33 — Terminologie

Die Admin-Oberfläche verwendet verständliche deutsche Fachbegriffe.

Aktionen: `Recht entziehen`, `Recht zusätzlich erlauben`, `Abweichung entfernen`, `Rolle zuweisen`,
`Rolle entfernen`, `Benutzer deaktivieren`, `Benutzer reaktivieren`.

Technische Begriffe (`Allow`, `Deny`, `Audit`, interne Reason-Codes) gehören nur in erweiterte
technische Details.

### D-35 — Projektweite Umsetzungs-Constraints (nicht verhandelbar)

- **Globale UI-Primitives sind Pflicht.** Jede user-facing UI nutzt `@/components/ui`
  (`Button`, `Select`, `FormField`, `Modal`, `Input`, `Textarea`, `Tabs`, `Drawer`, `Card`, `Table` …).
  Handgebaute native `<select>/<input>/<textarea>/<button>` sind verboten. Referenz: `/dev/ui-system`.
  Lokale Datei-Konsistenz rechtfertigt **kein** Abweichen vom globalen Design-System.
- **Design-Tokens:** ausschliesslich die globalen Tokens verwenden (`--surface-canvas/-card/-sunken`,
  `--text-primary/-muted`, `--color-border`, `--accent-primary/-deep`, `--shadow-*`). Keine eigenen
  CSS-Variablennamen erfinden.
- **Umlaute:** deutscher UI-Text nutzt immer korrekte Umlaute (ä/ö/ü/Ä/Ö/Ü/ß), keine ASCII-Ersatz-
  schreibweisen in user-facing Strings.
- **Modularität:** Produktionsdateien bleiben bei ≤ 450 Zeilen; grössere Implementierungen werden
  vorher geschnitten.
- **Contract-Kette:** Jede Vertragserweiterung geht durch OpenAPI (`shared/contracts/`) → Backend-DTO →
  Frontend-Typ (`frontend/src/types/`) → zentraler API-Helper (`frontend/src/lib/api.ts`).

---

# 3. UI-Grundsätze

## Vermeiden

- riesige Rollen-Cards
- reine Statistik-Kacheln ohne administrativen Nutzen
- technische IDs als fachliche Werte
- unkommentierte Switch-Listen
- sofortige globale Rechteänderungen ohne Impact-Vorschau
- doppelte Rechtepflege
- kilometerlange Akkordeon-Seiten
- Sackgassen zwischen Benutzer, Rolle, Gruppe und Capability
- technische Audit-Logs ohne fachliche Übersetzung

## Bevorzugen

- kompakte Listen und verständliche Tabellen
- kontextbezogene Detailansichten, progressive Details
- erklärbare Effective Rights mit sichtbaren Rechtequellen
- klare Override-Darstellung
- bidirektionale Navigation
- handlungsorientierte Warnungen
- verständliche Änderungshistorie
- Impact Preview vor globalen Änderungen

---

# 4. Bekannte bestehende Oberflächen (Ausgangslage)

Diese Dateien sind der Ausgangspunkt; die Liste ist ein Rechercheeinstieg, keine abschliessende
Bestandsaufnahme:

**Frontend**

- `frontend/src/app/admin/users/page.tsx`, `AdminUsersClient.tsx`, `useUserListFilters.ts`,
  `resolveRoleLink.ts`
- `frontend/src/app/admin/users/[id]/page.tsx`, `UserDetailPageClient.tsx`
- `frontend/src/app/admin/users/tabs/` — `UserOverviewTab`, `UserGroupRightsTab`,
  `UserGroupMembershipsTab`, `UserGlobalRolesTab`, `UserContributionsTab`, `UserMediaTab`,
  `UserClaimsTab`, `UserStreamingGrantsTab`, `UserAuditTab`
- `frontend/src/app/admin/role-capabilities/` (heutige grosse Rollen-Cards → D-08)
- `frontend/src/lib/api.ts`, `frontend/src/types/`

**Backend**

- `backend/internal/handlers/admin_effective_rights_handler.go` (Phase 137-07: Inspection/Mutation/History)
- `backend/internal/handlers/admin_capability_handler.go`, `capability_policy_contract.go`
- `backend/internal/handlers/admin_users_handler.go`, `admin_users_mutations_handler.go`
- `backend/internal/handlers/admin_group_roles_handler.go`, `role_catalog_handler.go`
- `backend/internal/handlers/member_claims_handler.go`, `member_claim_invitations_handler.go`
- `backend/internal/repository/authz_user_overrides_repository.go`, Audit-Log-Repository
- Routing/Wiring in `backend/cmd/server/main.go`

**Planungsartefakte**

- `.planning/phases/136-*/136-CONTEXT.md` (Policy, Katalog, Scope-Matrix)
- `.planning/phases/137-*/137-CONTEXT.md` (Resolver, Provenienz, Overrides — D01…D10, inkl.
  D01-Ausnahme „Contribution Roles override-blind")
- `.planning/phases/137-*/137-UAT.md`, `137-VERIFICATION.md`
- `.planning/notes/live-uat-ux-findings.md` (u. a. PlatformAdminGate-Remount = Datenverlust)

---

# 5. Research-Auftrag

Research muss den **realen Code** auswerten und darf Produktentscheidungen D-01…D-35 nicht still ändern.

- **R-01** Welche Effective-Rights-, Provenienz- und Override-Endpunkte hat Phase 137 tatsächlich
  geliefert (Pfade, Request/Response-Shapes, Provenienzfelder, entscheidende Quelle, non-deniable-Flag)?
  Welche der in D-12/D-13 geforderten Zustände sind bereits abbildbar, welche fehlen?
- **R-02** Wie sieht die reale Capability-Registry aus: Bezeichner, Kategorien, Reihenfolge, Labels,
  Hilfetexte, Scopes? Welche Kategorien existieren wirklich (statt der Beispielliste)?
- **R-03** Welche Rollen existieren real (global vs. Gruppenrollen), wie sind sie katalogisiert und
  welcher Endpunkt liefert Rolleninhaber inkl. Gruppenkontext (für D-07)?
- **R-04** Existiert bereits eine Impact-/Preview-Projektion, oder ist eine gezielte neue
  Preview-API nötig? Wie lässt sich sie **auf dem bestehenden Resolver** implementieren (Batch-Auflösung
  über alle Rolleninhaber), ohne N+1 und ohne zweite Engine? Welche Grenzen (max. Rolleninhaber,
  Timeout, Paginierung der Detailtabelle) sind nötig?
- **R-05** Welche belastbaren Aktivierungs-/Cache-Zustände gibt es im Backend wirklich
  (Permission-Cache, Invalidierung, Request-local Reuse aus 137-D09)? Welcher Vertrag kann
  `gespeichert / wird aktiviert / aktiv / fehlgeschlagen` **ehrlich** bedienen — und welche minimale
  Erweiterung ist dafür erforderlich? Kein Statuswert, der nur simuliert ist.
- **R-06** Welche Claim-Typen und -Status existieren real, welche Endpunkte gibt es für Liste,
  Filter, Genehmigung, Ablehnung? Was passiert beim Genehmigen berechtigungsseitig (für D-24)?
- **R-07** Welche Audit-Events werden real geschrieben (Aktionstypen, Payload, Vorher/Nachher-Daten),
  wie lassen sie sich fachlich übersetzen, und wie sind sie nach Benutzer/Gruppe/Rolle/Capability/Claim
  filterbar? Wo ist Vorher/Nachher **nicht** rekonstruierbar?
- **R-08** Woher kommt die fachliche Release-Versionsnummer heute, und liefert der bestehende
  Beitrags-Contract sie bereits (D-29)? Minimalinvasiver Fix ohne Phase-139-Vorgriff?
- **R-09** Welche bestehenden Admin-Routen/Komponenten können unter der neuen IA (D-01/D-03/D-06)
  wiederverwendet werden, welche werden ersetzt (grosse Rollen-Cards, read-only Gruppenrechte-
  Zusammenfassung), und wo entstehen doppelte Bearbeitungswege, die nach D-09/D-10/D-34 zusammengeführt
  werden müssen?
- **R-10** Welche `@/components/ui`-Primitives existieren bereits für Split-View, Matrix/Table,
  Modal, Drawer, Tabs, Filterleisten — und wo fehlt ein Primitive, sodass es dem globalen System
  hinzugefügt (nicht lokal nachgebaut) werden muss?
- **R-11** Welche bestehenden Tests (Frontend-Vitest, Go-Tests, Contract-Tests) decken die betroffenen
  Oberflächen und Endpunkte ab und können erweitert werden? Welche neuen Tests braucht die
  Impact-/Aktivierungs-Logik?
- **R-12** Welche Berechtigung schützt die Admin-Oberflächen selbst (Platform-Admin-Identität,
  Management-Capability aus 136/137)? Bleiben BOLA/IDOR-Garantien aus 137-D08 unangetastet?

---

# 6. Bewusst offen (in Planung/UI-Spec zu entscheiden)

Die meisten ursprünglich offenen Punkte wurden durch die Discuss-Dateien 01–04 geschlossen. Offen
bleiben nur:

- exakte visuelle Darstellung sehr grosser Capability-Mengen (Virtualisierung vs. Sektionen vs. Filter)
- genauer Umfang und Filterung von Aktivität vs. Änderungen im Benutzerkontext
- konkrete spätere Streaming-Funktionen (bewusst nicht in dieser Phase)
- exakte Grenzwerte/Paginierung der Impact-Detailtabelle (abhängig von R-04)

---

# 7. Anweisungen an GSD / Claude

1. Dieses Dokument ist der Discuss-/Context-Input für Phase 138. `/gsd:discuss-phase 138` nicht erneut ausführen.
2. Nächster Schritt: **Research** (`gsd-phase-researcher` → `138-RESEARCH.md`) gemäss R-01…R-12.
3. Danach **UI-Spec** (`/gsd:ui-phase 138`, Roadmap-Flag `UI hint: yes`). Die UI-SPEC muss die
   Pflichtnutzung der globalen `@/components/ui`-Primitives und der globalen Design-Tokens als
   Constraint führen (UI-Checker-Gate).
4. Danach **Planung** (`/gsd:plan-phase 138`) mit Wellenstruktur; die Pläne müssen D-NN-IDs in
   `must_haves.truths` zitieren, damit das Decision-Coverage-Gate greift.
5. Research und Planung dürfen Implementierungsmechanik, Namen und Codestruktur verfeinern, aber
   **keine** Produktentscheidung D-01…D-35 still ändern. Entdeckt Research einen echten Widerspruch
   (z. B. Aktivierungsstatus nicht ehrlich abbildbar, Impact nur mit zweiter Engine berechenbar),
   ist der Konflikt **explizit zu melden** statt ein abweichendes Verhalten zu wählen.
6. Keine Implementierung während Research.
