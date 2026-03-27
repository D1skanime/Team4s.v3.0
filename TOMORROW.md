# TOMORROW - 2026-03-27

## Top 3 Priorities
1. Define the exact edit save contract
   - what the main save button must persist
   - what should remain immediate actions
   - what feedback and redirect behavior we want
2. Continue edit-screen improvements
   - reduce confusing behavior
   - make the edit flow feel coherent after create
3. Decide how to handle the broken generic media upload backend
   - patch it to current schema
   - or intentionally defer it while local cover upload remains the safe path

## First 15-Minute Task
- Open [AnimeEditWorkspace.tsx](C:\Users\admin\Documents\Team4s\frontend\src\app\admin\anime\components\AnimeEditPage\AnimeEditWorkspace.tsx) and list in `WORKING_NOTES.md` every action that still bypasses the main save bar.

## Dependencies To Unblock Early
- None mandatory for the first task
- If edit work expands into richer uploads, revisit the backend media schema mismatch early
- If runtime review is repeated, leave Docker up or restart it first with `docker compose up -d --build`

## Nice To Have
- Decide whether relations management should move ahead of Phase 4 or stay behind ownership/resync work
