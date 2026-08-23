# Phase 138 — GSD Execute Pack

## Status

**Execute-ready planning pack** for Claude/GSD.

Place the whole folder under:

`.planning/phases/138-effective-rights-administration-impact-ux/`

Do not run a fresh discuss-phase. The four Discuss files in this pack are the approved decisions.

## Required reading before execute

1. `138-CONTEXT.md`
2. `138-RESEARCH.md`
3. `phase-138-discuss-01-admin-architektur-navigation.md`
4. `phase-138-discuss-02-effective-rights-user-overrides.md`
5. `phase-138-discuss-03-rollen-capabilities-impact-activation.md`
6. `phase-138-discuss-04-claims-aenderungen-adjacent-context.md`
7. `AGENTS.md`
8. `CLAUDE.md`
9. `AI-HANDOFF.md`

## Execution waves

### Wave 1 — independent foundations
- `138-01-PLAN.md` — combined admin shell + user list/detail IA
- `138-02-PLAN.md` — frontend Phase-137 Effective Rights API seam/view model
- `138-04-PLAN.md` — backend role-capability impact preview + activation contract

These may run in parallel in isolated workers.

### Wave 2
- `138-03-PLAN.md` — canonical user-in-group Effective Rights editor; depends on 01 + 02
- `138-05-PLAN.md` — role-capability impact/activation UI; depends on 01 + 04
- `138-06-PLAN.md` — role-holder/group cross-navigation; depends on 01 + 03

### Wave 3
- `138-07-PLAN.md` — Claims/Änderungen integration + bounded contribution-label correction; depends on 01 + 03 + 06

### Wave 4
- `138-08-PLAN.md` — integrated regressions, Linux green gate and live UAT; depends on all implementation plans

## Non-negotiable boundaries

- No second permission resolver.
- No authorization decisions derived from role labels in the UI.
- User Effective Rights come from Phase 137.
- Role-capability impact uses the same resolver semantics.
- HTTP 200 is not proof of active permission cache state.
- Do not pull Phase-139 contribution/media projection redesign into Phase 138.
- Do not invent Streaming functions/data.
- All execute and verification runs on `team4s-linux`.
- Use the central refresh-capable API client; no component token reads/bearer construction.
- One canonical user-in-group rights editor; user/group/role are entry perspectives, not separate mutation implementations.
- One canonical role-capability editor; capability detail is analysis/navigation.

## Completion artifacts

Expected after execute:
- `138-01-SUMMARY.md` through `138-08-SUMMARY.md`
- `138-UAT.md`
- `138-VERIFICATION.md`
- passing `scripts/phase138-green-gate.sh`
