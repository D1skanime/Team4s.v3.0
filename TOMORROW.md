# Tomorrow's Plan - 2026-02-03

## Top 3 Priorities

### 1. Start Docker and Verify Database Stack
Start Docker Desktop and bring up the development database infrastructure:
- Run `docker-compose up -d`
- Verify PostgreSQL is accessible via Adminer (localhost:8081)
- Verify Redis is running on port 6379
- Test connection with backend (if time permits)

### 2. Create PostgreSQL Schema
Design and implement the core database schema:
- users table (replacing wcf4_user)
- roles and permissions tables (replacing wcf4_user_to_group)
- anime table (from anmi1_anime)
- episodes table (from anmi1_episode)
- Supporting tables: comments, ratings, watchlist

### 3. Connect Go Backend to Database
- Initialize pgx connection pool in main.go
- Create database package in internal/database/
- Implement health check that verifies DB connection
- Test with simple query

## First 15-Minute Task
**Start Docker Desktop, run `docker-compose up -d`, verify with Adminer at localhost:8081**

Steps:
1. Open Docker Desktop (wait for it to fully start)
2. Open terminal in Team4s.v3.0 folder
3. Run: `docker-compose up -d`
4. Wait for containers to be healthy
5. Open browser: http://localhost:8081
6. Login: System=PostgreSQL, Server=postgres, User=team4s, Password=team4s_dev_password, Database=team4s

This is concrete, fast, and unblocks all database work.

## Dependencies to Unblock Early
- Docker Desktop must be running before any database work
- PostgreSQL must be healthy before schema migration
- Decide on UUID vs BIGSERIAL for primary keys (recommend BIGSERIAL for simplicity)

## Nice-to-Have (If Ahead of Schedule)
- Create migration files using golang-migrate
- Set up database seeding script with test data
- Initialize basic CI with GitHub Actions
- Start Next.js frontend skeleton

## Environment Reminders
- Docker Desktop needs manual start on Windows boot
- Backend .env already configured for local Docker PostgreSQL
- Adminer available at localhost:8081 for visual DB management
