# Domain Pitfalls

**Domain:** Admin anime intake, Jellyfin-assisted imports, asset provenance, manual overrides, admin-visible errors, audit logging, and anime relation CRUD
**Researched:** 2026-03-24

## Critical Pitfalls

### Pitfall 1: Preview Imports That Persist Too Early
**What goes wrong:** A "preview" flow quietly creates durable anime rows, stores Jellyfin links, uploads assets, or writes audit records that look like completed creates before the admin clicks save.
**Why it happens:** Teams reuse the final create path for preview hydration, or they need a persistent ID too early for media handling.
**Consequences:** Cancelled imports leave ghost anime, orphaned media, misleading audit trails, and duplicate records on retry.
**Warning signs:**
- Preview responses already contain a permanent `anime_id`
- Cancelling a Jellyfin preview leaves database rows or asset files behind
- Retrying the same preview creates duplicate draft-like records
**Prevention:** Keep preview state as a non-persistent DTO until explicit save. Do not allocate a durable anime record or provenance row during preview. If temporary media caching is unavoidable, keep it in a TTL-bound scratch area not linked to the final anime ID. Final save should perform one transaction that creates the anime, attaches source linkage, and records the audit event.
**Phase should address it:** Phase 2 - Jellyfin-Assisted Creation

### Pitfall 2: Weak Source Identity Causes Wrong Imports And Bad Re-Syncs
**What goes wrong:** The system treats title text as the source identity instead of the Jellyfin item ID plus path/library context, so admins select the wrong item or later sync against a moved/replaced item.
**Why it happens:** Search UX optimizes for display titles only, and backend persistence stores only a loose title/path string instead of immutable source identity plus a snapshot of what the admin picked.
**Consequences:** Wrong anime gets linked, re-sync fills fields from the wrong source, path moves look like missing items, and duplicate local folders become impossible to distinguish.
**Warning signs:**
- Selection UI does not show Jellyfin ID and visible path together
- Linked anime cannot explain which exact Jellyfin item was chosen
- A folder move or library rescan breaks re-sync without a clear relink path
**Prevention:** Require the preview and persisted link to carry Jellyfin item ID, library context, and the human-readable path snapshot shown to the admin at selection time. On re-sync, verify the source item still resolves; if it does not, surface a relink workflow instead of silently falling back to title matching. Keep the original source snapshot for audit and debugging.
**Phase should address it:** Phase 2 - Jellyfin-Assisted Creation, reinforced in Phase 4 - Data Ownership And Re-Sync Rules

### Pitfall 3: Manual Override Protection Implemented As "Non-Empty Wins"
**What goes wrong:** Manual protection is implemented as a simple "do not overwrite non-empty fields" rule, with no per-field provenance or distinction between imported, manually edited, and intentionally cleared values.
**Why it happens:** It looks simpler than tracking field ownership state, and it appears to match the v1 rule until admins start editing or clearing fields.
**Consequences:** Manual edits still get clobbered in edge cases, intentionally cleared fields repopulate unexpectedly, and operators cannot explain why one field syncs while another does not.
**Warning signs:**
- There is no stored per-field origin or last-imported value
- Clearing a field behaves the same as "never imported" or "manual blank"
- Re-sync behavior can only be described in prose, not by persisted state
**Prevention:** Track field-level provenance for Jellyfin-backed values. At minimum store whether the current value is imported, manually edited, or explicitly cleared after import. Preserve the last imported value separately from the current editorial value. Re-sync logic should consult that state rather than only checking for empty strings/nulls. Add matrix tests for untouched import, manual edit, manual clear, later refill, and repeated sync.
**Phase should address it:** Phase 4 - Data Ownership And Re-Sync Rules

### Pitfall 4: Removable Imported Assets Without A Provenance Ledger
**What goes wrong:** The UI offers "remove imported asset" actions, but the backend only stores bare URLs/paths, so it cannot reliably tell imported assets from manual uploads or prevent removed imported assets from coming back.
**Why it happens:** Asset fields start as simple columns, and provenance is added later as a UI concern instead of as a data model.
**Consequences:** Removing a Jellyfin-derived asset can delete the wrong thing, replacement uploads lose attribution, and later syncs or local `.nfo`/image priority can resurrect assets the admin thought were removed.
**Warning signs:**
- Remove buttons are driven by guessed URL patterns instead of persisted origin metadata
- After removal, the same Jellyfin poster/banner returns on the next sync
- Manual replacement and imported removal share the same code path
**Prevention:** Model media as provenance-aware records, not just scalar fields. Store origin (`manual`, `jellyfin-import`), source item ID, source locator, and status (`active`, `removed`, `replaced`). Treat removal of imported assets as a local suppression/tombstone, not deletion of the upstream file. Replacement should create a new manual asset record while preserving the old imported record for traceability. Sync logic must honor suppression so removed assets do not silently reappear.
**Phase should address it:** Phase 5 - Media Provenance And Admin Reliability, with sync suppression hooks in Phase 4 - Data Ownership And Re-Sync Rules

### Pitfall 5: Relation CRUD That Corrupts The Graph
**What goes wrong:** Relation management allows duplicate edges, self-links, contradictory directions, or season-like misuse of relation types.
**Why it happens:** Teams expose raw table CRUD without defining graph rules, uniqueness constraints, or editorial semantics.
**Consequences:** The same pair of anime can end up linked multiple ways, admin UIs show inconsistent relation sets, and later consumer features cannot trust the data.
**Warning signs:**
- An anime can be related to itself
- The same source/target/type combination can be created twice
- Admins use relation types to fake "season 2" instead of linking distinct anime intentionally
**Prevention:** Define a canonical relation model before building the UI: no self-relations, uniqueness on source/target/type, explicit allowed enum values for v1, and consistent directional semantics. Validate relation edits against existing records before save. Show existing links inline during editing so admins can see conflicts. Use AniDB-style relation semantics as editorial guidance, not free-text interpretation.
**Phase should address it:** Phase 3 - Anime Relations Management

## Moderate Pitfalls

### Pitfall 6: Modeling Anime Identity Around Season UI Instead Of Editorial Records
**What goes wrong:** Intake and relation flows assume anime map cleanly to numbered seasons, even though anime databases and Jellyfin naming often split or merge entries differently.
**Why it happens:** Teams copy western-TV assumptions into anime workflows, then try to patch over edge cases with relations later.
**Consequences:** Duplicate records are created for what should be one editorial work, or separate works get collapsed incorrectly. Relation CRUD becomes cleanup for an intake-model mistake.
**Warning signs:**
- The intake form implies every continuation is just another season
- Admins need relation management to undo auto-grouping choices made during creation
- Same franchise entries repeatedly need manual correction after import
**Prevention:** Keep anime creation focused on creating one explicit editorial record at a time. Make AniSearch/AniDB identifiers visible and editable early. Do not infer sequel/side-story relations automatically from folder names or season numbers. Add admin guidance for when to create a new anime versus when to edit an existing one.
**Phase should address it:** Phase 1 - Manual Anime Intake Baseline and Phase 3 - Anime Relations Management

### Pitfall 7: Error Surfaces That Are Either Opaque Or Too Raw
**What goes wrong:** Admins either get a generic "Jellyfin failed" message or a raw backend/upstream error blob with internal details and no actionable next step.
**Why it happens:** Error handling is added late, after happy-path workflows exist, and the same message format is used for operators and logs.
**Consequences:** Operators cannot self-serve debugging, repeated retries create noise, and developers still have to inspect logs for simple config/auth/path issues.
**Warning signs:**
- Different failure modes produce the same UI message
- Errors shown in the UI do not identify the failed step
- Stack traces, credentials, raw URLs, or internal file paths leak into admin-visible messages
**Prevention:** Use a structured admin error envelope with step (`search`, `preview`, `save`, `sync`, `remove-asset`, `relation-save`), concise user-safe summary, operator detail, correlation/request ID, and retryability. Separate upstream/raw error storage from UI rendering. Distinguish validation conflicts from Jellyfin auth, connectivity, not-found, and metadata parse failures.
**Phase should address it:** Phase 5 - Media Provenance And Admin Reliability, with step-specific coverage added as Phases 2-4 are implemented

### Pitfall 8: Audit Logs Too Thin To Explain What Happened
**What goes wrong:** The system logs only that an admin "updated anime" or "synced anime," with no target details, source context, or before/after summary.
**Why it happens:** Audit logging is treated like basic request logging rather than an operator-facing reconstruction tool.
**Consequences:** You can identify the actor but not the decision, the source item, or the changed fields. Debugging and accountability both stay weak.
**Warning signs:**
- Audit entries contain actor and endpoint but no domain payload summary
- Failed or denied actions are not logged
- Relation changes and asset removals are indistinguishable from generic updates
**Prevention:** Write append-only audit events for create, edit, sync, remove-asset, and relation CRUD actions. Include actor user ID, target anime ID, source Jellyfin item ID if relevant, action type, outcome, correlation ID, and a compact before/after summary of changed fields. Log failed and denied attempts too, while keeping secrets/tokens out of logs.
**Phase should address it:** Phase 5 - Media Provenance And Admin Reliability, with event schema hooks needed in Phase 3 - Anime Relations Management and Phase 4 - Data Ownership And Re-Sync Rules

## Minor Pitfalls

### Pitfall 9: Non-Idempotent Save, Sync, And Remove Actions
**What goes wrong:** Double-clicks, retries, or browser refreshes create duplicate anime, duplicate relation writes, or repeated asset removals with inconsistent state.
**Why it happens:** Admin workflows are assumed to be low volume, so idempotency and race handling are skipped.
**Consequences:** Operators lose trust because the same action sometimes runs twice and leaves partial side effects.
**Warning signs:**
- Repeating the same request produces new rows instead of the same result
- Audit history shows duplicate entries seconds apart for the same action
- Remove or sync actions fail on second attempt instead of being harmless
**Prevention:** Add idempotent handlers for save/sync/remove where practical, or at least detect duplicate in-flight actions. Use optimistic locking/version checks on anime edits, unique constraints on relation edges, and safe no-op behavior for repeated asset suppression/removal.
**Phase should address it:** Phase 2 - Jellyfin-Assisted Creation through Phase 5 - Media Provenance And Admin Reliability

### Pitfall 10: Preview Validation And Final Save Validation Drift Apart
**What goes wrong:** The preview looks valid, but final save rejects the data or silently normalizes it differently, especially for media fields, AniSearch IDs, and relation-adjacent edits.
**Why it happens:** Preview mappers, frontend form validation, and backend persistence validation evolve separately.
**Consequences:** Admins distrust the workflow because the form they reviewed is not the form the backend actually accepts.
**Warning signs:**
- Preview payload shape differs materially from final save payload shape
- Required-field or enum validation rules are duplicated in multiple places
- QA finds cases where previewed metadata disappears or changes on save
**Prevention:** Share validation contracts between preview hydration and final persistence. Normalize imported values before they hit the form, not again during save. Add end-to-end tests that compare previewed values, editable form values, and stored values for the same scenario.
**Phase should address it:** Phase 1 - Manual Anime Intake Baseline and Phase 2 - Jellyfin-Assisted Creation

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1 - Manual Anime Intake Baseline | Intake model quietly bakes in season-based assumptions | Keep anime creation as one editorial record at a time; expose AniSearch/AniDB IDs and avoid auto-inferring franchise structure |
| Phase 2 - Jellyfin-Assisted Creation | Preview flow persists too early or links by title instead of source identity | Separate preview from save; require Jellyfin item ID plus visible path snapshot |
| Phase 3 - Anime Relations Management | Raw CRUD creates duplicate, self, or semantically inconsistent edges | Add graph constraints, allowed enums, and conflict-aware UI before exposing writes |
| Phase 4 - Data Ownership And Re-Sync Rules | "Non-empty wins" logic fails for manual edits, clears, and suppressed assets | Store per-field provenance and explicit cleared/suppressed state; test sync matrices |
| Phase 5 - Media Provenance And Admin Reliability | Remove/replace/audit/error handling stays too shallow to debug operations | Add provenance-aware media records, structured admin errors, and append-only audit events with context |

## Sources

- Jellyfin metadata docs: local `.nfo` metadata has priority over remote providers, supports `lockedfields`, and can drive image selection. This is the main reason imported asset removal and re-sync suppression need explicit state instead of value-only fields. Source: https://jellyfin.org/docs/general/server/metadata/nfo/ (HIGH confidence)
- Jellyfin media naming docs: provider IDs in folder naming improve matching reliability, which supports requiring stronger source identity than title text alone. Source: https://jellyfin.org/docs/general/server/media/movies/ (MEDIUM confidence for the matching implication)
- Jellyfin metadata overview: Jellyfin combines multiple providers, including local metadata and plugins such as AniDB, which increases the chance of source disagreement if provenance is not tracked explicitly. Source: https://jellyfin.org/docs/general/server/metadata/ (HIGH confidence)
- AniDB relation guidance: relation semantics are editorial, and anime entries do not always map cleanly to western season assumptions. The page is useful but marked as needing updates, so treat it as directional rather than definitive. Source: https://wiki.anidb.net/Content%3ARelations (MEDIUM confidence)
- OWASP Logging Cheat Sheet: application logs should capture who/what/when/where and cover failures as well as successes without leaking sensitive data. Source: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html (HIGH confidence)
