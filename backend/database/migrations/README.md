# Database Migrations

## Media Upload Service

### Migration 001: Create Media Tables

This migration creates the database schema for the generic media upload service.

#### Tables Created

1. **media_assets** - Main table for uploaded media
   - Stores metadata about uploaded images/videos
   - Supports multiple entity types (anime, episode, fansub, release, user, member)
   - Supports multiple asset types (poster, banner, logo, avatar, gallery, karaoke)

2. **media_files** - File variants (original, thumb)
   - Stores information about each file variant
   - Links to media_assets via foreign key

3. **Join Tables**
   - anime_media
   - episode_media
   - fansub_group_media
   - release_media

#### Running Migrations

**Apply migration:**
```bash
psql -U postgres -d team4s -f database/migrations/001_create_media_tables.up.sql
```

**Rollback migration:**
```bash
psql -U postgres -d team4s -f database/migrations/001_create_media_tables.down.sql
```

#### Verification

After running the migration, verify tables exist:
```sql
\dt media_*
\dt *_media
```

Expected tables:
- media_assets
- media_files
- anime_media
- episode_media
- fansub_group_media
- release_media
