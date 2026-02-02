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
- [ ] Select specific Go web framework (Gin/Echo/Fiber)
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

## Pending Decisions

### Primary Key Strategy
**Options:** UUID vs BIGSERIAL
**Considerations:**
- UUID: Better for distributed systems, harder to guess
- BIGSERIAL: Simpler, better index performance
**Decision needed by:** Schema design phase

### Database Migration Tool
**Options:** golang-migrate vs goose vs Atlas
**Decision needed by:** Before first migration

### Go Web Framework
**Options:** Gin vs Echo vs Fiber
**Decision needed by:** Backend skeleton setup
