# Team4s.v3.0 - Project Status

## What Is This Project?
A complete rebuild of the Team4s Anime Portal, migrating from WoltLab WBB4/WCF + PHP to a modern stack: Go backend, Next.js 14 frontend, PostgreSQL database.

## Current Status
**Milestone:** Database Schema Design (Complete, Blocked on Deployment)
**Progress:** ~20% (Analysis complete, dev environment ready, schema designed, blocked by WSL2)

## What Works Now
- Legacy system fully analyzed and documented
- All database schemas reconstructed (10 legacy tables)
- Feature requirements documented (15 features across P0-P3)
- API endpoint mapping complete (20+ endpoints)
- Go backend compiles and runs with basic routes
- Docker Compose configured for PostgreSQL + Redis + Adminer
- **NEW:** PostgreSQL schema designed (12 tables)
- **NEW:** Migration files created with test data

### How to Verify (After WSL2 Fix)
```bash
# 1. First: Install WSL2 (one-time, requires restart)
# Open PowerShell as Admin:
wsl --install
# Restart computer

# 2. Start the database stack
docker-compose up -d

# 3. Verify PostgreSQL is running
# Open browser: http://localhost:8081 (Adminer)
# Server: postgres, User: team4s, Password: team4s_dev_password, DB: team4s

# 4. Run the backend (from backend/ directory)
go run cmd/server/main.go

# 5. Test health endpoint
curl http://localhost:8080/health
# Expected: {"service":"team4s-api","status":"ok"}

# 6. Test API placeholder
curl http://localhost:8080/api/v1/anime
# Expected: {"message":"Anime list - TODO"}
```

## Current Blocker
**WSL2 Not Installed** - Docker Desktop requires WSL2 on Windows 11.

Resolution:
1. Open PowerShell as Administrator
2. Run: `wsl --install`
3. Restart computer
4. Start Docker Desktop
5. Run: `docker-compose up -d`

## What's Next (Top 3)
1. **Install WSL2** - Run `wsl --install`, restart (BLOCKED)
2. **Start Docker Stack** - Verify PostgreSQL, Redis, Adminer work
3. **Connect Backend to Database** - Implement database connection pool in Go

## Known Risks / Blockers
- **WSL2:** Must be installed before Docker works (BLOCKING)
- **Docker Desktop:** Needs manual start after Windows restart
- **Password Migration:** WCF uses crypt-compatible hashes; need to verify bcrypt compatibility
- **Media Storage:** Need to decide on file storage strategy (local vs. S3-compatible)
- **Data Migration:** Character encoding issues (latin1 vs utf8) in legacy DB

## Database Schema (Ready to Deploy)
```
Tables (12):
- users, roles, user_roles (authentication)
- anime, anime_relations (content)
- episodes (with fansub process tracking)
- comments, ratings, watchlist, messages (social)
- attendants, fansub_groups, anime_fansub_groups (fansub workflow)

ENUMs (6):
- anime_status, anime_type, content_type
- episode_status, watchlist_status, fansub_role

Test Data:
- Users: admin/test123, testuser/test123
- Anime: Attack on Titan, Death Note, Steins;Gate
- Episodes: 4 test episodes
- Roles: 27 granular permissions
```

## Development Environment
- **Go:** 1.25.6 (installed)
- **IDE:** VS Code with Go extension, gopls, dlv
- **Database:** PostgreSQL 16 via Docker (BLOCKED)
- **Cache:** Redis 7 via Docker (BLOCKED)
- **Admin UI:** Adminer at localhost:8081 (BLOCKED)
- **WSL2:** NOT INSTALLED (required for Docker)

## Owner
- **Developer:** D1skanime (GitHub)
- **AI Assistant:** Claude (analysis and development support)
