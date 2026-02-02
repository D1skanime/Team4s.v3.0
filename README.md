# Team4s.v3.0

Modern rebuild of the Team4s Anime Portal.

## Project Overview

This project modernizes the legacy Team4s Anime Portal from WoltLab WBB4/WCF + PHP to a contemporary stack.

### Tech Stack
- **Backend:** Go 1.25.6 with Gin framework
- **Frontend:** Next.js 14 (App Router) + TypeScript
- **Database:** PostgreSQL 16 (via Docker)
- **Cache/Sessions:** Redis 7 (via Docker)
- **Auth:** JWT + Refresh Tokens
- **Deployment:** Docker Compose

## Current Status

**Phase:** Development Environment Setup (Complete)
**Progress:** ~15%

### Completed
- Legacy system analysis (10 database tables documented)
- Feature requirements (15 features cataloged)
- API endpoint mapping (20+ endpoints)
- Go backend skeleton with Gin framework
- Docker Compose configuration (PostgreSQL + Redis + Adminer)

### In Progress
- PostgreSQL schema design
- Database connection implementation
- Frontend skeleton

## Quick Start

### Prerequisites
- Go 1.25.6+
- Docker Desktop
- Node.js 18+ (for frontend, coming soon)

### Start Development Environment

```bash
# 1. Start Docker Desktop (Windows: manual start required)

# 2. Start database stack
docker-compose up -d

# 3. Verify databases are running
# Open http://localhost:8081 (Adminer)
# Login: System=PostgreSQL, Server=postgres, User=team4s, Password=team4s_dev_password

# 4. Run the backend
cd backend
cp .env.example .env  # First time only
go run cmd/server/main.go

# 5. Test the API
curl http://localhost:8080/health
# Expected: {"service":"team4s-api","status":"ok"}
```

### Stop Development Environment

```bash
docker-compose down
```

## Project Structure

```
Team4s.v3.0/
  backend/           # Go API server
    cmd/server/      # Application entry point
    internal/        # Private application code
    pkg/             # Public libraries
    .env.example     # Environment template
  frontend/          # Next.js application (coming soon)
  docs/              # Documentation and day logs
  context/           # Legacy context files
  data/              # Docker volume data (gitignored)
  docker-compose.yml # Local dev infrastructure
  CONTEXT.md         # Project context
  STATUS.md          # Current status
  TOMORROW.md        # Next day's plan
  RISKS.md           # Risk register
  DECISIONS.md       # Architecture decisions
```

## API Endpoints (Current)

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /api/v1/anime | List anime (placeholder) |
| GET | /api/v1/anime/:id | Anime detail (placeholder) |
| POST | /api/v1/auth/login | Login (placeholder) |

## Documentation

- **Architecture Decisions:** See `DECISIONS.md`
- **Day Logs:** See `docs/` directory
- **Legacy Analysis:** See `../Team4s.v2.0/reports/Final.md`

## Development

### Environment Variables

Copy `backend/.env.example` to `backend/.env` and adjust as needed:

```env
PORT=8080
GIN_MODE=debug
DATABASE_URL=postgres://team4s:team4s_dev_password@localhost:5432/team4s?sslmode=disable
JWT_SECRET=your-super-secret-key-change-in-production
REDIS_URL=redis://localhost:6379
```

### Database Management

Access Adminer at http://localhost:8081 for visual database management.

## Contributing

This is a private project for the Team4s community.

## License

Private - All rights reserved.
