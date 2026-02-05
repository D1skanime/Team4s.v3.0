# Team4s.v3.0

Modern rebuild of the Team4s Anime Portal.

## Project Overview

This project modernizes the legacy Team4s Anime Portal from WoltLab WBB4/WCF + PHP to a contemporary stack.

### Tech Stack
- **Backend:** Go 1.25.6 with Gin framework
- **Frontend:** Next.js 14 (App Router) + TypeScript + CSS Modules
- **Database:** PostgreSQL 16 (via Docker)
- **Cache/Sessions:** Redis 7 (via Docker)
- **Auth:** JWT + Refresh Tokens (planned)
- **Deployment:** Docker Compose

## Current Status

**Phase:** P0 Features Complete
**Progress:** ~55%

### What Works Now

**Frontend (http://localhost:3000):**
- `/anime` - Anime-Liste mit A-Z Filter und Pagination
- `/anime/:id` - Anime-Detail mit Cover, Infos, Episoden-Liste
- Dark Theme, Responsive Design

**Backend API (http://localhost:8080):**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check mit DB-Status |
| GET | /api/v1/anime | Liste mit Filtern und Pagination |
| GET | /api/v1/anime/:id | Anime-Detail |
| GET | /api/v1/anime/:id/episodes | Episoden eines Anime |

### Data Available
| Table | Records |
|-------|---------|
| anime | 13,326 |
| episodes | 30,179 |
| anime_relations | 2,323 |
| covers | 2,386 images |
| fansub logos | 105 images |

### What's Next (P1 Features)
1. Anime Search
2. Advanced Filters (Status, Type)
3. Related Anime Section
4. Episode Detail View

### Known Risks / Blockers
- User Migration pending (all user_id = 1 temporarily)
- FK Constraints disabled for bulk import
- Stream-Links not yet parsed

## Quick Start

### Prerequisites
- Go 1.25.6+
- Node.js 18+
- Docker Desktop (with WSL2 on Windows)

### Start Development Environment

```bash
# 1. Start Docker Desktop

# 2. Start database stack
docker-compose up -d

# 3. Start backend
cd backend
cp .env.example .env  # First time only
go run cmd/server/main.go
# API at http://localhost:8080

# 4. Start frontend
cd frontend
npm install  # First time only
npm run dev
# App at http://localhost:3000
```

### Stop Development Environment

```bash
docker-compose down
```

## Project Structure

```
Team4s.v3.0/
  backend/           # Go API server
    cmd/server/      # Entry point
    internal/        # Private code
      database/      # PostgreSQL connection
      handlers/      # HTTP handlers
      models/        # Data structures
      repository/    # Database queries
  frontend/          # Next.js application
    src/
      app/           # Pages (App Router)
      components/    # React components
      lib/           # API client, utilities
      types/         # TypeScript interfaces
    public/
      covers/        # Anime cover images (gitignored)
      groups/        # Fansub logos (gitignored)
  database/          # Migration files
  docs/              # Day logs
  CONTEXT.md         # Project context
  STATUS.md          # Current status
  TOMORROW.md        # Next day's plan
  RISKS.md           # Risk register
  DECISIONS.md       # Architecture decisions
```

## Environment Variables

### Backend (backend/.env)
```env
PORT=8080
GIN_MODE=debug
DATABASE_URL=postgres://team4s:team4s_dev_password@localhost:5432/team4s?sslmode=disable
JWT_SECRET=your-super-secret-key-change-in-production
REDIS_URL=redis://localhost:6379
```

### Frontend
Uses backend at `http://localhost:8080` by default.

## Database Access

- **Adminer:** http://localhost:8081
- **Direct:** `docker exec -it team4sv30-postgres-1 psql -U team4s`

## Documentation

- **Day Logs:** `docs/YYYY-MM-DD - day-summary.md`
- **Decisions:** `DECISIONS.md`
- **Risks:** `RISKS.md`

## License

Private - All rights reserved.
