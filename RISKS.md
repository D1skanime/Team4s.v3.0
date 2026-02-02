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

### 3. Media File Storage Strategy
**Impact:** Medium | **Likelihood:** Low

Current system uses X-Sendfile for downloads with IP-based rate limiting. Need to decide:
- Keep files local with nginx?
- Move to S3-compatible storage?
- How to handle download tokens in new system?

**Mitigation:**
- [ ] Inventory current media storage size
- [ ] Evaluate hosting options and costs
- [ ] Design new download token system (JWT-based?)

**Owner:** TBD | **Due:** Before P1 features

---

## Current Blockers
None - project is in initialization phase.

## If Nothing Changes...
**What will fail next week?**

If we don't finalize the PostgreSQL schema design soon, we risk:
- Inconsistent data models between backend and frontend
- Rework when we discover missing relationships
- Delayed start on actual feature development

**Action:** Complete schema design by end of Day 2 (2026-02-03).
