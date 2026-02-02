# Team4s.v3.0 - Working Notes

## Current Scratchpad

### Schema Design Thoughts
The legacy schema has some quirks to address:
- `anmi1_watch.IDs` uses non-standard naming (should be `id`)
- `verwandt` table uses German column names (`gueltig`) - normalize to English
- Mixed FK strategies (some explicit, some commented out in install.sql)

For the new schema, consider:
- Use `snake_case` consistently for all columns
- Add `deleted_at` for soft deletes where appropriate
- Include `created_by` and `updated_by` audit fields

### Authentication Migration Path
1. Export users with password hashes
2. On first login attempt in new system:
   - Try bcrypt verify against stored hash
   - If fails, prompt for password reset
   - Generate new bcrypt hash on successful login/reset
3. Track migration status per user (`password_migrated` boolean)

### Feature Mapping Notes
From Final.md, key features to implement first:
- `/api/anime` - List with filtering (P0)
- `/api/anime/:id` - Detail with episodes (P0)
- `/api/comments` - CRUD (P0)
- `/api/watchlist` - CRUD (P0)
- `/api/auth/login` - JWT issuance (P0)

### Questions to Answer
- [ ] How are anime covers currently stored? Path pattern?
- [ ] What's the download key generation algorithm exactly?
- [ ] Are there any rate limits we need to preserve?

---

## Mental Unload (End of Day 2026-02-02)

Today was productive - got the project properly initialized and all the analysis work from v2.0 is now actionable. The schema recovery from .frm files was a win; we now have complete documentation of the legacy database.

Main concern: the password migration. WCF's authentication is a black box, and we don't have direct code access to verify the exact hashing algorithm. Need to extract sample hashes and test against bcrypt.

Looking forward to tomorrow's schema design work. Having Final.md as reference makes this straightforward - just need to modernize the column names and add proper constraints.

GitHub setup went smoothly. Ready to push once the initial files are committed.
