# Team4s.v3.0 - Risks and Blockers

## Current Blockers

### BLOCKER: WSL2 Not Installed
**Status:** BLOCKING - Must resolve before any database work
**Impact:** Critical | **Since:** 2026-02-03

Docker Desktop on Windows 11 requires WSL2 (Windows Subsystem for Linux 2) as its backend. The system currently does not have WSL2 installed.

**Symptoms:**
- Docker Desktop shows virtualization error
- Cannot start containers
- PostgreSQL stack cannot run

**Resolution:**
1. Open PowerShell as Administrator
2. Run: `wsl --install`
3. Restart computer
4. Start Docker Desktop

**Owner:** D1skanime | **Due:** 2026-02-04 (first task)

---

## Top 3 Risks

### 1. Password Migration Complexity
**Impact:** High | **Likelihood:** Medium

The legacy system uses WCF's crypt-compatible password hashing. If we cannot verify bcrypt compatibility, we may need to:
- Force all users to reset passwords on first login
- Implement a dual-hash verification system during transition

**Mitigation:**
- [ ] Extract sample password hash from legacy DB
- [ ] Test compatibility with Go's bcrypt library
- [ ] Design fallback password reset flow

**Owner:** TBD | **Due:** Before user migration

---

### 2. Character Encoding Issues
**Impact:** Medium | **Likelihood:** High

Legacy database uses mixed encodings (latin1_swedish_ci for anmi1_watch, utf8_unicode_ci elsewhere). Japanese characters may be stored incorrectly.

**Mitigation:**
- [ ] Audit encoding of key text fields (anime titles, descriptions)
- [ ] Create encoding conversion script for migration
- [ ] Test with sample data before full migration

**Owner:** TBD | **Due:** Before data migration

---

### 3. Data Migration Volume
**Impact:** Medium | **Likelihood:** Low

Unknown total data volume in legacy system. Large tables may require batch migration strategy.

**Mitigation:**
- [ ] Query legacy DB for row counts
- [ ] Identify largest tables
- [ ] Plan batch migration if needed

**Owner:** TBD | **Due:** Before migration sprint

---

## Resolved Risks

### 2026-02-03
- **Primary Key Strategy:** Resolved - chose BIGSERIAL (simpler, better performance)
- **Schema Design Approach:** Resolved - anime portal only, no WCF tables

### 2026-02-02
- **Go Framework Selection:** Resolved - chose Gin (most popular, best documentation)
- **Database Infrastructure:** Resolved - Docker Compose with PostgreSQL 16 + Redis 7

---

## Pending Decisions (May Become Risks)

### Database Migration Tool
**Options:** golang-migrate vs goose vs Atlas
**Impact if delayed:** Manual schema changes become error-prone
**Recommendation:** golang-migrate (good Go integration, simple workflow)
**Decision needed by:** Before second schema change

### Media File Storage
**Options:** Local filesystem vs S3-compatible storage
**Impact if delayed:** May need to redesign download system later
**Decision needed by:** Before P1 features (download functionality)

### API Documentation
**Options:** OpenAPI/Swagger vs manual documentation
**Impact if delayed:** Frontend development slowed by unclear API contracts
**Decision needed by:** Before frontend sprint

---

## If Nothing Changes...
**What will fail next week?**

If we don't:
1. **Install WSL2** - Cannot develop any features requiring database
2. **Verify database schema** - Cannot build API endpoints
3. **Test user authentication flow** - Cannot implement login

**Critical path:** WSL2 -> Docker -> PostgreSQL -> API Development

All database-dependent work is blocked until WSL2 is installed.
