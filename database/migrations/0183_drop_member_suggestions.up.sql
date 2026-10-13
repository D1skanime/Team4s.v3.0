-- Migration 0183: Remove the dead "Medien-Vorschläge"/member_suggestions feature (Weg 8,
-- Phase 180 Live-UAT, Nutzerentscheidung 2026-10-13). The submitting frontend form
-- (ReportModal.tsx/ReportFormMedia.tsx) was never imported by any route; the review side
-- (admin approve/reject) was never built either (SuggestionsMeHandler only had
-- Create/ListBySubmitter, no admin handler ever referenced this table). Confirmed via psql
-- before this migration: 0 live rows. The separate, still-live anime_contributions.member_reason
-- column (added by the same original 0098 migration, used by the reject-with-reason feature)
-- is untouched by this migration.
DROP TABLE IF EXISTS member_suggestions CASCADE;
