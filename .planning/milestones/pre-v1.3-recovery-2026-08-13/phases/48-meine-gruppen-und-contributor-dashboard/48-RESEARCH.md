# Phase 48: Meine Gruppen & Contributor Dashboard - Research

**Researched:** 2026-05-13
**Domain:** Team4s contributor-scoped dashboards, group membership visibility, safe reuse of admin release/media/note surfaces
**Confidence:** Medium; there are strong visible reuse anchors in the frontend, but the newer membership/capability runtime seams are still not fully visible in the current branch

---

## Existing Team4s Seams

### 1. The visible frontend already has reusable group-detail building blocks

Current visible contributors for reuse:
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx`
- `AnimeProjectNotesSection`
- `NotesTab`
- `ReleaseVersionMediaDrawerSummary`

Implication:
- Phase 48 should try to reuse these pieces for a contributor-scoped group page
- but only after proving they can be rendered safely without exposing admin-only actions

### 2. The visible fansub admin flow is still global-admin flavored

Visible pages still point to:
- `/admin/fansubs/[id]/members`
- `/admin/fansubs/[id]/edit`

and the current branch still shows legacy auth/admin seams.

Implication:
- a contributor route like `/admin/my-groups/:id` is likely the safest MVP shell
- it can reuse existing components while avoiding accidental global-admin affordances

### 3. Release and media reuse is already close at hand

The fansub edit page already surfaces:
- anime/release groupings
- a release drawer
- release-media summary
- notes/project sections

Implication:
- Phase 48 does not need to invent a second release-management UI
- it mainly needs safe scoping, contributor routing, and capability-based action visibility

### 4. Group navigation helpers already exist

Visible helper:
- `frontend/src/lib/groupNavigation.ts`

Implication:
- Phase 48 can likely reuse or extend existing group navigation logic for `Meine Gruppen`
- this reduces the need for bespoke sorting and link-building logic

### 5. The main backend job is scoping, not new domain logic

The phase brief is explicit:
- load only own groups
- load only own group release contexts
- block URL tampering
- compute capabilities centrally

Implication:
- most backend work should be read models and scoped aggregations
- not new release/media/editor domain features

### 6. Historical credits should remain optional/read-only

Visible archival credit/note tables already exist in earlier schema.

Implication:
- `Meine Beteiligungen` can be a light read model if joins are easy
- otherwise it should be a documented prepared section, not a new big subsystem

---

## Architecture Recommendation

### Recommendation 1: Build one contributor overview endpoint, not many ad-hoc mini calls first

The dashboard will be easiest to ship if it has one canonical overview read:
- own group identity
- own roles
- status/active period
- summary counts
- capability booleans

This keeps the first screen fast to wire and easier to secure.

### Recommendation 2: Prefer a dedicated contributor route over directly exposing `/admin/fansubs/:id/edit`

Even if the edit page is reusable, a separate contributor entry route is safer:
- `/admin/my-groups`
- `/admin/my-groups/:id`

Why:
- avoids accidental deep links into global-admin assumptions
- keeps contributor-specific layout and quick actions coherent
- still allows component reuse inside the page body

### Recommendation 3: Reuse existing admin sections selectively, not wholesale

For each existing section, ask:
- can this render read-only?
- can actions be hidden/disabled by capability?
- does it assume global admin APIs?
- does it trust route parameters too much?

If yes:
- reuse or wrap it

If no:
- create a thinner contributor-specific wrapper around the underlying safe APIs

### Recommendation 4: Keep counts and summaries pragmatic

The group overview response may include counts for:
- anime
- release versions
- media

But only if they are cheap and trustworthy.

If counts become expensive:
- return the most useful subset
- document the limitation

### Recommendation 5: Treat capability aggregation as part of the group DTO

The dashboard and cards become much easier to wire if each group DTO contains:
- the group metadata
- the user's role list
- scoped capability booleans

This avoids a second per-card capability fetch in the first MVP.

### Recommendation 6: Scope everything from DB truth, not URL parameters

Contributor endpoints must derive:
- whether the actor belongs to the group
- whether a release version belongs to one of the actor's groups
- whether a coop release includes one of the actor's groups

Do not trust:
- route group IDs
- release IDs passed from the client
- front-end claims about which group a release belongs to

### Recommendation 7: `Meine Beteiligungen` should be a read model or a documented placeholder

If the archival credit joins are straightforward:
- show a read-only involvement list

If not:
- keep the section shallow or placeholder-based
- explicitly defer richer contributor activity dashboards to a later phase

---

## Recommended Backend Surface

### Core reads

- `GET /api/me/fansub-groups`
- contributor group detail read, likely by group id
- scoped anime/release/release-version summaries for that group

### Preferred capability shape per group

- `canOpenContributorGroup`
- `canEditGroup`
- `canViewGroupMedia`
- `canUploadGroupMedia`
- `canViewReleases`
- `canEditReleaseDescriptions`
- `canUploadReleaseMedia`
- `canManageMembers`

### Optional read-only involvement read

- one `me/contributions` style aggregate if existing credit tables make it cheap
- otherwise a prepared placeholder with documented follow-up

---

## Error and Status Semantics

Recommended behavior:
- `401` when unauthenticated
- `403` when authenticated but attempting to open a group/release context not allowed for the actor
- `404` when the resource truly does not exist
- `409` only for actual mutation conflicts if the dashboard triggers any
- `422` or `400` only for malformed request/query inputs

Important:
- forbidden group access should not leak the existence of unrelated release/version records if project convention prefers `404`

---

## Testing Recommendation

Backend tests should cover at least:
- authenticated user sees own groups
- authenticated user does not see foreign groups
- disabled user sees no groups
- `platform_admin` sees all or the documented admin variant
- contributor sees only own-group release versions
- direct URL/API access to a foreign group is blocked
- direct URL/API access to a foreign release version is blocked
- coop release appears when the actor's group participates
- capability booleans are correct per group
- historical credits do not imply any app rights

Frontend tests should cover:
- `Meine Gruppen` card/action visibility is capability-driven
- navigation contains `Mein Profil` and `Meine Gruppen`
- contributor group actions link into the correct reused surfaces
- no action appears when the corresponding capability is false

---

## Risks

### Biggest security risk: reusing global-admin screens without enough scoping

If existing admin sections are mounted directly:
- admin-only buttons may leak
- wrong API calls may still be reachable
- contributor URLs may expose unrelated group data

Mitigation:
- dedicated contributor routes
- section-by-section capability gating
- backend enforcement on every reused endpoint

### Biggest product risk: rebuilding instead of reusing

If the phase starts rebuilding notes/media/release UIs:
- it will sprawl
- it will drift from the existing admin experience

Mitigation:
- treat Phase 48 as a visibility/routing/scoping phase
- document every reuse decision

### Biggest data risk: incorrect coop-release scoping

If coop release-version queries are wrong:
- contributors may see too much or too little

Mitigation:
- derive membership/group participation from canonical DB joins
- add explicit coop tests

---

## Recommended Plan Shape

1. Pre-analysis and contributor scoping strategy
2. Backend overview/detail/scoped release reads and capability aggregation
3. Frontend dashboard, contributor group page, and navigation wiring
4. Tests, docs, verification, and Phase-49 handoff
