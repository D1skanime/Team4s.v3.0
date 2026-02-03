# Team4s.v3.0 - Working Notes

## Current Scratchpad

### WSL2 Installation Commands
```powershell
# Run as Administrator
wsl --install

# After restart, verify
wsl --status

# If needed, update WSL
wsl --update
```

### Docker Commands Quick Reference
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f postgres

# Reset database (delete all data)
docker-compose down
rm -rf data/postgres data/redis
docker-compose up -d

# Connect to PostgreSQL directly
docker exec -it team4s_postgres psql -U team4s

# Connect to Redis
docker exec -it team4s_redis redis-cli
```

### Database Test Queries
After Docker is working, run these in Adminer:
```sql
-- Verify all tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;

-- Check test data
SELECT * FROM users;
SELECT * FROM anime;
SELECT * FROM roles;
```

---

## Schema Design Notes (2026-02-03)

### ENUMs Created
Six PostgreSQL ENUM types for type-safe status fields:
1. `anime_status` - disabled, ongoing, done, aborted, licensed
2. `anime_type` - tv, ova, film, bonus, special, ona, music
3. `content_type` - anime, hentai
4. `episode_status` - disabled, private, public
5. `watchlist_status` - watching, done, break, planned, dropped
6. `fansub_role` - raw, translate, time, typeset, logo, edit, karatime, karafx, qc, encode

### Fansub Process Tracking
Episodes table has 10 percentage columns (0-100):
- raw_proc, translate_proc, time_proc, typeset_proc, logo_proc
- edit_proc, karatime_proc, karafx_proc, qc_proc, encode_proc

Each has a corresponding `*_proc_by` user reference.

### Roles System (27 roles)
Replaced WCF group system with granular RBAC:
- Core: admin, moderator, registered
- Anime: anime_create, anime_modify, anime_delete, anime_status
- Stream: stream_create, stream_modify, stream_delete, stream_status
- Comment: comment_modify, comment_delete
- Fansub: fansub_create, fansub_modify, fansub_delete
- Special: private
- Process: raw_proc, translate_proc, time_proc, typeset_proc, logo_proc, edit_proc, karatime_proc, karafx_proc, qc_proc, encode_proc

### Legacy ID Columns
All main tables have `legacy_*_id` columns for migration:
- users.legacy_wcf_user_id
- anime.legacy_anime_id
- episodes.legacy_episode_id
- comments.legacy_comment_id
- messages.legacy_message_id

---

## Go Backend Structure
```
backend/
  cmd/
    server/
      main.go         # Entry point, router setup
  internal/
    config/           # Configuration loading
    database/         # DB connection, migrations
    handlers/         # HTTP handlers
    models/           # Data structures
    services/         # Business logic
  pkg/
    middleware/       # Auth, logging, CORS
```

---

## Mental Unload (End of Day 2026-02-03)

Productive schema design day, but hit infrastructure blocker.

**Key wins:**
- Complete PostgreSQL schema designed (12 tables)
- All migration files created (001-005)
- init.sql with test data ready
- docker-compose.yml updated with init.sql mount

**What I learned:**
- Windows 11 Docker Desktop requires WSL2 - not optional
- PostgreSQL ENUMs are great for type safety
- Fansub workflow tracking needs 10 process stages

**Blocker discovered:**
WSL2 is not installed. Docker Desktop shows virtualization error because WSL2 backend is missing. User will restart to install WSL2 via `wsl --install`.

**Tomorrow's critical path:**
1. Install WSL2 (requires restart)
2. Start Docker Desktop
3. Run `docker-compose up -d`
4. Verify in Adminer

Once database is running, can finally connect Go backend and start building real endpoints.

**Feeling about progress:**
Schema work is solid - 12 well-designed tables with proper relationships, ENUMs, indexes, and triggers. Just need the infrastructure to catch up.

---

## Session Log

### 2026-02-03 Morning
- Day-start agent ran successfully
- Read Final.md for complete legacy analysis
- Planned schema migration approach

### 2026-02-03 Afternoon
- Created migration files 001-005
- Built init.sql with combined schema + test data
- Updated docker-compose.yml
- Attempted to start Docker - failed
- Discovered WSL2 not installed

### 2026-02-03 Evening
- Documented WSL2 blocker
- Created test_connection.sql
- Running day-closeout

### 2026-02-02 Morning
- Day-start agent ran successfully
- Recovered missing schemas from .frm files
- Updated Final.md with complete documentation

### 2026-02-02 Afternoon
- Installed GitHub CLI, authenticated
- Installed Go 1.25.6 + VS Code extension
- Created Go module, installed dependencies
- Built backend skeleton with Gin
- Compiled server.exe successfully

### 2026-02-02 Evening
- Installed Docker Desktop
- Created docker-compose.yml
- Set up data directories
- Updated .gitignore
- Created .env.example
- Created analyzer agents for legacy code
- Running day-closeout

---

## Questions to Answer
- [x] Primary keys: UUID vs BIGSERIAL? **Answer: BIGSERIAL**
- [ ] How are anime covers currently stored? Path pattern?
- [ ] What's the download key generation algorithm exactly?
- [ ] Are there any rate limits we need to preserve?
- [ ] WCF password hash compatibility with Go bcrypt?

---

## Test Credentials
| User | Password | Role |
|------|----------|------|
| admin | test123 | admin |
| testuser | test123 | registered |

bcrypt hash for "test123": `$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.Z6y6bqXOxP0RQKyqMO`
