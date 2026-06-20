---
plan: 02
status: complete
---

# Plan 02 Summary: Docker-Rebuild + Backend-Live-Verifikation + Repository-Test

**Ausgeführt vom Orchestrator** (Docker-Rebuild ist ein human-action-Checkpoint).

## Erledigt

- **Docker-Backend neu gebaut:** `docker compose up -d --build team4sv30-backend` — Container neu erstellt und gestartet, Health-Check `:8092/health` = 200.
- **Live-Verifikation gegen :8092** (echter Keycloak-Token für `ao-leader`, Passwort 123, Direct-Grant):
  `GET /api/v1/me/anime-contributions` liefert die neuen Felder korrekt:
  - Beitrag id 31 (Naruto, release_version_id=1) → `episode_number="1"`, `episode_sort_index=1`
  - Beitrag id 17 (Naruto, anime-weit, release_version_id=NULL) → `episode_number=null`, `episode_sort_index=null`
- **Regressions-Test** `anime_contributions_proposal_repository_test.go` (`package repository`): `TestMemberContributionWithProposalRow_HasEpisodeFields` sichert die nullable Episode-Felder am DTO ab. `go test ./internal/repository/... -run TestMemberContributionWithProposalRow` grün.

## Commit

- `01d84952` test(quick-260620-qog-02): Episode-Felder in MemberContributionWithProposalRow absichern

## Hinweis

Die Live-Verifikation gegen die echte Response (statt nur Compile-Check) ist der eigentliche Nachweis, dass die `rv→fansub_releases→episodes`-Auflösung end-to-end funktioniert.
