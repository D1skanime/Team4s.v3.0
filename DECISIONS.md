# Team4s.v3.0 - Architectural Decisions

## ADR-001: Tech Stack Selection
**Date:** 2026-02-02
**Status:** Accepted

### Context
Need to select a modern tech stack to replace the legacy WoltLab WBB4/WCF + PHP system. Requirements:
- Better performance than PHP
- Type safety
- Modern developer experience
- Good ecosystem for web applications

### Options Considered
1. **Node.js + Next.js full-stack** - All JavaScript, simpler stack
2. **Go + Next.js** - Go backend for performance, Next.js for modern frontend
3. **Rust + Next.js** - Maximum performance but steeper learning curve
4. **Python (FastAPI) + Next.js** - Good DX but performance concerns

### Decision
**Go + Next.js 14 + PostgreSQL + Redis**

### Why This Option Won
- Go provides excellent performance and concurrency (important for streaming/downloads)
- Strong typing in both Go and TypeScript
- PostgreSQL is robust and well-suited for relational data
- Redis handles sessions and caching efficiently
- Next.js 14 App Router provides modern React patterns with SSR
- All technologies have strong communities and long-term viability

### Consequences
**Good:**
- Fast API responses
- Type safety across the stack
- Clear separation of concerns
- Scalable architecture

**Bad:**
- Two languages to maintain (Go + TypeScript)
- Slightly more complex deployment than monolithic PHP

### Follow-ups
- [x] Select specific Go web framework (Gin/Echo/Fiber) - **Decided: Gin**
- [ ] Set up shared type definitions (OpenAPI spec?)

---

## ADR-002: Project Structure
**Date:** 2026-02-02
**Status:** Accepted

### Context
Need to organize the codebase for the new system.

### Decision
Monorepo structure:
```
/backend     - Go API server
/frontend    - Next.js application
/database    - Migration files and init scripts
/docs        - Documentation and day logs
/context     - AI context files
```

### Why
- Single repository simplifies version control
- Shared documentation and context
- Easier CI/CD configuration
- Clear separation between backend and frontend

### Consequences
- Need to manage dependencies for both Go and Node.js
- May need workspace tooling if repo grows

---

## ADR-003: Authentication Strategy
**Date:** 2026-02-02
**Status:** Proposed (needs validation)

### Context
Replacing WCF's session-based authentication.

### Decision
JWT + Refresh Token pattern with Redis session store

### Why
- Stateless authentication scales well
- Refresh tokens provide security without frequent re-login
- Redis provides fast session validation and revocation capability

### Consequences
- Need to implement token refresh logic on frontend
- Must handle token storage securely (httpOnly cookies)

### Follow-ups
- [ ] Define token expiration times
- [ ] Design refresh token rotation strategy
- [ ] Plan logout/revocation mechanism

---

## ADR-004: Go Web Framework Selection
**Date:** 2026-02-02
**Status:** Accepted

### Context
Need to select a Go web framework for the backend API.

### Options Considered
1. **Gin** - Most popular, extensive middleware ecosystem, excellent documentation
2. **Echo** - Fast, minimalist, good middleware support
3. **Fiber** - Express-inspired, very fast, newer community

### Decision
**Gin**

### Why This Option Won
- Most popular Go web framework (largest community)
- Excellent documentation and tutorials
- Mature middleware ecosystem (auth, CORS, logging, etc.)
- Battle-tested in production
- Easy to find help and examples

### Consequences
**Good:**
- Large community means easy troubleshooting
- Familiar patterns for developers from other frameworks
- Rich middleware ecosystem

**Bad:**
- Not the absolute fastest (Fiber is faster)
- Uses reflection (minor performance overhead)

### Implementation
- Gin v1.11.0 installed
- Basic server structure created in `backend/cmd/server/main.go`
- Health check and placeholder routes implemented

---

## ADR-005: Local Development Database Strategy
**Date:** 2026-02-02
**Status:** Accepted

### Context
Need a local development database setup that is:
- Easy to set up and tear down
- Consistent across development machines
- Close to production environment

### Options Considered
1. **Native PostgreSQL installation** - Direct install on Windows
2. **Docker Compose** - Containerized PostgreSQL + Redis
3. **Cloud-hosted dev database** - Remote development DB

### Decision
**Docker Compose with local volume storage**

### Why This Option Won
- Easy to start/stop entire stack with one command
- Data persists in `./data/` folder
- Adminer UI for visual DB management
- Matches production container setup
- No system-level installation required

### Configuration
```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes: ["./data/redis:/data"]
  adminer:
    image: adminer
    ports: ["8081:8080"]
```

### Consequences
**Good:**
- Consistent environment
- Easy to reset (delete data/ folder)
- Visual management via Adminer
- Portable setup
- Auto-runs init.sql on first start

**Bad:**
- Requires Docker Desktop running
- Docker Desktop needs manual start on Windows
- **Requires WSL2 on Windows 11** - RESOLVED 2026-02-03

---

## ADR-006: Primary Key Strategy
**Date:** 2026-02-03
**Status:** Accepted

### Context
Need to decide on primary key type for all tables.

### Options Considered
1. **UUID** - Globally unique, no collision risk, 36 characters
2. **BIGSERIAL** - Auto-incrementing 64-bit integer, simple, 8 bytes

### Decision
**BIGSERIAL for all primary keys**

### Why This Option Won
- Simpler to work with in development and debugging
- Better index performance (8 bytes vs 36 characters)
- Smaller storage footprint
- Sufficient for our scale (not building distributed system)
- Easier to reference in URLs and logs (can remember IDs)

### Consequences
**Good:**
- Simple, familiar pattern
- Fast index lookups
- Small storage footprint
- Easy debugging (sequential IDs)

**Bad:**
- IDs are guessable (mitigated by auth)
- Not suitable if we ever need distributed ID generation

### Implementation
All 13 tables use `id BIGSERIAL PRIMARY KEY`

---

## ADR-007: Database Status Fields as ENUMs
**Date:** 2026-02-03
**Status:** Accepted

### Context
Many tables have status fields with a fixed set of values (e.g., anime_status, episode_status).

### Options Considered
1. **VARCHAR** - Flexible but no type safety
2. **INTEGER with constants** - Fast but not self-documenting
3. **PostgreSQL ENUM** - Type-safe, self-documenting, enforced by DB

### Decision
**PostgreSQL ENUM types for all status fields**

### Why This Option Won
- Type safety at the database level
- Self-documenting (enum values visible in schema)
- Cannot insert invalid values
- Good performance (stored as integers internally)
- Works well with Go struct tags

### ENUMs Created
```sql
CREATE TYPE anime_status AS ENUM ('disabled', 'ongoing', 'done', 'aborted', 'licensed');
CREATE TYPE anime_type AS ENUM ('tv', 'ova', 'film', 'bonus', 'special', 'ona', 'music');
CREATE TYPE content_type AS ENUM ('anime', 'hentai');
CREATE TYPE episode_status AS ENUM ('disabled', 'private', 'public');
CREATE TYPE watchlist_status AS ENUM ('watching', 'done', 'break', 'planned', 'dropped');
CREATE TYPE fansub_role AS ENUM ('raw', 'translate', 'time', 'typeset', 'logo', 'edit', 'karatime', 'karafx', 'qc', 'encode');
```

### Consequences
**Good:**
- Invalid data impossible at DB level
- Clear schema documentation
- IDE autocomplete in Go with proper mapping

**Bad:**
- Adding new enum values requires ALTER TYPE
- Need to keep Go constants in sync

### Follow-ups
- [ ] Create Go enum constants matching PostgreSQL types
- [ ] Add migration strategy for adding new enum values

---

## ADR-008: Schema Scope - Anime Portal Only
**Date:** 2026-02-03
**Status:** Accepted

### Context
Legacy system has both WoltLab WBB4/WCF forum tables and custom anime portal tables. Need to decide scope of new schema.

### Options Considered
1. **Full migration** - Migrate both forum and portal tables
2. **Portal only** - Only migrate anime-related tables, replace forum
3. **Hybrid** - Keep WCF for forum, new system for portal

### Decision
**Anime portal tables only - clean break from WCF**

### Why This Option Won
- Clean architecture without legacy baggage
- Modern RBAC system replacing WCF groups
- Simpler codebase to maintain
- Forum functionality can be added later with modern solution
- Focus on core value: anime portal

### Tables Created (13)
**Authentication:**
- users (replacing wcf4_user)
- roles (replacing wcf4_user_group)
- user_roles (replacing wcf4_user_to_group)

**Content:**
- anime (from anmi1_anime)
- anime_relations (from verwandt)
- episodes (from anmi1_episode)

**Social:**
- comments (from anmi1_comments)
- ratings (from anmi1_rating)
- watchlist (from anmi1_watch)
- messages (new, simplified PM system)

**Fansub:**
- attendants (from anmi1_attendants)
- fansub_groups (new)
- anime_fansub_groups (new)

### Consequences
**Good:**
- Clean, maintainable schema
- No legacy dependencies
- Modern role-based permissions
- Focused feature set

**Bad:**
- No forum out of the box
- Need to rebuild all integrations

---

## ADR-009: VARCHAR to TEXT for HTML Content
**Date:** 2026-02-03
**Status:** Accepted

### Context
During migration, discovered that legacy data contained HTML content longer than VARCHAR(255) limit.

### Problem
Fields like `stream_comment`, `sub_comment`, and `description` contained full HTML blocks that exceeded 255 characters.

### Decision
**Change VARCHAR(255) to TEXT for content fields that may contain HTML**

### Implementation
```sql
-- Applied via schema_update.sql
ALTER TABLE anime ALTER COLUMN stream_comment TYPE TEXT;
ALTER TABLE anime ALTER COLUMN sub_comment TYPE TEXT;
ALTER TABLE anime ALTER COLUMN description TYPE TEXT;
```

### Consequences
**Good:**
- No length limit issues
- Can store rich HTML content
- Migration completes successfully

**Bad:**
- TEXT slightly slower for indexing (but we don't index these fields)
- Larger storage footprint

---

## ADR-010: Migration Strategy - Temporary FK Disable
**Date:** 2026-02-03
**Status:** Accepted (temporary)

### Context
Bulk import of legacy data fails due to FK constraints when user table is not yet populated.

### Problem
- Episodes, comments, ratings, watchlist reference user_id
- User migration not yet complete
- FK constraints prevent import

### Decision
**Temporarily disable FK constraints, import with placeholder user_id=1**

### Implementation
```sql
-- Disable constraints
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
-- etc.

-- Import with user_id=1 for all records
INSERT INTO comments (..., user_id, ...) VALUES (..., 1, ...);
```

### Consequences
**Good:**
- Allows complete data import
- Core content (anime, episodes) fully accessible
- Can fix user references later

**Bad:**
- User attribution temporarily lost
- Must remember to re-enable FK constraints
- Referential integrity not enforced until fixed

### Follow-up Required
- [ ] Extract and migrate WCF users
- [ ] Update user_id references in migrated tables
- [ ] Re-enable FK constraints
- [ ] Verify integrity

---

## ADR-011: Idempotent Migration with ON CONFLICT
**Date:** 2026-02-03
**Status:** Accepted

### Context
Migration scripts may need to be run multiple times during development. Need to prevent duplicate key errors.

### Decision
**Use ON CONFLICT DO NOTHING for all INSERT statements**

### Implementation
```sql
INSERT INTO anime (id, title, ...) VALUES (1, 'Title', ...)
ON CONFLICT (id) DO NOTHING;
```

### Consequences
**Good:**
- Safe to re-run migration scripts
- No errors on duplicate data
- Predictable behavior

**Bad:**
- Won't update existing records (use DO UPDATE if needed)
- Silent failures if data should have been inserted

---

## Pending Decisions

### Database Migration Tool
**Options:** golang-migrate vs goose vs Atlas
**Considerations:**
- golang-migrate: Simple CLI, good Go integration
- goose: Go-native, embeddable
- Atlas: Modern, declarative, more complex
**Recommendation:** golang-migrate (simple, proven)
**Decision needed by:** Before second schema change

### API Documentation
**Options:** OpenAPI/Swagger vs manual documentation
**Decision needed by:** Before frontend development starts
