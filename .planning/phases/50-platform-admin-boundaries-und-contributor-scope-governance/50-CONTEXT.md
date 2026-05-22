# Phase 50: Platform Admin Boundaries und Contributor-Scope-Governance - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning
**Source:** Operator discussion during live auth/role UAT

<domain>
## Phase Boundary

Phase 50 hardens the boundary between global Team4s platform administration and
group-scoped contributor/fansub-lead work. It must turn the current mixed
`/admin` experience into explicit route, API, capability, and navigation
contracts.

This phase is not a visual redesign. It is a permission architecture and route
ownership cleanup.
</domain>

<decisions>
## Implementation Decisions

### D-01 Platform Admin Boundary
- The `/admin` route family is reserved for Team4s platform admins.
- `platform_admin` is the only role that may open global admin views such as
  `/admin/fansubs`, `/admin/fansubs/create`, `/admin/fansubs/merge`,
  `/admin/anime`, `/admin/anime/create`, and `/admin/episodes`.
- Fansub leads must not see global admin list pages, global create routes,
  global merge/delete actions, anime creation, or episode mapping/import
  surfaces.

### D-02 Fansub Lead Workspace
- A `fansub_lead` works directly in a group-scoped management surface for their
  own group.
- The current target experience is functionally equivalent to opening
  `http://127.0.0.1:3002/admin/fansubs/88/edit`, but it must not be exposed as a
  global-admin route for non-platform admins.
- The implementation may reuse the existing Fansub edit components internally,
  but the route, guard, navigation, and API contract must communicate
  group-scoped ownership instead of platform administration.
- A lead may manage only groups where the Team4s DB grants an active
  `fansub_lead` or equivalent managing capability.

### D-03 Rebuild Meine Gruppen As Management Entry
- The product concept `Meine Gruppen` is the right entry point for logged-in
  contributors.
- The current `/admin/my-groups` implementation is not the desired lead
  workspace because it contains too much placeholder/dashboard copy.
- It should be rebuilt as a concise non-admin management entry point and either
  live at `/manage/groups` or have `/admin/my-groups` redirect there.
- A link from `Meine Gruppen` to the user's own profile is acceptable and useful,
  but profile editing remains in the dedicated profile route.
- Because app users may be active in multiple fansub groups over time, the
  entry point must support a scoped group chooser.
- If the user has exactly one manageable active group, the chooser may redirect
  directly to that group's management workspace.
- If reused in the future, the route must not become a public group page or an
  admin substitute.

### D-04 Public Group Area Is Separate
- Public fansub group pages are a separate product surface.
- The existing public route family such as `/fansubs/animeownage` remains the
  public group profile/archive area.
- Public route work must not grant management access and must not be mixed with
  the authenticated group-management route.
- A public group area may use slugs and public-safe data, while management
  routes use authenticated app-user capabilities and stable group IDs or another
  unambiguous scoped identifier.

### D-05 Backend Owns Authorization
- Frontend route guards and hidden buttons are UX only.
- Backend APIs must enforce platform-admin versus group-scoped contributor
  permissions independently.
- Capability responses must drive frontend action visibility; frontend role
  string checks are not sufficient as the primary rule system.

### D-06 No Keycloak Domain Roles
- Keycloak remains identity only.
- `fansub_lead`, `platform_admin`, membership, and scoped capabilities live in
  Team4s DB/application logic, not as Keycloak realm/client roles.

### D-07 Existing Domain Rules Stay Intact
- Anime and episodes remain neutral domain entities.
- Fansub context belongs to fansub groups, releases, and release versions.
- This phase must not attach release or fansub data directly to anime or
  episodes while restructuring routes.

### D-08 Canonical Fansubgruppen-Stammdaten Are Platform-Admin Only
- Canonical Fansubgruppen-Stammdaten, especially the editable
  `Fansubgruppenname` field, may only be visible and editable in the
  platform-admin experience.
- A `fansub_lead` must not see the canonical `Fansubgruppenname` form field in
  their scoped management workspace and must not be able to submit changes for
  it.
- The same restriction applies to other destructive or identity-defining group
  fields discovered during implementation, such as slug, global status,
  dissolution/foundation identity fields, merge/delete controls, and any field
  that changes the canonical archive entity rather than the group's scoped
  contribution workspace.
- `Slug` is a platform-admin-only technical identity field; it must not be shown
  or edited in the scoped lead workspace.
- The scoped lead workspace may show a public-safe group label for orientation,
  but not as an editable canonical field.

### D-09 App-User Membership And Invitation Flow Must Be Explicit
- Group management has only one membership authority: Team4s `app_users` with
  group membership and group roles.
- The scoped group workspace must not create or manage a separate legacy member
  entity for permissions. Historical/profile data may be shown elsewhere, but it
  is not the source for group access.
- The UI must clearly separate two app-user workflows:
  - assign an already existing Team4s app user to the group
  - invite an e-mail address so the invited logged-in app user can accept the
    group membership and preselected group roles
- Direct assignment never creates a Keycloak account; it only connects an
  existing app user to the fansub group through `fansub_group_members` and
  `fansub_group_member_roles`.
- Invitation creates a one-time accept link; the raw link is shown only once
  and must be sent to the invited app user by the operator unless e-mail delivery
  is added later.
- The invited user must log in with Keycloak first, which resolves or creates the
  Team4s app user, then accept the link; Team4s applies the invited group roles
  only to that app user.
- The UI must make role labels understandable for real users, e.g. that
  `translator` means the group role `Übersetzung`.
- Dangerous default role selection must be reviewed. A translator invite should
  not accidentally default to `fansub_lead` in the future scoped lead flow.

### D-10 Member Stories Belong To Profiles
- `Mitgliedergeschichten` are personal member/profile content, not group content.
- The scoped group workspace must not show or edit the current
  `Mitgliedergeschichten` block from the fansub group notes tab.
- The own profile route is the correct place for a user's own member story.
- If platform admins need to inspect or moderate member stories, that must be an
  explicit profile/admin-profile surface, not embedded in group administration.
- The profile member-story UI should reuse the global editor composition used by
  the UI-system reference `Anime-Einblicke / Editor-Accordion`, so personal
  stories and anime/project insight text share the same editor language.

### D-11 Group/Profile UI Must Reuse The Global Editor Pattern
- The existing TipTap/RichTextEditor foundation stays the editor implementation
  for group stories, anime/project insights, and member stories.
- The surrounding UI shell must be consolidated: `Anime-Einblicke`,
  `Gruppengeschichte`/group story, and profile `Mitgliedergeschichte` should
  use the same global editor/accordion composition and CSS conventions.
- The current simple profile `textarea` for member story must be removed during
  implementation and replaced with the shared TipTap-based editor shell.
- The profile page must be adapted to the relevant UI-system templates and CSS
  rules, without adding large explanatory helper text.
- The scoped group workspace sections `Grunddaten`, `Medien`, `Mitglieder`, and
  `Gruppengeschichte` should use the same UI language: restrained section
  headers, compact action rows, capability-driven actions, and no local ad-hoc
  card style when a global component/pattern exists.

### D-12 Execute With Parallel Slice Owners And Cross-Reviews
- Phase 50 execution should be split across separate implementation agents when
  the execution environment supports it, because the scope touches multiple
  pages and risk domains.
- Preferred implementation slices:
  - platform-admin route guards and navigation
  - `Meine Gruppen` / scoped group route
  - group `Grunddaten` capability split
  - group `Medien` UI and persistence wiring
  - group `Mitglieder` app-user assignment/invitation UX
  - `Gruppengeschichte` editor shell
  - profile `Mitgliedergeschichte` editor shell
- After implementation, use separate review agents or clearly separated review
  passes for:
  - Auth/permission boundary and direct URL/API denial
  - DB/persistence and migration risk, including whether data is saved to the
    intended existing tables
  - frontend state/API wiring, including stale auth/session state and
    capability refresh after mutations
  - UI consistency against the global Anime-Einblicke/editor pattern
  - domain ownership, ensuring no fansub/release/profile data is attached to the
    wrong entity
- The phase is not complete until the reviews explicitly confirm that auth,
  database persistence, frontend state, and saved data wiring are correct.

### D-13 Release-Version Media/Notes Are A Narrow Contributor Surface
- A fansub contributor with the correct release/group capability may reach the
  release-version editing layer needed for their own work, currently represented
  by routes such as `/admin/episode-versions/41/edit?tab=media`.
- This must not expose the full platform-admin episode-version editor to
  non-platform users.
- For non-platform contributors, only the release-version tabs/sections needed
  for scoped contribution work may render. The intended visible sections are
  `Medien` and `Notizen`; the tab names are still working titles and may be
  renamed during implementation.
- All other release-version tabs, mapping controls, canonical episode/anime
  controls, and platform-admin-only operations remain visible/editable only for
  Team4s platform admins.
- Direct URL/API access must enforce the same split: a contributor may upload or
  manage media only for release versions connected to their authorized fansub
  group/release context, and must be denied for foreign groups or global admin
  fields.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Auth And Permissions
- `docs/operations/keycloak-auth-foundation-phase43.md` - Keycloak identity and
  Team4s app-user role separation.
- `docs/architecture/fansub-member-management.md` - App-user group membership
  and fansub-lead semantics.
- `backend/internal/permissions/permissions.go` - Permission engine roles,
  actions, and context evaluation.
- `backend/internal/handlers/platform_admin_authz.go` - Platform-admin guard.
- `backend/internal/handlers/app_auth.go` - Current `/api/v1/me` response shape.

### Existing Frontend Surfaces
- `frontend/src/app/admin/page.tsx` - Current admin dashboard links.
- `frontend/src/app/admin/fansubs/page.tsx` - Current global fansub list that
  leaks a platform-admin experience to leads.
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` - Existing group edit
  workspace to reuse or wrap behind a scoped route.
- `frontend/src/app/admin/my-groups/page.tsx` - Placeholder route to retire,
  redirect, or explicitly de-scope.
- `frontend/src/app/admin/anime/page.tsx` - Global anime management route.
- `frontend/src/app/admin/anime/create/page.tsx` - Global anime creation route.
- `frontend/src/app/admin/episodes/page.tsx` - Global episode mapping route.
- `frontend/src/app/admin/episode-versions/[id]/edit/page.tsx` - Existing
  release-version editor. Contributors may need a narrowed media/notes surface;
  platform admins retain the full editor.

### Domain Ownership
- `docs/architecture/db-schema-fansub-domain.md` - Fansub/release ownership
  rules and neutral anime/episode boundaries.
</canonical_refs>

<specifics>
## Specific Ideas

- Introduce a group-management route outside the platform-admin namespace, for
  example `/manage/fansubs/:id` or another clearly scoped route chosen during
  planning.
- Introduce a non-admin management entry point, preferably `/manage/groups`, for
  app users who can manage one or more groups. From there, users choose the
  relevant group and enter its scoped workspace.
- This entry point may keep the UI title `Meine Gruppen`, but it must be a
  focused working list with group cards/actions and a profile link, not a
  placeholder information page.
- For a single manageable group, `/manage/groups` may redirect to the scoped
  group workspace; for multiple active or previous app-user group memberships,
  it must show an explicit chooser.
- Non-platform admins who open `/admin/fansubs`, `/admin/anime`,
  `/admin/anime/create`, or `/admin/episodes` should be redirected to a suitable
  non-admin destination or shown a scoped access denied page.
- Links from contributor navigation should go directly to the group-scoped
  management entry point, not through `/admin/my-groups` placeholder pages.
- Existing `/admin/fansubs/:id/edit` may remain for platform admins, but a
  non-platform lead should not need to use that URL.
- Existing release-version edit URLs may be reused internally for now, but
  non-platform contributors must only see contribution-safe tabs such as
  `Medien` and `Notizen` when their group/release capability allows it.
- The existing Fansub edit form contains canonical fields such as
  `Fansubgruppenname`; these must be split from lead-facing sections before
  reusing the page in a scoped workspace.
- The member section must be rewritten so the operator understands that every
  assignment/invitation targets an app user, which roles will be applied, and
  what the invited user has to do next.
- The existing `Mitgliedergeschichten` section in `NotesTab.tsx` must be removed
  from the group workspace and moved into the profile experience using the
  global Anime-Einblicke editor composition.
- `Gruppengeschichte`/group story remains group-owned content, but its visual
  shell should be aligned with the global Anime-Einblicke editor composition.
- Profile `Mitgliedergeschichte` must stop using the simple textarea and instead
  use the same TipTap editor foundation and global editor/accordion UI shell.
- `Mitglieder`, `Medien`, and `Grunddaten` in the scoped group workspace must be
  visually normalized to the same UI-system pattern family.
- Execution should assign these surfaces to independent implementation slices
  where possible, then reconcile through review instead of letting one large
  change hide cross-surface regressions.
- Tests must cover `phase43-member` as fansub lead for group 88 and
  `phase43-admin` as platform admin.
</specifics>

<deferred>
## Deferred Ideas

- Full public fansub group area redesign.
- Full replacement of every admin UI component with new design-system
  primitives.
- Broad route rename of release-version/media editor flows unless required by
  authorization boundaries.
</deferred>

<risks>
## Risk Summary

- Reusing the existing fansub edit page can accidentally carry platform-admin
  controls into the lead workspace unless capabilities are enforced centrally.
- Merely hiding links is insufficient; direct URL and API access must be tested.
- Overloading `/admin/my-groups` would preserve the current ambiguity instead
  of fixing it.
- Route changes must avoid breaking release/fansub media ownership or attaching
  fansub data to neutral anime/episode records.
- UI cleanup must not replace the proven TipTap editor foundation; the target is
  a shared shell/pattern, not a new editor engine.
- The release-version drawer/editor is especially easy to overexpose: if it is
  reused for contributors, tab visibility and API writes must be capability
  scoped, not only hidden through navigation.
- The profile page must stay operational and calm: avoid turning it into a
  tutorial page with excessive hints.
- Parallel work increases merge and state-drift risk; reviewers must inspect
  final combined behavior, not only their own slice.
</risks>

---

*Phase: 50-platform-admin-boundaries-und-contributor-scope-governance*
*Context gathered: 2026-05-22 via operator discussion*
