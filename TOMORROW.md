# TOMORROW - 2026-03-19

## Top 3 Priorities

### 1. Clean Up Outdated Documentation
Review and correct UX handoff documentation that incorrectly described Related section placement. Previous docs stated Related should be standalone post-hero block, but implementation proved inside-infoCard placement is correct.

**Why:** Prevent future confusion and unnecessary rework. Documentation must reflect actual working implementation.

**Scope:**
- Review `docs/ux-related-section-handoff-2026-03-15.md`
- Add correction notice explaining placement change
- Consider archiving outdated version for reference
- Update any other docs that reference Related section placement

---

### 2. Inventory Frontend Lint Debt
Create comprehensive inventory of repo-wide frontend lint failures to prepare for separate cleanup pass.

**Why:** Current lint failures mask slice-level regressions. Clean lint is needed as validation gate.

**Scope:**
- Run `npm run lint` and capture all errors
- Categorize failures by type (unused vars, type issues, style, etc.)
- Estimate effort required for cleanup
- Create separate cleanup plan/issue
- Determine if any failures are blocking vs. cosmetic

---

### 3. Consider Accessibility Audit
Evaluate current accessibility status of anime detail page and identify improvements.

**Why:** Glassmorphism design and complex layouts require careful accessibility consideration.

**Scope:**
- Check keyboard navigation flow
- Verify screen reader compatibility
- Test color contrast ratios
- Review ARIA labels and roles
- Document findings and recommendations
- Create follow-up tasks if issues found

---

## First 15-Minute Task

Open `C:\Users\D1sk\Documents\Entwicklung\Opencloud\Team4s.v3.0\docs\ux-related-section-handoff-2026-03-15.md` (or search for UX docs about Related section) and add a correction notice at the top:

```markdown
> **CORRECTION NOTICE (2026-03-18):**
> The Related section placement described in this document was later found to be incorrect.
> Implementation revealed that placing Related INSIDE the hero infoCard (not as standalone post-hero block)
> creates better visual hierarchy, solves overflow issues, and aligns with glassmorphism design pattern.
> This document is preserved for reference but should not be treated as current implementation guidance.
> See `DECISIONS.md` entry for "2026-03-18 - Related Section Placement Correction" for details.
```

**Success criteria:** Correction notice added, document saved.

---

## Dependencies to Unblock Early
- None (no blockers)

---

## Nice-to-Have (If Ahead of Schedule)
- Create visual diagram of actual component hierarchy for anime detail page
- Begin planning next feature phase beyond current metadata groundwork
- Review other UX decisions for similar documentation/implementation mismatches
- Consider writing testing plan for Related section scroll behavior
- Document genre array contract pattern as reference for future CSV-to-array migrations

---

## Context for Tomorrow

### Where We Are
- Genre array contract: COMPLETE and deployed
- Related section layout: CORRECTED and deployed
- Preview cards: IMPROVED and deployed
- All builds passing, runtime healthy
- No technical blockers

### What Changed Yesterday
- Implemented type-safe genre handling with backward compatibility
- Corrected Related section placement based on implementation findings
- Improved preview card content and styling
- Discovered documentation inconsistency that needs correction

### First Action
Start with documentation cleanup - this is non-coding work that unblocks future understanding without requiring development environment setup.
