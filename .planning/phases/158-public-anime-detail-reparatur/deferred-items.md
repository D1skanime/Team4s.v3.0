# Phase158 deferred baseline issues

- Full production build stops at the unchanged exported formatEditLoadError helper in frontend/src/app/admin/anime/[id]/edit/page.tsx (present at7c7e1c7d line26). No global fix or ignoreBuildErrors. Later whole-build blockers beyond it are unknown.
- cssCustomProperties.guard.test.ts has the same two failures as phase baseline; full lint retains the same13errors/331warnings. Exact file/message comparison is in phase158/baseline-comparison.json.
- Existing episodeCard overflow:hidden can clip its header's outward focus outline; body overflow-x:clip also predates158. F03's CTA focus/slider preservation passes; no unrelated CSS cleanup.
- Five unrelated backend fixture tests skip without their distinct prerequisites: TestListUserContributionsGroupsByAnimeAndProject; TestUpdateAnimeFansubProjectTimelineRejectsEndBeforeCompletedRelease; TestListAnimeSegmentsAssignedEpisodesHasOverridePerEpisode; TestGetAnimeSegmentByID_HydratesPlaybackForRequestedReleaseVersion; TestAttachPendingOwnNoteRevisionAttentionGroupsByAnimeAndFansubGroup. All17new public-read database subcases run; skips are not SQL proof.
- Existing Pretty page lacks its own metadata/self-canonical; numeric compatibility canonical is verified. No unrelated SEO change.
- Human156GAP02(14checks),157-06Task4 and158review remain open. Phase159/F15 scope unchanged.
