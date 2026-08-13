---
phase: 126
slug: mitgliedschaftsbadges-fachlich-trennen-responsive-membership-stage
status: draft
nyquist_validation: true
created: 2026-08-11
---

# Phase 126 Validation Strategy

## Validation Goal

Prove that Phase 126 is a presentation-only correction: founding and duration behave independently, duration remains backend-authoritative, membership no longer uses an outer carousel, all four active assets keep stable geometry, predecessor badge families remain unchanged, and human UAT approves the responsive result.

## Dirty-Worktree Safety Gate

Before every implementation plan:

1. Capture `git status --short`, `git diff`, `git diff --cached`, and `git diff --binary` for `MemberBadgeChain*`, `memberBadgeLabels*`, `FocalCarousel*`, and current modified membership/contribution asset files.
2. Record hashes or a baseline patch for each overlapping file.
3. Work from the current worktree, never reconstruct from `HEAD` and never reset.
4. Produce a Phase-126-only patch and verify any staged diff equals it exactly.
5. If hunk isolation is not provable, leave changes uncommitted and report the overlap.

## Automated Test Matrix

| Area | Cases | Required proof |
|---|---|---|
| Duration boundaries | 0, 1, 4, 5, 6, 7, 8, 9, 10, 11, 24 years | current/next/remainder/complete, hero, true years, progress values |
| Independent founder state | founder and non-founder at 3, 6, 24 years | founder never alters duration state; omission when absent; no duplicate special badge |
| Longest single membership | multiple historical membership rows | UI consumes projected value and never sums membership rows |
| Duration membership | exact codes 5/7/10 in order | founding absent from duration track; 5/7/10 exact |
| Preview | 10+ years, select 5 and 7 | hero/status change; actual years/progress/complete/current marker do not |
| Locked states | 6 years | 7/10 not buttons, not focusable/selectable; 5 is current |
| Terminal states | 10, 24, 50 | 10 current, no next threshold, true years visible, “Höchste Stufe erreicht” |
| Carousel removal | all membership states | no membership `FocalCarousel`, arrows, counter, outer drag, quiet semantics |
| Accessibility | current/earned/locked/founding | `aria-current`, `aria-pressed`, correct progressbar values, visible focus, state not color-only |
| Assets/geometry | four active membership assets | central resolver only; stable square slots; contained aspect ratio; no active-version change |
| SSR/visibility | zero/<5 non-founder and normal profiles | membership remains SSR-visible under current behavior; public visibility/404 unchanged |
| Shared regression | roles, projects, points, contributions, `FocalCarousel`, `FansubProjectsGrid`, labels | existing focused tests and full frontend suite remain green |

## Commands

Run from `/home/d1sk/team4s` on `team4s-linux`:

```bash
docker compose exec -T team4sv30-frontend npm test -- --run frontend/src/components/profile/memberBadgeLabels.test.ts frontend/src/components/profile/MemberBadgeChain.test.tsx
docker compose exec -T team4sv30-frontend npm run typecheck
docker compose exec -T team4sv30-frontend npm run lint
docker compose exec -T team4sv30-frontend npm test
docker compose exec -T team4sv30-frontend npm run build
git diff --check
```

If the container workdir expects paths without `frontend/`, use `src/components/profile/...`; record the exact successful command.

## Live UAT Matrix

Use the shared in-app browser through `http://127.0.0.1:3300` and navigate through the user-visible public profile path.

| Viewport | Required checks | Evidence |
|---|---|---|
| 390×844 | all three duration nodes visible, no overflow, correct stack/focus | `membership-390.png` |
| 768×1024 | tablet composition, text wrapping, slots | `membership-768.png` |
| 1024×768 | landscape/tablet composition | `membership-1024.png` |
| 1440×900 | wide Stage balance | `membership-1440.png` |
| 1920×1080 | max visual-width behavior | `membership-1920.png` |
| 2560×1440 | no narrow centered mobile card or oversized hero | `membership-2560.png` |

Additional evidence:

- `membership-founding.png`
- `membership-non-founder.png`
- `membership-preview.png`
- `membership-max.png`

## Human Checkpoint

After automated checks and evidence, stop and show:

1. Desktop Membership Stage.
2. Mobile Membership Stage.
3. Founder and non-founder states.
4. 5/7/10 duration track.
5. Earlier earned-stage preview.
6. Highest stage with real duration greater than 10.

Do not mark the phase complete or produce the final 21-section report until the user responds `approved` or gives concrete corrections.

## Post-Approval Gate

After `approved`, create the exact report structure required by PRD §58 and explicitly answer its five quality questions. Validate that the report cites executed commands, screenshots, changed files, remaining risks, and shared-regression results.
