# Phase 138 – Benutzer- & Rechteverwaltung: verbindlicher Diskussionsstand

**Status:** Discuss-Phase / Grundlage für die spätere GSD-Plan-Phase  
**Projekt:** Team4s  
**Phase:** 138  
**Schwerpunkt:** Admin-UI für Benutzer, Gruppen, Rollen, Capabilities, Effective Rights, Claims und Audit  
**Wichtig:** Dieses Dokument beschreibt den abgestimmten fachlichen und UX-seitigen Zielzustand. Es ist **noch kein Execute-Auftrag**.

---

## 1. Ziel der Phase

Phase 138 soll die heute verteilte und teilweise schwer verständliche Benutzer-, Rollen- und Rechteverwaltung zu einem gemeinsamen Admin-Modul zusammenführen.

Die Oberfläche soll nicht primär technische IDs, abstrakte Kennzahlen oder isolierte Switch-Listen zeigen, sondern Administratoren konkrete Fragen beantworten:

- Was darf ein bestimmter Benutzer?
- Warum darf er das?
- In welcher Gruppe gilt das?
- Welche Rolle oder welcher Override ist dafür verantwortlich?
- Wer besitzt eine bestimmte Rolle?
- Was darf eine Rolle standardmässig?
- Welche Benutzer sind von einer Rollen-/Capability-Änderung tatsächlich betroffen?
- Welche Claims sind offen?
- Was hat sich an Benutzer, Rollen, Rechten oder Claims geändert?
- Wer hat eine Änderung durchgeführt?
- Was war vorher und was gilt danach?

Phase 138 ist damit primär eine **Admin-UX-Phase auf Basis des bereits vorhandenen Rechte- und Effective-Rights-Modells aus Phase 137**.

---

# 2. Zentrale Admin-Navigation

Die Benutzer- und Rechteverwaltung soll als gemeinsames Modul verstanden werden.

Vorgesehene Hauptnavigation:

```text
Benutzer | Gruppen | Rollen | Capabilities | Claims | Audit / Änderungen
```

Diese Bereiche sind keine unabhängigen Systeme, sondern unterschiedliche Perspektiven auf dieselben Benutzer-, Gruppen-, Rollen- und Berechtigungsdaten.

Die Navigation muss bidirektional funktionieren.

Beispiele:

```text
Benutzer → Rolle → Capability
Rolle → Benutzer → Gruppe
Gruppe → Benutzer → Rolle → Recht
Capability → Rollen → betroffene Benutzer
Audit → Benutzer / Rolle / Capability
```

Ein Administrator soll fachlich durch das Modell navigieren können, ohne die technische Datenstruktur kennen zu müssen.

---

# 3. Benutzer

## 3.1 Benutzerliste

Die Benutzerliste ist eine **Arbeitsliste**, kein Statistik-Dashboard.

Pro Benutzer sollen vor allem administrativ relevante Informationen sichtbar sein.

### Anzeigen

| Feld | Zweck |
|---|---|
| Name | Identifikation |
| E-Mail | Identifikation / Kontakt |
| Status | aktiv / deaktiviert |
| Globale Rolle | z. B. Plattform-Admin |
| Member-Profil | aktiv / nicht aktiv |
| Gruppen | Anzahl Gruppenmitgliedschaften |
| Offene Claims | zeigt konkreten Handlungsbedarf |
| Letzte Aktivität | administrativ relevant |
| Aktionen | Bearbeiten, deaktivieren, ggf. löschen |

### Nicht als Hauptinformation anzeigen

Folgende Kennzahlen helfen in der Benutzer-Arbeitsliste nicht unmittelbar und sollen dort nicht prominent erscheinen:

- Anzahl Beiträge
- Anzahl Release-Arbeitsflächen
- Anzahl Media-Uploads
- reine Summen effektiver Rechte
- reine Summen von Overrides

Grundregel:

> Keine Kennzahl prominent anzeigen, wenn ein Administrator danach erst weiterklicken muss, um zu verstehen, was sie fachlich bedeutet.

---

# 4. Benutzer-Detailansicht

Die heutige lange Akkordeon-Seite soll nicht einfach weiter ausgebaut werden.

Vorgesehene Benutzer-Navigation:

```text
Übersicht | Rollen & Rechte | Beiträge | Claims | Streaming | Audit
```

`Streaming` wird später fachlich umgesetzt, soll aber bereits strukturell vorgesehen werden, damit die Benutzerverwaltung später nicht erneut grundlegend umgebaut werden muss.

Es sollen keine Fake-Streaming-Funktionen implementiert werden.

---

# 5. Benutzer – Übersicht

Die Übersicht soll den aktuellen fachlichen Zustand des Benutzers zeigen.

Keine grossen Statistik-Kacheln wie:

- 1 Gruppe
- 1 Rolle
- 18 effektive Rechte
- 13 Release-Beiträge

Solche Zahlen alleine sind nicht aussagekräftig genug.

## Stattdessen anzeigen

- Benutzername
- E-Mail
- Accountstatus
- Member-Profil
- globale Rolle
- Gruppenmitgliedschaften kompakt
- Rollen innerhalb der Gruppen
- letzte Aktivität
- offene Claims
- relevante Warnungen / Auffälligkeiten
- letzte wichtige administrative Änderungen

### Beispiel

```text
New-Subs
Rolle: Co-Leitung

Wichtige Rechte:
✓ Gruppe bearbeiten
✓ Mitglieder verwalten
✓ Projekte verwalten
✓ Releases bearbeiten
✕ Review freigeben

Keine persönlichen Rechteabweichungen
Keine offenen Claims
```

Wenn ein Benutzer in mehreren Gruppen ist, wird jede Gruppe kompakt und verständlich dargestellt.

---

# 6. Benutzer – Rollen & Rechte

Dieser Bereich ist der Kern der Benutzer-Rechteverwaltung.

Für jede Gruppenmitgliedschaft soll sichtbar sein:

- Gruppe
- Gruppenrolle(n)
- Rollenstandard
- zusätzliche Rechtequellen
- persönliche Allows
- persönliche Denies
- effektives Recht
- entscheidende Quelle / Begründung

Beispiel:

| Capability | Rollenstandard | User-Override | Effektiv |
|---|---:|---|---:|
| Gruppe bearbeiten | ✓ | – | ✓ |
| Mitglieder verwalten | ✓ | Verweigert | ✕ |
| Release bearbeiten | ✕ | Erlaubt | ✓ |

Wichtig:

Die UI darf das Rechteverhalten nicht durch eine falsche vereinfachte Regel ersetzen.

Die Anzeige muss sich am tatsächlichen Effective-Rights-Modell aus Phase 137 orientieren.

Für den Administrator muss nachvollziehbar sein:

```text
Welche Quellen existieren?
Welche Quelle entscheidet?
Was gilt effektiv?
```

---

# 7. Rechte erklären – „Warum darf dieser Benutzer das?“

Ein einzelnes Recht muss aufklappbar oder in einem Inspector erklärbar sein.

Beispiel:

```text
Gruppenseite bearbeiten
Effektiv: ERLAUBT

Warum?

Co-Leitung → gewährt dieses Recht
Webmaster → gewährt dieses Recht
Persönlicher Allow → keiner
Persönlicher Deny → keiner

Entscheidende Quelle:
Gruppenrolle
```

Wenn mehrere Rollen dasselbe Recht gewähren, muss dies sichtbar sein.

Ein Administrator darf nicht glauben, dass das Entfernen nur einer Rolle automatisch das Recht entfernt, wenn noch eine zweite Quelle existiert.

---

# 8. Benutzer-Overrides

Direkte User-Overrides sollen nicht als technisch unkommentierte Switches präsentiert werden.

Stattdessen verständliche Aktionen:

```text
Recht für diesen Benutzer entziehen
Recht für diesen Benutzer zusätzlich erlauben
```

Beim Entzug muss die Oberfläche erklären, woher das Recht aktuell kommt.

Beispiel:

```text
Dieses Recht wird aktuell durch folgende Rollen gewährt:

- Co-Leitung
- Webmaster

Das Entfernen nur einer Rolle würde das Recht nicht vollständig entziehen.

Empfohlen:
Persönlicher Deny für diesen Benutzer in dieser Gruppe.
```

Vor dem Speichern soll der resultierende Zustand sichtbar sein.

---

# 9. Gruppen

Die Gruppenansicht ist eine zweite zentrale Perspektive.

Wenn ein Administrator eine Gruppe öffnet, soll er direkt sehen:

- alle Benutzer dieser Gruppe
- deren Rollen
- wesentliche effektive Rechte
- persönliche Abweichungen
- Status
- relevante Aktivität
- offene Claims im Gruppenkontext

Beispiel:

```text
New-Subs

Benutzer          Rollen                   Auffälligkeit
coleader          Co-Leitung               keine
D1sk              Fansub-Leitung, Encoder  1 persönlicher Override
translator        Übersetzer               1 offener Claim
```

Ein Benutzer ist direkt anklickbar und führt in dessen Benutzeransicht.

Eine Rolle ist ebenfalls direkt anklickbar.

---

# 10. Rollen

Der Rollenbereich beantwortet primär:

> Wer besitzt diese Rolle?

Beispiel:

```text
Rollen → Co-Leitung
```

Anzeigen:

| Benutzer | Gruppe | Status | Rechte-Abweichungen | Letzte Aktivität |
|---|---|---|---|---|
| Max | Anime no Fansub | aktiv | keine | heute |
| Lisa | Subgruppe X | aktiv | 2 | gestern |
| Peter | Gruppe Y | deaktiviert | 1 | 12.08. |

Der Benutzer ist direkt anklickbar.

Die Gruppe ist direkt anklickbar.

Zusätzlich soll die Rolle einen direkten Weg zu ihrer Capability-Definition besitzen.

Die Rollenansicht und die Capability-Matrix sind aber fachlich unterschiedliche Perspektiven.

---

# 11. Capabilities

Der Capability-Bereich beantwortet:

> Was darf eine Rolle standardmässig?

Die heutige Darstellung mit sehr grossen Rollen-Cards soll ersetzt werden.

Die Rollen sollen kompakt auswählbar sein, beispielsweise in einer Liste oder Seitennavigation.

Nach Auswahl einer Rolle, z. B. `Co-Leitung`, erscheint deren Capability-Matrix.

Beispiel:

```text
Co-Leitung

Gruppenrechte
✓ Gruppe bearbeiten
✓ Mitglieder verwalten
✓ Rollen vergeben
✕ Medien verwalten

Release-Rechte
✓ Release erstellen
✓ Release bearbeiten
✕ Release löschen
✓ Review durchführen
```

Hier wird der **globale Rollenstandard** gepflegt.

Beim einzelnen Benutzer werden dagegen nur Abweichungen dieses Standards administriert.

Dadurch darf dieselbe Berechtigungsdefinition nicht an mehreren Stellen unabhängig voneinander gepflegt werden.

---

# 12. Änderung einer Rollen-Capability

Die heutige Logik:

```text
Switch ändern → sofort speichern
```

ist für Phase 138 nicht ausreichend.

Vor einer Änderung muss eine Impact-Analyse erscheinen.

Beispiel:

```text
„Gruppenseite bearbeiten“ aus Co-Leitung entfernen?

27 Benutzer besitzen diese Rolle.

19 verlieren das Recht tatsächlich.
6 behalten es über eine andere Rolle.
2 behalten es über einen persönlichen Allow.
```

Danach müssen die betroffenen Benutzer einsehbar sein.

Beispiel:

| Benutzer | Gruppe | Vorher | Nachher | Grund |
|---|---|---|---|---|
| Sorata | Anime no Sekai | erlaubt | erlaubt | Webmaster gewährt ebenfalls |
| Mika | Anime no Sekai | erlaubt | nicht erlaubt | keine weitere Quelle |
| Kenji | Moonlight Subs | erlaubt | erlaubt | persönlicher Allow |

Erst danach darf die Änderung bestätigt werden.

---

# 13. Persistiert vs. aktiv

Für Capability-/Rollenänderungen muss sichtbar sein, ob eine Änderung:

```text
gespeichert
in Aktivierung
aktiv
fehlgeschlagen
```

ist.

Die UI darf nicht nur melden:

```text
„Capability erfolgreich entzogen“
```

wenn zwar die Datenbank geändert wurde, der aktive Permission-Zustand aber noch nicht sicher aktualisiert ist.

Dies ist ein wichtiger Bestandteil der Phase-138-UX.

Für diesen Bereich kann eine kleine Backend-Vertragserweiterung erforderlich sein.

Das bedeutet **keine neue Permission-Engine**, sondern eine belastbare Rückmeldung über den tatsächlichen Aktivierungszustand.

---

# 14. Beiträge

Beiträge gehören in die Benutzerakte, aber nicht als einfache Gesamtzahl.

Der Bereich soll konkret zeigen:

- Beitrag
- Beitragstyp
- Anime / Projekt
- Episode / Release
- Release-Version
- Gruppe
- Datum
- Status
- Aktion / Link zum Inhalt

## Bekannter aktueller UI-Fehler

Im aktuellen Frontend wird teilweise:

```text
Version {release_version_id}
```

angezeigt.

Damit wird eine interne Datenbank-ID fälschlicherweise als fachliche Versionsnummer dargestellt.

Beispiel Buddy Complex:

Falsch:

```text
Episode 1 → Version 1
Episode 2 → Version 2
...
Episode 13 → Version 13
```

wenn tatsächlich alle Releases Version 1 sind.

Richtig wäre beispielsweise:

```text
Buddy Complex · Episode 1 · Version 1
Buddy Complex · Episode 2 · Version 1
...
Buddy Complex · Episode 13 · Version 1
```

Technische IDs dürfen nicht als fachliche Versionsnummern präsentiert werden.

---

# 15. Beiträge gruppieren

Bei vielen Beiträgen soll die Darstellung sinnvoll gruppiert werden.

Beispiel:

```text
Buddy Complex · New-Subs
13 release-spezifische Beiträge

Episode 1 · Version 1
Typesetting · Karaoke-FX · Encoding

Episode 2 · Version 1
Typesetting · Karaoke-FX · Encoding
...
```

Die UI soll auch bei Projekten mit sehr vielen Episoden bzw. Beiträgen benutzbar bleiben.

---

# 16. Claims

Claims sind ein zentraler operativer Admin-Bereich und gehören sowohl:

- in die zentrale Navigation
- als auch in die Benutzerakte

Bei einem Benutzer sollen Claims fachlich verständlich dargestellt werden.

Beispiel:

```text
Claim: Mitgliedschaft
Gruppe: Anime no Fansub
Beantragt als: Timer
Status: offen
Eingereicht: 22.08.2026
```

Je nach Claim-Typ werden die passenden Zielobjekte angezeigt.

Offene Claims sollen dort sichtbar sein, wo sie für einen Administrator Arbeit erzeugen:

- Benutzerliste
- Benutzerübersicht
- Claims-Bereich
- ggf. Gruppenansicht

---

# 17. Streaming

Streaming wird später ein eigener Benutzerbereich.

Vorgesehene Benutzer-Navigation enthält deshalb bereits:

```text
Streaming
```

Phase 138 soll dafür aber keine fachlichen Funktionen erfinden.

Ziel ist nur, die Informationsarchitektur so zu wählen, dass Streaming später ohne grundlegenden Umbau der gesamten Benutzerakte ergänzt werden kann.

---

# 18. Audit

Audit ist kein technischer Restbereich, sondern die nachvollziehbare Historie des Benutzers und der Rechteverwaltung.

Beim Benutzer sollen beispielsweise nachvollziehbar sein:

- Rolle erhalten
- Rolle verloren
- Capability geändert
- Gruppenmitgliedschaft geändert
- Claim gestellt
- Claim genehmigt
- Claim abgelehnt
- Account deaktiviert
- Account aktiviert
- Member-Profil geändert
- persönlicher Allow gesetzt
- persönlicher Deny gesetzt
- Override entfernt
- später relevante Streaming-Aktionen

Vorgesehene Darstellung:

```text
Zeitpunkt | Aktion | Objekt | vorher → nachher | ausgeführt von
```

Beispiel:

```text
23.08.2026 14:32

Admin hat coleader das Recht
„Gruppenseite bearbeiten“
in New-Subs persönlich entzogen.

Vorher:
ERLAUBT durch Co-Leitung

Nachher:
NICHT ERLAUBT durch persönlichen Deny

Ausgeführt von:
admin@example.org
```

Technische Audit-Bezeichnungen sollen, wo möglich, in verständliche fachliche Ereignisse übersetzt werden.

---

# 19. Audit und Aktivität unterscheiden

Es muss zwischen zwei Dingen unterschieden werden:

## Aktivität

Was hat ein Benutzer fachlich getan?

Beispiele:

- Release bearbeitet
- Beitrag erstellt
- Claim eingereicht
- Projekt bearbeitet

## Änderungshistorie

Was wurde administrativ an Rollen, Rechten oder Benutzerzuständen verändert?

Beispiele:

- Rolle vergeben
- Rolle entfernt
- Capability aus Rolle entfernt
- User-Deny gesetzt
- Claim genehmigt

Diese beiden Konzepte dürfen UI-seitig nicht unklar vermischt werden.

---

# 20. Capability-Perspektive

Das System soll auch aus Sicht einer einzelnen Capability untersuchbar sein.

Beispiel:

```text
release.edit
```

Darunter:

- welche Rollen gewähren diese Capability?
- welche Benutzer besitzen sie effektiv?
- in welchem Kontext gilt sie?
- welche Benutzer besitzen persönliche Allows?
- welche Benutzer besitzen persönliche Denies?
- welche Änderungshistorie existiert?

Damit kann ein Administrator auch fragen:

> Wer besitzt `release.edit` und warum?

---

# 21. Bidirektionale Navigation als Kernprinzip

Die UI soll nicht aus Sackgassen bestehen.

Beispiele:

```text
Benutzer
→ New-Subs
→ Co-Leitung
→ Gruppenseite bearbeiten
```

Von dort muss `Co-Leitung` anklickbar sein und direkt in die Rollenansicht führen.

Umgekehrt:

```text
Rollen
→ Co-Leitung
→ Benutzer
→ coleader
→ New-Subs
```

Von einer Capability:

```text
Capabilities
→ release.edit
→ Co-Leitung
→ betroffene Benutzer
```

Das Rechte- und Identitätsmodell soll fachlich navigierbar sein.

---

# 22. Keine redundante Rechtepflege

Es muss eine klare Trennung geben:

## Rollen-/Capability-Verwaltung

Definiert:

> Was darf diese Rolle standardmässig?

## Benutzer-Rechteverwaltung

Definiert nur:

> Welche individuelle Abweichung gilt für diesen Benutzer?

Es darf nicht passieren, dass dieselbe Capability an mehreren Stellen unabhängig als Standardrecht gepflegt wird.

---

# 23. UI-Grundsätze

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

- kompakte Listen
- verständliche Tabellen
- kontextbezogene Detailansichten
- progressive Details
- erklärbare Effective Rights
- sichtbare Rechtequellen
- klare Override-Darstellung
- bidirektionale Navigation
- handlungsorientierte Warnungen
- verständliche Änderungshistorie
- Impact Preview vor globalen Änderungen

---

# 24. Verhältnis zu Phase 137

Phase 138 soll das in Phase 137 geschaffene Effective-Rights-Modell sichtbar und administrierbar machen.

Phase 138 soll **keine zweite parallele Permission-Logik** im Frontend erfinden.

Die UI muss die tatsächlichen Ergebnisse und Provenienz-Daten des bestehenden Resolvers verwenden.

Relevant sind insbesondere:

- effektiver Allow/Deny-Zustand
- Rollenquellen
- persönliche Allows
- persönliche Denies
- weitere spezialisierte Grants, sofern vorhanden
- entscheidende Quelle
- Reason / Provenienz
- Audit
- Aktivierungsstatus von Änderungen

---

# 25. Erwarteter Gesamtzustand nach Phase 138

Die Benutzer- und Rechteverwaltung soll vier zentrale Fragen aus unterschiedlichen Perspektiven beantworten können:

## Benutzer

> Was darf Max und warum?

## Rolle

> Wer ist Co-Leitung und was darf eine Co-Leitung standardmässig?

## Capability

> Welche Rollen und Benutzer besitzen `release.edit` und warum?

## Audit

> Wer hat wann was verändert und was galt vorher bzw. danach?

Zusätzlich bildet **Claims** den operativen Arbeitsbereich für offene oder zu prüfende Zuordnungen.

Damit ist die Oberfläche nicht nur eine klassische Benutzerverwaltung, sondern ein gemeinsames Admin-Cockpit für:

- Identitäten
- Gruppenmitgliedschaften
- Rollen
- Capabilities
- Effective Rights
- Benutzer-Overrides
- Claims
- Beiträge
- Audit / Änderungen
- später Streaming

---

# 26. Für die spätere GSD-Plan-Phase festhalten

Die spätere Plan-Phase soll diesen Diskussionsstand als verbindliche UX-/Fachgrundlage verwenden.

Sie soll insbesondere prüfen und planen:

1. bestehende Admin-Routen und Komponenten
2. bestehende Benutzer-, Gruppen-, Rollen- und Capability-APIs
3. Effective-Rights-Endpunkte aus Phase 137
4. Override-Endpunkte und Historie
5. vorhandene Audit-Daten und deren fachliche Darstellbarkeit
6. Claim-Daten und Claim-Administration
7. Beitragstypen und korrekte Release-/Versionsdarstellung
8. benötigte Impact-Preview für Rollen-Capability-Änderungen
9. benötigten Persistierungs-/Aktivierungsstatus für Rollenänderungen
10. responsive Umsetzung für Desktop, Tablet und Mobile
11. Entfernung oder Ablösung der heutigen grossen Rollen-Cards
12. Ablösung der heutigen read-only Gruppenrechte-Zusammenfassung
13. Vermeidung redundanter UI-Wege und Rechtepflege
14. bidirektionale Navigation zwischen Benutzer, Gruppe, Rolle und Capability
15. vorbereitete, aber noch nicht implementierte Streaming-Navigation

---

# 27. Bewusst noch offen

Folgende Punkte sind noch Gegenstand weiterer Diskussion und sollen nicht voreilig als final entschieden gelten:

- genaue visuelle Anordnung der Hauptnavigation
- Tabellen- vs. Split-View-Anteile
- exakte Darstellung sehr grosser Capability-Mengen
- exakte Filter- und Suchmechanik
- genaue Struktur der Capability-Perspektive
- Umfang und Filterung von Aktivität vs. Audit
- konkrete spätere Streaming-Funktionen
- endgültige Mobile-/Tablet-Interaktion
- genaue Löschregeln für Benutzer
- endgültige Bezeichnungen einzelner UI-Tabs und Aktionen

Diese Punkte werden in der weiteren Phase-138-Diskussion konkretisiert.

---

**Ende des festgehaltenen Diskussionsstands.**
