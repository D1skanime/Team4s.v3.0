---
phase: quick-260812-bqs
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [frontend/src/components/profile/MemberBadgeChain.tsx, frontend/src/components/profile/MemberBadgeChain.module.css, frontend/src/components/profile/MemberBadgeChain.test.tsx]
autonomous: false
requirements: [260812-bqs-scope]
must_haves:
  truths:
    - "Ein Mitglied ohne Punkte-Meilenstein sieht im Punkte-Hero eine grosse neutrale Mystery-Medaille mit prominentem Fragezeichen, Schloss und dem sichtbaren Text 'Noch nicht freigeschaltet'."
    - "Jede vollstaendig unverdiente Beitragsfamilie und eine vollstaendig unverdiente Mitgliedschaft zeigen dieselbe Hero-Darstellung."
    - "Kein gesperrter Hero verraet Silhouette, Motiv, Rahmen, Bild-URL oder Badge-Farbpalette einer kuenftigen Auszeichnung."
    - "Verdiente, aktuelle und vom Mitglied ausgewaehlte Vorschau-Heroes sowie Fortschritt, Schwellenwerte und Karussellverhalten bleiben unveraendert."
    - "Die Mystery-Medaille bleibt von 390 bis 1920 Pixeln lesbar, proportional und ohne horizontalen Seitenueberlauf."
  artifacts:
    - {path: frontend/src/components/profile/MemberBadgeChain.tsx, provides: "hero-faehige Variante der bestehenden LockedStageArtwork-Naht und ausschliesslich drei unverdiente Hero-Verwendungen"}
    - {path: frontend/src/components/profile/MemberBadgeChain.module.css, provides: "neutrale responsive Mystery-Medaillen-Komposition ohne Badge-spezifische Gestaltung"}
    - {path: frontend/src/components/profile/MemberBadgeChain.test.tsx, provides: "DOM-, SSR-, Zustands- und CSS-Regressionsschutz"}
  key_links:
    - {from: frontend/src/components/profile/MemberBadgeChain.tsx, to: LockedStageArtwork, via: "hero variant when currentCode is null"}
    - {from: frontend/src/components/profile/MemberBadgeChain.tsx, to: resolveBadgeArtwork, via: "earned/current/selected branches remain the only hero-art path"}
---

<objective>
Turn the empty or undersized locked heroes for Punkte-Meilensteine, completely unearned contribution families, and completely unearned membership into one professional neutral mystery medal.

Purpose: The locked state should feel intentional and inviting while preserving the secrecy contract established by Quick 260811-lck.
Output: A tested, responsive hero variant of `LockedStageArtwork`, focused styling, and live Sheppert evidence that remains blocked on explicit human approval.
</objective>

<context>
<read_first>
@AGENTS.md
@docs/engineering/implementation-contract.md
@docs/frontend/ui-system.md
@docs/agent-guidelines-ui.md
@.planning/quick/260811-lck-hide-locked-achievement-art/260811-lck-PLAN.md
@frontend/src/components/profile/MemberBadgeChain.tsx
@frontend/src/components/profile/MemberBadgeChain.module.css
@frontend/src/components/profile/MemberBadgeChain.test.tsx
@frontend/src/components/profile/memberBadgeFamilies.ts
@frontend/src/components/profile/memberBadgeLabels.ts
@frontend/src/components/profile/badgeArtwork.ts
@frontend/src/components/ui/Badge.tsx
</read_first>
<interfaces>
`LockedStageArtwork({ className })` is the existing Quick-260811-lck secrecy seam and emits `data-locked-stage-art` without an image. Extend this seam with an explicit hero presentation instead of creating another placeholder component. `ContributionAchievementStage` and `MembershipStage` already use it when `currentCode` is null, but only at compact dimensions. `PointsAchievementStage` currently leaves `.pointsHeroArtwork` empty when `currentCode` is null. Earned/current and selected earned previews continue through `resolveBadgeArtwork`; they are outside this quick.
</interfaces>
<scope_boundary>
Only the three completely unearned hero states are in scope: Punkte-Meilensteine, each contribution family whose `currentCode` is null, and membership whose `currentCode` is null. Do not change compact locked stages, Anime-Projekte, roles, founding-member handling, earned/current/preview heroes, labels other than the exact new locked copy, progress math/copy, thresholds, ordering, carousel/scroll logic, backend, API, database, contracts, or image assets. A locked hero may retain useful tier text only in neutral/muted styling; it must not use the future badge's presentation color.
</scope_boundary>
</context>

<tasks>
<task type="auto" tdd="true">
<name>Task 1: RED - lock the hero mystery contract</name>
<files>frontend/src/components/profile/MemberBadgeChain.test.tsx</files>
<behavior>
- Zero points renders one hero-sized `data-locked-stage-art` with a dedicated hero marker and visible exact text `Noch nicht freigeschaltet`.
- Each contribution family with zero earned tiers and membership with zero earned duration tiers renders the same hero contract.
- Those locked heroes contain a prominent question mark and lock visual, but no `img`, `data-achievement-art`, motif/frame class, asset basename, badge icon, or future-tier color variant in DOM or SSR.
- Mixed/earned fixtures still render their current hero artwork; clicking an already earned older tier still renders `Vorschau`; a founding-member preview remains unchanged.
- Progress values, threshold copy, stage counts, noninteractive compact locks and carousel/scroll behavior remain unchanged.
</behavior>
<action>Before editing, run `git status --short` and `docker compose ps`. Because `MemberBadgeChain.test.tsx` already contains unrelated unstaged work, record the exact incoming working-tree patch, index patch, indexed blob/path list, and SHA-256 hashes for all three scoped files under this quick's `evidence/incoming/`. Compare intended test insertion ranges against incoming hunks and fail closed on overlap. Add a new `Quick 260812-bqs locked mystery heroes` describe block using existing render helpers/fixtures; do not rewrite or reformat existing tests. Run only the new test name first and save the expected assertion failure in `evidence/RED.txt`. Stage/commit only the exact new test hunks using a generated patch or `git add -p`; never use `git add .`, `git add -A`, whole-file replacement, or whole-file staging.</action>
<verify>
<automated>cd /home/d1sk/team4s &amp;&amp; test -s .planning/quick/260812-bqs-gesperrte-auszeichnungs-heroes-als-gross/evidence/RED.txt &amp;&amp; grep -E "FAIL|failed|AssertionError" .planning/quick/260812-bqs-gesperrte-auszeichnungs-heroes-als-gross/evidence/RED.txt</automated>
</verify>
<done>The focused tests fail only because the three locked heroes do not yet meet the shared large mystery-medal contract, while incoming user hunks remain byte-identical.</done>
</task>

<task type="auto" tdd="true">
<name>Task 2: GREEN - extend LockedStageArtwork for neutral heroes</name>
<files>frontend/src/components/profile/MemberBadgeChain.tsx, frontend/src/components/profile/MemberBadgeChain.module.css, frontend/src/components/profile/MemberBadgeChain.test.tsx</files>
<action>Extend the local `LockedStageArtwork` component with an explicit hero variant that preserves the compact default unchanged. The hero variant must render one neutral circular medal composition, a dominant `?`, a clearly subordinate `Lock`, and visible correct German copy `Noch nicht freigeschaltet`; keep decorative shapes/icons `aria-hidden` and expose the copy as normal text. Reuse this variant only when `currentCode` is null in `PointsAchievementStage`, `ContributionAchievementStage`, and `MembershipStage`. For completely unearned contribution/membership status, use only neutral/muted status styling so future tier colors are not disclosed; do not hide factual progress or threshold text. Add a dedicated `data-locked-stage-hero` hook for tests/UAT. Style it with existing surface, border, text and shadow tokens, `max-width: 100%`, stable aspect geometry, and sizing inherited safely from the three existing hero artwork slots; do not introduce a badge-specific gradient, silhouette, image, asset, viewport-device breakpoint, global wrapping rule, or second component. Preserve the existing earned/current/selected artwork branches exactly. Apply only isolated hunks after checking them against the saved incoming patch, then prove the incoming hashes/hunks remain preserved outside the new changes.</action>
<verify>
<automated>cd /home/d1sk/team4s &amp;&amp; docker compose exec -T team4sv30-frontend npm test -- --run frontend/src/components/profile/MemberBadgeChain.test.tsx -t "Quick 260812-bqs locked mystery heroes" &amp;&amp; docker compose exec -T team4sv30-frontend npm test -- --run frontend/src/components/profile/MemberBadgeChain.test.tsx &amp;&amp; docker compose exec -T team4sv30-frontend npm run typecheck &amp;&amp; docker compose exec -T team4sv30-frontend npm run lint -- --file src/components/profile/MemberBadgeChain.tsx --file src/components/profile/MemberBadgeChain.test.tsx &amp;&amp; git diff --check &amp;&amp; git diff --cached --check</automated>
</verify>
<done>All three entirely unearned hero types use the one expanded seam, locked DOM/SSR remains secret and neutral, earned/current/preview behavior is unchanged, focused/full component tests and static checks pass, and unrelated dirty hunks are preserved.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
<name>Task 3: Approve the responsive Sheppert result</name>
<files>none</files>
<what-built>A shared professional mystery medal for the three completely unearned public-profile hero states, with no future-art disclosure.</what-built>
<action>Using the shared live browser and the real Sheppert public member profile through `http://127.0.0.1:3300`, rebuild/restart only the frontend service if necessary. Capture the relevant full-page or section evidence at 390x844, 768x1024, 1024x768, 1440x900, and 1920x1080 when the browser permits. Store screenshots and `MANIFEST.md` under this quick's `evidence/uat/`; for any browser-limited size, record the exact failure instead of substituting a scaled desktop capture. Record `document.documentElement.scrollWidth &lt;= document.documentElement.clientWidth` at each captured width. Stop at this checkpoint and do not write SUMMARY.md, update STATE.md, or mark the quick complete before the user explicitly approves.</action>
<how-to-verify>
1. Punkte-Meilensteine, every completely unearned contribution family, and completely unearned membership show the same large neutral medal with a prominent `?`, lock, and visible `Noch nicht freigeschaltet`.
2. No future badge silhouette, motif, frame, artwork, asset color, image flash, or colored future-tier treatment is visible during load or after hydration.
3. The medal and copy remain centered, legible, proportional and unclipped at every captured size, with no document-level horizontal overflow.
4. Earned/current artwork, an already-earned older-tier `Vorschau`, membership founding preview, progress bars/copy, thresholds, compact stage locks, ordering, scrolling and carousels behave exactly as before.
</how-to-verify>
<verify>
<automated>cd /home/d1sk/team4s &amp;&amp; docker compose ps team4sv30-frontend &amp;&amp; test -s .planning/quick/260812-bqs-gesperrte-auszeichnungs-heroes-als-gross/evidence/uat/MANIFEST.md &amp;&amp; grep -E "390|768|1024|1440|1920" .planning/quick/260812-bqs-gesperrte-auszeichnungs-heroes-als-gross/evidence/uat/MANIFEST.md &amp;&amp; git diff --check</automated>
</verify>
<done>The user has explicitly approved the real Sheppert view, or supplied feedback that returns execution to Task 2; absent approval, the quick remains in progress.</done>
<resume-signal>Reply exactly `approved` to authorize finalization, or describe the visual issue to revise.</resume-signal>
</task>
</tasks>

<threat_model>
| Threat | Disposition | Mitigation |
|---|---|---|
| Future badge disclosure through hero DOM, SSR, image URL, icon, silhouette, frame or palette | mitigate | One earned-state branch gate plus DOM/SSR absence tests and live load inspection |
| Accessibility regression from decorative mystery art | mitigate | Decorative medal and icons are hidden; exact visible German state copy remains available to assistive technology |
| Earned/current/preview regression | mitigate | Mixed-state tests and live selection regression checks |
| Dirty worktree overwrites or accidental commit of unrelated hunks | mitigate | Incoming patches/blobs/hashes, overlap fail-closed gate, exact patch staging and post-change hunk audit |
| Responsive clipping or page overflow | mitigate | Parent-slot-safe intrinsic sizing plus 390/768/1024/1440/1920 live evidence and scrollWidth assertion |
| Scope drift into mechanics or assets | mitigate | Explicit scope boundary and diff audit excludes backend/API/DB/assets/progress/threshold/carousel changes |
</threat_model>

<verification>RED then GREEN focused TDD, full MemberBadgeChain regression suite, typecheck, scoped lint, working/index diff checks, incoming-hunk preservation audit, DOM/SSR secrecy assertions, and responsive live Sheppert UAT at five widths followed by exact human approval.</verification>
<success_criteria>The three completely unearned hero cases look intentional and consistent through the existing seam; their exact German locked state is visible; future badge art and palette remain secret; earned/current/preview mechanics are unchanged; mobile-through-widescreen evidence has no overflow; and no completion occurs before explicit approval.</success_criteria>
<source_audit>
GOAL professional large neutral mystery medal | Tasks 1-3 | COVERED
REQ Punkte-Meilensteine at zero | Tasks 1-3 | COVERED
REQ every completely unearned contribution family | Tasks 1-3 | COVERED
REQ completely unearned membership | Tasks 1-3 | COVERED
REQ exact visible German copy | Tasks 1-3 | COVERED
REQ never reveal future silhouette/colors/art | Tasks 1-3 | COVERED
REQ reuse LockedStageArtwork from Quick 260811-lck | Tasks 1-2 | COVERED
REQ earned/current/preview heroes unchanged | Tasks 1-3 | COVERED
