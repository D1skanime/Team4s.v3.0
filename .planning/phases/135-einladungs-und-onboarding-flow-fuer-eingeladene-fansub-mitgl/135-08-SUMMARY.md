---
phase: 135-einladungs-und-onboarding-flow-fuer-eingeladene-fansub-mitgl
plan: 08
subsystem: infra
tags: [keycloak, freemarker, login-theme, i18n, auth]

# Dependency graph
requires:
  - phase: 135-01
    provides: "frontend/src/lib/keycloakAuth.ts beginKeycloakLogin({intent:'register', loginHint, returnPath}); login_hint is always the invited email for the invite Registrieren path"
  - phase: 135-05
    provides: "InviteAcceptFlow.tsx's handleRegister forwards loginHintEmail as login_hint to beginKeycloakLogin; the Content-Spec Addendum scope ruling (135-05-SUMMARY.md) that deferred dynamic group/inviter context but kept the Keycloak register-page email lock in scope for this plan"
provides:
  - "infra/keycloak/themes/team4s/login/register.ftl — first .ftl override the team4s theme ships (previously inherited byte-for-byte from keycloak.v2); locks + prefills the email field and shows a generic invite-context line whenever login_hint carries an email-shaped value, unchanged (fully editable, no context) otherwise"
  - "Empirically documented, in-file finding: Keycloak 26.0.8's registration endpoint maps login_hint only into the 'username' profile attribute, never 'email' — a fact any future Keycloak/theme change in this realm needs to account for"
  - "team4sInviteContext / team4sEmailLockedHelp German message keys in messages_de.properties"
affects: [135-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Theme-only FreeMarker override that inlines user-profile-commons.ftl's userProfileFormFields loop (rather than calling the macro) so exactly one attribute (email) can get custom markup (HTML readonly, not the macro's built-in disabled) while every other attribute keeps calling the stock userProfileCommons.inputFieldByType macro unchanged."
    - "FreeMarker doc/finding comments in theme .ftl files must use <#-- --> (real FreeMarker comments), never HTML <!-- -->, if the prose contains example <#if ...> directive syntax — HTML comments do not suppress FreeMarker parsing and a live directive-shaped example text inside one crashes the page with a 500."
    - "Keycloak 26's auto-escaping (HTML output format) rejects an explicit ?html builtin as redundant double-escaping; rely on the engine's default auto-escaping for ${...} output instead, matching how every stock inputTag value is already rendered unescaped-in-source but auto-escaped-at-render."

key-files:
  created: []
  modified:
    - infra/keycloak/themes/team4s/login/register.ftl
    - infra/keycloak/themes/team4s/login/messages/messages_de.properties
    - infra/keycloak/themes/team4s/login/resources/css/login.css
    - infra/keycloak/themes/team4s/login/theme.properties

key-decisions:
  - "Sourced the invited email from the login_hint-prefilled 'username' attribute's value (when it contains '@'), not from a new query param or realm userProfile config change — the only theme-reachable mechanism this realm actually exposes, confirmed by curling the live /protocol/openid-connect/registrations endpoint before writing any template code (plan's REALITY section required this, not an assumption)."
  - "Rendered the locked email field with a real HTML `readonly` attribute via custom inlined markup, not Keycloak's built-in attribute.readOnly path (which emits `disabled` and would silently drop the value from form submission) — proven necessary by reading user-profile-commons.ftl's inputTag macro before implementing."
  - "D-13's context line is generic (no dynamic group/inviter/role name) because Keycloak does not forward that context to the registration template in a theme-only change — matches the plan's own REALITY note and 135-05-SUMMARY.md's prior Content-Spec Addendum scope ruling."
  - "Added resources/css/login.css and theme.properties changes beyond the plan frontmatter's exact files_modified list (register.ftl, theme.properties, messages_de.properties already covered CSS ambiguity) — CSS was needed to satisfy Task 2's own action text ('a visually-disabled style consistent with the team4s theme'); theme.properties got a documentation-only comment for Task 3's cache-behavior confirmation, no functional change."

patterns-established:
  - "Any future team4s Keycloak theme override of a stock keycloak.v2 template must use <#-- --> for documentation comments if the prose includes literal FreeMarker-syntax examples."

requirements-completed: [D-12, D-13, D-07]

# Metrics
duration: ~50min
completed: 2026-08-17
---

# Phase 135 Plan 08: Keycloak register.ftl email lock + invite context Summary

**`register.ftl` is now a real team4s theme override (the theme's first) that renders the invite-prefilled email field as HTML `readonly` (value still submitted) plus a generic invite-context line, proven end-to-end by actually registering and deleting a live Keycloak test account through the locked path.**

## Performance

- **Duration:** ~50 min
- **Started:** 2026-08-17 (session continuation from Plan 06)
- **Completed:** 2026-08-17
- **Tasks:** 3
- **Files modified:** 4 (register.ftl created as theme override; messages_de.properties, login.css, theme.properties modified)

## Accomplishments
- Confirmed empirically (not assumed) against the live Keycloak 26.0.8 realm that `login_hint` only ever prefills the "username" registration attribute, never "email" — proven by curling `/realms/team4s/protocol/openid-connect/registrations` with `login_hint` set and inspecting the rendered `<input>` values before writing any template code.
- `register.ftl` now exists in the team4s theme (previously the theme shipped zero `.ftl` overrides and inherited register.ftl byte-for-byte from `keycloak.v2`). It inlines `user-profile-commons.ftl`'s attribute-rendering loop so exactly the "email" attribute can get a real HTML `readonly` input (value still submitted with the form) instead of Keycloak's built-in `attribute.readOnly` → `disabled` path (which would silently drop the value from submission).
- When an email-shaped `login_hint` is present: the email field renders readonly + prefilled with a helper line, and a generic invite-context block (`team4sInviteContext`) renders above the form. When absent: both are absent and the form behaves exactly like stock open registration (verified live, including a non-email-shaped `login_hint` producing no false-positive lock).
- Full live end-to-end proof (not just rendering inspection): GET the register page with a login_hint → POST the completed form to Keycloak's own rendered action URL → 302 with an auth code → exchanged the code at the token endpoint → called `/userinfo` and confirmed the newly created account's `email` claim is byte-identical to the invited address, proving the locked field's value genuinely persists as the account's real email (the D-12-critical property). Test account deleted afterward via the Keycloak admin API.
- Confirmed via `docker-compose.yml` and live iteration (including recovering from an intermediate FreeMarker syntax error) that the theme is bind-mounted read-only and `start-dev` disables Keycloak's theme cache — no restart or cache-config change was needed to pick up edits.

## Task Commits

Each task was committed atomically:

1. **Task 1: Determine the running Keycloak's register template + email-reach mechanism** - `cd7636ec` (feat) — added a functionally-identical baseline copy of stock keycloak.v2 register.ftl with the empirically-verified findings documented in-file as a FreeMarker comment.
2. **Task 2: Lock the email field + add generic invite-onboarding context (D-12/D-13)** - `f73529cc` (feat) — inlined the attribute loop, added the custom readonly/prefilled email branch, the invite-context block, two new German message keys, and CSS styling.
3. **Task 3: Load the theme into Keycloak and live-verify the end-to-end register leg** - `1f8bbe80` (docs) — documented the already-correct theme-cache/mount behavior in theme.properties and recorded the full live cold-register round trip proof.

_Task 1 initially shipped with a subtle bug (an HTML `<!-- -->` comment containing literal `<#if ...>` example syntax, which FreeMarker still parses inside HTML comments and crashed the page with a 500) caught immediately by curling the live endpoint before moving to Task 2; fixed by switching to a true FreeMarker `<#-- -->` comment before committing Task 1. See Issues Encountered._

## Files Created/Modified
- `infra/keycloak/themes/team4s/login/register.ftl` - New theme override (previously did not exist): documents the login_hint→username finding, derives `invitedEmail`, renders a generic invite-context block, and renders the "email" attribute with custom readonly+prefilled markup while every other attribute keeps using the stock macros.
- `infra/keycloak/themes/team4s/login/messages/messages_de.properties` - Added `team4sInviteContext` and `team4sEmailLockedHelp`, both with correct German Umlaute.
- `infra/keycloak/themes/team4s/login/resources/css/login.css` - Added `.team4s-invite-context` (info-box styling) and `.team4s-email-locked input.team4s-input-readonly` (muted/disabled-looking input styling).
- `infra/keycloak/themes/team4s/login/theme.properties` - Documentation-only comment recording the confirmed theme-cache/mount behavior (no functional change; `start-dev` + the existing read-only bind mount already disable caching).

## Decisions Made
See `key-decisions` in frontmatter. The most consequential one: rendering the email field's `readonly` state required abandoning Keycloak's own `userProfileFormFields` macro invocation (which cannot have its inner `<input>` rendering overridden per-attribute from outside) in favor of inlining that macro's loop body directly in `register.ftl`, with a single branch for `attribute.name == "email"`. This keeps every other field (username, password, password-confirm, firstName, lastName) on the exact same stock rendering path.

## Deviations from Plan

**Two files outside the plan frontmatter's exact `files_modified` list were touched, both directly required by the plan's own `<tasks>` prose, not scope creep:**
- `infra/keycloak/themes/team4s/login/resources/css/login.css` — Task 2's action text explicitly says the locked field needs "a visually-disabled style consistent with the team4s theme"; the theme ships one shared stylesheet (`styles=css/login.css` in theme.properties), so that's where the styling landed.
- `infra/keycloak/themes/team4s/login/theme.properties` — was already declared as a Task 3 file in the plan frontmatter. No functional change was actually needed (theme caching was already correctly disabled via the existing `start-dev` command + read-only bind mount), so the change is a documentation-only comment recording that confirmation rather than a config edit.

No other deviations — Task 1/2/3 acceptance criteria were implemented and live-verified as written.

## Issues Encountered
- **Live 500 during Task 1's own baseline copy**: the documentation comment block used an HTML `<!-- -->` comment containing literal FreeMarker directive-syntax prose (`<#if attribute.readOnly>disabled</#if>` as an illustrative example). FreeMarker does not treat HTML comments as its own comment syntax and parsed/executed that example text as a real directive referencing an undefined `attribute` variable, producing `freemarker.core.NonHashException` and an HTTP 500 on the real registration endpoint. Caught immediately by curling the live endpoint (this plan's verification habit) before committing; fixed by switching the whole documentation block to a true FreeMarker `<#-- --> ` comment. Documented as a pattern to avoid in future theme .ftl work.
- **`?html` rejected by FreeMarker**: Keycloak 26's templates run with auto-escaping (HTML output format) active; an explicit `${invitedEmail?html}` in the email `value=` attribute was rejected at template-parse time as "not allowed when auto-escaping is on... to avoid double-escaping mistakes." Fixed by using `${invitedEmail}` directly (auto-escaping already applies, matching every other attribute value output in the stock template) — the threat model's "escape the value" mitigation (T-135-08-02) is satisfied by the engine's default auto-escaping rather than an explicit builtin.
- Both issues were caught and fixed before their respective task commits by re-curling the live realm after every edit (no broken state was ever committed).

## User Setup Required

None - no external service configuration required. The `keycloak` docker-compose service already bind-mounts the theme directory read-only and runs `start-dev` (theme caching disabled by default), so this change is live the moment the container sees the updated files — no restart, rebuild, or `--spi-theme-cache-themes` flag needed in this environment.

## Next Phase Readiness
D-12 (email lock) and D-13 (invite context) are closed for the Keycloak registration leg of the cold-invite flow. Combined with 135-05/135-06's shared `InviteAcceptFlow` and 135-01's `login_hint` forwarding, an invitee following "Registrieren" from either invite type now lands on a register form where the email that will later need to match at accept-time (`FansubGroupInvitationRepository.Accept()`'s `email_match` check, unchanged and still authoritative) cannot be silently altered. 135-07 (the phase's full automated gate + live UAT checkpoint plan) can treat this leg as done; its own live cold-invite Mailpit round trip should now observe the locked+contextualized register page as part of that broader walkthrough, though the KC-side rendering and submission behavior itself was already proven live in this plan's Task 3 (not merely assumed).

Note for any future revisit of D-08's original locked text ("kein KC-Theme-Umbau", `135-CONTEXT.md`/ROADMAP.md Phase 135 scope section): this plan intentionally does add a KC theme change, layered on top of (not replacing) D-08's mediated query-param fallback from 135-03 — D-12/D-13 were introduced later, during live-UAT review, specifically because the mediated-only approach could prefill but not lock the email or show any context. This is a scope evolution, not a contradiction, and is worth reflecting explicitly the next time `135-CONTEXT.md`'s D-08 text is revised.

---
*Phase: 135-einladungs-und-onboarding-flow-fuer-eingeladene-fansub-mitgl*
*Completed: 2026-08-17*
