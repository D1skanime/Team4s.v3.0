---
created: 2026-10-19T21:45:00+00:00
title: „Hinweis senden“ — Beitrag auch für andere Gruppen vorschlagen können
area: contributions-proposals
status: discuss-first
files:
  - frontend/src/components/contributions/MyProposalsSection.tsx
  - frontend/src/components/contributions/ProposalForm.tsx
  - frontend/src/components/contributions/ProposalForm.steps.tsx
  - backend/internal/handlers/contribution_proposals_me_handler.go
---

## Nutzerbefund (19.10.2026)

Als Mitglied einer Gruppe kann ich bei „Hinweis senden“ (Beitragsvorschlag) nur **meine eigene(n) Gruppe(n)** auswählen. In der Praxis arbeiten Leute aber auch bei anderen Gruppen mit. Beispiel: Ich bin Timer bei NewSubs (eigene Gruppe), war aber auch Timer bei RedHeartFansub und möchte, dass mir dieser Beitrag zugeteilt wird.

## Ist-Stand (kurz geprüft)

- `ProposalForm.tsx`: Schritt 1 „Gruppe & Projekt“ bietet nur `ownGroups` an (Label „Eigene Gruppe“). `MyProposalsSection.tsx`: Der Knopf erscheint nur, wenn `ownGroups.length > 0`.
- Das Backend (`contribution_proposals_me_handler.go`, `CreateProposal`, `ListMemberships`) prüft die Gruppe vermutlich ebenfalls gegen die eigenen Mitgliedschaften — genau prüfen.

## Offene Fragen (vor dem Planen klären)

1. ~~Wer bestätigt?~~ **ENTSCHIEDEN (Nutzer, 19.10.2026):** Geht es um die **Leader-Rolle**, bestätigt der **Plattform-Admin**. Bei **allen anderen Rollen** bestätigt der **Leader der Zielgruppe** (nicht die eigene Gruppe des Absenders).
2. ~~Welche Gruppen?~~ **ENTSCHIEDEN (Nutzer, 19.10.2026): alle Gruppen**, über die **bereits gebaute Gruppensuche (Name + Alias)**. Code und UI WIEDERVERWENDEN, NICHT neu coden:
   - Suchlogik heute: `useEpisodeVersionEditor.ts` (Effekt um `groupQuery`, ca. Z. 155–187): `getFansubList({ q, page: 1, per_page: 10 })` mit 180-ms-Debounce, bereits gewählte Gruppen ausgefiltert, Meldung „Keine passende Gruppe oder kein passender Alias gefunden.“
   - UI heute: `FansubGroupsSection.tsx` im Release-Editor (Phase 187, „Partnergruppe hinzufügen“: `Input` + Ergebnis-`Button`s aus `@/components/ui`).
   - Da die Suchlogik derzeit im Editor-Hook steckt: als gemeinsamen Hook herausziehen (z. B. `useFansubGroupSearch`) und im Release-Editor UND im Hinweis-Formular nutzen — keine Kopie. Ebenso das Such-/Ergebnis-Markup als gemeinsame Komponente teilen statt nachzubauen.
   - In der Auswahl kennzeichnen: „Eigene Gruppe“ vs. „Andere Gruppe“.
3. ~~Automatische Mitgliedschaft?~~ **ENTSCHIEDEN (Nutzer, 19.10.2026):** Der Hinweis ist **nur eine Information**, nichts passiert automatisch. Der Leader der Zielgruppe (bzw. bei Leader-Rolle der Plattform-Admin) **sieht den Hinweis auf der Fansub-Seite seiner Gruppe** und **entscheidet selbst**, ob er die Person zur Gruppe hinzufügt und zu welchen Projekten in welcher Rolle. Dafür die **bestehenden** Wege nutzen (Mitglied hinzufügen, Projekt-/Release-Crew zuweisen) — keine neuen Zuweisungs-Flows bauen. Bezug zur Mitgliedschafts-Registry bleibt beim bestehenden Verhalten.
4. Schutz vor Spam/Missbrauch: Begrenzung, Ablehnen mit Begründung, Sichtbarkeit für die Zielgruppe.
5. Punkte und Badges: Zählen Beiträge bei fremden Gruppen genauso (Bezug Badge-Nenner aus Phase 188 und Punktekatalog #17)?
6. Steuerung über das Rechtesystem: eigenes Recht „Hinweis für fremde Gruppen senden“ oder Teil der Grundausstattung?

## Vorgaben für später

Bestehenden Vorschlags-Flow und die globalen UI-Primitives wiederverwenden, keine Parallelseite. Gruppen-Auswahl mit klarer Kennzeichnung „Eigene Gruppe“ vs. „Andere Gruppe“.
