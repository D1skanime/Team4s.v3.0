---
phase: 127
slug: besondere-auszeichnungen-kompakt-in-bestehenden-member-header-integrieren
status: draft
nyquist_validation: true
created: 2026-08-11
---

# Phase 127 Validation Strategy

## Validation Goal

Prove that `historical_leader` and `all_rounder` render compactly in the existing public member hero for zero/one/both states, while Verified remains exactly once, Founding remains Membership-only, the old separate Special group disappears, SSR/request behavior stays unchanged, and all Phase 121–126 presentation families retain their behavior.

## Deterministic Dirty-Worktree Isolation Gate

Before every implementation task:

1. Capture `git status --short`, `git diff`, `git diff --cached`, `git diff --binary` and SHA-256 for `MemberProfileHero.tsx`, `profile.module.css`, `page.tsx`, `page.test.tsx`, `MemberBadgeChain.tsx`, `MemberBadgeChain.module.css`, `MemberBadgeChain.test.tsx`, `memberBadgeLabels.ts`, and any extracted resolver/component.
2. Preserve Phase 126's current uncommitted TSX/CSS foundation and all unrelated binary asset/FocalCarousel edits; never reset, reconstruct from `HEAD`, broad-format or overwrite them.
3. Produce a Phase-127-only patch from exact before/after snapshots. Any cached diff must byte-equal that patch and contain only authorized files/hunks.
4. If a hunk depends on an uncommitted predecessor anchor and exact ownership cannot be proven, leave the app hunk unstaged/uncommitted and report it; planning/docs may proceed independently.
5. Never stage or commit `.planning/STATE.md`, Phase-125/126 artifacts, contribution assets, FocalCarousel files, or unrelated untracked files as Phase 127.

## Automated Test Matrix

| Area | Cases | Required proof |
|---|---|---|
| Header special presence | none, Historical only, Allrounder only, both | wrapper omitted when empty; 1/2 exact items; deterministic order |
| Artwork normalization | Historical image, Allrounder icon | same square slot; contain sizing; historical central resolver path; no invented asset |
| Verified | verified true/false crossed with all special cases | one existing `VerifiedBadge` only; never rendered from public_badges |
| Founding | founder/non-founder crossed with specials | absent from header; exactly one Membership representation when earned |
| Old Special section | Historical, Allrounder, Verified combinations | no `data-badge-group="special"`, heading, carousel, arrows, counter or skeleton |
| Semantics | no/one/both | SSR list/name/order; decorative image handling; no buttons/tab/carousel; labels visible |
| Responsive | 390×844, 768×1024, 1024×768, 1440×900, 1920×1080 | no overflow/clipping; wrapping stable; header height/background/identity priority retained |
| SSR/data flow | anonymous/owner token and repeated render | existing one cached profile read; no extra fetch/effect/client hydration dependency |
| Shared regressions | roles, projects, points, three contribution families, membership | Phase 121–126 selectors/art, progress, preview and carousel ownership unchanged |
| Protected shared engine | FocalCarousel | zero source diff; existing focused tests retain baseline |

## Required Test Files

- `frontend/src/components/profile/MemberProfileHero.test.tsx` — hero no/one/both/Verified/accessibility contracts.
- `frontend/src/app/members/[slug]/page.test.tsx` — SSR prop/data flow, exact-once cross-case and old-section absence.
- `frontend/src/components/profile/MemberBadgeChain.test.tsx` — special group suppression plus five-family regression.
- `frontend/src/components/profile/memberBadgeLabels.test.ts` — exact catalog classification/order remains stable if resolver/catalog seam changes.
- `frontend/src/components/ui/FocalCarousel.test.tsx` — regression only; production component is protected.

## Commands

Run from `/home/d1sk/team4s` on `team4s-linux`:

```bash
docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/MemberProfileHero.test.tsx 'src/app/members/[slug]/page.test.tsx' src/components/profile/MemberBadgeChain.test.tsx src/components/profile/memberBadgeLabels.test.ts src/components/ui/FocalCarousel.test.tsx
docker compose exec -T team4sv30-frontend npm run typecheck
docker compose exec -T team4sv30-frontend npm run lint
docker compose exec -T team4sv30-frontend npm test
docker compose exec -T team4sv30-frontend npm run build
git diff --check
git diff --cached --check
```

Record the pre-implementation result of every command. Known Phase-125/126 failures must remain separately attributed; Phase 127 may not silently update stale predecessor assertions unless the assertion directly describes the moved Special presentation and exact hunk ownership is proven.

## Live UAT Matrix

Use the shared in-app browser at `http://127.0.0.1:3300` through the user-visible `/members/[slug]` navigation path.

| State / viewport | Required checks | Evidence name |
|---|---|---|
| Historical + Allrounder, 1440×900 | compact header, artwork/icon balance, background visible, Verified once | `specials-desktop-both.png` |
| Historical + Allrounder, 390×844 | wrap/stack, no overflow, readable labels | `specials-mobile-both.png` |
| Historical only, 768×1024 | one item, no empty slot, tablet balance | `specials-tablet-historical.png` |
| Allrounder only, 1024×768 | icon fallback in normalized slot | `specials-tablet-allrounder.png` |
| No specials, 1920×1080 | fifth viewport; no wrapper/gap; baseline header height | `specials-desktop-none.png` |
| Verified + Founding + both, 1440×900 | Verified once; Founding only in Membership; no old special section | `specials-dedup-membership.png` |

At every viewport inspect horizontal overflow, focus order, accessibility tree/labels, contrast over a real background image, and the uninterrupted roles/projects/points/contributions/membership sections.

## Human Checkpoint

After automated checks and truthful screenshot evidence, stop and show exactly:

1. Desktop header with Historical Leader + Allrounder.
2. Mobile header.
3. Header with one special.
4. Header without specials.
5. Verified exactly once.
6. Page without the old separate Special section.

Do not claim completion or write the final report until the user responds with standalone `approved` or concrete corrections. Missing browser/evidence is a blocker and must not be replaced with fabricated/headless-only proof.

## Post-Approval Report Gate

After approval, create the exact 21-section report required by PRD §49: Zusammenfassung; Vorherige Darstellung; Bestehender Member-Header; Neue Special-Integration; Historische Leitung; Allrounder; Verified-Deduplizierung; Gründungsmitglied-Abgrenzung; Entfernung der alten Special-Sektion; Desktop; Mobile; Accessibility; Datenfluss; Geänderte Dateien; Tests; Live-UAT; Evidence; Shared Regression; Zukunftssicherheit; Offene Punkte; Fazit. In the conclusion answer all five PRD questions explicitly; every answer must link resolvable evidence. `UNPROVEN` is forbidden after the approval gate—missing proof blocks approval/report creation instead.

## Scope/Contract Assertions

- `git diff -- backend shared/contracts frontend/src/lib/api.ts frontend/src/types` is empty for Phase 127.
- `git diff -- frontend/src/components/ui/FocalCarousel.tsx frontend/src/components/ui/FocalCarousel.module.css` contains no Phase-127 hunks.
- No new `fetch`, `useEffect`, endpoint, DTO, migration, dependency, asset generation or public badge computation is introduced.
- The only route data remains `profile.public_badges` from the existing cached SSR profile request.
