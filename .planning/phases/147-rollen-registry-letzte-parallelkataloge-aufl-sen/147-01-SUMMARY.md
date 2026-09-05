---
phase: 147-rollen-registry-letzte-parallelkataloge-aufl-sen
plan: 01
subsystem: backend-repository
tags: [role-registry, public-api, openapi-contract, postgres-integration-test]
dependency-graph:
  requires: []
  provides:
    - PublicReleaseNote.RoleCode (release_detail_public_repository.go, release_detail_public_repository_helpers.go)
    - ProjectMemberNote.RoleCode (project_member_public_repository.go)
    - shared/contracts/openapi.yaml role_code properties (PublicReleaseNote, ProjectMemberNote)
  affects:
    - frontend/src/types/releaseDetail.ts (Plan 147-02, consumes role_code)
    - frontend/src/types/projectMember.ts (Plan 147-02, consumes role_code)
    - frontend/src/components/public/PublicNoteCard.tsx (Plan 147-02, HC-01 fix)
tech-stack:
  added: []
  patterns:
    - "COALESCE(rd.code, '') AS role_code alongside existing COALESCE(rd.label_de, '') AS role_label at all role_definitions joins"
key-files:
  created:
    - backend/internal/repository/public_note_role_code_integration_test.go
  modified:
    - backend/internal/repository/release_detail_public_repository.go
    - backend/internal/repository/release_detail_public_repository_helpers.go
    - backend/internal/repository/project_member_public_repository.go
    - backend/internal/testsupport/phase117_postgres.go
    - shared/contracts/openapi.yaml
decisions:
  - "role_code Go field is a plain non-pointer string (mirrors RoleLabel's COALESCE(..., '') non-null contract); only the OpenAPI schema marks it non-required, matching role_label's existing treatment."
metrics:
  duration: "~35 minutes"
  completed: 2026-09-05
---

# Phase 147 Plan 01: role_code threading through public note repositories Summary

Threaded the stable `role_definitions.code` value (already joined at all three public-note
query sites via `LEFT JOIN role_definitions rd ON rd.code = cr.name`) into `PublicReleaseNote.RoleCode`
and `ProjectMemberNote.RoleCode`, documented it in the OpenAPI contract, and proved it with a
real-Postgres regression test that survives a `label_de` change — closing HC-01's backend half.

## What Was Built

**Task 1 — `RoleCode` at all three query sites:**
- `backend/internal/repository/release_detail_public_repository.go`: added `RoleCode string
  \`json:"role_code"\`` to `PublicReleaseNote` (right after `RoleLabel`), added `COALESCE(rd.code, '')
  AS role_code,` to `ListReleaseVersionNotesCursor`'s SELECT, and `&item.RoleCode` to its `Scan(...)`.
- `backend/internal/repository/release_detail_public_repository_helpers.go`: identical addition to
  the second, independent `loadNotes` query implementation (used by `GetPublicReleaseDetail`'s full
  aggregate read) — both sites now change together.
- `backend/internal/repository/project_member_public_repository.go`: added `RoleCode string
  \`json:"role_code"\`` to `ProjectMemberNote`, and the same `COALESCE(rd.code, '')`/`&n.RoleCode`
  addition to `ListNotes`'s single query site.
- No new joins were needed — `LEFT JOIN role_definitions rd ON rd.code = cr.name` already existed
  at all three sites.

**Task 2 — OpenAPI contract:**
- `shared/contracts/openapi.yaml`: added `role_code: {type: string}` to both the `PublicReleaseNote`
  schema (block style, after `role_label`) and the `ProjectMemberNote` schema (compact single-line
  style, after `role_label`). Neither schema's `required:` array was touched — `role_code` behaves
  identically to `role_label`'s existing non-required, empty-string-on-no-role treatment.

**Task 3 — Real-Postgres proof:**
- Extended `createPhase117Prerequisites` in `backend/internal/testsupport/phase117_postgres.go`
  additively: `name TEXT` on `fansub_groups`, `release_date TIMESTAMPTZ NULL` on `release_versions`
  and `fansub_releases`, plus four new tables (`members`, `contributor_roles`, `role_definitions`,
  `release_version_notes`).
- New `backend/internal/repository/public_note_role_code_integration_test.go`
  (`TestPublicNoteRoleCode`, package `repository`) inserts one fixture row per required table with
  `contributor_roles.name = role_definitions.code = 'phase147_test_role'` and `label_de = 'Testrolle
  Eins'`, then calls all three producers (`ListReleaseVersionNotesCursor`, the unexported `loadNotes`,
  and `ProjectMemberPublicRepository.ListNotes`) and asserts `RoleCode == "phase147_test_role"` on
  each. A second sub-test updates `label_de` to `'Testrolle Zwei'` and re-asserts `RoleLabel` changed
  while `RoleCode` did not, at all three sites.
- The pre-existing `TestReleaseDetailPublicSegments` analog was re-run against the extended stub
  schema and still passes unchanged, proving the schema extension is non-breaking.

## Verification Performed

- `docker exec team4sv30-backend go build ./...` — clean (0 output).
- `docker exec team4sv30-backend go vet ./internal/repository/... ./internal/testsupport/...` — clean.
- Created a dedicated ephemeral test database `team4s_phase117_test_147a` on `team4sv30-db`; ran via
  a `golang:1.25-alpine` container attached to `team4s_default`, with `/database/migrations` and the
  repo's `backend/` bind-mounted, reusing existing `team4s_gomod`/`team4s_gocache` volumes (no network
  fetch needed — modules already cached from prior phases):
  ```
  TEAM4S_PHASE117_TEST_DSN=postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_phase117_test_147a?sslmode=disable
  go test ./internal/repository/... -run "TestPublicNoteRoleCode|TestReleaseDetailPublicSegments" -v
  ```
  Result: `PASS` — both `TestPublicNoteRoleCode` sub-tests and all three `TestReleaseDetailPublicSegments`
  sub-tests green.
- Dropped the ephemeral test database after the run (`DROP DATABASE team4s_phase117_test_147a`) —
  no persistent state left behind on the shared dev Postgres instance.
- `grep -n "role_code" shared/contracts/openapi.yaml` shows exactly two new schema-property lines
  (`PublicReleaseNote` at line ~14915, `ProjectMemberNote` at line ~15163); confirmed neither
  schema's `required:` array token list changed.

## Deviations from Plan

None — plan executed exactly as written. One clarifying note: the plan's acceptance-criteria grep
command (`grep -c "RoleCode"`, case-sensitive) undercounts because the SQL-side addition is
lowercase `role_code`, not the Go identifier `RoleCode` — a case-insensitive grep
(`grep -ic "role_code\|rolecode"`) reports 3/2/6 matches for the three repository files
respectively, consistent with the plan's intended "struct field + SELECT COALESCE + Scan arg"
count. This is a plan-wording nuance, not a functional gap; the authoritative `go build`/`go vet`/
real-Postgres-test verification all pass.

## Self-Check: PASSED

- FOUND: backend/internal/repository/release_detail_public_repository.go
- FOUND: backend/internal/repository/release_detail_public_repository_helpers.go
- FOUND: backend/internal/repository/project_member_public_repository.go
- FOUND: backend/internal/testsupport/phase117_postgres.go
- FOUND: backend/internal/repository/public_note_role_code_integration_test.go
- FOUND: shared/contracts/openapi.yaml (role_code present, 2 occurrences)
- FOUND commit 3919c4b6 (Task 1)
- FOUND commit 5fb60084 (Task 2)
- FOUND commit 874e61d3 (Task 3)
