# Team4s.v3.0 - Project Context

## Project Overview
Modernization of the Team4s Anime Portal from legacy WoltLab WBB4/WCF + PHP stack to a modern Go + Next.js + PostgreSQL architecture.

## Current Phase
**Phase:** P0 Features Complete
**Started:** 2026-02-02
**Status:** Core Browse/View functionality working, ready for P1 features

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
- [x] PostgreSQL schema designed (13 tables)
- [x] Migration files created (001-005)
- [x] Combined init.sql with test data
- [x] Test connection queries prepared
- [x] **WSL2 installed** (BIOS + wsl --install)
- [x] **Docker Desktop running**
- [x] **PostgreSQL container running**
- [x] **MySQL to PostgreSQL migration script created**
- [x] **47,145+ records migrated from legacy database**

### In Progress
- [ ] P1-1: Anime Search Endpoint
- [ ] P1-2: Advanced Filters (Status, Type)
- [ ] P1-3: Related Anime Section

### Recently Completed (2026-02-05)
- [x] Connect Go backend to PostgreSQL (pgx pool)
- [x] Implement real API endpoints with database queries
- [x] Frontend with Next.js 14 App Router
- [x] Anime Liste mit A-Z Filter und Pagination
- [x] Anime Detail Page mit Cover, Infos, Status
- [x] Episode View mit Episoden-Liste
- [x] 2.386 Cover-Bilder migriert
- [x] 105 Fansub-Logos migriert

### Blocked
- **User Migration:** Need to extract and migrate WCF users
  - All user_id references currently point to admin (user_id=1)
  - FK constraints disabled until user migration complete

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
13 tables deployed with production data:
- **Users:** users, roles, user_roles
- **Content:** anime (13,326), anime_relations (2,323), episodes (30,179)
- **Social:** comments (145), ratings (456), watchlist (716), messages
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

### Day 2026-02-05
- Phase: P0 Features (COMPLETED)
- Accomplishments:
  - Backend: Database connection with pgxpool, Repository pattern
  - Backend: 3 API endpoints (anime list, detail, episodes)
  - Frontend: Next.js 14 App with App Router
  - Frontend: Anime-Liste mit A-Z Filter und Pagination
  - Frontend: Anime-Detail Page mit Cover, Infos
  - Frontend: Episode View mit Episoden-Liste
  - Assets: 2.386 Covers + 105 Logos migriert
  - Styling: CSS Modules mit Dark Theme
- Key Decisions:
  - CSS Modules statt Tailwind (bessere Performance, mehr Kontrolle)
  - Server Components fuer alle Pages (schnelleres Initial Load)
  - Repository Pattern im Backend (saubere Trennung)
- Risks/Unknowns:
  - Stream-Links noch nicht geparst
  - User-Auth noch Placeholder
- Next Steps: P1 Features (Search, Filter, Related Anime)
- First task tomorrow: Search-Endpoint implementieren

### Day 2026-02-03
- Phase: Database Migration (COMPLETED)
- Accomplishments:
  - Fixed WSL2 installation (BIOS + wsl --install)
  - Started Docker Desktop successfully
  - PostgreSQL container running with schema
  - Created Python migration script (migrate_mysql_to_postgres.py)
  - Migrated 47,145+ records from legacy MySQL dump
  - Fixed VARCHAR->TEXT for HTML content fields
  - Temporarily disabled FK constraints for bulk import
- Key Decisions:
  - VARCHAR(255) to TEXT for stream_comment, sub_comment, description
  - ON CONFLICT DO NOTHING for idempotent imports
  - Point orphaned user_id references to admin temporarily
- Migration Results:
  - anime: 13,326 records
  - episodes: 30,179 records
  - anime_relations: 2,323 records
  - comments: 145 records
  - ratings: 456 records
  - watchlist: 716 records
- Risks/Unknowns:
  - User migration still pending
  - FK constraints disabled
- Next Steps:
  - Connect Go backend to database
  - Implement GET /api/v1/anime endpoint
  - Implement GET /api/v1/anime/:id endpoint
- First task tomorrow: Create internal/database/postgres.go

### Day 2026-02-03 (Morning Session)
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
- Migration Script: `database/migrate_mysql_to_postgres.py`
- Migration Data: `database/migration_data/*.sql`
