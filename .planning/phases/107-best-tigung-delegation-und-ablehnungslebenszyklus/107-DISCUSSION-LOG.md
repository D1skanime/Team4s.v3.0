# Phase 107: Bestätigung, Delegation und Ablehnungslebenszyklus - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-23
**Phase:** 107-Bestätigung, Delegation und Ablehnungslebenszyklus
**Areas discussed:** Delegierte Review-Rechte, Selbstreview-Override und Prüfpunkte, Ablehnung und erneute Einreichung, Cleanup und Audit-Tombstone, Prüfer ohne bestätigte Member-Zuordnung

---

## Delegierte Review-Rechte

| Entscheidung | Optionen | Auswahl |
|---|---|---|
| Granularität | Getrennte Capabilities je Beitragstyp / eine Capability für alles / je Einreichung | Getrennte Capabilities je Beitragstyp |
| Vergabe | Gruppenadmins plus globale Plattform-Admins ohne Ketten / nur Plattform-Admins / Weiterdelegation erlaubt | Gruppenadmins plus globale Plattform-Admins ohne Ketten |
| Dauer | Bis Widerruf / Ablaufdatum / einzelne Sitzung | Bis Widerruf |
| Entzug | Nur künftig sperren und offene Zuweisungen zurückgeben / Historie neu prüfen / offene Zuweisungen belassen | Nur künftig sperren und offene Zuweisungen zurückgeben |

**User's choice:** Jeweils Option 1.
**Notes:** Historische Entscheidungen und Prüfpunkte bleiben bestehen.

---

## Selbstreview-Override und Prüfpunkte

| Entscheidung | Optionen | Auswahl |
|---|---|---|
| Strenge | Ausnahme mit Pflichtgrund und Warnung / jederzeit mit Pflichtgrund / nur ohne unabhängigen Prüfer | Ausnahme mit Pflichtgrund und Warnung |
| Prüfpunkte | Keine / normale / erst nach zweiter Bestätigung | Keine |
| Sichtbarkeit des Grundes | Einreicher und Admins / nur Plattform-Admins / alle reviewberechtigten Gruppenmitglieder | Alle reviewberechtigten Gruppenmitglieder |
| Unberechtigter Override | Zurück in Review / nur Audit-Vermerk / direkt ablehnen, Punkte zurücknehmen, Neueinreichung | Direkt ablehnen, Punkte zurücknehmen, Neueinreichung |

**User's choice:** Optionen 1, 1, 3 und 3.
**Notes:** Self-Override ist eine explizite Plattform-Admin-Ausnahme und niemals eine Quelle für Prüfpunkte.

---

## Ablehnung und erneute Einreichung

| Entscheidung | Optionen | Auswahl |
|---|---|---|
| Bearbeitung | Texte und Medien vollständig / nur Texte / komplett neue Einreichung | Texte und Medien vollständig |
| Ablehnungsgrund | Kategorie plus Pflichtfreitext / nur Freitext / nur Kategorie | Kategorie plus Pflichtfreitext |
| Neueinreichung | Revision mit Inhaltshistorie / denselben Arbeitsstand überschreiben / neue ID mit Vorgänger | Denselben Arbeitsstand überschreiben |
| Erneuter Prüfer | Derselbe, aber nie selbst / zwingend anderer / nur Admin | Derselbe, aber nie selbst |

**User's choice:** Optionen 1, 1, 2 und 1.
**Notes:** Die sichtbare Inhaltshistorie wird nicht versioniert; Status- und Audit-Ereignisse bleiben erhalten.

---

## Cleanup und Audit-Tombstone

| Entscheidung | Optionen | Auswahl |
|---|---|---|
| Fristbeginn | Letzte Aktivität / ursprüngliche Ablehnung / ausdrückliche Aufgabe | Letzte Aktivität |
| Tombstone | Strukturierte Audit-Metadaten / nur ID und Status / Begründungen dauerhaft | Strukturierte Audit-Metadaten |
| Vorwarnung | Einmal / keine / mehrfach | Keine |
| Dateifehler | Gesamtvorgang blockieren / Daten löschen und Datei später / Tombstone sofort und Fehler protokollieren | Tombstone sofort und Fehler protokollieren |

**User's choice:** Optionen 1, 1, 2 und 3.
**Notes:** Fehlgeschlagene physische Dateilöschung muss separat idempotent wiederholbar bleiben.

---

## Prüfer ohne bestätigte Member-Zuordnung

> **Entwicklerkorrektur nach Klarstellung (2026-07-23):** Die nachstehende ursprüngliche Auswahl bleibt ausschließlich als Audit-Historie erhalten und ist fachlich überholt. Verbindlich ist CONTEXT.md D-21 bis D-24: bestätigte Mitgliedschaft bleibt historisch bestehen; Inaktivität oder fehlende Logins ändern nichts automatisch; Phase 107 kennt kein Mitgliedschaftsende und keine Snapshot-Ausnahme; ausschließlich ausdrücklicher Delegationsentzug gibt offene Zuweisungen atomar an die Gruppenqueue zurück, sperrt den früheren Delegierten, bewahrt abgeschlossene Entscheidungen/verdiente Punkte und vergibt nichts für unfertige zurückgegebene Arbeit.

| Entscheidung | Optionen | Auswahl |
|---|---|---|
| Delegation ohne Mitgliedschaft | Nie / bei Admin-Delegation / nur Plattform-Admins | Nie |
| Ende der Mitgliedschaft | Alles sofort zurückgeben / Rechte manuell entziehen / bestehende Zuweisungen abschließen | Bestehende Zuweisungen abschließen |
| Abschlussfrist | 24 Stunden / keine Zusatzfrist / 7 Tage | Keine Zusatzfrist |
| Prüfpunkte | Normal / keine / erst nach Admin-Bestätigung | Normal |

**User's choice:** Optionen 1, 3, 2 und 1.
**Notes (historisch, überholt):** Die damalige Antwort nahm fälschlich ein Mitgliedschaftsende an. Sie darf nicht als Planungs- oder Implementierungsgrundlage verwendet werden.

## Agent's Discretion

- Technische Benennung und Speicherung von Capabilities, Zuweisungen, Ablehnungskategorien und Cleanup-Nachläufen.
- Konkrete Höhe der festen Prüfpunkte innerhalb der beschlossenen Gleichbehandlung.

## Deferred Ideas

- Generische Credit-zu-Permission-Brücke und Credits-UI-Konsolidierung aus `.planning/todos/pending/2026-06-03-credits-ui-konsolidierung-und-permission-bruecke.md`.
