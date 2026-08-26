# UAT-Datenkonstellation für den Milestone-Abschluss (Phase 142)

**Festgehalten:** 2026-08-26
**Vereinbart:** Nutzer legt die Testdaten an, gemeinsame Live-UAT beim Abschluss von Phase 142.
**Warum hier:** Phase 142 ist das Fixtures- und Live-Release-Gate des Milestones v1.4. Die
Konstellation deckt Phase 140 (Delegation) und Phase 141 (Review-Queue) gemeinsam ab.

## Reale Struktur (live geprüft, 2026-08-26)

Zwei Release-Review-Arten:
- Medien/Bilder → `release_version_media_review_lifecycle`
- Notizen/Texte → `release_version_note_review_lifecycle`

Mitwirkungsprüfungen laufen in einem **getrennten** kanonischen Workflow (RQUE-06).
Delegationen liegen in `fansub_group_member_review_capabilities` — Stand heute **0 Zeilen**.
Bestehende Benutzer: `admin` (1), `D1sk` (2), `founder` (3), `coleader` (4).

## Benötigte Konstellation

Entscheidend ist nicht die Menge, sondern dass jede Prüfung **widerlegbar** wird.

| # | Was | Wofür | Ohne das … |
|---|---|---|---|
| 1 | Ein Prüfer mit **nur einer** der beiden Fähigkeiten (z. B. Bilder ja, Texte nein) | RQUE-01 / Kriterium 1 | Ein Allesdürfer kann Kriterium 1 nicht widerlegen |
| 2 | **Beide** Arten gleichzeitig offen | RQUE-01 | „Texte fehlen" ist Zufall statt Beweis |
| 3 | Eine **eigene Einreichung** dieses Prüfers | RQUE-02 / RQUE-03 | Die Trennung der Spuren und der Zähler-Ausschluss sind nicht prüfbar |
| 4 | Mindestens ein Eintrag, den dieser Prüfer **nicht** entscheiden darf | RQUE-05 / Kriterium 4 | Der Schutz gegen manipulierte URLs bleibt ungetestet |
| 5 | Eine **Mitwirkungsprüfung** | RQUE-06 / Kriterium 5 | Die Negativbedingung hat keinen Kandidaten, der auftauchen könnte |
| 6 | Ein Mitglied mit einer **Review-Delegation** aus Phase 140 | RDEL-05 | Der einzige Fall, der 140 und 141 verbindet, bleibt ungeprüft |

## Ablauf für Punkt 6 (RDEL-05)

Der einzige Prüfpunkt, der bisher **nie** live lief, weil es null Delegationen gab:

1. Im Mitglieder-Editor unter „Prüf-/Freigabe-Rechte" eine Delegation erteilen.
2. In der Review-Queue prüfen: Die zugehörigen Einträge erscheinen, der Actionable-Zähler steigt.
3. Delegation entziehen.
4. Erneut prüfen: Einträge **und** Zähler müssen unmittelbar verschwinden — ohne dass das Mitglied
   dabei eine breitere Leitungsrolle verliert.

Die Recherche zu Phase 141 hat belegt, dass die Kette `ResolveGroupRights` →
`reviewGrantProvider` → `ResolveActorReviewGrantContext` durchgehend live auflöst, ohne Cache.
Unmittelbarkeit sollte also strukturell gelten — dieser Durchlauf bestätigt es am lebenden System.

## Offener Einzelpunkt aus Phase 140

Bei der Gelegenheit gleich miterledigen (aus `140-VERIFICATION.md`, human_verification):
Weist die generische Effective-Rights-Ansicht die Quelle korrekt als `specialized_grant` aus, und
scrollt der Sprunglink sichtbar zur Sektion „Prüf-/Freigabe-Rechte"?
