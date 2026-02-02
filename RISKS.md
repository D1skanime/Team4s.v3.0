# Team4s.v3.0 - Risks and Blockers

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

### 3. Docker Desktop Manual Start
**Impact:** Low | **Likelihood:** High

Docker Desktop on Windows does not auto-start by default. Development workflow requires manual Docker start after each system restart.

**Mitigation:**
- [ ] Consider adding Docker Desktop to Windows startup
- [ ] Document startup procedure in TOMORROW.md
- [x] Added reminder in tomorrow's first task

**Owner:** D1skanime | **Due:** Ongoing awareness

---

## Current Blockers
None - development environment is fully set up and ready.

## Resolved Risks (2026-02-02)
- **Go Framework Selection:** Resolved - chose Gin (most popular, best documentation)
- **Database Infrastructure:** Resolved - Docker Compose with PostgreSQL 16 + Redis 7

## Pending Decisions (May Become Risks)

### Primary Key Strategy
**Options:** UUID vs BIGSERIAL
**Impact if delayed:** Schema rework if we change minds later
**Recommendation:** BIGSERIAL for simplicity; UUIDs add complexity without clear benefit for this app
**Decision needed by:** Before creating schema (Day 2)

### Media File Storage
**Options:** Local filesystem vs S3-compatible storage
**Impact if delayed:** May need to redesign download system later
**Decision needed by:** Before P1 features (download functionality)

---

## If Nothing Changes...
**What will fail next week?**

If we don't:
1. **Verify Docker stack works** - Cannot develop any database features
2. **Create PostgreSQL schema** - Cannot implement any CRUD operations
3. **Decide on primary keys** - Risk rework if schema needs to change

**Action:** Complete Docker verification and schema design by end of Day 2 (2026-02-03).
