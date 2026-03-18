# TOMORROW

## Top 3 Priorities
1. Review and archive/correct outdated UX handoff documentation that incorrectly described Related section as standalone post-hero block
2. Inventory repo-wide frontend lint failures and create cleanup plan separate from feature work
3. Optional: Conduct accessibility audit for anime detail page (keyboard navigation, screen readers, ARIA labels)

## First 15-Minute Task
Open `docs/ux-related-section-handoff-2026-03-15.md` and compare its description of Related section placement against the actual implemented code in `frontend/src/app/anime/[id]/page.tsx`. Document the discrepancy and decide whether to archive the document or add a correction note at the top.

## Dependencies To Unblock Early
- No external dependencies
- All technical blockers from today are resolved
- Ready to focus on documentation hygiene and quality improvements

## Nice To Have
- Create a visual diagram showing the correct anime detail page component hierarchy
- Document the genre array migration pattern as a reference for future contract changes
- Write developer notes about overflow handling patterns used in Related section
