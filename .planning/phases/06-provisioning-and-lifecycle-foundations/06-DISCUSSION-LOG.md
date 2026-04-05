# Phase 6: Provisioning And Lifecycle Foundations - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 06-provisioning-and-lifecycle-foundations
**Areas discussed:** Folder model, Provisioning trigger, Safety rules, Lifecycle contract, Allowed request data

---

## Folder model

| Option | Description | Selected |
|--------|-------------|----------|
| Only `anime` and `group` | Keep Phase 6 narrow and explicit | |
| `anime` and `group`, but extensible later | Deliver only those two now, keep contract ready for more entity types later | ✓ |
| `anime`, `group`, and `release` immediately | Broader first cut with more entity types | |

**User's choice:** Extensible later
**Notes:** User then asked how asset folder ordering is typically handled in industry. We aligned on entity-first structure with fixed asset-type subfolders as the practical default.

---

## Provisioning trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit admin action | Operator presses a dedicated provisioning button | |
| Automatic on first upload | Provision when upload needs the structure | ✓ |
| Both explicit and automatic | Dedicated action plus fallback auto-provisioning | |

**User's choice:** Automatic on first upload
**Notes:** User explicitly required that existing folders must not be recreated, all errors must be clear in the UI, and all actions/failures must be logged.

---

## Safety rules

| Option | Description | Selected |
|--------|-------------|----------|
| Very strict | Known entity types only, canonical roots only, no freeform client paths | ✓ |
| Medium | Strict entity identity but some flexible path/input segments | |
| More open | Greater client control over pathing or target specifics | |

**User's choice:** Very strict
**Notes:** User also selected "no dry-run" for Phase 6 and wanted real validation plus real execution only.

---

## Lifecycle contract

| Option | Description | Selected |
|--------|-------------|----------|
| Provisioning only | Leave upload/replace/delete semantics for later phases | |
| Provisioning plus baseline lifecycle rules | Lock the rules now, implement the full behavior later | ✓ |
| Full lifecycle semantics now | Specify everything in detail already in Phase 6 | |

**User's choice:** Provisioning plus baseline lifecycle rules
**Notes:** For cleanup behavior, the user chose direct physical deletion of superseded files rather than archive/marker-based cleanup.

---

## Allowed request data

| Option | Description | Selected |
|--------|-------------|----------|
| Very restrictive request contract | Only minimal identifying fields and file payload; server derives the rest | ✓ |
| Moderately flexible request contract | Minimal fields plus a few hints or mode switches | |
| Flexible request contract | Client can influence pathing/naming/storage choices | |

**User's choice:** Very restrictive request contract
**Notes:** The user also chose a per-entity allowlist for `asset_type`, not a global loose string.

---

## the agent's Discretion

- Exact canonical folder segment naming
- Exact provisioning response payload fields
- Exact audit event schema and naming
- Exact MIME and filename normalization rules within the strict contract

## Deferred Ideas

- Full generic upload UX belongs to Phase 7
- Full replace/delete operator UX belongs to Phase 8
- Additional entity types beyond `anime` and `group`
