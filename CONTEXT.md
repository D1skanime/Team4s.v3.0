# Team4s.v3.0 - Project Context

## Project Overview
Modernization of the Team4s Anime Portal from legacy WoltLab WBB4/WCF + PHP stack to a modern Go + Next.js + PostgreSQL architecture.

## Current Phase
**Phase:** Development Environment Setup (Complete)
**Started:** 2026-02-02

## Project State

### Done
- [x] Legacy system analysis (Team4s.v2.0/reports/Final.md)
- [x] Database schema reconstruction (including anmi1_watch, anmi1_profield, verwandt)
- [x] Feature catalog documented
- [x] API endpoint mapping completed
- [x] Tech stack decision finalized
- [x] Project folder structure created
- [x] Git repository initialized
- [x] GitHub CLI installed and authenticated (D1skanime)
- [x] Go 1.25.6 installed with VS Code extension, gopls, dlv
- [x] Go module initialized (github.com/D1skanime/Team4s.v3.0/backend)
- [x] Gin web framework installed
- [x] PostgreSQL driver (pgx), JWT, godotenv installed
- [x] Backend structure created (cmd/server, internal/*, pkg/middleware)
- [x] Basic API server with health check and placeholder routes
- [x] Server compiles successfully (server.exe)
- [x] Docker Desktop installed
- [x] docker-compose.yml created (PostgreSQL 16, Redis 7, Adminer)
- [x] Local data directories created (./data/postgres, ./data/redis)
- [x] .gitignore updated to exclude data/ and binaries
- [x] backend/.env.example created with connection template
- [x] Frontend/JavaScript analyzer agents created (in Team4s.v2.0)

### In Progress
- [ ] PostgreSQL schema design for new system
- [ ] Database connection implementation
- [ ] Next.js frontend skeleton setup

### Blocked
- None

## Key Decisions & Context

### Intent & Constraints
- **Optimize for:** Clean architecture, maintainability, type safety, modern developer experience
- **Refuse to do:** Direct WoltLab forum integration (we replace it entirely)
- **Constraint:** Must support migration of existing data from MySQL/MariaDB

### Tech Stack (Decided)
- **Backend:** Go 1.25.6 with Gin framework
- **Frontend:** Next.js 14 with App Router + TypeScript
- **Database:** PostgreSQL 16 (via Docker)
- **Cache/Sessions:** Redis 7 (via Docker)
- **Auth:** JWT + Refresh tokens + Redis session store
- **Deployment:** Docker Compose + nginx
- **DB Admin:** Adminer on localhost:8081

### Design Approach
- Monorepo structure with `/backend` and `/frontend` directories
- RESTful API design (see Final.md for endpoint mapping)
- Role-based access control (RBAC) replacing WCF group system
- Server-side rendering for SEO-critical pages

### Assumptions
- Users will be migrated with password reset (bcrypt compatibility TBD)
- Existing media files (covers, downloads) will be migrated to new storage
- AniSearch integration will be rebuilt as external API integration

### Quality Bar
- All Go code must pass `go vet` and `golangci-lint`
- TypeScript strict mode enabled
- API responses must include proper error handling
- Database queries must use parameterized statements (no SQL injection)

## Session History

### Day 2026-02-02
- Phase: Project Initialization -> Development Environment Setup
- Accomplishments:
  - Ran day-start agent for morning briefing
  - Recovered missing database schemas from .frm files (anmi1_watch, anmi1_profield, verwandt)
  - Updated Final.md with complete schema documentation
  - Installed GitHub CLI and authenticated as D1skanime
  - Created Team4s.v3.0 project folder and initialized git
  - Installed Go 1.25.6 with VS Code extension + gopls + dlv
  - Initialized Go module with Gin, pgx, JWT, godotenv dependencies
  - Created backend structure (cmd/server/main.go with basic routes)
  - Built server.exe successfully
  - Installed Docker Desktop
  - Created docker-compose.yml for PostgreSQL 16 + Redis 7 + Adminer
  - Set up local data directories for persistent storage
  - Updated .gitignore for data/ and binaries
  - Created backend/.env.example configuration template
  - Created frontend-assets-analyzer.md and javascript-analyzer.md agents
- Key Decisions:
  - Go web framework: Gin (most popular, best documentation)
  - Database: PostgreSQL 16 via Docker (local data in ./data/)
  - Cache: Redis 7 via Docker
  - Primary key strategy: Still pending (UUID vs BIGSERIAL)
- Risks/Unknowns:
  - Docker Desktop needs manual start after Windows restart
  - Password migration from WCF hashes not yet tested
- Next Steps:
  - Start Docker and verify PostgreSQL/Redis
  - Create PostgreSQL schema
  - Connect Go backend to database
- First task tomorrow: Start Docker, run docker-compose up -d, verify with Adminer

## References
- Legacy Analysis: `../Team4s.v2.0/reports/Final.md`
- Feature Catalog: See Final.md "Feature-Katalog" section
- API Mapping: See Final.md "API-Endpunkte" section
- Database Schema: See Final.md "Datenbank-Architektur" section
- Docker Config: `docker-compose.yml`
- Backend Entry: `backend/cmd/server/main.go`
