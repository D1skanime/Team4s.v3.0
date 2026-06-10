# DECISIONS

## 2026-06-10 - Fansub Members Uses Two Domain Tables; Historical Linkage Only Through Confirmed Claims

### Decision
The admin fansub member workspace at `/admin/fansubs/[id]/edit` keeps one visible Fansub Members/Collaboration tab, but the content is split into two domain-owned tables:

- `App-/Fansub-Members`: app/admin workspace members, invitations, access state, and permission roles.
- `Historische Mitglieder`: public/historical fansub member entries and their role/task history.

The tab has one primary `Mitglied hinzufügen` action. Its modal or drawer offers separate paths for app member/invitation work and historical member creation. Historical members do not have their own active/disabled/pending workflow status. Their visible claim state is derived from claims/linkage only: `Nicht beansprucht`, `Claim offen`, or `Bestätigt/verknüpft`.

Historical member to app-profile linkage must not be performed manually by an admin in this UI. The linkage is created only when a logged-in user self-claims the historical member and a leader/admin confirms that claim.

### Why This Won
- A single mixed table makes app access and historical/public identity look like the same domain entity, which they are not.
- Two tables keep the UI scannable while preserving the data ownership split between app membership, historical group members, claims, and invitations.
- Self-claim confirmation prevents admins from accidentally attaching a historical identity to the wrong app profile.
- Removing historical active/disabled/pending states keeps the historical row model simple: it is a historical entry; claim state belongs to the claim/linkage.

### Consequences
- Implement table UI with existing global primitives such as `frontend/src/components/ui/Table.tsx`, `Button`, `Badge`, `EmptyState`, and `Modal`/`Drawer`.
- Do not add a UI action such as `Profil verknüpfen`, `App-Profil zuordnen`, or an equivalent manual linking path for historical members.
- Claim review can surface beside or inside the historical table, but mutations remain claim/invitation operations.
- Any backend/API changes needed later must keep contracts, DTOs, and frontend helpers aligned in the same change.

### Follow-ups Required
- The Phase 73 table UI agent should apply this as the target UX contract while avoiding concurrent overwrite of active edits in `FansubAppMembersSection.tsx`, `GroupMembersTab.tsx`, and related CSS.

## 2026-06-08 - Phasen-Ausführung komplett auf `main`; Worktree-Konvention abgeschafft (löst 2026-06-05 ab)

### Decision
Die Worktree-Konvention von 2026-06-05 wird zurückgenommen. Sowohl Planung als auch Code-Ausführung einer Phase laufen ab sofort direkt auf `main`. Es werden keine Schwester-Worktrees (`../Team4s-phaseNN`) und keine `codex/phase-NN`-Branches mehr angelegt. GSD wird mit `workflow.use_worktrees: false` betrieben, sodass `/gsd:execute-phase` Executor-Agenten sequenziell im Haupt-Working-Tree ausführt.

### Why This Won
- Die Worktree-Isolation hat in der Praxis zu **fehlerhaft umgesetzten Phasen** geführt: In den Schwester-Worktrees war `frontend/node_modules` oft nur ein leerer Cross-Link, sodass `vitest`/`tsc` nicht liefen und Phasen ohne echte Verifikation als „fertig" galten; zusätzlich entstanden stale Builds und Merge-Reibung auf `.planning/STATE.md`/`ROADMAP.md`.
- Direktes Arbeiten auf `main` hält Tooling, Tests und den Live-Dev-Server (`:3000`) konsistent mit dem tatsächlich ausgelieferten Stand.
- Der vermeintliche Isolationsvorteil wog den Korrektheitsverlust nicht auf — bei Solo-Entwicklung ist ein sauberer, getesteter Stand wichtiger als parallele Branch-Isolation.

### Consequences
- `.planning/config.json`: `workflow.use_worktrees` ist explizit `false`.
- `CLAUDE.md`-Abschnitt „Phasen-Ausführung auf `main`" ersetzt die frühere „Phasen-Worktree-Konvention".
- Disziplin bleibt: kein `git stash` bei offenen Änderungen, Artefakte gezielt per Pfad committen, nach Phase-UAT sofort committen.
- Bei parallelen GSD-Schreibern auf `main` weiterhin vor dem nächsten Schritt Live-Writer auf `.planning/STATE.md`/`ROADMAP.md` prüfen.

### Follow-ups Required
- Keine. Bestehende Alt-Worktrees unter `.claude/worktrees/` sind historisch und können bei Bedarf separat aufgeräumt werden.

## 2026-06-05 - Jede Phase executet im eigenen Worktree; Planung bleibt auf main

> **ABGELÖST am 2026-06-08** — siehe Eintrag oben. Worktree-Ausführung führte zu fehlerhaften Phasen; alles läuft jetzt auf `main`.


### Decision
GSD-Planungsartefakte (CONTEXT/RESEARCH/VALIDATION/UI-SPEC/PLAN) werden auf `main` erstellt und committet. Die Code-Ausführung einer Phase (`/gsd:execute-phase`) läuft in einem eigenen Schwester-Worktree pro Phase auf einem `codex/phase-NN-<slug>`-Branch und wird nach bestandener Verifikation zurück nach `main` gemergt. Ein separater Worktree NUR für die Planung wird bewusst NICHT gemacht.

### Why This Won
- Entspricht der bereits gelebten Praxis (`Team4s-phase72`/`-phase73`/`-phase75` auf `codex/phase-NN`-Branches).
- Planung erzeugt nur Docs: geringes Konfliktrisiko, und sie soll für parallele Phasen sofort auf `main` sichtbar sein. Die Code-Execution dagegen profitiert von Isolation + sauberem Merge.
- Ein Worktree nur für die Planung wäre der falsche Schnitt — Planen und Ausführen würden in verschiedene Worktrees auseinanderfallen.
- GSD `plan-phase` vermeidet bewusst Branch-Operationen (Branch-Invariante); ein erzwungener Auto-Hook ist daher unerwünscht. Dies ist eine Konvention, kein Automatismus.

### Consequences
- Pro Phase: `git worktree add ../Team4s-phaseNN codex/phase-NN-<slug>` von aktuellem `main` HEAD; dort executen, testen, dann zurück nach `main` mergen.
- `.planning/STATE.md` und `.planning/ROADMAP.md` sind geteilte, veränderliche Dateien → bei parallelen Phasen-Branches sind Merge-Konflikte genau dort möglich und werden manuell aufgelöst. Vor `execute-phase` Live-Writer auf `main` prüfen.
- Kein `git stash` bei offenen Änderungen; Artefakte gezielt per Pfad committen.

### Follow-ups Required
- Optional `gsd-workstreams`/`gsd-workspace` evaluieren, falls eine GSD-nativere Isolation gewünscht wird.

## 2026-06-02 - Phase 65 Review Queue Belongs In Fansub Edit, Not my-groups

### Decision
Leader/admin review actions for member contribution proposals belong in the existing internal group workspace at `/admin/fansubs/[id]/edit`. Phase 65 must not continue building the review queue primarily under `/admin/my-groups/[id]`.

### Why This Won
Live UAT in the Codex in-app browser showed that a logged-in group leader naturally lands in the existing fansub edit workspace when opening their group. The separate `my-groups` route made the feature technically reachable but undiscoverable from the real leader flow. It also risks confusing future public/member group surfaces, which are not yet defined.

### Consequences
- Put `Offene Vorschläge` and related confirm/reject actions in `/admin/fansubs/[id]/edit`, preferably as a dedicated tab or clearly owned section.
- Do not add new Phase-65 leader review behavior to `/admin/my-groups/[id]` unless a later decision redefines that route.
- Treat future public/member group pages as a separate product surface; do not mix public group presentation with internal review/admin actions.
- UAT for proposal review must start from the real leader workflow: profile/navigation -> group edit workspace -> proposals/review section.

### Follow-ups Required
- Keep or remove old `my-groups` proposal review code only after deciding the long-term public/member group route.
- Update Phase-65 verification and UAT notes to use `/admin/fansubs/[id]/edit` as the canonical review path.

## 2026-05-28 - Profile Story TipTap Persistence Needs A Dedicated Contract Phase

### Decision
Phase 53 keeps the profile story/description as plain text. Rich TipTap persistence for that field must be planned as a dedicated Phase 55 slice before implementation.

### Why This Won
Storing TipTap content safely is not only a UI change. It affects database shape, migration of existing plain text, backend request/response DTOs, OpenAPI, frontend types, sanitizer rules, and how the shared editor serializes content. A quick local patch would make the profile surface drift from the API contract.

### Consequences
- Phase 55 must define the persisted representation before coding.
- Migration and backend/API contract changes belong in the same phase as the frontend editor change.
- Existing plain text must keep rendering and migrate predictably.
- The shared TipTap editor should be reused instead of adding a profile-only rich-text path.

### Follow-ups Required
- At next Day Start, define Phase 55 with read-first files for profile persistence, existing TipTap flows, migrations, and OpenAPI.

## 2026-05-28 - Avatar Cropping Moves To A Shared Library-Based Component

### Decision
Stop treating the current avatar cropper as a sequence of small local bugs. Replace it later with one shared cropper component built on a modern maintained cropper library and reuse it for own profile avatar and fansub group images.

### Why This Won
Human UAT showed that the current in-house cropper can save a different crop from the preview and has unreliable movement constraints. The UI looked acceptable, but the functional behavior is too fragile for reuse.

### Consequences
- Do not keep patching the current cropper unless it is a tiny unblocker.
- Future cropper work should define expected behavior explicitly: free movement in all directions until the image edge reaches the circular crop boundary, accurate saved output, touch/mouse/keyboard parity, and reusable ownership-specific upload integration.
- Fansub group image flows should use the same shared component once available.

### Follow-ups Required
- Create/execute a future phase or quick slice for global cropper replacement after current UAT flow.

## 2026-05-26 - Agents Must Use Implementation Contracts Before Adding Parallel Code

### Decision
Codex and GSD work must use persistent implementation contracts before coding: search for existing seams first, map persisted UI data to semantic controls, keep API contracts aligned, and avoid duplicating helpers, hooks, services, DTOs, upload logic, auth handling, or domain ownership logic.

### Context
Repeated agent work had drifted in three ways: pages reinterpreted the global UI system, API behavior could be inferred locally instead of updated as a contract, and similar code could be rebuilt in different places for nearby problems.

### Options Considered
- keep reminding each agent manually in every prompt
- put only short reminders in `AGENTS.md`
- create persistent docs plus a project-local Codex/GSD skill that planners and executors can load

### Why This Won
Persistent docs and a project-local skill make the rule discoverable by both normal Codex work and GSD planning/execution. The instruction lives with the codebase instead of depending on repeated chat context.

### Consequences
- `AGENTS.md` now points agents to implementation, API, and UI contract rules.
- `docs/engineering/implementation-contract.md` is the general search-first and reuse gate.
- `docs/api/api-contracts.md` is the API contract workflow guide.
- `docs/frontend/ui-system.md` and `docs/agent-guidelines-ui.md` include semantic UI control mapping.
- `.codex/skills/team4s-implementation-contract/SKILL.md` makes these rules discoverable to GSD agents through project skill discovery.

### Follow-ups Required
- Future UI/API/code-reuse phases should include these contract docs and existing analog files in `read_first` blocks.

## 2026-05-26 - Upload UI Reuses Existing Domain Flows Instead Of Adding New Parallel Flows

### Decision
Future upload work must inspect and reuse the existing domain-specific upload flows before adding anything new. `MediaUpload` remains the reusable fansub/group media upload component. Release-version-scoped process media stays in `ReleaseVersionMediaSection` and `useReleaseVersionMedia`, addressed by real `release_version_id`. Anime media keeps using the existing anime create/edit upload planning and Jellyfin asset controls. Shared UI work may extract small primitives such as dropzone, progress, error, or preview components, but it must not merge domain flows or create another upload path beside the existing ones.

### Why This Won
The current upload flows encode different ownership rules. The risk is that a future agent sees repeated dropzone/progress/error UI and builds another almost-identical upload path. That would increase confusion and could attach media to the wrong entity. A reuse-first rule keeps the domain boundaries clear while still allowing small UI cleanup.

### Consequences
- New upload features must start by checking the existing upload components, hooks, API helpers, and domain docs.
- A new upload component, hook, endpoint, or table requires an explicit documented decision.
- Release-Version-Media must continue to use `release_version_media` with `release_version_id`.
- Shared upload cleanup should be limited to low-level UI primitives unless a separate decision approves a broader refactor.

### Follow-ups Required
- If GSD execute starts an upload-related slice, first identify which existing flow owns the target domain.
- If no existing flow fits, document why before implementing a new one.

## 2026-05-25 - Contributor Release Editors Are Capability-Gated And Platform Gates Must Block Child Effects

### Decision
Contributor-facing release-version editor access should be driven by backend capability responses, and the editor must not render its admin tab shell until both the current user and release capabilities are loaded. Denied `PlatformAdminGate` access must prevent protected children from mounting at all. Tests should cover the side-effect boundary, including children that would call APIs such as `getFansubList()`.

### Why This Won
Phase 48/49 established the separation between platform-admin surfaces and contributor-scoped surfaces. Without explicit regression tests, the UI could accidentally show admin tabs to non-platform users, flash admin shell before capability resolution, or let protected child effects start before the gate denies access.

### Consequences
- Non-platform users with `can_view_media` should only reach the media workspace.
- Non-platform users with `can_edit_notes` should only reach the notes workspace.
- Non-platform users with no relevant release capability should see no admin/editor actions.
- Platform admins get the full release-version editor tab set only after scope is loaded.
- Direct `/admin/fansubs/create` and `/admin/fansubs/merge` visits remain platform-admin gated.
- Platform-admin gates must be tested with children that have mount-time side effects, not only static text.

### Follow-ups Required
- Keep future contributor/admin tests capability-driven instead of inferring roles in the client.
- If more gated admin pages load lists on mount, add similar denial tests around their highest-level gate.

## 2026-05-21 - Browser-Facing API And Media URLs Stay Same-Origin/Public-Domain

### Decision
Browser-facing frontend code should resolve normal API and public/media URLs as same-origin or as an explicitly public domain. Docker-internal backend URLs such as `http://team4sv30-backend:8092`, `http://127.0.0.1:8092`, or `http://localhost:8092` belong only in server-side proxy/streaming boundaries, not in pages or components.

### Why This Won
The Docker-live frontend on `3002` could complete the Keycloak token exchange but then failed to resolve `/api/v1/me` because the browser tried to reach `127.0.0.1:8092` directly. The same class of bug existed in public/media helpers. A same-origin browser seam keeps local Docker, later public-domain deployments, token refresh, and auth resync behind one central Auth/API path.

### Consequences
- `API_INTERNAL_URL` is the server-side backend target for Next proxy code.
- `NEXT_PUBLIC_API_URL` must be empty/same-origin or a real public origin for browser users; it must not point at loopback backend ports in live deployments.
- Pages/components should not store tokens, read Keycloak tokens directly, or special-case auth state.
- Public/media URL helpers should reuse `frontend/src/lib/publicApiUrl.ts`.
- Explicit streaming routes remain allowed server-side boundaries and need separate live-domain smoke tests.

### Follow-ups Required
- Before public domain deployment, verify reverse proxy routing, Keycloak Redirect URIs/Web Origins, HTTPS/cookie behavior, `API_INTERNAL_URL`, `NEXT_PUBLIC_API_URL`, and streaming routes together.

## 2026-05-21 - Docker Live API Calls Should Flow Through The Frontend Proxy

### Decision
For Docker/live frontend verification, normal frontend API calls should route through the frontend proxy instead of relying on browser-visible backend topology assumptions.

### Why This Won
The live container setup can differ from the local dev server topology. Proxying through the frontend keeps the browser-facing API seam stable and avoids false negatives where the UI is correct but the browser cannot reach the backend as assumed.

### Consequences
- Phase 49 auth/API-client hardening should preserve a central browser-safe request seam.
- Docker UAT should verify the frontend route and proxy path together.
- Direct backend calls remain useful for API diagnostics, but not as the only proof that browser UI flows work.

### Follow-ups Required
- Keep Phase 49 tests focused on token lifecycle, central request behavior, and one-shot auth retry semantics.
- Do not scatter direct Keycloak/App token handling back into individual pages.

## 2026-05-19 - Fansub Anime Release Headers Prefer A Resolved Landscape Image Instead Of Poster-Only Rendering

### Decision
The fansub release overview endpoint now provides a resolved `header_image` for each anime entry. The release header UI should prefer this wide visual in the order `banner -> first background -> cover fallback`, instead of treating the block as poster-only.

### Why This Won
The release list header is visually closer to a horizontal media band than to a poster grid. The old `cover_image`-only contract forced portrait artwork even when broader anime assets already existed in Team4s. Reusing existing anime `banner` and `backgrounds` data keeps the change inside documented asset ownership instead of inventing a parallel release-media image source.

### Consequences
- the `GET /api/v1/admin/fansubs/:id/anime` response may now include `header_image`
- frontend consumers may prefer `header_image` and fall back to `cover_image`
- the backend continues to keep `cover_image` for compatibility and poster-style fallbacks

### Follow-ups Required
- if more screens need the same horizontal anime preview, they should reuse the same resolved `header_image` semantics
- future UI cleanup can decide whether the release list should become fully landscape-first on mobile as well

## 2026-05-17 - Phase 44 Centralizes Authorization On Team4s Permission Actions And Resolved Group Scope

### Decision
Phase 44 introduces one Team4s-owned permission engine that evaluates explicit action names against `CurrentUser`, global app roles, and resolved fansub-group context. Handlers and capability endpoints must consume this engine instead of making ad-hoc admin or role decisions.

### Why This Won
The codebase had already moved identity and membership ownership into Team4s with Phase 43, but authorization was still fragmented across `requireAdmin(...)`, route-local checks, and implicit assumptions about who may mutate release/media data. A central action matrix prevents drift between backend handlers and frontend affordances and keeps group-scope authorization on canonical fansub-release seams instead of legacy `users` or Keycloak claims.

### Consequences
- `CurrentUser` is the canonical authenticated principal for permission checks
- `platform_admin` stays global in `app_user_global_roles`
- group-scoped roles stay in `fansub_group_members` plus `fansub_group_member_roles`
- release and release-version checks must resolve canonical `fansub_group_id` membership through existing release tables
- frontend permission-aware UI should consume backend capability endpoints rather than duplicating the policy matrix

### Follow-ups Required
- future handlers should add new action constants and reuse the permission service instead of adding route-local role checks
- future UI slices should prefer capability endpoints over client-side role inference
- later phases can extend beyond `group` scope, but they should keep the same action-and-context seam

## 2026-05-16 - Phase 43 Uses Keycloak For Identity But Keeps Team4s As The Authority For App And Fansub Roles

### Decision
Phase 43 adopts Keycloak as the external identity and login provider, but Team4s remains the canonical authority for authenticated app users, global app roles, fansub memberships, and `fansub_lead`.

### Why This Won
The project needs real browser-authenticated users without leaking business authorization into JWT claims or realm configuration. Keeping Keycloak identity-only preserves clean boundaries for the later permission engine and avoids coupling group-scope authorization to external role claims.

### Consequences
- `app_users` is the new Team4s principal seam for authenticated users
- `app_user_global_roles` owns `platform_admin`
- `fansub_group_members` and `fansub_group_member_roles` own group membership and `fansub_lead`
- `/api/v1/me` is the first stable frontend session seam
- Keycloak logout invalidates local Team4s auth state, but it does not become the business authorization source

### Follow-ups Required
- Phase 44 must consume the Phase-43 seams instead of falling back to legacy `users` or Keycloak role claims
- local docs must stay explicit about the SQL bootstrap path for the first Team4s `platform_admin`

## 2026-05-16 - Phase 42 Collaboration Stays Parked Until Phases 43 Through 48 Exist

### Decision
Do not actively continue Phase 42 (`tiptap collaboration mvp fuer fansub group notes`) before Phases 43 through 48 establish the real user, role, and membership foundation.

### Why This Won
The collaboration slice only makes sense when it can be verified with real user identities, roles, and multiple participants. Building it earlier would create a technically interesting but weakly testable branch of work.

### Consequences
- the next major workflow should move toward Phase 43 instead of reopening collaboration first
- collaboration-specific testing should wait for real auth/permission context
- Phase 42 remains documented, but is intentionally skipped in the short term

### Follow-ups Required
- revisit Phase 42 after the auth/roles/member phases are in place
- keep handoff files explicit so future sessions do not restart Phase 42 too early

## 2026-05-13 - Rich-Text Editor Images Must Reuse The Existing Media Upload Flow

### Decision
When editor image support is added, it must reuse the existing Team4s media/upload flow and storage seams instead of inventing a TipTap-specific parallel uploader or persistence path.

### Why This Won
The editor already appears in many contexts, and media ownership in this repo is domain-sensitive. A special-case upload path inside TipTap would duplicate asset logic, blur storage ownership, and raise the risk of attaching files to the wrong entity.

### Consequences
- image support needs an explicit owning storage seam before implementation starts
- the future editor image command should call into existing product upload/media code rather than bypassing it
- the rollout should be designed so one editor can behave consistently across pages without forking media semantics per screen

### Follow-ups Required
- inspect the current reusable media upload path before any TipTap image implementation
- document which entity/storage seam owns editor images in the first implementation slice

## 2026-05-13 - Phase 40 Does Not Need A Full Separate UAT If Phase 41 Covers The Main Live Paths

### Decision
Treat Phase 40 as practically covered by the completed Phase-41 UAT unless we explicitly want documentary proof for the smaller residual paths (group-note delete, explicit sanitizing evidence, member-story live path).

### Why This Won
Phase 40 already has a strong technical verification baseline, and Phase 41's passed browser UAT re-exercised the main operator-critical save flows on the TipTap path: group notes, anime project notes, and release-version notes with real roles. Re-running a full separate Phase-40 UAT would mostly duplicate already-proven behavior.

### Consequences
- The main uncertainty around Phase 40 is documentary, not a known product failure.
- Follow-up planning should not treat Phase 40 as broadly unverified.
- If we want total closure, a mini-UAT addendum is enough; a full second UAT pass is usually unnecessary.

### Follow-ups Required
- update stale documents that still imply Phase 41 is not fully green
- decide whether to record a short Phase-40 mini-UAT addendum for delete/sanitizing/member-story coverage

## 2026-05-06 - Fansub Timeline Uses Release Duration And Release-Asset Semantics

### Decision
The fansub release timeline should use `release_variants.duration_seconds` as its first duration source. In the fansub UI, a segment with `source_type = release_asset` is treated as release-specific/upload-required until a concrete release-scoped `release_theme_assets` row exists.

### Why This Won
Operators enter or hydrate the total duration on the episode-version editor, so the fansub release overview must consume the same persisted value instead of deriving a longer timeline from stale or test segment data. Also, `release_asset` describes who still owns the upload work; showing a missing release-specific file as `Global/Admin` hides the action the fansub group still needs to take.

### Consequences
- `/admin/fansubs/:id/edit` should show the same release duration that `/admin/episode-versions/:id/edit` persists.
- `Global/Admin` means no release upload is needed.
- `Release-Asset` means a release-scoped asset exists.
- `Fehlt` means a release-specific asset is expected but missing.
- The fansub timeline rail should stay visually aligned with the grey episode-version editor rail unless the design system changes intentionally.

### Follow-ups Required
- smoke-test delete/re-upload on Release 41 once more after the latest upload-state fix
- decide whether release theme asset `size_bytes` metadata should be persisted or recovered from related media-file data

## 2026-05-05 - Global Theme Segment Coverage Locks Conflicting Release Uploads

### Decision
If a global/admin theme segment already covers a release's episode anchor for a given theme, release-specific theme-video uploads for that same theme must be rejected instead of silently overriding the global assignment.

### Why This Won
The product rule is that one OP/ED definition spanning an episode range such as episodes 1 through 8 must remain authoritative for every covered episode. Allowing a later release-specific upload on episode 2 would fracture that meaning and create hidden conflicts between neutral anime-level segment truth and release-level overrides.

### Consequences
- backend upload handlers now check whether a global segment with source already covers the release before accepting a release-theme upload
- blocked uploads return a conflict with code `theme_segment_locked`
- the release drawer may still show global state, but UI alone is no longer the trust boundary for this rule

### Follow-ups Required
- complete one more focused drawer-state pass so locked/global themes also feel obviously non-overridable in the UI

## 2026-05-25 - Release-Version-Media Is Canonical For Version-Scoped Process Media

### Decision
`release_version_media` is the canonical persistence structure for release-version-scoped process media such as release screenshots, typesetting/karaoke examples, fun/outtake images, and other admin/fansub working media. These uploads must still create `media_assets` and `media_files`, but they must not be forced through `release_media`.

`release_media` remains a separate release-level/public/legacy asset seam and must not be used as an implicit substitute for media that belongs to a concrete `release_version_id`.

### Why This Won
The implemented Phase-34 through Phase-38 flow, permissions, cleanup, UI, and API are built around a concrete release-version context. The live local DB on 2026-05-25 also confirms this shape: `release_version_media` contains data, has `release_version_id -> release_versions.id`, while `release_media` is empty and has no version scope.

Forcing this flow back onto `release_media` would either erase the version scope or require broad schema changes and migration risk. Dual-writing would create two competing truths.

### Consequences
- Admin Release-Version-Media endpoints remain the correct API surface for this flow.
- The Fansub Release Drawer must pass a real `release_version_id` or disable the media entry until one is selected.
- OpenAPI and domain docs must document `/api/v1/admin/release-versions/:versionId/media`.
- `AGENTS.md` and `docs/architecture/db-schema-fansub-domain.md` must distinguish `release_version_media` from release-level `release_media`.
- Public Release Assets still need a separate decision if process media should become public.

### Follow-ups Required
- Fix any drawer `release_id`/`release_version_id` wiring.
- Update OpenAPI for admin release-version media.
- Keep agent/domain docs aligned so future agents do not revert the canonical table.
- Decide whether public release asset reads should ever include or promote from `release_version_media`.

## 2026-05-05 - Fansub Domain Agent Work Uses The Repo Schema Reference First

### Decision
When agents work on fansub, anime, release, or release-media features, they should use `docs/architecture/db-schema-fansub-domain.md` as the first source-of-truth document, then verify the current code and migrations against it before making persistence changes.

### Why This Won
The current worktree spans Phase 29 through Phase 32 plus cleanup-boundary migrations and repo-local tooling changes. Without one explicit domain reference, it is too easy to reintroduce wrong-domain persistence, hidden release discovery, or legacy-column assumptions.

### Consequences
- anime and episodes stay neutral in agent reasoning
- release-version-scoped process media must stay on `release_version_media`; release-level/public assets may stay on `release_media`
- group media must stay on `fansub_group_media`
- `release_version_groups.fansub_group_id` stays canonical and `fansubgroup_id` is treated as legacy cleanup only
- agents should stop instead of guessing when schema or ownership truth conflicts

### Follow-ups Required
- keep `AGENTS.md`, `STATUS.md`, and closeout files aligned with this rule set whenever the active fansub/release slice changes

## 2026-05-02 - release_version_groups Runtime Uses fansub_group_id Only

### Decision
Treat `release_version_groups.fansub_group_id` as the only runtime source of truth. Backend runtime code must not read from or write to the legacy duplicate `fansubgroup_id` column. The live local DB checked on 2026-05-25 no longer exposes `release_version_groups.fansubgroup_id`; older target DBs should still be checked before assuming the cleanup already ran everywhere.

### Final Drop Safety Check
Run this before a final drop migration only on a target DB where the legacy column still exists:

```sql
SELECT *
FROM release_version_groups
WHERE fansubgroup_id IS NOT NULL
  AND fansubgroup_id <> fansub_group_id;
```

## 2026-04-29 - Fansub Group Model Uses One Canonical Group Record Plus Generic Link Entries

### Decision
Treat `fansub_groups` as the canonical fansub-group record, use `fansub_group_links` as the canonical model for outward community links, and treat duplicate transition columns such as `closed_year`, `history_description`, alias-side `group_id`, and URL-vs-media-ID overlap as cleanup targets rather than product-facing long-term fields.

### Context
The live database currently exposes a workable fansub-group model, but it also contains several transition-era duplicates: `history` alongside `history_description`, `dissolved_year` alongside `closed_year`, direct URL link columns on `fansub_groups` alongside generic rows in `fansub_group_links`, and a duplicate `group_id` reference in `fansub_group_aliases`. That makes it too easy for frontend/API work to drift into supporting both the intended model and old reconciliation leftovers at the same time.

### Options Considered
- keep using the current mixed model and let each UI/API surface choose whichever fields are most convenient
- keep `fansub_groups` canonical for core identity but continue using fixed link columns (`website_url`, `discord_url`, `irc_url`) as the main link model
- keep `fansub_groups` canonical for identity/metadata and move link management toward generic `fansub_group_links` entries defined by DB link type

### Why This Won
The DB already defines a more extensible link model with `fansub_group_links` and constrained `link_type` values. Using that as the long-term direction prevents the UI from hardcoding a permanently incomplete link set and lets future support for `twitter`/`github` follow the schema instead of requiring new columns. At the same time, the core fansub record should stay centered on one canonical group row plus aliases, members, and collaboration membership instead of spreading meaning across overlapping transitional fields.

### Consequences
- core fansub CRUD should be designed around the canonical `fansub_groups` fields that represent identity and profile data
- outward links should be programmed against `fansub_group_links`, not only against fixed `website_url` / `discord_url` / `irc_url` columns
- collaboration administration should remain explicit and use `fansub_collaboration_members` rather than hiding that behavior inside normal group fields
- alias handling should standardize on `fansub_group_aliases.fansub_group_id`; alias-side `group_id` is legacy reconciliation baggage
- future cleanup should remove or deprecate duplicate fields once the API/UI no longer depend on them

### Phase-29 Update
- backend and frontend now expose generic community-link CRUD on `/api/v1/admin/fansubs/:id/links`
- fansub create/edit now manage `website`, `discord`, `twitter`, `github`, and `irc` as generic rows instead of three fixed URL inputs
- collaboration-member admin is live on the fansub edit page and remains separate from the ordinary profile form
- `fansub_groups.website_url` / `discord_url` / `irc_url` remain compatibility projections sourced from `fansub_group_links`
- `closed_year` and `history_description` remain readable transitional fields only; alias-side duplicate `group_id` is now an explicit cleanup boundary and no longer part of the intended live contract

### Follow-ups Required
- define the exact canonical fansub-group API payload shape before the next fansub-admin implementation slice
- add generic link CRUD in backend/frontend using `fansub_group_links`
- add/edit collaboration-member management in the admin UI for `group_type='collaboration'`
- plan a cleanup migration for `closed_year`, `history_description`, and alias-side `group_id` once no active code depends on them

## 2026-04-29 - Episode-Version Duration Input Accepts Shorthand But Must Fail Safe

### Decision
Accept operator-friendly duration forms such as raw seconds, `m:ss`, `hh:mm:ss`, `2m`, `1m30`, and `1m30s` in the episode-version editor, but treat invalid non-empty input as a validation error instead of serializing `duration_seconds: null`.

### Context
The UI and product intent had drifted toward faster manual runtime entry, but the first implementation only parsed raw seconds and colon syntax. Worse, malformed text could be serialized as `null` and silently erase previously stored runtime metadata.

### Options Considered
- keep only raw seconds / colon syntax and leave shorthand unsupported
- support shorthand forms but allow parse failures to fall through as `null`
- support shorthand forms and block save when a non-empty value cannot be parsed

### Why This Won
Operators think in short runtime forms during admin work, so shorthand support genuinely reduces friction. At the same time, runtime metadata is too easy to lose if parse failures are silently coerced to `null`. Fast input and fail-safe persistence are both required.

### Consequences
- the frontend parser must support both colon syntax and shorthand forms consistently
- save flows must guard against unparseable duration text before issuing the patch request
- future UI copy/help text should not advertise duration forms that the parser does not actually implement

### Follow-ups Required
- capture one real browser/UAT pass that covers both valid shorthand values and an invalid value

## 2026-04-28 - Segment Types Stay Generic And Naming Carries The Human Distinction

### Decision
Use generic segment types (`OP`, `ED`, `Insert`, `Outro`) and let the free name field carry distinctions such as `Naruto OP 1`, `Naruto Final OP`, or `Creditless Ending`.

### Context
The earlier segment/type work exposed rigid values like `OP1`, `OP2`, `ED1`, and `ED2`. That matched an internal seeded theme-type model more than the real operator workflow and made later cases feel artificial.

### Options Considered
- keep fixed enumerations like `OP1`, `OP2`, `ED1`, `ED2`
- switch to generic types plus free naming in the UI and normalized generic types in the DB

### Why This Won
Generic types fit both the reference UI and real usage better. They avoid artificial limits and let the operator decide how to distinguish variants while the system still keeps a simple type axis for timeline and filtering.

### Consequences
- UI type selectors should stay generic
- DB/runtime mappings should not drift back into operator-facing `OP1/ED1` semantics
- segment identity becomes `type + optional free name + release context + episode range`

### Follow-ups Required
- keep later segment-file and playback work aligned with the generic type model

## 2026-04-28 - Segment Structure Lives On Episode-Version Edit, Not On A Separate Anime Themes Screen

### Decision
Treat the anime-level `/admin/anime/:id/themes` screen as legacy/redirected and keep active segment structure work on `/admin/episode-versions/:id/edit`.

### Context
The earlier OP/ED/theme work had drifted into a mixed anime-theme/fansub-theme flow that was not the real operator context. The actual behavior needed to be tied to a concrete release combination: anime, episode, group, and version.

### Options Considered
- keep a parallel anime-level themes management surface
- retire it from the active workflow and anchor segment work on episode-version edit

### Why This Won
Segment timing and applicability only really make sense in release context. Keeping two competing admin surfaces would confuse operators and split the truth.

### Consequences
- the anime themes page should not remain an active maintenance screen
- segment range logic must be validated on episode-version routes
- later file-upload and playback work should build from the episode-version context

### Follow-ups Required
- if future fansub-self-service upload surfaces are added, they should still reuse this release-context model

## 2026-04-28 - Segment Files Are Team4s-Owned Release Assets, Not Primarily Jellyfin Upload Targets

### Decision
Store OP/ED/Insert files as Team4s-owned assets referenced by `release_asset`, with the segment holding only the source metadata/reference.

### Context
There was open uncertainty whether segment files should be selected from Jellyfin, stored in Jellyfin conventions, or managed directly by Team4s. The release-context segment workflow and later fansub rights model pointed toward Team4s-managed assets instead.

### Options Considered
- make Jellyfin the primary upload/storage model for segment sources
- treat Jellyfin only as optional context and store segment files as Team4s assets

### Why This Won
Team4s-owned assets fit the permission model better, are easier to name/control, and do not depend on Jellyfin-specific folder or API assumptions for the core workflow.

### Consequences
- Phase 26 upload/persistence work should target Team4s assets first
- source labels should expose concrete uploaded file information in the admin UI
- future playback can build on the same media/asset references without changing the storage truth

### Follow-ups Required
- later fansub-self-service upload should reuse the same underlying asset/reference seam

## 2026-04-24 - Collaboration Records Stay Persisted But Do Not Belong In The Default Fansub Group List

### Decision
Keep persisted collaboration records such as `AnimeOwnage & Project Messiah` for release/version wiring, but hide them from the standard `/admin/fansubs` management list so that default list stays focused on real fansub groups.

### Context
Phase 21 introduced deterministic collaboration persistence when multiple fansub groups are attached to one release version. That behavior is correct for release modeling, but in the regular fansub admin list those collaboration rows looked like ordinary groups and confused the operator.

### Options Considered
- show collaborations in the same default group list as normal fansub groups
- keep collaborations persisted but remove them from the default everyday group-management view

### Why This Won
The normal fansub list is primarily an operator surface for real groups. Collaboration rows are a release-level modeling detail and become misleading when presented as if they were first-class standalone groups in the same everyday list.

### Consequences
- collaboration rows can continue to exist in `fansub_groups` with `group_type='collaboration'`
- default fansub admin listing now hides them
- release/version wiring can still use the collaboration record internally

### Follow-ups Required
- if collaboration administration is needed later, give it a separate explicit view instead of reusing the normal group list

## 2026-04-24 - Anime Edit Must Copy The Create Interaction Model Instead Of Preserving Legacy Edit-Specific UI

### Decision
Anime edit should reuse the create-flow interaction model directly and remove stale edit-specific helper surfaces instead of wrapping the old edit experience in a new shell.

### Context
The first Phase-22 implementation still left too much of the old edit route behavior intact. Live operator feedback showed that the page still felt like the old editor, just rearranged.

### Options Considered
- keep adapting the old edit page incrementally
- take create as the real foundation and subtract legacy-only edit clutter aggressively

### Why This Won
Create already reflects the intended operator workflow. Reusing that model is simpler, easier to learn, and less likely to keep dragging old assumptions forward.

### Consequences
- top provenance banners and duplicate save affordances are not worth keeping by default
- Jellyfin reselection in edit should behave like create rather than like a special sync tool
- future edit refinements should start from shared create-style sections, not from old edit-only widgets

### Follow-ups Required
- finish Phase 22 by deciding whether the remaining source/context card is now lean enough to verify and close
## 2026-05-17 - Fansub Member Management Uses App Users, Central Permissions, And Backend Self-Lockout Guards

### Decision
Fansub-Mitgliederverwaltung läuft ausschließlich über `app_users`, `fansub_group_members` und `fansub_group_member_roles`; alle Mutationen werden durch die zentrale Permission-Engine geschützt und der Self-Lockout wird nur im Backend entschieden.

### Context
Nach Phase 43 und 44 war die Identity- und Permission-Basis vorhanden, aber die sichtbare Mitgliederverwaltung hing noch an einem schmalen MVP und einem veralteten Placeholder im Fansub-Edit-Tab. Gleichzeitig durfte Phase 45 keine neue Parallelstruktur neben `fansub_members` aufbauen.

### Options Considered
- die Legacy-`fansub_members`-Struktur weiter in Richtung App-Rechte ausbauen
- eine zweite Membership-/Audit-Struktur nur für die neue UI einführen
- die vorhandene app-user-basierte Membership-Struktur vollständig zum kanonischen Admin-Seam machen

### Why This Won
Die vorhandenen Phase-43/44-Seams decken Identität, Rollen und Scope bereits sauber ab. Darauf aufzubauen vermeidet Daten- und Autorisierungsdrift. Der Self-Lockout ist sicherheitsrelevant und muss deshalb serverseitig invariant bleiben statt von der UI vorhergesagt zu werden.

### Consequences
- `fansub_members` bleibt Legacy-/Contributor-Datenmodell und ist keine Quelle für App-Berechtigungen
- die Members-UI liest nur Capability-Flags
- `409 Conflict` mit verständlichen Meldungen ist der offizielle Lockout-Pfad
- spätere Invitation-/Join-Request-Flows müssen dieselbe Membership-Struktur wiederverwenden

### Follow-ups Required
- Phase 46 soll auf Einladungen und Join-Requests aufbauen, ohne die Membership-Quelle zu ändern

## 2026-05-26 - Team4s API Bearer Tokens Must Be Keycloak Access Tokens

### Decision
Team4s API calls use Keycloak `access_token` as the bearer token. Keycloak `id_token` remains only a login/identity artifact and must not be accepted as a Team4s API bearer.

### Context
Phase 51 found that the previous Keycloak flow stored the ID token as the Team4s bearer while using access-token expiry semantics. That mixed the OIDC login identity boundary with the API resource-server boundary and made session behavior confusing.

### Options Considered
- keep accepting `id_token` as a Team4s bearer and extend local app-token lifetimes
- make Keycloak issue an API-audience access token and validate that token on the backend

### Why This Won
The Resource Server model is the correct OIDC boundary: access tokens target APIs, ID tokens target the frontend/client login session. It also allows the 24h login goal to be handled through refresh/SSO lifetime while API access tokens stay short-lived.

### Consequences
- Keycloak includes `team4s-api` in access-token `aud`.
- Backend verifies API bearers with `KEYCLOAK_API_AUDIENCE=team4s-api` and `azp=team4s-frontend`.
- Frontend persists/sends `access_token` for Team4s API calls.
- Live UAT requires access token `200` and ID token `401` on `/api/v1/me`.

### Follow-ups Required
- Keep auth regression tests that prevent `id_token` from flowing back into Team4s bearer storage or refresh retry paths.

## 2026-05-29 - Shared Cropper Is UI Export Infrastructure Only

### Decision
Use `react-easy-crop` behind a shared `Team4sCropper` component, but keep upload, auth, persistence, and media ownership in the existing domain-specific flows.

### Context
Phase 56 replaced the fragile custom cropper behavior for profile avatars and fansub group raster logos. The same cropper UI was needed in both places, but media ownership must remain separate: profile avatars are member/profile assets, while fansub logos are group media.

### Options Considered
- make the cropper own upload behavior across profile and fansub group media
- keep the cropper as a small domain-neutral client-side export component and let callers upload through their existing seams

### Why This Won
The cropper only needs to solve preview/export parity and interaction quality. Letting it upload would mix profile, fansub group, release, anime, and auth concerns in a shared UI primitive.

### Consequences
- `Team4sCropper` exports a cropped `File` and performs no persistence.
- Profile avatar upload keeps source-original plus cropped-display semantics through `uploadOwnProfileAvatar`.
- Fansub group logo upload stays in `MediaUpload` and `uploadFansubMedia`.
- SVG group logos bypass canvas/cropper conversion and stay on the existing upload path.

### Follow-ups Required
- If future domains need cropping, integrate the shared cropper as UI/export only and keep each domain's existing upload and ownership contract.
