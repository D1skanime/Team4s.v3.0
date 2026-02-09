# Team4s.v3.0 - Project Context

## Project Overview
Modernization of the Team4s Anime Portal from legacy WoltLab WBB4/WCF + PHP stack to a modern Go + Next.js + PostgreSQL architecture.

## Current Phase
**Phase:** P2 Features In Progress
**Started:** 2026-02-02
**Status:** P0 + P1 complete, P2-1 Auth + P2-2 Profile complete

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
- [x] **P0 Features complete** (Anime List, Detail, Episodes, Covers, Logos)
- [x] **P1 Features complete** (Search, Filters, Related, Episode Detail, Watchlist, Rating Display)
- [x] **P2-1 Auth System** (JWT, Refresh Token, Redis, Login/Register)
- [x] **P2-2 User Profile** (Profile Page, Settings, Password Change, Account Delete)

### In Progress
- [ ] P2-3: User Ratings (submit own ratings)
- [ ] P2-4: Watchlist Sync (localStorage to backend)
- [ ] P2-5: Comments (read and write)

### Recently Completed (2026-02-09)
- [x] P2-1: Auth System
  - Backend: TokenService, AuthService, AuthMiddleware
  - Backend: Redis integration for refresh tokens
  - Backend: User Repository with CRUD
  - Frontend: AuthContext with login/register/logout/refreshUser
  - Frontend: Login/Register Pages
  - Frontend: Header with User Menu
- [x] P2-2: User Profile
  - Backend: User Handler (GetProfile, UpdateProfile, ChangePassword, DeleteAccount)
  - Backend: UserStats Query (anime watched, watching, ratings, comments)
  - Frontend: /user/[username] Profile Page with ProfileCard, StatsGrid
  - Frontend: /settings Page with Tabs (Profile, Password, Account)
  - Frontend: ProfileForm, PasswordForm, DeleteAccountForm Components

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
- **Auth:** JWT (15 min) + Refresh tokens (7 days) + Redis session store
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

### Day 2026-02-09
- Phase: P2 IN PROGRESS (40% complete)
- Accomplishments:
  - P2-1: Auth System complete (JWT + Refresh + Redis)
  - P2-2: User Profile complete (View, Edit, Settings)
  - Backend: 11 neue Dateien (services, handlers, middleware, repository)
  - Frontend: ~25 neue Dateien (pages, components, contexts)
  - 10 neue API Endpoints implementiert
- Key Decisions:
  - JWT Access Token: 15 min Expiry (ADR-020)
  - Refresh Token: 7 Tage, Random Hex in Redis (ADR-021)
  - bcrypt Cost: 10 fuer Password Hashing (ADR-022)
  - AuthContext mit refreshUser() (ADR-023)
  - Settings Page mit Tab-Navigation (ADR-024)
- Risks/Unknowns:
  - Rate Limiting noch nicht implementiert (Brute-Force-Schutz fehlt)
  - Email Verification nicht implementiert
  - Avatar nur als URL, kein Upload
- Next Steps: P2-3 User Ratings, P2-4 Watchlist Sync
- First task tomorrow: RatingInput Komponente erstellen

### Day 2026-02-06
- Phase: P1 COMPLETED
- Accomplishments:
  - P1-2: AnimeFilters mit Status/Type Dropdowns, URL-State Sync
  - P1-3: RelatedAnime mit horizontalem Scroll, Relation-Type Badges
  - P1-4: Episode Detail Route /episode/:id mit FansubProgress (10 Bars)
  - P1-5: WatchlistButton Dropdown, localStorage Persistenz, /watchlist Page
  - P1-6: StarRating mit SVG clipPath fuer halbe Sterne, RatingDisplay
  - Backend: 3 neue Endpoints (relations, episode detail, rating stats)
  - Backend: Rating Handler/Repository/Model
  - Frontend: 17 neue Dateien (Komponenten, Pages, Styles)
- Key Decisions:
  - AnimeFilters als Client Component mit URL-State Sync
  - Horizontaler Scroll statt Carousel fuer Related Anime
  - FansubProgress mit 10 einzelnen Progress-Bars (Legacy-kompatibel)
  - Watchlist mit localStorage (Backend-Sync kommt mit P2 Auth)
  - StarRating mit SVG clipPath fuer praezise Partial-Fills
- Risks/Unknowns:
  - Stream-Links noch nicht geparst
  - clipPath IDs koennen bei mehreren StarRating-Instanzen kollidieren
  - User Migration weiterhin blockiert Social Features
- Next Steps: P2 Phase - Auth, Profile, User Ratings, Comments
- First task tomorrow: Login/Register Pages planen

### Day 2026-02-05/06 (Nacht-Session)
- Phase: P0 COMPLETED + P1-1 COMPLETED
- Accomplishments:
  - Backend: Search Handler in anime.go hinzugefuegt
  - Backend: Search Repository-Methode mit ILIKE Query
  - Backend: SearchResponse Model fuer strukturierte Rueckgabe
  - Frontend: Search Page (/search) erstellt
  - Frontend: SearchBar Komponente mit Styling
  - Frontend: Header Komponente mit globaler Navigation
  - Frontend: Layout.tsx refactored (Header integriert)
  - Backend: Database connection with pgxpool, Repository pattern
  - Backend: 4 API endpoints (anime list, detail, episodes, SEARCH)
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
  - ILIKE fuer Case-insensitive Suche (performant genug fuer 13k records)
  - SearchBar als eigenstaendige Komponente (wiederverwendbar)
- Risks/Unknowns:
  - Stream-Links noch nicht geparst
  - User-Auth noch Placeholder
  - Full-text Search fuer bessere Performance bei Wachstum
- Next Steps: P1-2 Advanced Filters, P1-3 Related Anime
- First task tomorrow: Status/Type Filter implementieren

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
