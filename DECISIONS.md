# Team4s.v3.0 - Architectural Decisions

## ADR-001: Tech Stack Selection
**Date:** 2026-02-02
**Status:** Accepted

### Context
Need to select a modern tech stack to replace the legacy WoltLab WBB4/WCF + PHP system. Requirements:
- Better performance than PHP
- Type safety
- Modern developer experience
- Good ecosystem for web applications

### Options Considered
1. **Node.js + Next.js full-stack** - All JavaScript, simpler stack
2. **Go + Next.js** - Go backend for performance, Next.js for modern frontend
3. **Rust + Next.js** - Maximum performance but steeper learning curve
4. **Python (FastAPI) + Next.js** - Good DX but performance concerns

### Decision
**Go + Next.js 14 + PostgreSQL + Redis**

### Why This Option Won
- Go provides excellent performance and concurrency (important for streaming/downloads)
- Strong typing in both Go and TypeScript
- PostgreSQL is robust and well-suited for relational data
- Redis handles sessions and caching efficiently
- Next.js 14 App Router provides modern React patterns with SSR
- All technologies have strong communities and long-term viability

### Consequences
**Good:**
- Fast API responses
- Type safety across the stack
- Clear separation of concerns
- Scalable architecture

**Bad:**
- Two languages to maintain (Go + TypeScript)
- Slightly more complex deployment than monolithic PHP

### Follow-ups
- [x] Select specific Go web framework (Gin/Echo/Fiber) - **Decided: Gin**
- [ ] Set up shared type definitions (OpenAPI spec?)

---

## ADR-002: Project Structure
**Date:** 2026-02-02
**Status:** Accepted

### Context
Need to organize the codebase for the new system.

### Decision
Monorepo structure:
```
/backend     - Go API server
/frontend    - Next.js application
/docs        - Documentation and schemas
/context     - AI context files
```

### Why
- Single repository simplifies version control
- Shared documentation and context
- Easier CI/CD configuration
- Clear separation between backend and frontend

### Consequences
- Need to manage dependencies for both Go and Node.js
- May need workspace tooling if repo grows

---

## ADR-003: Authentication Strategy
**Date:** 2026-02-02
**Status:** Proposed (needs validation)

### Context
Replacing WCF's session-based authentication.

### Decision
JWT + Refresh Token pattern with Redis session store

### Why
- Stateless authentication scales well
- Refresh tokens provide security without frequent re-login
- Redis provides fast session validation and revocation capability

### Consequences
- Need to implement token refresh logic on frontend
- Must handle token storage securely (httpOnly cookies)

### Follow-ups
- [ ] Define token expiration times
- [ ] Design refresh token rotation strategy
- [ ] Plan logout/revocation mechanism

---

## ADR-004: Go Web Framework Selection
**Date:** 2026-02-02
**Status:** Accepted

### Context
Need to select a Go web framework for the backend API.

### Options Considered
1. **Gin** - Most popular, extensive middleware ecosystem, excellent documentation
2. **Echo** - Fast, minimalist, good middleware support
3. **Fiber** - Express-inspired, very fast, newer community

### Decision
**Gin**

### Why This Option Won
- Most popular Go web framework (largest community)
- Excellent documentation and tutorials
- Mature middleware ecosystem (auth, CORS, logging, etc.)
- Battle-tested in production
- Easy to find help and examples

### Consequences
**Good:**
- Large community means easy troubleshooting
- Familiar patterns for developers from other frameworks
- Rich middleware ecosystem

**Bad:**
- Not the absolute fastest (Fiber is faster)
- Uses reflection (minor performance overhead)

### Implementation
- Gin v1.11.0 installed
- Basic server structure created in `backend/cmd/server/main.go`
- Health check and placeholder routes implemented

---

## ADR-005: Local Development Database Strategy
**Date:** 2026-02-02
**Status:** Accepted

### Context
Need a local development database setup that is:
- Easy to set up and tear down
- Consistent across development machines
- Close to production environment

### Options Considered
1. **Native PostgreSQL installation** - Direct install on Windows
2. **Docker Compose** - Containerized PostgreSQL + Redis
3. **Cloud-hosted dev database** - Remote development DB

### Decision
**Docker Compose with local volume storage**

### Why This Option Won
- Easy to start/stop entire stack with one command
- Data persists in `./data/` folder
- Adminer UI for visual DB management
- Matches production container setup
- No system-level installation required

### Configuration
```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    volumes: ["./data/postgres:/var/lib/postgresql/data"]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes: ["./data/redis:/data"]
  adminer:
    image: adminer
    ports: ["8081:8080"]
```

### Consequences
**Good:**
- Consistent environment
- Easy to reset (delete data/ folder)
- Visual management via Adminer
- Portable setup

**Bad:**
- Requires Docker Desktop running
- Docker Desktop needs manual start on Windows

---

## Pending Decisions

### Primary Key Strategy
**Options:** UUID vs BIGSERIAL
**Considerations:**
- UUID: Better for distributed systems, harder to guess, 36 chars
- BIGSERIAL: Simpler, better index performance, sequential
**Recommendation:** BIGSERIAL (we're not distributed, simpler is better)
**Decision needed by:** Before schema design (Day 2)

### Database Migration Tool
**Options:** golang-migrate vs goose vs Atlas
**Decision needed by:** Before first migration

### API Documentation
**Options:** OpenAPI/Swagger vs manual documentation
**Decision needed by:** Before frontend development starts
