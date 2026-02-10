# Team4s.v3.0 - Risks and Blockers

## Current Blockers

### BLOCKER: User Migration Not Complete
**Status:** BLOCKING legacy user attribution | **Since:** 2026-02-03
**Impact:** Medium (new users can register, legacy users cannot login)

Legacy WCF users have not been migrated. All user_id references in migrated data currently point to user_id=1 (admin).

**Affected Tables:**
- comments.user_id
- ratings.user_id
- watchlist.user_id

**Workaround:** New users can register and use all features. Legacy user attribution is lost until migration.

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

### 1. Production Email Service Not Configured
**Impact:** High | **Likelihood:** Certain (when going to production)
**Added:** 2026-02-09

Console email service works for development but cannot send real emails in production.

**Affected Features:**
- Email verification
- Password reset (future)
- Notifications (future)

**Mitigation:**
- [x] EmailService interface defined
- [x] Console implementation for development
- [ ] Create SendGrid implementation
- [ ] Configure production environment variables
- [ ] Test email delivery before production

**Owner:** D1skanime | **Due:** Before production deployment

---

### 2. Password Migration Complexity
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

### 3. Stream Links Parsing
**Impact:** Medium | **Likelihood:** High

Legacy stream links are stored as HTML in `stream_links_legacy` column. Episode Detail currently cannot display structured stream links.

**Current State:**
- Episode Detail shows FansubProgress but no actual stream links
- HTML contains `<a href="...">` tags that need parsing

**Mitigation:**
- [ ] Analyze HTML structure in legacy data
- [ ] Create parser for stream link extraction
- [ ] Store structured data in new format
- [ ] Update Episode Detail to display links

**Owner:** D1skanime | **Due:** Before Episode Detail is fully functional

---

## Medium-Priority Risks

### 4. Data Integrity - Orphaned References
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

### 5. StarRating clipPath ID Collision
**Impact:** Low | **Likelihood:** Medium

StarRating component uses static IDs (`star-clip-1`, `star-clip-2`, etc.) for SVG clipPath definitions. If multiple StarRating instances are on the same page, IDs may collide.

**Current State:**
- Works on Anime Detail (single rating display)
- May break on list views with ratings

**Mitigation:**
- [ ] Generate unique IDs per component instance (useId hook)
- [ ] Test with multiple ratings on one page

**Owner:** D1skanime | **Due:** P4 or when adding rating to list views

---

### 6. Comment Threading Display
**Impact:** Low | **Likelihood:** Certain
**Added:** 2026-02-09

Backend supports reply_to_id for threaded comments, but frontend shows comments in a flat list.

**Current State:**
- Comments API supports reply_to_id
- Frontend ignores threading
- All comments appear at same level

**Mitigation:**
- [ ] Implement nested comment display
- [ ] Add "Reply" button to comments
- [ ] Consider thread depth limit (3 levels?)

**Owner:** D1skanime | **Due:** P4 enhancement

---

### 7. Cover Upload Not Implemented
**Impact:** Medium | **Likelihood:** Certain
**Added:** 2026-02-10

Admin anime CRUD lacks cover image upload functionality.

**Current State:**
- AnimeEditor form does not include file upload
- Covers must be added manually to filesystem
- No image validation or processing

**Mitigation:**
- [ ] Add file upload input to AnimeEditor
- [ ] Create upload endpoint in backend
- [ ] Implement image validation (type, size)
- [ ] Add image preview before save
- [ ] Store in covers/ directory with proper naming

**Owner:** D1skanime | **Due:** P4-1 or as enhancement

---

## Resolved Risks

### 2026-02-10
- **P3 Admin Features:** RESOLVED - All 3 features complete (Role, Dashboard, Anime CRUD)

### 2026-02-09
- **Rate Limiting:** RESOLVED - Redis sliding window implemented for auth endpoints
- **Email Verification:** RESOLVED - Token-based verification with Redis storage
- **Watchlist Sync:** RESOLVED - Backend API with localStorage migration
- **User Ratings:** RESOLVED - Full CRUD with RatingInput component
- **Comments System:** RESOLVED - Full CRUD with soft delete

### 2026-02-06
- **P1 Feature Scope:** Resolved - All 6 P1 features completed
- **Filter URL State:** Resolved - useSearchParams working correctly
- **Related Anime Display:** Resolved - Horizontal scroll with badges

### 2026-02-05
- **Frontend Framework:** Resolved - Next.js 14 with App Router working
- **CSS Strategy:** Resolved - CSS Modules chosen over Tailwind
- **Cover Migration:** Resolved - 2.386 images successfully migrated
- **API Design:** Resolved - RESTful endpoints with pagination working

### 2026-02-03
- **WSL2 Blocker:** Resolved - installed via wsl --install after BIOS changes
- **VARCHAR Overflow:** Resolved - changed to TEXT for HTML content fields
- **Migration Import Errors:** Resolved - used ON CONFLICT DO NOTHING
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

### API Documentation
**Options:** OpenAPI/Swagger vs manual documentation
**Impact if delayed:** External API consumers have no reference
**Decision needed by:** Before public API release

### Anime Deletion Strategy
**Options:** Hard delete vs Soft delete
**Impact if delayed:** Inconsistent data handling
**Recommendation:** Soft delete (preserve history, easier undo)
**Decision needed by:** Before admin anime deletion is used extensively

---

## If Nothing Changes...
**What will fail next week?**

If we don't:
1. **Configure production email** - Cannot deploy with email verification
2. **Implement episode management** - Admin cannot manage episode content
3. **Add cover upload** - New anime entries have no cover images
4. **Test user migration** - Cannot restore legacy user accounts

**Critical path for next week:** Episode Management -> Cover Upload -> User Management

P3 complete - continue with P4 Content Management.
