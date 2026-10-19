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

1. Wer prüft und bestätigt einen Hinweis für eine fremde Gruppe? Vermutlich der Leader bzw. die Rolle mit Freigaberecht **der Zielgruppe**, nicht die eigene Gruppe.
2. Welche Gruppen sind auswählbar: alle Gruppen, oder nur Gruppen, die das Projekt/Anime tatsächlich released haben?
3. Wird man durch einen bestätigten Hinweis automatisch (Gast-)Mitglied der fremden Gruppe, oder bleibt es ein reiner Projekt-Beitrag ohne Mitgliedschaft? Bezug zur Mitgliedschafts-Registry und zu historischen Mitgliedschaften/Claims.
4. Schutz vor Spam/Missbrauch: Begrenzung, Ablehnen mit Begründung, Sichtbarkeit für die Zielgruppe.
5. Punkte und Badges: Zählen Beiträge bei fremden Gruppen genauso (Bezug Badge-Nenner aus Phase 188 und Punktekatalog #17)?
6. Steuerung über das Rechtesystem: eigenes Recht „Hinweis für fremde Gruppen senden“ oder Teil der Grundausstattung?

## Vorgaben für später

Bestehenden Vorschlags-Flow und die globalen UI-Primitives wiederverwenden, keine Parallelseite. Gruppen-Auswahl mit klarer Kennzeichnung „Eigene Gruppe“ vs. „Andere Gruppe“.
