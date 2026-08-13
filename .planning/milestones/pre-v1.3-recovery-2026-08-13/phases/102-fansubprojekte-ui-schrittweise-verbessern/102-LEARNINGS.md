---
phase: 102
phase_name: "fansubprojekte-ui-schrittweise-verbessern"
project: "Team4s Admin Anime Intake"
generated: "2026-07-16"
counts:
  decisions: 4
  lessons: 4
  patterns: 4
  surprises: 3
missing_artifacts: []
---

# Phase 102 Learnings: fansubprojekte-ui-schrittweise-verbessern

## Decisions

### Public Release Segment Is A Public Component
The release segment discussed during Phase 102 belongs to the public Fansub project page, not the internal Fansub release editor or member workspace.

**Rationale:** The user explicitly corrected the target after the internal release component was touched during design iteration.
**Source:** 102-07-SUMMARY.md

---

### Newest Fansub Release Means Public Activity
The newest public Fansub release on a project page is selected by latest public/published note or approved public media activity.

**Rationale:** The user wanted "neueste Releases" based on work done to a release, such as text or image upload, not just episode number.
**Source:** 102-07-SUMMARY.md

---

### Activity Sort Is Additive
`release-list?sort=activity` was added without changing the default release-list ordering.

**Rationale:** Existing release-list consumers should keep their episode-order behavior while the public project page can opt into activity order.
**Source:** 102-07-SUMMARY.md

---

### Release Detail Timeline Is Deferred
The richer single-release timeline design is intentionally saved for the future public release detail page.

**Rationale:** The project page can contain many releases, so the list segment needs to remain slim.
**Source:** 102-07-SUMMARY.md

---

## Lessons

### UI-Dev Must Name The Target Surface
When a design is explored in UI-dev, the artifact must say whether it applies to public pages, admin edit pages, member workspaces, or a future detail page.

**Context:** The public release segment and internal release component briefly got mixed up during the design loop.
**Source:** 102-07-SUMMARY.md

---

### Empty Public Data Can Hide A Correct Layout
The project story/member layout can look broken even when the component logic is correct if cockpit defaults save rows as hidden drafts.

**Context:** Viper Creed had data, but public endpoints correctly hid it until the save defaults and local UAT data were corrected.
**Source:** 102-UAT-EVIDENCE.md

---

### Public Contributor APIs Need Member-Anchored Rows
Project contributor visibility must support current `member_id` anchored contribution rows and not rely only on historical group member rows.

**Context:** Confirmed Viper Creed members were hidden because the public query still expected `fansub_group_member_id`.
**Source:** 102-UAT-EVIDENCE.md

---

### Docker Verification Catches Contract Wiring
The final public project page only proved complete after backend rebuild/recreate, frontend restart, route HTML check, and direct API check were all run together.

**Context:** The activity sort and public release block span backend, OpenAPI, frontend mapping, and Docker runtime.
**Source:** 102-07-SUMMARY.md

---

## Patterns

### Shared Public Surface From UI-Dev
Iterate the visual composition in UI-dev, then promote it into a shared component and reuse that component on the real public route.

**When to use:** Public surfaces that should become global UI truth across multiple pages.
**Source:** 102-07-SUMMARY.md

---

### Additive API Sort Parameters
Add a named sort mode for new presentation behavior while keeping the default contract stable.

**When to use:** A single public endpoint needs a new ordering for one UI surface without regressing existing consumers.
**Source:** 102-07-SUMMARY.md

---

### Evidence-First Live UAT
Record exact routes, viewport checks, labels, removed copy, and command results in a phase evidence file while fixing live-reported issues.

**When to use:** UI phases with many small acceptance corrections from shared browser review.
**Source:** 102-UAT-EVIDENCE.md

---

### Public Visibility Gates Stay Server-Owned
Fix cockpit defaults or public query anchoring, but keep public endpoints gated to public/published or approved data.

**When to use:** Public pages show missing content that exists internally.
**Source:** 102-UAT-EVIDENCE.md

---

## Surprises

### The Existing Public Project Data Was Hidden By Defaults
The page looked empty although Viper Creed had story/member data because previous cockpit saves silently produced hidden states.

**Impact:** The fix needed both UI save-default changes and local UAT data correction, not a public endpoint visibility bypass.
**Source:** 102-UAT-EVIDENCE.md

---

### Route Compatibility Data Did Not Match The User's Mental Example
`/anime/13/group/1` mapped to Arata the Legend in local data, while Viper's Creed was the main human test case.

**Impact:** UAT had to verify route identity by actual seeded data instead of assuming an example ID.
**Source:** 102-UAT-EVIDENCE.md

---

### Timeline Design Belongs To Two Different Surfaces
The same timeline idea felt good for a single release detail page but too heavy for a list of many releases.

**Impact:** The project page segment became slimmer, and the richer timeline is preserved as a future release-detail design direction.
**Source:** 102-07-SUMMARY.md
