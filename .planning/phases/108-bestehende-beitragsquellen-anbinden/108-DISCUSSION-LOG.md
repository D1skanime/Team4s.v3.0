# Phase 108: Weitere bestehende Quellen anbinden und bei Bestätigung wirklich Punkte buchen - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-24
**Phase:** 108-weitere-bestehende-quellen-anbinden-und-punkte-buchen
**Areas discussed:** Punktfähige Quellen und Granularität, Punkteempfänger und Identitäten, Buchung und Stornierung, Beitrags- und Review-Bewertung

---

## Punktfähige Quellen und Granularität

| Entscheidung | Gewählte Richtung | Verworfen |
|---|---|---|
| Neue Quellen | Release-/Anime-Mitwirkungen und Rollen plus Projekttext | Release-Version-Texte/-Medien erneut anbinden; Metadatenpflege bepunkten |
| Projekttext | Einmaliger Credit ohne Review | Zweite Review-Queue oder wiederholte Punkte je Bearbeitung |
| Rollenquelle | Tatsächliche Arbeit je Member, Release und Rolle | Punkte für die Verwaltungsaktion |
| Künftige Releases | Projektteam wird bei Release-Anlage übernommen | Nur zum Zeitpunkt der Projektzuweisung existierende Releases |

**User's choice:** Release-Arbeit ist pro Release und Rolle zu würdigen; Projekttext einmalig. Metadatenpflege ist Plattform-Admin-Arbeit und bleibt punktelos.

**Notes:** Beispiel: 12 Releases mit projektweitem Timing ergeben 12 Einheiten. Eine release-spezifische Rollenbesetzung muss die tatsächliche Arbeit dieses Releases ausdrücken.

---

## Punkteempfänger und Identitäten

| Entscheidung | Gewählte Richtung | Verworfen |
|---|---|---|
| Empfänger | Fachlich beteiligter Member | Eintragender Leader oder zusätzlicher Leader-Credit |
| Historische Person | Dauerhafter Member ohne Account | Freitextname je Zuweisung |
| Gemeinsame Rolle | Alle tatsächlich Beteiligten erhalten je eine Einheit | Genau eine Person pro Rolle |
| Release-Besetzung | Vollständige gespeicherte Besetzung | Versteckter rollenweiser oder ganzer Fallback beim Lesen |
| Projekttext-Autor | Erster Leader-Member mit nichtleerem Text | Letzter Bearbeiter oder nomineller Gruppenleader |

**User's choice:** Verdienste gehören der realen Person, unabhängig von Login oder aktuellem Interesse.

**Notes:** Gon soll 220 Übersetzungsleistungen sichtbar besitzen können, selbst wenn er nie einen Account hatte. Es gibt keine Übernahme alter Testdaten; historische Fakten werden frisch im Produkt erfasst.

---

## Buchung und Stornierung

| Entscheidung | Gewählte Richtung | Verworfen |
|---|---|---|
| Transaktion | Besetzung und alle Punkte vollständig oder gar nicht | Teilbuchung oder späterer Nachlauf |
| Korrektur | Append-only Gegenbuchung | Ledger-Eintrag löschen oder Punkte dauerhaft behalten |
| Release-Modell | Vollständiger Snapshot je Release | Aktuelles Ganzes-Release-Override auf Leseebene |
| Projektänderungen | Nur unveränderte Releases synchronisieren | Individuelle Releases automatisch zusammenführen |
| Rückkehr zum Projektteam | Keine Reset-Aktion | „Projektbesetzung neu übernehmen“ |

**User's choice:** Individuell bearbeitete Releases bleiben unabhängig und werden danach nur manuell geändert.

**Notes:** Codeprüfung ergab, dass der aktuelle Backendpfad bereits bei einer einzigen Release-Contribution alle Projekt-Defaults ausblendet. Der Drawer materialisiert zwar häufig eine vollständige Kopie, aber das fachliche Snapshot-Modell und sein Synchronisationsstatus fehlen.

---

## Beitrags- und Review-Bewertung

| Entscheidung | Gewählte Richtung | Verworfen |
|---|---|---|
| Rollenwert | 1 Punkt je Member × Release × Rolle | Unterschiedliche Rollenwerte oder höherer gleicher Wert |
| Projekttext | 5 Punkte einmalig | 1 oder 10 Punkte |
| Verwaltung/Review | Keine Zusatzpunkte | Leader-, Korrektur- oder Review-Credits |
| Projekttext-Löschung | 5 Punkte stornieren; spätere Neuanlage kann neu buchen | Punkte behalten oder Löschen verbieten |

**User's choice:** Einfache, nachvollziehbare Werte ohne Farming-Anreiz.

**Notes:** Mehrere Rollen derselben Person an einem Release ergeben jeweils eine Einheit. Wiederholtes Speichern darf keine weiteren Punkte erzeugen.

---

## the agent's Discretion

- Technische Namen für Snapshotstatus, RuleCodes, SourceRefs und Audit-Events.
- Genaue Service-/Repository-Aufteilung unter Wiederverwendung der bestehenden Domain- und PointService-Seams.

## Deferred Ideas

- Ranglisten und öffentliche Gamification-Darstellung bleiben späteren Phasen vorbehalten.
- Automatisch vorgeschlagene UI-, Media- und Badge-Todos wurden nicht in Phase 108 übernommen.
