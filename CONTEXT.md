# Project Context - Team4s.v3.0

## What This Is
Modernization of Team4s anime streaming platform from legacy WoltLab PHP to Go backend + Next.js frontend.

## Current Phase
Active development - Admin tooling hardening and code quality improvements

## Project State

### Done
- [x] Core backend API (Go/Gin/PostgreSQL)
- [x] Fansub domain model (groups, members, aliases, anime relations)
- [x] Episode versioning system (multiple fansub versions per episode)
- [x] Jellyfin integration (sync, preview, media proxy)
- [x] Admin anime management (CRUD, Jellyfin sync, episode management)
- [x] Admin fansub management (CRUD, members, aliases, merge wizard)
- [x] Media upload system (logo/banner with cropper)
- [x] Public anime/fansub pages
- [x] Authentication system

### In Progress
- [ ] Code modularization (handler files exceeding limits)
- [ ] Admin UX refinements (Episode Manager, Context panels)

### Blocked
- None currently

## Key Decisions & Context

### Intent & Constraints
- Contract-first API design (OpenAPI/YAML)
- Go backend only - no direct provider calls from frontend
- German user-facing messages, English code comments
- Handler limit: 150 lines per file
- Component limit: 400 lines per file

### Architecture
- Backend: Go (Gin), PostgreSQL 16, Redis 7
- Frontend: Next.js 16, TypeScript, Tailwind/CSS Modules
- Media: Jellyfin provider via backend proxy
- Auth: JWT tokens, session management

### Quality Bar
- All tests passing before commit
- Build must succeed (Go + Next.js)
- Smoke tests for critical paths
- No functional regressions

## Day 2026-02-27
- Phase: Code quality / modularization
- Accomplishments: Split 2 monolithic handlers into 11 focused files
- Key Decisions: Responsibility-based splitting over HTTP-method splitting
- Risks/Unknowns: 4 more handlers still need modularization
- Next Steps: Continue handler splits or switch to feature work
- First task tomorrow: Review uncommitted Episode Manager frontend changes
