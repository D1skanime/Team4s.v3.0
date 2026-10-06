---
created: 2026-10-06T09:17:45+00:00
title: Mobile sticky save button covers Gruppentyp field
area: admin-fansubs
files:
  - frontend/src/app/admin/fansubs/[id]/edit
---

## Problem

Found during Phase 174 Welle-5 visual-equality UAT (plan 174-24, approved 2026-10-06): on the mobile viewport (~375px) of `/admin/fansubs/[id]/edit`, the sticky save button overlaps the "Gruppentyp" field. Confirmed present in the 174-01 BEFORE baseline screenshot too, so it predates Phase 174 and is unrelated to the 174-22/174-23 CSS Module splits — not a regression, not fixed as part of Welle 5.

## Desired Outcome

Plan a small follow-up fix so the sticky save button no longer covers the Gruppentyp field on mobile (e.g. add bottom padding/margin to the form content area sized to the sticky bar's height, or reposition the field).
