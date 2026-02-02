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

### Primary Key Decision (Leaning BIGSERIAL)
Pros of BIGSERIAL:
- Simpler to work with
- Better index performance
- Smaller storage footprint
- Sufficient for our scale (not building distributed system)

Cons of UUID:
- Adds complexity without clear benefit
- 36 chars vs 8 bytes
- Harder to debug (can't remember UUIDs)

**Recommendation: Use BIGSERIAL for all primary keys**

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

### Go Backend Structure
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

## Mental Unload (End of Day 2026-02-02)

Incredibly productive day. Went from "project initialized" to "full development environment ready."

**Key wins:**
- Go toolchain fully installed and working
- Backend skeleton compiles and runs
- Docker Compose ready with PostgreSQL + Redis + Adminer
- All dependencies installed (Gin, pgx, JWT, godotenv)

**What I learned:**
- Go 1.25.6 installation was straightforward
- Gin is really clean to work with - the routing syntax is intuitive
- Docker Compose makes local dev infrastructure trivial
- Adminer is a nice lightweight alternative to pgAdmin

**Main concern going forward:**
Still need to verify the Docker stack actually works. Haven't run `docker-compose up` yet because Docker Desktop wasn't started. That's literally the first thing tomorrow.

The password migration remains a question mark. Need to grab a sample hash from the legacy DB and test it against Go's bcrypt package. Worst case: force password reset for all users.

**Feeling good about:**
- Clean project structure
- Good documentation foundation
- Clear next steps

Tomorrow: Docker up, schema design, database connection. Let's go.

---

## Session Log

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
