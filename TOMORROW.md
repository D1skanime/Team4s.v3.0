# Tomorrow's Plan - 2026-02-04

## Top 3 Priorities

### 1. Install WSL2 and Fix Docker
**Critical blocker resolution.** Docker Desktop requires WSL2 on Windows 11.

Steps:
1. Open PowerShell as Administrator
2. Run: `wsl --install`
3. Restart computer when prompted
4. After restart, WSL2 will complete installation
5. Start Docker Desktop
6. Wait for Docker to fully initialize

### 2. Start Database Stack and Verify
Once Docker is working:
```bash
cd C:\Users\D1sk\Documents\Entwicklung\claude\Team4s.v3.0
docker-compose up -d
```

Verify in Adminer (http://localhost:8081):
- System: PostgreSQL
- Server: postgres
- User: team4s
- Password: team4s_dev_password
- Database: team4s

Expected: All 12 tables created, test data populated.

### 3. Test Database with Verification Queries
Run the test queries from `database/test_connection.sql`:
- Verify all tables exist
- Verify test users created (admin, testuser)
- Verify test anime and episodes created
- Verify roles populated (27 roles)

---

## First 15-Minute Task
**Open PowerShell as Admin, run `wsl --install`, restart when prompted.**

This single action unblocks everything else.

If WSL2 is already installed (check with `wsl --status`), skip directly to starting Docker Desktop.

---

## Dependencies to Unblock Early
1. **WSL2** must be installed before Docker works
2. **Docker Desktop** must be running before database starts
3. **PostgreSQL** must be healthy before running test queries
4. **init.sql** must complete before backend can connect

---

## Verification Checklist
After completing priorities 1-3, verify:
- [ ] `wsl --status` shows WSL2 installed
- [ ] Docker Desktop icon shows "Running"
- [ ] `docker ps` shows 3 containers (postgres, redis, adminer)
- [ ] Adminer login works at localhost:8081
- [ ] Tables visible in Adminer (users, anime, episodes, etc.)
- [ ] Test users exist: admin, testuser
- [ ] Test anime exist: Attack on Titan, Death Note, Steins;Gate

---

## If Ahead of Schedule

### Connect Go Backend to Database
If database verification succeeds quickly:
1. Start the Go server: `go run cmd/server/main.go`
2. Update `/health` endpoint to check database connection
3. Implement basic database query in health check

### Create First Real Endpoint
Implement `GET /api/v1/anime`:
- Query anime table with pagination
- Return JSON list of anime
- Include basic filtering (status, type)

---

## Environment Reminders
- Docker Desktop may take 1-2 minutes to fully start
- PostgreSQL health check runs every 10 seconds
- init.sql runs only on first container start (empty data volume)
- To reset database: `docker-compose down && rm -rf data/postgres && docker-compose up -d`

---

## Test Credentials
| User | Password | Role |
|------|----------|------|
| admin | test123 | admin |
| testuser | test123 | registered |

These are bcrypt-hashed in the database.
