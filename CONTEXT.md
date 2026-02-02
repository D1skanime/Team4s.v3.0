# Team4s.v3.0 - Project Context

## Project Overview
Modernization of the Team4s Anime Portal from legacy WoltLab WBB4/WCF + PHP stack to a modern Go + Next.js + PostgreSQL architecture.

## Current Phase
**Phase:** Project Initialization / Pre-Development
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

### In Progress
- [ ] PostgreSQL schema design for new system
- [ ] Go backend skeleton setup
- [ ] Next.js frontend skeleton setup

### Blocked
- None

## Key Decisions & Context

### Intent & Constraints
- **Optimize for:** Clean architecture, maintainability, type safety, modern developer experience
- **Refuse to do:** Direct WoltLab forum integration (we replace it entirely)
- **Constraint:** Must support migration of existing data from MySQL/MariaDB

### Tech Stack (Decided)
- **Backend:** Go (likely Gin/Echo/Fiber framework)
- **Frontend:** Next.js 14 with App Router + TypeScript
- **Database:** PostgreSQL 16
- **Cache/Sessions:** Redis
- **Auth:** JWT + Refresh tokens + Redis session store
- **Deployment:** Docker Compose + nginx

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
- Phase: Project Initialization
- Accomplishments:
  - Ran day-start agent for morning briefing
  - Recovered missing database schemas from .frm files (anmi1_watch, anmi1_profield, verwandt)
  - Updated Final.md with complete schema documentation
  - Installed GitHub CLI and authenticated as D1skanime
  - Created Team4s.v3.0 project folder and initialized git
- Key Decisions:
  - Project structure: monorepo with backend/frontend/docs/context folders
  - Version control: GitHub with D1skanime account
- Risks/Unknowns:
  - Password migration strategy not yet defined
  - Media storage approach not finalized
- Next Steps:
  - Design PostgreSQL schema
  - Set up Go backend skeleton
  - Set up Next.js frontend skeleton
- First task tomorrow: Design core PostgreSQL tables (users, anime, episodes)

## References
- Legacy Analysis: `../Team4s.v2.0/reports/Final.md`
- Feature Catalog: See Final.md "Feature-Katalog" section
- API Mapping: See Final.md "API-Endpunkte" section
- Database Schema: See Final.md "Datenbank-Architektur" section
