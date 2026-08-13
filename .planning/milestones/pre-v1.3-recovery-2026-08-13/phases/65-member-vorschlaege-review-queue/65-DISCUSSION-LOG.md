# Phase 65: Member-Vorschläge und Review-Queue - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-02
**Phase:** 65-member-vorschlaege-review-queue
**Areas discussed:** Vorschlags-Umfang, Review-Queue, 90-Tage-Timeout, Member-Dashboard-UX, Sichtbarkeit nach Bestätigung, Duplikat-Behandlung, Rollen-Auswahl, Audit-Attribution

---

## Vorschlags-Umfang

| Frage | Optionen | Auswahl |
|--------|-------------|----------|
| Gruppen-Scope | Nur eigene Gruppen / Beliebige bestehende / Auch neue anlegen | **Nur eigene Gruppen** |
| Pflichtfelder | Anime+Rollen / +Zeitraum / Frei mit Notizfeld | **Frei mit Notizfeld** (Anime+Rollen Pflicht) |
| Wen betrifft | Nur für sich selbst / Auch für andere | **Nur für sich selbst** |

---

## Review-Queue (Leader)

| Frage | Optionen | Auswahl |
|--------|-------------|----------|
| Queue-Ort | Pro Gruppe / Zentrale Review-Seite | **Pro Gruppe** |
| Ablehn-Status | disputed / hidden / hart löschen | **disputed (bleibt intern)** |
| Ablehngrund | Pflicht+sichtbar / optional / kein Grund | **optional, Member sieht ihn** |
| Review-Recht | Nur Leader / Leader+Admins | **Leader + Admins** |

---

## 90-Tage-Timeout

| Frage | Optionen | Auswahl |
|--------|-------------|----------|
| Timeout-Weg | Member schaltet selbst / an Moderation / beides | **Member schaltet selbst (unverified)** |
| Mechanik | On-Read / geplanter Job | **On-Read berechnet** |
| Transparenz | Hinweis im Formular / nur im Status | **Hinweis im Formular** |

---

## Member-Dashboard-UX

| Frage | Optionen | Auswahl |
|--------|-------------|----------|
| Eingabe-UX | Inline-/Modal-Formular / eigene Unterseite | **Inline-/Modal in der Sektion** |
| Status-Anzeige | Nach Status gruppiert / Liste mit Chip | **Nach Status gruppiert** |
| Benachrichtigung | Nur In-App / zusätzlich E-Mail | **Nur In-App-Status** |

---

## Sichtbarkeit nach Bestätigung

| Frage | Optionen | Auswahl |
|--------|-------------|----------|
| Sichtbarkeit bei confirm | Bleibt false (manuell) / Profil auto / Beide auto | **Beide automatisch an** |

---

## Duplikat-Behandlung

| Frage | Optionen | Auswahl |
|--------|-------------|----------|
| Duplikat-Vorschlag | Hinweis+erlauben / hart blockieren / keine Prüfung | **Hart blockieren** (Member+Anime+Gruppe) |

---

## Rollen-Auswahl

| Frage | Optionen | Auswahl |
|--------|-------------|----------|
| Erlaubte Rollen | Alle role_definitions (min.1) / nur Kernrollen (min.1) | **Alle role_definitions, min. 1 Pflicht** |

---

## Audit-Attribution

| Frage | Optionen | Auswahl |
|--------|-------------|----------|
| confirmed_by bei Selbstschaltung | bleibt NULL / = Member-App-User | **= Member-App-User (Eintrag bleibt unverified)** |

---

## Claude's Discretion

- Schema-Detail für optionalen Ablehngrund (neue Spalte vs. wiederverwendbares Feld)
- Unterscheidung „unverified selbst-geschaltet" vs. „leader-confirmed" (Mechanismus offen für Research)
- Handler-Aufteilung (bestehende Handler erweitern vs. neuer Review-Handler) unter 450-Zeilen-Limit
- Komponenten-/Dateistruktur der neuen UI-Abschnitte

## Deferred Ideas

- E-Mail-Benachrichtigung (SMTP seit Phase 60) — aus V1 ausgeklammert
- Automatische Moderations-Eskalation nach Timeout — verworfen
- Hintergrundjob für Timeout — verworfen zugunsten On-Read
- Todos `profile-hub-content-activity-redesign` und `contributor-owned-media-note-edit-delete` — reviewed, nicht gefoldet (eigene Phasen)
