# Team4s.v3.0 - Risks and Blockers

## Current Blockers

### BLOCKER: User Migration Not Complete
**Status:** BLOCKING social features | **Since:** 2026-02-03
**Impact:** Medium (core anime data works, social features incomplete)

Legacy WCF users have not been migrated. All user_id references in migrated data currently point to user_id=1 (admin).

**Affected Tables:**
- comments.user_id
- ratings.user_id
- watchlist.user_id

**Workaround:** Data is accessible, but user attribution is lost until migration.

**Resolution:**
1. Extract user data from WCF tables in MySQL dump
2. Map WCF user IDs to new user IDs
3. Update references in migrated tables
4. Re-enable FK constraints

**Owner:** D1skanime | **Due:** Before social features go live

---

### BLOCKER: FK Constraints Disabled
**Status:** Technical debt | **Since:** 2026-02-03
**Impact:** Low (dev only, no production risk yet)

Foreign key constraints were disabled to allow bulk import without user table populated.

**Constraints disabled:**
- episodes.anime_id -> anime.id
- comments.anime_id -> anime.id
- comments.user_id -> users.id
- ratings.anime_id -> anime.id
- ratings.user_id -> users.id
- watchlist.anime_id -> anime.id
- watchlist.user_id -> users.id
- anime_relations.anime_id -> anime.id
- anime_relations.related_anime_id -> anime.id

**Resolution:** Re-enable after user migration with:
```sql
ALTER TABLE episodes ADD CONSTRAINT episodes_anime_id_fkey FOREIGN KEY (anime_id) REFERENCES anime(id);
-- etc.
```

**Owner:** D1skanime | **Due:** After user migration

---

## Resolved Blockers

### 2026-02-03: WSL2 Not Installed - RESOLVED
**Was:** Docker Desktop could not start due to missing WSL2
**Resolution:** Enabled virtualization in BIOS, ran `wsl --install`, restarted
**Result:** Docker Desktop now running successfully

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

### 2. Media File Migration
**Impact:** High | **Likelihood:** Medium

Legacy system has anime covers and download files stored locally. Need strategy for:
- Cover images - DONE (2.386 migriert)
- Fansub logos - DONE (105 migriert)
- Download files (unknown count/size)
- Stream links (stored as legacy HTML)

**Mitigation:**
- [x] Audit current file storage location and size
- [x] Migrate cover images to frontend/public/covers/
- [x] Migrate fansub logos to frontend/public/groups/
- [ ] Decide storage strategy for downloads (local vs S3-compatible)
- [ ] Parse stream_links_legacy into structured format

**Owner:** D1skanime | **Due:** Before P1 episode detail feature

---

### 3. Data Integrity - Orphaned References
**Impact:** Medium | **Likelihood:** Low

Some migrated records may reference anime/episodes that were deleted in legacy system.

**Potential issues:**
- Episodes referencing non-existent anime
- Comments on deleted content
- Watchlist entries for removed anime

**Mitigation:**
- [ ] Run integrity checks after re-enabling FK constraints
- [ ] Handle orphaned records (delete or archive)
- [ ] Add ON DELETE CASCADE where appropriate

**Owner:** TBD | **Due:** Before production

---

## Resolved Risks

### 2026-02-03
- **WSL2 Blocker:** Resolved - installed via wsl --install after BIOS changes
- **VARCHAR Overflow:** Resolved - changed to TEXT for HTML content fields
- **Migration Import Errors:** Resolved - used ON CONFLICT DO NOTHING

### 2026-02-03 (Morning)
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
**Impact if delayed:** External API consumers have no reference
**Decision needed by:** Before public API release

---

## Resolved Risks (2026-02-05)
- **Frontend Framework:** Resolved - Next.js 14 with App Router working
- **CSS Strategy:** Resolved - CSS Modules chosen over Tailwind
- **Cover Migration:** Resolved - 2.386 images successfully migrated
- **API Design:** Resolved - RESTful endpoints with pagination working

---

## If Nothing Changes...
**What will fail next week?**

If we don't:
1. **Implement Search** - Users cannot find specific anime
2. **Plan user migration** - Social features will have wrong attribution
3. **Parse stream links** - Episode detail pages will be incomplete

**Critical path:** Search -> Filters -> Auth -> Social Features

P0 is complete - P1 features are now the priority.
