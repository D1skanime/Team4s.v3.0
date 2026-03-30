# TOMORROW - 2026-03-31

## Top 3 Priorities
1. Move admin anime update/edit persistence onto the v2 schema.
2. Audit remaining anime routes for legacy flat-column writes/reads and list which need migration next.
3. Decide whether the old compatibility mirrors can be reduced once edit/update is working on v2.

## First 15-Minute Task
- Open `backend/internal/repository/admin_content_anime_metadata.go` and list every `anime` column write in `UpdateAnime(...)` that does not exist in v2: `title`, `title_de`, `title_en`, `type`, `status`, `cover_image`, `updated_at`.

## Dependencies To Unblock Early
- Keep Docker running; backend/frontend are already on the live local v2 stack.
- Verify which existing edit-route UI fields truly need persisted v2 columns versus compatibility-only response fields before rewriting the update contract.

## Nice To Have
- Add focused tests for the future v2 update path once the first migration slice is in place.
