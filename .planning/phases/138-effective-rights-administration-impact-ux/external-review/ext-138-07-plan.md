---
phase: 138-effective-rights-administration-impact-ux
plan: 07
type: execute
wave: 3
depends_on: [138-01, 138-03, 138-06]
files_modified:
  - frontend/src/app/admin/users/tabs/UserClaimsTab.tsx
  - frontend/src/app/admin/users/tabs/UserClaimsTab.test.tsx
  - frontend/src/app/admin/users/tabs/UserAuditTab.tsx
  - frontend/src/app/admin/users/tabs/UserAuditTab.test.tsx
  - frontend/src/app/admin/claims/page.tsx
  - frontend/src/app/admin/claims/AdminClaimsClient.tsx
  - frontend/src/app/admin/changes/page.tsx
  - frontend/src/app/admin/changes/AdminChangesClient.tsx
  - frontend/src/app/admin/identity-access/AdminIdentityAccessNav.tsx
  - frontend/src/app/admin/users/tabs/UserContributionsTab.tsx
  - frontend/src/app/admin/users/tabs/UserContributionsTab.test.tsx
autonomous: true
requirements: [UADM-01]
must_haves:
  truths:
    - "Claims and Änderungen are reachable inside the combined admin module and preserve links back to user/group context."
    - "The user claims section remains a real claim history, not a count-only dashboard."
    - "Known rights/role/claim audit events are presented as understandable Änderungen with technical fallback for unknown events."
    - "Internal release_version_id values are never presented as semantic version numbers."
    - "No Phase-139 contribution regrouping is implemented."
---

<objective>
Integrate Claims and Änderungen into the combined module and make the bounded contribution-label correction.

Purpose: complete the agreed administration context without duplicating claim business logic or pulling Phase 139 forward.
Output: central Claims/Änderungen surfaces, user-context links, truthful contribution labels.
</objective>

<context>
@138-CONTEXT.md
@138-06-SUMMARY.md
@frontend/src/app/admin/users/tabs/UserClaimsTab.tsx
@frontend/src/app/admin/users/tabs/UserAuditTab.tsx
@frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx
@frontend/src/app/admin/users/tabs/UserContributionsTab.tsx
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Integrate Claims as a work queue without duplicate mutation logic</name>
  <read_first>UserClaimsTab.tsx; ClaimManagementPanel.tsx; existing claim API helpers/routes</read_first>
  <files>frontend/src/app/admin/claims/page.tsx, frontend/src/app/admin/claims/AdminClaimsClient.tsx, frontend/src/app/admin/users/tabs/UserClaimsTab.tsx, frontend/src/app/admin/users/tabs/UserClaimsTab.test.tsx, frontend/src/app/admin/identity-access/AdminIdentityAccessNav.tsx</files>
  <behavior>
    - Central Claims route uses real statuses/types and bounded existing backend query capabilities.
    - User and group references deep-link to canonical contexts.
    - If approval/rejection remains implemented only in group ClaimManagementPanel, the queue links there instead of cloning mutation code.
    - User Claims tab shows member profile, claim type/status/date/group and navigation.
  </behavior>
  <action>Prefer composition/deep-linking. Only add backend filters if required for a bounded list; do not create a new claim domain service.</action>
  <verify><automated>cd frontend &amp;&amp; npx vitest run src/app/admin/users/tabs/UserClaimsTab.test.tsx src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.test.tsx --reporter=dot</automated></verify>
  <done>Claims are reachable and actionable without a forked approval implementation.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Present user and central audit as Änderungen</name>
  <read_first>UserAuditTab.tsx; Phase-137/role-capability audit event names; AdminAuditEntry</read_first>
  <files>frontend/src/app/admin/changes/page.tsx, frontend/src/app/admin/changes/AdminChangesClient.tsx, frontend/src/app/admin/users/tabs/UserAuditTab.tsx, frontend/src/app/admin/users/tabs/UserAuditTab.test.tsx, frontend/src/app/admin/identity-access/AdminIdentityAccessNav.tsx</files>
  <behavior>
    - Visible label is Änderungen.
    - Known effective-right override, role-capability and claim events render German summaries with context and outcome.
    - Unknown event types remain visible via technical fallback.
    - Timestamp and target/context are always retained.
    - Before→after is shown when payload/history provides it; never fabricate missing state.
  </behavior>
  <action>Use existing audit storage. If central filtering requires a small query projection, add only that query/handler seam and keep storage unchanged.</action>
  <verify><automated>cd frontend &amp;&amp; npx vitest run src/app/admin/users/tabs/UserAuditTab.test.tsx --reporter=dot</automated></verify>
  <done>Administrative history is understandable but complete.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Remove release_version_id-as-version presentation</name>
  <read_first>UserContributionsTab.tsx; AdminContributionItem; Phase-139 roadmap</read_first>
  <files>frontend/src/app/admin/users/tabs/UserContributionsTab.tsx, frontend/src/app/admin/users/tabs/UserContributionsTab.test.tsx</files>
  <behavior>
    - Never render `Version {release_version_id}`.
    - If no semantic version field exists, use a neutral release-specific assignment label/link.
    - Preserve current project_default/release_override/dispute grouping.
    - Do not introduce client-side mass regrouping or fake episode/version ranges.
  </behavior>
  <action>Make only the truthful display correction; Phase 139 owns scalable projections.</action>
  <verify><automated>cd frontend &amp;&amp; npx vitest run src/app/admin/users/tabs/UserContributionsTab.test.tsx --reporter=dot</automated></verify>
  <done>Technical IDs are not misrepresented as release version numbers.</done>
</task>

</tasks>

<verification>Focused Claims/Änderungen/contribution tests and `git diff --check`.</verification>
<success_criteria>The additional agreed admin context is integrated without duplicating domain mutation logic or stealing Phase-139 scope.</success_criteria>
<output>After completion, create `138-07-SUMMARY.md`.</output>
