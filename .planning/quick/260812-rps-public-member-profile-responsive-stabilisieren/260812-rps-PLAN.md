---
phase: quick-260812-rps
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [frontend/src/app/members/[slug]/page.module.css, frontend/src/app/members/[slug]/page.test.tsx, frontend/src/components/profile/profile.module.css, frontend/src/components/profile/MemberProfileHero.test.tsx, frontend/src/components/profile/MemberBadgeChain.module.css, frontend/src/components/profile/MemberBadgeChain.test.tsx, frontend/src/components/profile/MemberCurrentProjectsSection.module.css, frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx, frontend/src/components/ui/FocalCarousel.module.css, frontend/src/components/ui/FocalCarousel.test.tsx]
autonomous: false
requirements: [260812-rps-scope]
must_haves:
  truths:
    - "Shepperts Profil hat bei 768x1024 keinen horizontalen Seitenueberlauf, keine buchstabenweisen Umbrueche und keine abgeschnittenen Hero-, Status-, Fortschritts- oder Karteninhalte."
    - "Dieselben Vertraege gelten bei 390x844, 1024x768, 1440x900 und 1920x1080; mobil ist die Seite sauber gestapelt und widescreen ausgewogen."
    - "Karussellkarten bleiben containergebunden; nur beabsichtigtes Peeking ist sichtbar und Pfeile, Tastatur sowie Touch-/Swipe bleiben benutzbar."
    - "Gestaltung, Inhalte, Assets, Achievement-Mechanik und Datenvertraege bleiben unveraendert."
  artifacts:
    - {path: frontend/src/app/members/[slug]/page.module.css, provides: "responsive page composition without global word-breaking workaround"}
    - {path: frontend/src/components/profile/profile.module.css, provides: "shrinkable hero and status geometry"}
    - {path: frontend/src/components/profile/MemberBadgeChain.module.css, provides: "container-bound badge and progress layouts"}
    - {path: frontend/src/components/ui/FocalCarousel.module.css, provides: "bounded cards, intentional peeking and usable controls"}
  key_links:
    - {from: frontend/src/app/members/[slug]/page.module.css, to: frontend/src/components/profile/profile.module.css, via: "page width and child shrink boundaries"}
    - {from: frontend/src/components/profile/MemberBadgeChain.module.css, to: frontend/src/components/ui/FocalCarousel.module.css, via: "consumer sizing through existing container-query seam"}
---

<objective>
Stabilize the complete public member profile responsively, using real Sheppert data and broken 768x1024 portrait as the primary fixture.
Purpose: Fix owning layout defects instead of hiding them with global word breaking or clipping, preserving approved design and interaction.
Output: Test-first contracts, narrow CSS/layout corrections, five-size evidence, and blocking human approval.
</objective>

<context>
<read_first>
@AGENTS.md
@docs/engineering/implementation-contract.md
@docs/frontend/ui-system.md
@docs/agent-guidelines-ui.md
@.planning/quick/260803-ozq-profilseite-responsiv-optimieren-neulade/260803-ozq-PLAN.md
@.planning/quick/260811-pqe-phase-127-public-member-profile-visuelle/260811-pqe-PLAN.md
@.planning/quick/260811-rms-phase-127-public-member-profile-widescre/260811-rms-PLAN.md
@.planning/quick/260811-rwd-binding-responsive-ui-standard/260811-rwd-PLAN.md
@.planning/quick/260812-bqs-gesperrte-auszeichnungs-heroes-als-gross/260812-bqs-PLAN.md
@frontend/src/app/members/[slug]/page.tsx
@frontend/src/app/members/[slug]/page.module.css
@frontend/src/app/members/[slug]/page.test.tsx
@frontend/src/components/profile/MemberProfileHero.tsx
@frontend/src/components/profile/profile.module.css
@frontend/src/components/profile/MemberProfileHero.test.tsx
@frontend/src/components/profile/MemberBadgeChain.tsx
@frontend/src/components/profile/MemberBadgeChain.module.css
@frontend/src/components/profile/MemberBadgeChain.test.tsx
@frontend/src/components/ui/FocalCarousel.tsx
@frontend/src/components/ui/FocalCarousel.module.css
@frontend/src/components/ui/FocalCarousel.test.tsx
</read_first>
<interfaces>The page owns viewport composition through `.page`, `.rhythmBand` and section-pair grids. Reusable surfaces own local geometry. `FocalCarousel` already owns its inline-size container, arrows, pointer drag, swipe, keyboard and active-item state; extend this seam, never add a profile-only carousel.</interfaces>
<scope_boundary>Only responsive CSS/layout, focused tests and strictly necessary semantic hooks. No redesign, backend/API/DB/assets/content, Achievement state/progress/threshold/order, or carousel logic rewrite. No global `overflow-x: hidden`, `word-break: break-all` or `overflow-wrap: anywhere`. A TSX hook requires proven targeting need, frontmatter amendment first, and no rendered/behavioral change.</scope_boundary>
<dirty_tree_contract>Incoming unrelated changes include STATE, assets, MemberBadgeChain tests/labels and all FocalCarousel files. Before edits save worktree/index patches, indexed blob IDs and SHA-256 hashes for scoped dirty files under `evidence/incoming/`; fail closed on overlap. Use deterministic patches and exact patch or `git add -p` staging. Never use `git add .`, `git add -A`, whole-file replacement/formatting/staging of dirty targets.</dirty_tree_contract>
</context>

<tasks>
<task type="auto" tdd="true">
<name>Task 1: RED - encode the full-page responsive contract</name>
<files>frontend/src/app/members/[slug]/page.test.tsx, frontend/src/components/profile/MemberProfileHero.test.tsx, frontend/src/components/profile/MemberBadgeChain.test.tsx, frontend/src/components/ui/FocalCarousel.test.tsx</files>
<behavior>
- Page root has no global arbitrary word breaker, 100vw, negative horizontal margin or page overflow clipping.
- At 768x1024 page pairs switch before minimum geometry fails; shrinkable children use min-width 0 and normal local wrapping.
- Hero identity/status/points/metadata and BadgeChain hero/status/progress/cards reflow without clipping or character-by-character wrapping.
- FocalCarousel follows its container, bounds cards with deliberate peeking only, and retains 44px arrows plus pointer/touch/keyboard navigation.
- Existing 1440/1920 hierarchy, earned/locked/preview states and carousel semantics remain unchanged.
</behavior>
<action>Run status/Compose checks and create dirty-tree evidence. Before code changes reproduce Sheppert at exactly 768x1024: save full-page screenshot, document `documentElement.scrollWidth/clientWidth`, and list every rect outside its owner in `evidence/diagnosis/768x1024.md`. Add focused `Quick 260812-rps` tests using selector-block assertions and existing DOM contracts, not snapshots. Replace the obsolete assertion requiring page-global `overflow-wrap: anywhere`. Save focused expected failures in `evidence/RED.txt`. Commit only exact test hunks after cached-diff audit.</action>
<verify><automated>cd /home/d1sk/team4s &amp;&amp; test -s .planning/quick/260812-rps-public-member-profile-responsive-stabilisieren/evidence/diagnosis/768x1024.md &amp;&amp; test -s .planning/quick/260812-rps-public-member-profile-responsive-stabilisieren/evidence/RED.txt &amp;&amp; grep -E "FAIL|failed|AssertionError" .planning/quick/260812-rps-public-member-profile-responsive-stabilisieren/evidence/RED.txt &amp;&amp; git diff --cached --check</automated></verify>
<done>Failing tests and live evidence name exact page, Hero, BadgeChain and carousel owners while incoming hunks remain intact.</done>
</task>

<task type="auto" tdd="true">
<name>Task 2: GREEN - repair geometry at owning seams</name>
<files>frontend/src/app/members/[slug]/page.module.css, frontend/src/app/members/[slug]/page.test.tsx, frontend/src/components/profile/profile.module.css, frontend/src/components/profile/MemberProfileHero.test.tsx, frontend/src/components/profile/MemberBadgeChain.module.css, frontend/src/components/profile/MemberBadgeChain.test.tsx, frontend/src/components/ui/FocalCarousel.module.css, frontend/src/components/ui/FocalCarousel.test.tsx</files>
<action>Implement only Task-1-proven corrections. Remove the page-global arbitrary breaker and switch intermediate composition before measured geometry fails; retain wide 8fr/5fr balance and narrow stack where they fit. Add `min-width: 0`, `max-width: 100%`, normal/local wrapping, `minmax(0, ...)` and container transitions only to actual Hero, BadgeChain and FocalCarousel owners. Preserve carousel container seam and all inputs; cards show only intentional peeking and never widen the document. Do not clip page, shrink text illegibly, change tokens/content/mechanics or broadly format. Apply/stage isolated hunks and audit hashes plus working/cached diffs.</action>
<verify><automated>cd /home/d1sk/team4s &amp;&amp; docker compose exec -T team4sv30-frontend npm test -- --run 'src/app/members/[slug]/page.test.tsx' src/components/profile/MemberProfileHero.test.tsx src/components/profile/MemberBadgeChain.test.tsx src/components/ui/FocalCarousel.test.tsx &amp;&amp; docker compose exec -T team4sv30-frontend npm run typecheck &amp;&amp; docker compose exec -T team4sv30-frontend npm run lint -- --file 'src/app/members/[slug]/page.tsx' --file src/components/profile/MemberProfileHero.tsx --file src/components/profile/MemberBadgeChain.tsx --file src/components/ui/FocalCarousel.tsx &amp;&amp; git diff --check &amp;&amp; git diff --cached --check</automated></verify>
<done>Responsive/static checks pass, owners contain layout, interactions remain intact, and unrelated dirty work is preserved.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
<name>Task 3: Approve exact live Sheppert evidence</name>
<files>none</files>
<what-built>The approved public profile stabilized mobile-to-widescreen, prioritizing 768x1024.</what-built>
<action>Use the shared browser and real Sheppert route at `http://127.0.0.1:3300`. Capture exact full-page screenshots at 390x844, 768x1024, 1024x768, 1440x900 and 1920x1080 under `evidence/uat/`. MANIFEST records viewport, URL, screenshot, document scroll/client width, carousel track/client/scroll widths, card rect versus container and intentional peeking. Inspect every Hero/status/profile/history/projects/roles/points/contribution/membership/progress/card area. Exercise arrows and swipe/pointer at 390, 768 and 1024 plus keyboard once. Record browser limits, never substitute scaled captures. STOP: no SUMMARY, STATE update or completion commit before explicit approval.</action>
<how-to-verify>
1. 768x1024 has no page overflow, character-wise wrapping, overlap or clipped Hero/status/progress/cards.
2. 390x844 stacks cleanly with readable labels and usable 44px controls.
3. 1024x768 keeps page pairs/cards contained.
4. 1440x900 and 1920x1080 remain balanced.
5. Carousel peeking is intentional; arrows, keyboard and swipe/pointer work.
6. Visual language, content, assets, states, values, thresholds and order are unchanged.
</how-to-verify>
<verify><automated>cd /home/d1sk/team4s &amp;&amp; docker compose ps team4sv30-frontend &amp;&amp; test -s .planning/quick/260812-rps-public-member-profile-responsive-stabilisieren/evidence/uat/MANIFEST.md &amp;&amp; grep -E "390x844|768x1024|1024x768|1440x900|1920x1080" .planning/quick/260812-rps-public-member-profile-responsive-stabilisieren/evidence/uat/MANIFEST.md &amp;&amp; git diff --check</automated></verify>
<done>User explicitly approves all five sizes/interactions, or feedback returns to Task 2; absent approval the Quick stays in progress.</done>
<resume-signal>Reply exactly `approved` to authorize SUMMARY/STATE finalization, or name viewport and defect.</resume-signal>
</task>
</tasks>

<threat_model>
| Threat | Disposition | Mitigation |
|---|---|---|
| Overflow hidden instead of fixed | mitigate | Ban clipping/global wrapping; capture widths and offending rects. |
| German words split per character | mitigate | Remove page-global anywhere; local technical-token handling only. |
| Carousel follows viewport | mitigate | Preserve container queries; test bounds, peeking and inputs. |
| Mobile/wide/input regression | mitigate | Full suites, five exact captures and live arrow/swipe/keyboard UAT. |
| Dirty work overwritten | mitigate | Patches/blobs/hashes, overlap gate and hunk-only staging. |
| Scope drift | mitigate | CSS/layout boundary and component regression suites. |
</threat_model>
<verification>RED-first contracts; page/Hero/BadgeChain/FocalCarousel suites; typecheck; scoped lint; diff/incoming audits; exact five-size Sheppert UAT; explicit approval.</verification>
<success_criteria>768x1024 is reproduced and fixed; all exact sizes have no overflow/clipping/character wrapping; mobile stacks, widescreen balances; carousel remains bounded/usable; no scope or dirty-tree drift; no SUMMARY/STATE before approval.</success_criteria>
<source_audit>
GOAL whole public profile responsive stabilization | Tasks 1-3 | COVERED
REQ prioritize 768x1024 and verify four other exact sizes | Tasks 1-3 | COVERED
REQ no overflow/character wrap/clipped hero-status-progress-cards | Tasks 1-3 | COVERED
REQ bounded peeking and arrows/swipe; mobile stacked/wide balanced | Tasks 1-3 | COVERED
REQ CSS/layout/minimal hooks/tests; no redesign/data/assets/mechanics/content | Tasks 1-2 | COVERED
REQ test-first, dirty-hunk preservation, screenshots, blocking approval and no early SUMMARY/STATE | Tasks 1-3 | COVERED
RESEARCH external discovery | EXCLUDED - Level 0 established CSS Modules/React, no dependency
CONTEXT deferred ideas | EXCLUDED - none
</source_audit>
<output>Only after explicit Task 3 approval create `260812-rps-SUMMARY.md` and update STATE Quick Tasks Completed, preserving incoming STATE hunks through exact staging.</output>