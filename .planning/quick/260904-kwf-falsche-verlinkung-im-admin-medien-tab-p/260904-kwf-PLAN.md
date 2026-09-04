---
phase: quick-260904-kwf
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/app/admin/users/tabs/UserMediaTab.tsx
  - frontend/src/app/admin/users/tabs/UserMediaTab.test.tsx
autonomous: true
requirements: []

must_haves:
  truths:
    - "Platform admin clicking 'Release-Medien öffnen' in the Admin-Medien tab lands in the admin episode-version editor, not the contributor workspace"
    - "The contributor-side workspace links elsewhere in the codebase remain untouched"
  artifacts:
    - path: "frontend/src/app/admin/users/tabs/UserMediaTab.tsx"
      provides: "ReleaseBlockCard button href pointing at /admin/episode-versions/{id}/edit"
      contains: "/admin/episode-versions/"
    - path: "frontend/src/app/admin/users/tabs/UserMediaTab.test.tsx"
      provides: "Assertion covering the corrected href"
      contains: "/admin/episode-versions/42/edit"
  key_links:
    - from: "frontend/src/app/admin/users/tabs/UserMediaTab.tsx"
      to: "/admin/episode-versions/[versionId]/edit"
      via: "Button href using block.release_version_id"
      pattern: "/admin/episode-versions/\\$\\{block.release_version_id\\}/edit"
---

<objective>
Fix a broken link in the Admin-Medien tab: the "Release-Medien öffnen" button currently
points at the contributor workspace route (`/me/releases/{id}/workspace`), which requires a
verified member profile that platform admins do not have. Clicking it as a platform admin
(e.g. app_user_id=1) produces a 404 project lookup and a missing notes tab. The admin area
already has a full-featured editor at `/admin/episode-versions/{versionId}/edit` backed by
the same `getEpisodeVersionEditorContext` hook/endpoint keyed by the same version ID, so
retargeting the link is a drop-in fix with no backend or data changes.

Purpose: Platform admins can open release media directly from the Admin-Medien tab without
hitting a broken contributor-only route.
Output: Corrected href in `UserMediaTab.tsx` and an updated assertion in
`UserMediaTab.test.tsx` proving the new destination.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@frontend/src/app/admin/users/tabs/UserMediaTab.tsx
@frontend/src/app/admin/users/tabs/UserMediaTab.test.tsx
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Retarget the Release-Medien-öffnen button and update its test</name>
  <files>frontend/src/app/admin/users/tabs/UserMediaTab.tsx, frontend/src/app/admin/users/tabs/UserMediaTab.test.tsx</files>
  <behavior>
    - Test: "zeigt den primären Aktions-Button 'Release-Medien öffnen' mit korrektem Link,
      nicht die alte Kopie" (UserMediaTab.test.tsx line ~104-110) currently asserts
      `expect.stringContaining('/me/releases/42/workspace')`. Update this assertion to
      `expect.stringContaining('/admin/episode-versions/42/edit')` — same assertion style
      (`toHaveProperty('href', expect.stringContaining(...))`), only the expected substring
      changes. Do not touch the other assertions in this test block (button label check,
      `queryByText('Arbeitsfläche öffnen')` absence check).
  </behavior>
  <action>
    In `frontend/src/app/admin/users/tabs/UserMediaTab.tsx`, inside `ReleaseBlockCard` (around
    line 116), change the `Button` component's `href` prop from
    `` `/me/releases/${block.release_version_id}/workspace` `` to
    `` `/admin/episode-versions/${block.release_version_id}/edit` ``. Keep the button label
    "Release-Medien öffnen" and every other prop (`size="sm"`, `variant="primary"`) unchanged.

    Update the test assertion described in `<behavior>` first (RED — it should fail against
    the current href), then apply the production change (GREEN — assertion passes).

    Do NOT modify any other file. Specifically leave these contributor-context workspace links
    exactly as they are: `frontend/src/app/me/dashboard/components/AttentionSection.tsx`,
    `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx`,
    `frontend/src/components/contributions/ContributionCard.tsx`,
    `frontend/src/components/contributions/AnimeGroupCard.tsx`. They correctly point
    contributors at `/me/releases/{id}/workspace` and are out of scope for this fix.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/app/admin/users/tabs/UserMediaTab.test.tsx"</automated>
  </verify>
  <done>
    All tests in UserMediaTab.test.tsx pass, including the updated assertion expecting
    `/admin/episode-versions/42/edit`. The href in UserMediaTab.tsx no longer contains
    `/me/releases/` or `/workspace`. No other file in the repo was modified.
  </done>
</task>

<task type="auto">
  <name>Task 2: Restart frontend container to pick up the change</name>
  <files></files>
  <action>
    HMR does not reliably pick up this route-string change in the running dev container.
    Restart the frontend container so the live app serves the corrected link:
    `docker restart team4sv30-frontend`. Wait for the container to report healthy/running
    before considering this task done.
  </action>
  <verify>
    <automated>docker compose ps team4sv30-frontend | grep -i "up\|running"</automated>
  </verify>
  <done>
    team4sv30-frontend container is restarted and reports a running/healthy state.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| Admin UI -> route navigation | Platform-admin-only client-side link; no new trust boundary crossed, target route (`/admin/episode-versions/{id}/edit`) already enforces its own existing admin-auth guard. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|--------------|-----------------|
| T-260904-kwf-01 | Elevation of Privilege | `/admin/episode-versions/{id}/edit` route | accept | Route already exists and is already gated behind existing admin-only auth middleware/guards independent of this plan; this change only redirects an existing admin-visible button to an already-protected admin route, granting no new access. |
</threat_model>

<verification>
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/app/admin/users/tabs/UserMediaTab.test.tsx"` passes fully.
- Manual spot check (optional, via SSH tunnel at `http://127.0.0.1:3300`): as a platform admin, open Admin -> Users -> a user with release media -> Medien tab -> click "Release-Medien öffnen" -> lands on `/admin/episode-versions/{id}/edit`, not a 404.
</verification>

<success_criteria>
- `UserMediaTab.tsx`'s button href points at `/admin/episode-versions/${block.release_version_id}/edit`.
- `UserMediaTab.test.tsx` asserts the new href and passes.
- No other files changed; contributor-side workspace links remain byte-identical.
- Frontend container restarted so the fix is live.
</success_criteria>

<output>
Create `.planning/quick/260904-kwf-falsche-verlinkung-im-admin-medien-tab-p/260904-kwf-SUMMARY.md` when done
</output>
