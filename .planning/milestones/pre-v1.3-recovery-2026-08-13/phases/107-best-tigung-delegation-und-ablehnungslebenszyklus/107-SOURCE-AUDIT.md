# Phase 107 — Multi-Source Coverage Audit

**Result:** All in-scope GOAL, REQ, RESEARCH and CONTEXT items are covered. Deferred Phase 107.1/108+ product surfaces are explicitly excluded and do not appear in executable tasks.

| Source | ID | Feature / Requirement | Plan | Status | Notes |
|---|---|---|---|---|---|
| GOAL | — | Reusable domain-neutral review/delegation foundation with typed rights, first-decision-wins, audit and bounded review points; no concrete source/UI | 01-06 | COVERED | Test → schema → permission/repositories → service |
| REQ | P107-SC1 | Typed group capabilities, same-group admin delegation, global platform admin, no redelegation | 01-04,06 | COVERED | Permission Engine, dedicated DB-backed AuthzRepository tests and tx-bound delegation |
| REQ | P107-SC2 | No reservation/assignment; exactly first atomic decision wins with stable conflict | 01,02,05,06 | COVERED | DB Unique plus rollback-tested service |
| REQ | P107-SC3 | Self-review denied for App-User or membership-independent verified Member match; trustworthy submitter/beneficiary target attribution required; reasoned platform override; platform actors never rewarded | 01,02,03,06 | COVERED | Every actor identity resolved tx-bound; platform without actor Member allowed only with complete target attribution and proven no-match |
| REQ | P107-SC4 | Actual-mutation audit only; no audit for Grant/Revoke no-op or reads; invalid attribution has no side effects; reject category + mandatory reason; separate override reason; immutable structured history; scrub-capable free text | 01,02,03,04,06 | COVERED | Dedicated no-read-audit repository test plus typed parent and purpose-separated reason children |
| REQ | P107-SC5 | PointService-only review awards; max append-only reject plus later confirm slot per concrete source | 01,02,05,06 | COVERED | Source-global slots close member-key gap and reject UPDATE/DELETE/TRUNCATE |
| REQ | P107-SC6 | Narrow adapters and automated authorization/self-review/platform/concurrency/audit/credit tests; no Release/UI wiring | 01-06 | COVERED | Fake adapter and artifact boundary |
| RESEARCH | R-01 | Reuse existing Permission Engine, fallback matrix, action catalog and startup fail-closed check | 02,03 | COVERED | No parallel boolean review permission |
| RESEARCH | R-02 | Make AuthzRepository tx-bound without widening shared repository.DBTX or changing established permissions.Resolver | 03 | COVERED | Focused AuthzDBTX + WithDB + separate ReviewContextResolver, with exact DB-backed repository cases owned by Plan 03 |
| RESEARCH | R-03 | Direct grants require active app user/membership and verified anchor; Self-review identity resolves all verified actor Members without Membership dependency | 03,04,06 | COVERED | Dedicated ordinary/platform identity tests, exact grant-scope test and no-read-audit proof |
| RESEARCH | R-04 | Immutable Decision unique on SourceType+StableKey+Revision; every loser is conflict | 01,02,05,06 | COVERED | No same-actor retry success |
| RESEARCH | R-05 | Conditional adapter mutation shares the winning transaction | 06 | COVERED | Narrow registry-bound interface; positive adapter-owned submitter/beneficiary attribution is validated before any mutation |
| RESEARCH | R-06 | Mandatory typed audit for actual mutations; no best-effort generic audit and no no-op/read audit | 02,04,06 | COVERED | Changed signal gates delegation audit |
| RESEARCH | R-07 | Every Reject has structured category + nonblank reason; override reason separate; free text only in deletable purpose child | 01,02,04,05,06 | COVERED | Privacy scrub boundary without losing category |
| RESEARCH | R-08 | Source-global append-only slot before PointService because Phase-106 key is beneficiary-scoped | 01,02,05,06 | COVERED | Advisory xact lock + recheck + Unique + DB mutation guards |
| RESEARCH | R-09 | `review.decision` RuleRef v1, category platform_contribution, equal value 1 for confirm/reject | 01,02,06 | COVERED | Fail-closed seed; caller cannot override |
| RESEARCH | R-10 | Real PostgreSQL Up/Down/Up, barrier concurrency and rollback gates | 01,02,05,06 | COVERED | Dedicated disposable database, no phase-gate skip |
| RESEARCH | R-11 | Stable `errors.Is` service sentinels for conflict/self-review/override/capability/target states | 06 | COVERED | Handler mapping intentionally later |
| RESEARCH | R-12 | Platform reward skip must not suppress adapter-owned submitter work credit/reversal | 06 | COVERED | Fake adapter contract; no concrete domain |
| RESEARCH | R-13 | Boundary forbids handlers, frontend/contracts, concrete sources, cleanup, upload, rankings and direct ledger writes | 01,06 | COVERED | Artifact-local scans only |
| CONTEXT | D-01 | Separate capabilities for text, image and contribution | 01-03,06 | COVERED | Three exact actions; no generic decide |
| CONTEXT | D-02 | Fansub admin same-group active confirmed target; platform global; delegate cannot redelegate | 03,04,06 | COVERED | Central members.manage/platform authority |
| CONTEXT | D-03 | Grant has no expiry; no automatic revoke on no login/inactivity | 02,04,06 | COVERED | Stored grant persists; current use can deny inactive |
| CONTEXT | D-04 | Delegation UI extends canonical member editor, never a second management surface | 01,03,06 | COVERED | This foundation adds no UI/route; boundary reserves the later canonical integration only |
| CONTEXT | D-05 | No reservation, takeover, assignment table or person-owned review state | 01,02,05,06 | COVERED | Explicit schema/source boundary |
| CONTEXT | D-06 | All authorized reviewers may act; first atomic commit wins; losers stable conflict/no points | 01,02,05,06 | COVERED | Decision Unique plus full loser rollback |
| CONTEXT | D-07 | Revoke only future decisions; history/earned points remain; nothing reassigned | 02,04,06 | COVERED | Grant deletion only |
| CONTEXT | D-08 | Regular self-review forbidden; platform override requires explicit nonblank reason | 01,02,03,06 | COVERED | Both target identity anchors required; App-user plus every membership-independent verified Member comparison; absent attribution rejects before side effects |
| CONTEXT | D-09 | Platform admins global, actor Member optional, never receive points/badges/awards; submitter work may still credit | 01-03,06 | COVERED | Existing bypass plus hard reward skip; Member-less platform decision requires complete target attribution and proven no-match |
| CONTEXT | D-10 | Platform override has no review points; later domain work reversal uses PointService exactly once | 02,04,06 | COVERED | Core preserves adapter-owned `ReverseInTx`; fake integration proves it without binding a source |
| CONTEXT | D-11 | Every mutation audited; reads not; later lifecycle/cleanup events supported by structured seam | 01,02,04,06 | COVERED | Phase 107 emits only its foundation mutations; later lifecycle emission remains in its owning phase |
| CONTEXT | D-12 | Every Reject requires structured category + nonblank reason; platform Self-Override separately requires nonblank reason; immutable metadata and scrub-capable text | 01,02,04,05,06 | COVERED | Category snapshot plus purpose-separated parent/child guards |
| CONTEXT | D-13 | Explicit system actor; no fake Member/profile | 02,04,06 | COVERED | ActorKind `system` |
| CONTEXT | D-14 | Confirm/reject same fixed small points; no caller value/key; PointService owns rule-derived value/key | 01,02,06 | COVERED | RuleRef fixed internally; collision-free source identity is server-composed before PointService generates the ledger key |
| CONTEXT | D-15 | Stable source identity; max one reject slot and one later confirm slot | 01,02,05,06 | COVERED | Revision excluded from source-global slot |
| CONTEXT | D-16 | Distinct concrete texts/images independent; edit/resubmit preserves source identity | 01,05,06 | COVERED | StableKey independence and across-revision tests |
| CONTEXT | D-17 | Review credit belongs to reviewer Member; platform without Member remains valid and point-free | 02,03,05,06 | COVERED | Credit Member from active Membership; Self-review Member set from independent verified claims |
| CONTEXT | Deferred | Release queue/detail, automatic submit/publish, rejection editing/resubmit, cleanup | NONE | EXCLUDED | Phase 107.1 |
| CONTEXT | Deferred | `anime_contributions` and other existing source adapters | NONE | EXCLUDED | Phase 108 |
| CONTEXT | Deferred | Rankings, badges and public UI | NONE | EXCLUDED | Phases 109–110 |
| CONTEXT | Deferred | Generic credit-to-permission bridge | NONE | EXCLUDED | Explicit pending todo |

## Prohibition Audit

The plan set contains no task that creates or modifies:

- `review_assignments`, claim/reservation/takeover state, queue ownership or personal assignment;
- handler, server route, OpenAPI/shared contract, frontend or UI files;
- concrete release-note, release-version-media or anime-contribution adapters;
- cleanup/retention jobs or upload/media ownership flows;
- badges, rankings or direct `point_ledger_entries` inserts.
- mutation APIs for existing `review_credit_slots`; the table is insert-only and DB-guarded against UPDATE/DELETE/TRUNCATE.

`review_credit_slots` is not a ledger. It is the required source-global arbiter; the actual award remains exclusively `PointService.CreditInTx` → `point_ledger_entries`.

## Plan Ownership Audit

- `backend/internal/repository/authz_permissions_test.go` is modified only by Plan 107-03 (Wave 3); no same-wave plan owns it.
- `backend/internal/services/review_service_boundary_test.go` is modified only by Plan 107-06 (Wave 4), using exact analog `backend/internal/services/point_service_boundary_test.go`.
- Same-wave file ownership remains disjoint across all six plans after these revisions.
