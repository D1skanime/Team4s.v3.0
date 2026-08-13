# Phase 72: Domänen-Projektionen & Status-Fundament - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-03
**Phase:** 72-Domänen-Projektionen & Status-Fundament
**Areas discussed:** Contribution-Konflikt-Status, Sichtbarkeits-/Status-Modell, Review-Politik, Phasengrenze (Reads vs. Writes), Memorial-Durchsetzung

> Vorgelagert: Meilenstein v1.2 (Phasen 72–80) wurde aus dem mitgelieferten
> Phase-72-Diskussionsdokument abgeleitet. Struktur-Entscheidungen: neuer Meilenstein
> mit 9 Phasen (8 Arbeitspakete, Leader Workspace gesplittet in 77/78); Entscheidungen
> A–K als LOCKED in `.planning/milestones/v1.2-DISCUSSION.md`; zusätzlich offene
> Fundament-Punkte für Phase 72 durchgesprochen (unten).

---

## Contribution-Konflikt-Status

| Option | Description | Selected |
|--------|-------------|----------|
| Separate Konflikt-Dimension | Eigenes Feld (dispute_state) neben inhaltlichem Status; confirmed+disputed koexistieren; beste Audit-Spur | ✓ |
| Neuer Wert im Status | Status springt auf 'disputed'; einfach, aber 'confirmed' geht verloren | |
| Eigene Dispute-Tabelle | contribution_disputes mit Historie; maximale Flexibilität, mehr Aufwand | |

**User's choice:** Separate Konflikt-Dimension (Option A) — nach Anforderung eines
realistischen Use-Cases entschieden.
**Notes:** Use-Case (Leader trägt historischen Credit ein → echte/geclaimte Person
bestreitet via „Das war ich nicht" → Leader/Admin entscheidet in Phase 78) wurde
durchgespielt. Eine aktive Konflikt-Dimension reicht; keine Mehrfach-Historie in v1.2.

---

## Sichtbarkeits-/Status-Modell

| Option | Description | Selected |
|--------|-------------|----------|
| Zwei getrennte Achsen | `visibilities`-Lookup (intern/öffentlich) + separater Review-/Lebenszyklus-Status | ✓ |
| Ein kombiniertes Statusfeld | Sechs Werte in einem Feld; vermischt Sichtbarkeit und Bearbeitungszustand | |
| Nur Sichtbarkeit, Review abgeleitet | Review aus anderen Quellen abgeleitet; Medien ohne Contribution-Bezug ohne Review | |

**User's choice:** Zwei getrennte Achsen (implizit bestätigt über die Review-Politik-Frage).
**Notes:** User fragte nach manuellem Aufwand → Klärung, dass Defaults die Last bestimmen,
nicht die Zahl der Zustände.

---

## Review-Politik / Auto-Freigabe

| Option | Description | Selected |
|--------|-------------|----------|
| Nur Fremd-Vorschläge reviewen | Leader/Admin-eigene Arbeit auto-freigegeben; nur Vorschläge + Konflikte in Prüfung | ✓ |
| Alles Öffentliche reviewen | Auch Leader-Uploads brauchen Freigabe; maximale Kontrolle, mehr Arbeit | |
| Pro Owner-Typ unterschiedlich | Feingranulare Auto-Freigabe je Kontext | |

**User's choice:** Nur Fremd-Vorschläge + Konflikte reviewen (Option A).
**Notes:** Deckt Lock 6 ohne Alltagslast; Review-Queue (Phase 78) füllt sich nur aus
externen Vorschlägen (Phase 76) und Konflikten.

---

## Phasengrenze 72 (Reads vs. Writes)

| Option | Description | Selected |
|--------|-------------|----------|
| Schema + Read-Projektionen + Contracts | Alle Writes in nutzenden Phasen; sauberstes Fundament | ✓ |
| + minimale Write-Seams | Generische Setter schon in 72 | |
| Nur Schema | Projektionen später je Read-Phase; Risiko doppelter Arbeit | |

**User's choice:** Schema + Read-Projektionen + Contracts (Option A).
**Notes:** Keine endpunktlosen Writes in 72.

---

## Memorial-Durchsetzung

| Option | Description | Selected |
|--------|-------------|----------|
| Zusammen in Phase 74 | Setter + Claim-Sperre shippen gemeinsam; in 72 nur Statuswert | ✓ |
| Defensiver Guard schon in 72 | Hard Guard im bestehenden Claim-Flow ab Tag 1 | |
| DB-Ebene in 72 | Constraint/Trigger; stärkster Schutz, mehr DB-Logik | |

**User's choice:** Zusammen in Phase 74 (Option A).
**Notes:** Konsistent mit der Reads-only-Grenze (D-05); kein Fenster „setzbar aber
ungeschützt", da memorial erst in 74 setzbar wird.

---

## Claude's Discretion

- Konkrete Spaltennamen/Enum-Werte, Migrationsnummern, Lookup-Tabelle vs. Enum-Spalte,
  Projektions-Schichtung, Wiederverwendung vorhandener media_assets-Status-Spalten —
  Researcher/Planner, im Rahmen von D-01..D-06 und der Locks.

## Deferred Ideas

- Schreib-Flows (memorial/dispute/review/visibility) → nutzende Phasen 74/76/78/80.
- Memorial-Setter + Claim-Sperre → Phase 74.
- Mehrfach-/parallele Anfechtungen mit Historie (eigene Dispute-Tabelle) → nicht v1.2.
- Public-Darstellung der Trennungen/Sichtbarkeitsregeln → Phasen 73/74/75.
