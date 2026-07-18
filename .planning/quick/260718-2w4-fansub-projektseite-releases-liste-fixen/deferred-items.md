# Deferred Items — Quick Task 260718-2w4

## Pre-existing lint error (out of scope)

- **File:** `frontend/src/components/fansubs/FansubStorySection.tsx:49`
- **Rule:** `react-hooks/set-state-in-effect` (`setIsMobileStoryOpen` called synchronously inside `useEffect`)
- **Status:** Pre-existing, unrelated to this quick task. Confirmed via `git status` (file untouched by this task) and `git log -1` (last touched by commit `1e26cc64`, "fix: use story reader modal on tablet portrait", unrelated feature).
- **Action taken:** None — out of scope per task boundary. Not fixed, not re-run hoping it resolves.
- **Follow-up:** Should be addressed in a separate quick task or as part of a future FansubStorySection touch.
