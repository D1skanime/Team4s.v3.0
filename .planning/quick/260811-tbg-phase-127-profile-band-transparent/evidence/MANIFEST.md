# Profile-band UAT evidence manifest

- Route: `http://127.0.0.1:3300/members/csubs-leader`
- Browser: Codex in-app browser
- Before 1440x900: `profile-band-before-1440.png`
- Candidate 1440x900: `profile-band-candidate-1440.png`
- Before 1920x1080: `profile-band-before-1920.png`
- Candidate 1920x1080: `profile-band-candidate-1920.png`
- Exact candidate diff: `candidate.diff`

The candidate changes only `.profileBand`: its background is transparent and its inherited outer border and border radius are neutralized. `.rhythmBand` padding/gap, `.profilePair` 8:5 columns, inner cards, and all other bands remain unchanged.

Validation notes:

- Focused test: 19 passed, 1 inherited baseline failure because the dirty Phase 127 implementation removed the legacy `Besondere Auszeichnungen` heading while an older heading-order assertion still expects it.
- Typecheck: inherited baseline failures in generated `.next/dev/types/app/members/[slug]/page.ts` and incoming `MemberBadgeChain.test.tsx` `badgeProgress` usage.
- `git diff --check`: passed.
- `git diff --cached --check`: passed.
