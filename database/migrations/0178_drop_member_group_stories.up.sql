-- Migration 0178: Remove the superseded Member-Group-Story Altlast (D-16, 176-CONTEXT.md).
-- The group's history is already maintained via "Gruppengeschichte" (GroupHistorySection)
-- on the fansub edit page; member_group_stories is a fully superseded, inconsistent-rights
-- admin surface with 0 rows (confirmed before this migration lands). The personal member
-- story feature (members.member_story_*, /me/profile) is a separate column-based feature
-- and is untouched by this migration.
DROP TABLE IF EXISTS member_group_stories;
