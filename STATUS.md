# Team4s.v3.0 - Project Status

## What Is This Project?
A complete rebuild of the Team4s Anime Portal, migrating from WoltLab WBB4/WCF + PHP to a modern stack: Go backend, Next.js 14 frontend, PostgreSQL database.

## Current Status
**Milestone:** Database Migration Complete
**Progress:** ~35% (database layer fully operational with production data)

## What Works Now
- WSL2 installed and configured
- Docker Desktop running (PostgreSQL + Redis + Adminer)
- PostgreSQL database with 13 tables deployed
- **47,145+ records migrated from legacy MySQL:**
  - 13,326 anime entries
  - 30,179 episodes
  - 2,323 anime relations
  - 145 comments, 456 ratings, 716 watchlist entries
- Go backend compiles and runs (placeholder routes)
- Migration script for repeatable imports

### How to Verify
```bash
# 1. Start the database stack (if not running)
docker-compose up -d

# 2. Verify PostgreSQL is running
# Open browser: http://localhost:8081 (Adminer)
# Server: postgres, User: team4s, Password: team4s_dev_password, DB: team4s

# 3. Check data counts
# In Adminer SQL console:
SELECT 'anime' as table_name, COUNT(*) as count FROM anime
UNION ALL SELECT 'episodes', COUNT(*) FROM episodes
UNION ALL SELECT 'anime_relations', COUNT(*) FROM anime_relations;

# 4. Run the backend (from backend/ directory)
go run cmd/server/main.go

# 5. Test health endpoint
curl http://localhost:8080/health
# Expected: {"service":"team4s-api","status":"ok"}
```

## What's Next (Top 3)
1. **Connect Go backend to database** - Implement pgx connection pool
2. **Build GET /api/v1/anime endpoint** - Query real data with pagination
3. **Build GET /api/v1/anime/:id endpoint** - Single anime with episodes

## Known Risks / Blockers
- **User Migration Pending:** Legacy users not yet migrated from WCF; all user_id references point to admin
- **FK Constraints Disabled:** Need to re-enable after user migration
- **Password Migration:** WCF uses crypt-compatible hashes; bcrypt compatibility not yet tested
- **Media Storage:** Need to decide on file storage strategy (local vs. S3-compatible)

## Database Schema (Deployed)
```
Tables (13):
- users, roles, user_roles (authentication)
- anime, anime_relations (content) - 13,326 + 2,323 records
- episodes (with fansub process tracking) - 30,179 records
- comments, ratings, watchlist, messages (social) - 1,317 records
- attendants, fansub_groups, anime_fansub_groups (fansub workflow)

ENUMs (6):
- anime_status, anime_type, content_type
- episode_status, watchlist_status, fansub_role
```

## Development Environment
- **Go:** 1.25.6 (installed)
- **IDE:** VS Code with Go extension, gopls, dlv
- **Database:** PostgreSQL 16 via Docker (RUNNING)
- **Cache:** Redis 7 via Docker (RUNNING)
- **Admin UI:** Adminer at localhost:8081 (RUNNING)
- **WSL2:** INSTALLED

## Owner
- **Developer:** D1skanime (GitHub)
- **AI Assistant:** Claude (analysis and development support)
