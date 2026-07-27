# Phase 110: Member-Badges, Ranglisten-UI und E2E-Abnahme - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-27
**Phase:** 110-member-badges-ranglisten-ui-und-e2e-abnahme
**Areas discussed:** Umfang (global-schlank), Ranglisten-Einstieg, Punkte am Profil, Badge-Typ 1

---

## Umfang der UI

| Option | Description | Selected |
|--------|-------------|----------|
| Global-schlank | Nur globale Rangliste, Punkte am Profil, einfache Badges | ✓ |
| Voller Roadmap-Umfang | Gruppen-/Kategorie-Ranglisten, volle E2E/UAT, Security-Suite | |

**User's choice:** Global-schlank halten, „Idee für Idee umsetzen".
**Notes:** Konsistent mit der Scope-Reduktion aus Phase 109 (D-03/D-04). Divergenz zur Roadmap in CONTEXT dokumentiert.

---

## Q1 — Ranglisten-Einstieg

| Option | Description | Selected |
|--------|-------------|----------|
| Nav-Eintrag „Rangliste" in AppShell-Gruppe „Entdecken" | Immer sichtbar (anonym + eingeloggt), neben „Anime entdecken", Ziel /members/ranking | ✓ |
| Unauffällig / nur direkt verlinkt | Kein Nav-Eintrag | |

**User's choice:** Nav-Eintrag „Rangliste" — die Anime-Seite ist das Haupttor, Rangliste muss von dort einen Klick entfernt sein.
**Notes:** Es gibt keine Mitglieder-Übersicht; /members/ranking wird faktisch der Einstieg in die Member-Welt. Historische Einträge ohne Profil bleiben Text ohne Link.

---

## Q2 — Punkte am Member-Profil

| Option | Description | Selected |
|--------|-------------|----------|
| Nur Punktzahl im Hero | Eine prominente Zahl beim Namen | ✓ |
| Punktzahl + Ranglistenplatz | Zusätzlich „Platz N" | |

**User's choice:** Aktuell nur die Punktzahl.
**Notes:** Ranglistenplatz deferred.

---

## Q3 — Badges

| Option | Description | Selected |
|--------|-------------|----------|
| Punkte-Meilenstein-Stufen (Bronze/Silber/Gold) | Schwellen 50/200/500 | |
| Einmalige Rollen-Einstiegs-Badges | Pro Rolle einmal, Bedingung ≥1 netto Punkt in der Rolle | ✓ |

**User's choice:** Einmalige Rollen-Einstiegs-Badges (Typ 1).
**Notes:** Bedingung: ≥1 netto Punkt aus akzeptierter Arbeit in der Rolle („nur wenn er den Punkt hat, hat er den Beitrag wirklich geleistet"). Storno → Punkt weg → Badge weg (Live-Projektion). Gilt für jede punktfähige Rolle inkl. editor/raw_provider; keine hartcodierte Liste. Verifiziert: Profilpflege gibt aktuell keine Punkte. Datenquelle: rollen-gefilterte release_role_work-Buchungen, nicht die Gesamtsumme. Anzeige in bestehender MemberBadgeChain-Sektion; Badge-Bilder liefert der Nutzer später, vorerst Platzhalter. Mockup gezeigt und bestätigt. Weitere Badge-Typen (2+) später.

---

## Claude's Discretion

- Exakte Badge-Codes/Labels/Icons/Palette je Rolle (Stil des vorhandenen Katalogs).
- Rolle je Ledger-Eintrag aus source_key rekonstruieren vs. Join auf Besetzungsdaten (Recherche-Detail).
- Layout-Details der Ranglisten-Seite und der Hero-Punktzahl im globalen UI-System.

## Deferred Ideas

- Badge-Typ 2 und weitere (Nutzer definiert später).
- Ranglistenplatz am Profil.
- Gruppen-/Kategorie-/Zeitraum-Ranglisten.
- Breite E2E/UAT-Abnahme und Security-/Abuse-Testsuite (Roadmap-SC5/SC6 von 110).
