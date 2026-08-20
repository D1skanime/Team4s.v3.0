# Phase 136: Capability Policy, Catalog & Schema Contract - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-20
**Phase:** 136-capability-policy-catalog-schema-contract
**Areas discussed:** Individually overridable capabilities, reason and audit, assignable roles without rights, canonical Karaoke-FX role

---

## Individually overridable capabilities

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit catalog opt-in | A catalog flag controls overridability; new capabilities default to off. | ✓ |
| All group capabilities | Every group-scoped capability is automatically overridable except platform rights. | |
| Static backend allowlist | Go code maintains a separate list of overridable capabilities. | |

**User's choice:** Explicit catalog opt-in; opted-in capabilities support both personal Allow and Deny.
**Notes:** Deny has precedence. Platform/global, rights, role, delegation, security, and audit administration remain non-overridable. New capabilities fail closed.

---

## Reason and audit

| Option | Description | Selected |
|--------|-------------|----------|
| Always require a reason | Every actor must explain every override mutation. | |
| Platform-admin exception | Normal administrators require a reason; platform administrators may omit it. | ✓ |
| Optional for everyone | Reasons are always optional. | |

**User's choice:** A platform administrator does not need to justify a mutation; other administrators do.
**Notes:** Structured categories are used, with required free text for `other`. All real mutations retain immutable actor/time/target/group/capability/before-after metadata. Platform administrators see all history; group administrators see only their group. Exact idempotent saves do not create duplicate domain-audit entries.

---

## Assignable roles without rights

| Option | Description | Selected |
|--------|-------------|----------|
| Roles may have zero rights | Identity and permissions stay separate; UI discloses zero-right state contextually. | ✓, refined |
| Every role receives broad defaults | Role names imply a standard administrative permission bundle. | |
| Hide zero-right roles | Roles without operative capabilities cannot be selected. | |

**User's choice:** Keep identity and permissions separate, but provide confirmed narrow defaults for `gfxler`, `techadmin`, `founder`, and `co_leader`.
**Notes:** All four receive group-media upload/edit/reorder rights. `gfxler` covers logo/banner/images; `techadmin` also edits technical links; `founder` also edits founding date/history; `co_leader` also edits general page content/links. No implied role/member administration or media deletion. The selector remains compact and shows the zero-right message only when relevant.

---

## Canonical Karaoke-FX role

| Option | Description | Selected |
|--------|-------------|----------|
| Keep combined with Typesetting | Karaoke and Typesetting remain represented by one role. | |
| Local UI-only role | Add Karaoke FX only to the immediate member selector/page. | |
| Canonical cross-surface role | Add a distinct assignable role used by all role, badge, point, member, profile, release, and credit surfaces. | ✓ |

**User's choice:** `karaoke_fx` is distinct from `typer`/Typesetting and must be integrated everywhere, not fixed in one code location.
**Notes:** Phase 136 owns the canonical key, metadata, assignability, contracts, badge/point integration requirement, fixtures, and tests. It initially receives no group-administration capabilities merely from its name. General badge-UI unification remains deferred.

## the agent's Discretion

- Exact schema identifiers and normalized representation.
- Exact concise zero-right notice wording.
- Mapping of the confirmed product-level defaults onto existing/new canonical capability keys.

## Deferred Ideas

- Effective resolver/enforcement: Phase 137.
- Rights inspector/override editor/impact UX: Phase 138.
- Scalable user projections: Phase 139.
- Finding #34 general badge-UI unification and Finding #33 document/initiative library: later milestone.
