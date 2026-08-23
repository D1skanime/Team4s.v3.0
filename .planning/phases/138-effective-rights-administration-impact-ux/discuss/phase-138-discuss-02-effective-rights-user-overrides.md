# Phase 138 – GSD Discuss Context 02
## Effective Rights, Benutzer-in-Gruppe-Editor und persönliche Abweichungen

**Projekt:** Team4s  
**Phase:** 138  
**Status:** Diskussionsentscheidungen / Input für `/gsd:plan-phase 138`

---

## 1. Kern des Benutzer-Rechtebereichs

Im Benutzer wird `Rollen & Rechte` zuerst nach Gruppe strukturiert.

Beispiel:

```text
coleader
└── Rollen & Rechte
    └── New-Subs
        ├── Rollen
        ├── persönliche Abweichungen
        └── effektive Rechte
```

Nicht zuerst nach Capability-Kategorie über alle Gruppen hinweg.

Begründung:

Ein Benutzer kann in verschiedenen Gruppen völlig unterschiedliche Rollen und effektive Rechte besitzen.

---

## 2. Mehrere Rollen innerhalb derselben Gruppe

Hat ein Benutzer z. B. gleichzeitig:

```text
Co-Leitung
Encoder
```

in `New-Subs`, werden die Rollen gemeinsam im selben Gruppenkontext dargestellt.

Es gibt keine getrennte Effective-Rights-Welt pro Rolle.

Die effektive Rechteansicht zeigt den zusammengeführten Zustand.

Beispiel Quelle:

```text
Co-Leitung + Encoder
```

wenn beide Rollen dieselbe Capability gewähren.

---

## 3. Vollständiger relevanter Capability-Katalog

Im Benutzer-in-Gruppe-Editor werden nicht nur aktuell erlaubte Rechte angezeigt.

Der vollständige für diesen Kontext relevante Capability-Katalog wird dargestellt:

- erlaubt
- nicht erlaubt
- persönlich entzogen
- persönlich zusätzlich erlaubt
- non-deniable, falls vorhanden

Damit kann ein Administrator auch ein derzeit fehlendes Recht gezielt zusätzlich erlauben.

---

## 4. Fachliche Gruppierung der Capabilities

Capabilities werden nach fachlichen Bereichen gruppiert, z. B.:

```text
Gruppe
Projekt
Release
Review
Medien
Claims
Beiträge
...
```

Die realen Kategorien aus Registry/Code sind maßgeblich.

Keine neuen Capability-Namen erfinden, wenn der aktuelle Code bereits verbindliche Bezeichnungen besitzt.

Sektionen sind einklappbar.

Wichtige Bereiche können standardmäßig geöffnet sein.

Für große Kataloge zusätzlich Suche/Filter.

---

## 5. Kompakte Standarddarstellung

Standardansicht pro Capability:

| Capability | Effektiv | Quelle |
|---|---|---|

Beispiel:

| Capability | Effektiv | Quelle |
|---|---|---|
| Gruppe bearbeiten | Erlaubt | Co-Leitung |
| Mitglieder verwalten | Verweigert | persönliche Abweichung |
| Release bearbeiten | Erlaubt | Co-Leitung + Encoder |

Nicht standardmäßig eine technische Matrix aus Allow/Deny/Reason-Code/Resolver-Feldern anzeigen.

---

## 6. Detailansicht eines Rechts

Beim Öffnen einer Capability werden die vollständigen Provenienzdetails gezeigt.

Mindestens, soweit im Phase-137-Modell vorhanden:

- alle Rollenquellen
- persönlicher Allow
- persönlicher Deny
- spezialisierte Grants
- entscheidende Quelle
- Reason / Provenienz
- non-deniable
- Override-Historie
- aktueller effektiver Zustand

Beispiel:

```text
Gruppenseite bearbeiten
Effektiv: ERLAUBT

Quellen:
- Co-Leitung
- Webmaster

Persönlicher Allow:
- keiner

Persönlicher Deny:
- keiner

Entscheidende Quelle:
- Gruppenrolle
```

---

## 7. Keine parallele Permission-Logik im Frontend

Das Frontend darf keine vereinfachte Rechtehierarchie erfinden, die dem Resolver widerspricht.

Die tatsächliche Semantik des Phase-137-Effective-Rights-Modells ist verbindlich.

Die UI erklärt die Daten des Resolvers, sie ersetzt ihn nicht.

---

## 8. Persönliche Abweichungen – Bedienmodell

Keine technischen Hauptschalter:

```text
Allow | Deny | kein Override
```

Stattdessen fachliche Aktionen:

```text
Recht entziehen
Recht zusätzlich erlauben
```

Das System übersetzt die Absicht intern in den passenden persönlichen Override.

---

## 9. Geführter Entzug

Wenn ein Admin auswählt:

```text
Recht entziehen
```

muss zuerst erklärt werden, woher das aktuelle Recht kommt.

Beispiel:

```text
Dieses Recht wird aktuell gewährt durch:

- Co-Leitung
- Webmaster

Das Entfernen nur einer dieser Rollen würde das Recht nicht vollständig entziehen.

Empfohlen:
Persönliche Abweichung für diesen Benutzer in New-Subs setzen.
```

Erst danach bestätigen.

Der resultierende Zustand muss vor dem Speichern verständlich angezeigt werden.

---

## 10. Bestehende Abweichungen

Bestehende persönliche Overrides werden fachlich dargestellt als:

```text
persönlich entzogen
```

oder:

```text
persönlich zusätzlich erlaubt
```

Primäre Aktion:

```text
Abweichung entfernen
```

Danach fällt der Benutzer wieder auf den normalen Resolver-/Rollen-Zustand zurück.

Technische Allow-/Deny-Begriffe dürfen in Details sichtbar sein, sind aber nicht das Hauptbedienmodell.

---

## 11. Non-deniable

Nicht entziehbare Rechte werden klar gekennzeichnet.

Wenn `non-deniable` gilt:

- `Recht entziehen` wird nicht angeboten oder eindeutig deaktiviert.
- Die UI erklärt, warum das Recht nicht persönlich entzogen werden kann.
- Die Quelle bleibt sichtbar.
- Keine Überraschung erst beim Speichern.

---

## 12. Rollen zuweisen oder entfernen

Auch die Änderung einer Rollenzuweisung für einen konkreten Benutzer bekommt eine Auswirkungs-Vorschau.

Vor dem Speichern zeigen:

- welche effektiven Rechte gewonnen werden
- welche effektiven Rechte verloren gehen
- welche Rechte über andere Rollen erhalten bleiben
- welche persönlichen Abweichungen weiterhin wirken
- welcher Zustand danach effektiv gilt

Keine weitreichende Rollenänderung im Blindflug.

---

## 13. Historie direkt am Recht

Die Detailansicht einer Capability innerhalb des Benutzerkontexts zeigt eine kompakte Historie.

Beispiele:

- Rolle Co-Leitung zugewiesen
- Capability dadurch erhalten
- persönlicher Deny gesetzt
- Deny entfernt
- relevante Rollen-Capability-Änderung
- Zeitpunkt
- ausführender Admin

Der zentrale Bereich `Änderungen` bleibt zusätzlich bestehen.

---

## 14. Kanonischer Editor

Alle Einstiege auf denselben Benutzer in derselben Gruppe öffnen denselben Editor.

Kein separater Rechteeditor unter Benutzer, Gruppe und Rolle.

---

## 15. Ziel dieser Datei

Diese Datei definiert das verbindliche Bedien- und Erklärungsmodell für Effective Rights und persönliche Abweichungen in Phase 138.
