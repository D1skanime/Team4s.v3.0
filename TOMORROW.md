# Tomorrow's Plan - 2026-02-04

## Top 3 Priorities

### 1. Connect Go Backend to PostgreSQL
Implement database connection pool using pgx driver.

Steps:
1. Create `internal/database/postgres.go` with connection pool
2. Add database health check to `/health` endpoint
3. Load connection string from environment variables
4. Test connection on startup

```go
// Expected structure
func NewPostgresPool(ctx context.Context, connString string) (*pgxpool.Pool, error)
func (p *Pool) Ping(ctx context.Context) error
```

### 2. Implement GET /api/v1/anime Endpoint
Replace placeholder with real database query.

Requirements:
- Query anime table with pagination (default 20 per page)
- Support query parameters: `?page=1&limit=20&status=ongoing&type=tv`
- Return JSON with metadata: total count, page info
- Include basic anime fields: id, title, type, status, year, cover_image

Expected response:
```json
{
  "data": [...],
  "meta": {
    "total": 13326,
    "page": 1,
    "per_page": 20,
    "total_pages": 667
  }
}
```

### 3. Implement GET /api/v1/anime/:id Endpoint
Single anime detail with related data.

Requirements:
- Fetch anime by ID
- Include episodes list
- Include anime relations (sequels/prequels)
- Return 404 if not found

---

## First 15-Minute Task
**Create `internal/database/postgres.go` with basic connection pool setup.**

This is the foundation for all database operations. Start simple:
1. Create the file
2. Import pgxpool
3. Add NewPool function
4. Add Ping function
5. Test compilation

---

## Dependencies to Unblock Early
1. **Docker running** - Verify with `docker ps` showing postgres container
2. **Environment variables** - Ensure DATABASE_URL is set in .env
3. **pgx driver** - Already installed (verify with `go list -m github.com/jackc/pgx/v5`)

---

## Verification Checklist
After completing priorities 1-3, verify:
- [ ] `go run cmd/server/main.go` starts without errors
- [ ] `/health` endpoint shows database connection status
- [ ] `/api/v1/anime` returns paginated anime list from database
- [ ] `/api/v1/anime/1` returns a single anime with episodes
- [ ] Response times are reasonable (<100ms for list, <50ms for single)

---

## If Ahead of Schedule

### Implement Search Endpoint
`GET /api/v1/anime/search?q=attack`
- Full-text search on title, title_de, title_en
- Return matching anime with relevance scoring

### Add Episode Detail Endpoint
`GET /api/v1/episodes/:id`
- Episode detail with fansub process status
- Include stream links (parsed from legacy format)

### Start User Authentication
- Create `/api/v1/auth/login` endpoint
- Implement JWT token generation
- Add middleware for protected routes

---

## Environment Reminders
- Docker Desktop should already be running from today
- PostgreSQL container name: `team4sv30-postgres-1`
- Database has 47,145+ records of real data to work with
- Test with real anime IDs (1-13326 range)

---

## Code Structure Reference
```
backend/
  cmd/server/main.go     # Entry point - add database init here
  internal/
    config/              # Add database config loading
    database/            # NEW: postgres.go connection pool
    handlers/            # Update anime.go with real queries
    models/              # Define Go structs for anime, episode
    services/            # Business logic layer
  pkg/middleware/        # Existing middleware
```

---

## Test Data Quick Reference
| ID | Title | Type | Status |
|----|-------|------|--------|
| 1 | First anime in DB | tv | varies |
| ~13326 | Last anime in DB | varies | varies |

Use Adminer to find specific test IDs:
```sql
SELECT id, title, type, status FROM anime LIMIT 10;
```
