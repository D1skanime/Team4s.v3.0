---
phase: 67-release-episode-credits
plan: 05
status: complete
completed: 2026-06-02
requirements: [P67-SC1]
---

# Plan 67-05 — Member-Proposal-Backend (release_version_id + D-03) — Summary

## Was gebaut wurde

Der Member-Vorschlagspfad (`backend/internal/handlers/contribution_proposals_me_handler.go`)
nimmt jetzt ein optionales `release_version_id` an und durchläuft dieselbe
Beteiligungsprüfung (D-03) wie der Leader-Pfad — Pitfall 5 (D-03 muss in BEIDEN
Schreibpfaden greifen) ist damit geschlossen.

- `createProposalRequest.ReleaseVersionID *int64` (`json:"release_version_id"`) — additiv.
- Beim gesetzten `release_version_id`: Aufruf von `GroupParticipatesInReleaseVersion`
  (Repo-Methode aus 67-02) über das `releaseVersionChecker`-Interface (Handler-Zeile 59).
- Gruppen-fremde Version → **HTTP 422** mit deutscher Meldung
  „Diese Gruppe war an der gewählten Release-Version nicht beteiligt." (korrekte Umlaute).
- `release_version_id` wird in `ProposalInput` durchgereicht und persistiert.

## Verifikation

- `cd backend && go build ./...` — grün.
- `go test ./internal/handlers/... -run "CreateProposal|ReleaseVersion" -count=1` — **ok** (grün).
- D-03-Check nur bei gesetztem `release_version_id` (NULL = anime-weit, kein Check).

## Abweichungen / Hinweise

- **Commit-Attribution (Concurrency):** Diese Phase wurde auf `main` parallel zu einer
  anderen Session (Phase 66/68) ausgeführt. Die GREEN-Implementierung dieses Plans wurde
  durch die parallele Session in deren Commit `5a3cafb8 fix(phase65): route proposal review
  through fansub edit` mit eingesammelt (sweep einer noch nicht committeten Arbeitskopie,
  als das ursprüngliche 67-05-Executor-Run am Session-Limit endete). Der RED-Test liegt
  sauber in `4ea8cae9 test(67-05)`. Funktional ist der gesamte Code in HEAD, baut und ist
  grün getestet; nur die Commit-Zuordnung des feat-Anteils ist nicht unter `feat(67-05)`.
- **Member-Vorschlags-UI (D-08 Frontend):** bleibt bewusst außerhalb — das Frontend-
  Vorschlagsformular existiert noch nicht (`me/contributions/page.tsx` listet nur). Der
  Backend-Annahmepfad ist gehärtet, sodass das spätere Formular das Feld nur senden muss
  (Phase-65-Restscope).

## Requirement-Beitrag

- **P67-SC1** (Schreib-/Konsistenzanteil im Member-Pfad): erfüllt.
