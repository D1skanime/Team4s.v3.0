# Team4s.v3.0 - Project Context

## Project Overview
Modernization of the Team4s Anime Portal from legacy WoltLab WBB4/WCF + PHP stack to a modern Go + Next.js + PostgreSQL architecture.

## Current Phase
**Phase:** Database Schema Design (Complete, Awaiting Deployment)
**Started:** 2026-02-02
**Blocked:** WSL2 installation required

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
- [x] PostgreSQL schema designed (12 tables)
- [x] Migration files created (001-005)
- [x] Combined init.sql with test data
- [x] Test connection queries prepared

### In Progress
- [ ] Install WSL2 (requires restart)
- [ ] Start Docker and verify PostgreSQL
- [ ] Connect Go backend to database

### Blocked
- **WSL2 Not Installed:** Docker Desktop requires WSL2 on Windows 11
  - Resolution: Run `wsl --install` in admin PowerShell, restart

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
- **Primary Keys:** BIGSERIAL (not UUID) - simpler, better performance
- **Status Fields:** PostgreSQL ENUMs for type safety

### Database Schema
12 tables designed:
- **Users:** users, roles, user_roles
- **Content:** anime, anime_relations, episodes
- **Social:** comments, ratings, watchlist, messages
- **Fansub:** attendants, fansub_groups, anime_fansub_groups

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

### Day 2026-02-03
- Phase: Database Schema Design
- Accomplishments:
  - Ran day-start agent for morning briefing
  - Read Final.md documentation with complete legacy analysis
  - Created PostgreSQL migration schema for anime portal tables
  - Created 5 migration files (001-005) covering all tables
  - Created init.sql with combined schema + test data
  - Created test_connection.sql for verification queries
  - Updated docker-compose.yml with init.sql mount
  - Discovered Docker virtualization error
  - Found WSL2 not installed (root cause)
- Key Decisions:
  - BIGSERIAL for all primary keys (not UUID)
  - PostgreSQL ENUMs for status fields
  - Anime portal tables only (no WCF/WoltLab)
  - Test users: admin/test123, testuser/test123
- Risks/Unknowns:
  - WSL2 installation requires system restart
  - Password migration from WCF hashes not yet tested
- Next Steps:
  - Install WSL2 (`wsl --install`)
  - Restart and start Docker
  - Verify database with Adminer
- First task tomorrow: PowerShell Admin -> `wsl --install` -> restart

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
- Risks/Unknowns:
  - Docker Desktop needs manual start after Windows restart
  - Password migration from WCF hashes not yet tested
- Next Steps:
  - Start Docker and verify PostgreSQL/Redis
  - Create PostgreSQL schema
  - Connect Go backend to database

## References
- Legacy Analysis: `../Team4s.v2.0/reports/Final.md`
- Feature Catalog: See Final.md "Feature-Katalog" section
- API Mapping: See Final.md "API-Endpunkte" section
- Database Schema: See Final.md "Datenbank-Architektur" section
- Docker Config: `docker-compose.yml`
- Backend Entry: `backend/cmd/server/main.go`
- Migration Files: `database/migrations/001-005_*.sql`
- Init Script: `database/init.sql`
