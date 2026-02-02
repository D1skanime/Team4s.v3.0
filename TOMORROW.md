# Tomorrow's Plan - 2026-02-03

## Top 3 Priorities

### 1. Design PostgreSQL Schema
Create the core database schema for the new system:
- users table (replacing wcf4_user)
- roles and permissions tables (replacing wcf4_user_to_group)
- anime table (from anmi1_anime)
- episodes table (from anmi1_episode)
- Supporting tables: comments, ratings, watchlist, messages, attendants, relations

### 2. Set Up Go Backend Skeleton
- Initialize Go module (`go mod init`)
- Create folder structure per Final.md recommendations
- Set up basic HTTP server with chosen framework
- Create placeholder handlers for core routes

### 3. Set Up Next.js Frontend Skeleton
- Initialize Next.js 14 project with TypeScript
- Configure App Router structure
- Create basic layout components
- Set up Tailwind CSS (if using)

## First 15-Minute Task
**Create `docs/schema/001-users.sql`** - Write the PostgreSQL DDL for the users table with:
- id (UUID or BIGSERIAL)
- username (VARCHAR, unique)
- email (VARCHAR, unique)
- password_hash (VARCHAR)
- created_at, updated_at timestamps
- Basic indexes

This is small, concrete, and unblocks all other schema work.

## Dependencies to Unblock Early
- Decide on Go web framework (Gin vs Echo vs Fiber)
- Decide on database migration tool (golang-migrate vs goose)
- Decide on UUID vs integer primary keys

## Nice-to-Have (If Ahead of Schedule)
- Set up Docker Compose for local PostgreSQL + Redis
- Create `.env.example` with configuration template
- Initialize basic CI with GitHub Actions
