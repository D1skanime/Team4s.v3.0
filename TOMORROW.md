# Tomorrow's Plan - 2026-02-14

**Context:** P4 QA Testing completed with all critical bugs fixed. MVP at 97%. Ready for security hardening and production prep.

---

## Top 3 Priorities

### 1. Security Fixes (From QA Report)
Address security issues identified during testing.

**Task 1.1: Rate Limiting for Upload Endpoints**
- Add rate limiter middleware to `/api/v1/admin/upload/cover`
- Limit: 10 uploads per minute per admin
- Test with rapid uploads to verify blocking

**Task 1.2: Stream Link URL Validation**
- Add validation in EpisodeEditor.tsx
- Enforce https:// protocol
- Filter out invalid URLs before submit
- Add backend validation as well

**Task 1.3: Duplicate Episode Number Check**
- Add repository-level check before episode creation
- Prevent duplicate episode numbers for same anime
- Return 409 Conflict with clear error message

---

### 2. Schema Migration File
Create proper migration file for all schema changes applied during QA.

**Task 2.1: Document Schema Changes**
- Create migration file 008_add_missing_columns.sql
- Include all ALTER TABLE statements from QA session
- Add comments explaining each change

**Task 2.2: Test on Clean Database**
- Spin up fresh PostgreSQL container
- Run all migrations 001-008 in sequence
- Verify schema matches dev database
- Test data import on clean schema

---

### 3. Production Environment Documentation
Document all configuration needed for production deployment.

**Task 3.1: Environment Variables**
- Create `.env.production.example`
- Document all required variables
- Add security notes (JWT secret, etc.)

**Task 3.2: Email Service Research**
- Compare SendGrid vs AWS SES vs Mailgun
- Check pricing for expected volume
- Document setup steps for chosen provider

**Task 3.3: Deployment Checklist**
- List pre-deployment tasks
- Database setup steps
- Security hardening checklist
- Post-deployment verification

---

## First 15-Minute Task

**Implement Rate Limiting for Upload Endpoint**

1. Open `backend/cmd/server/main.go`
2. Find admin upload routes (around line 274-282):
   ```go
   admin.POST("/upload/cover", uploadHandler.UploadCover)
   ```
3. Add rate limiter middleware:
   ```go
   admin.POST("/upload/cover", rateLimiter.Limit("10/m"), uploadHandler.UploadCover)
   ```
4. Test by uploading 11 covers rapidly
5. Verify 429 Too Many Requests after 10th upload
6. Check error message is user-friendly

**Expected Result:** Upload endpoint protected from spam

---

## Dependencies to Unblock Early

1. **Docker running**
   ```bash
   docker ps
   # Should show: postgres, redis, adminer
   ```

2. **Backend compiles**
   ```bash
   cd backend && go run cmd/server/main.go
   # Server starts on :8090
   ```

3. **Frontend running**
   ```bash
   cd frontend && npm run dev
   # App runs on :3001
   ```

4. **Admin user exists and verified**
   - Username: admin
   - Password: admin123
   - Email verified: true
   - Has admin role

---

## Nice-to-Have (If Ahead of Schedule)

### Admin Audit Logging
- Create admin_audit_log table
- Log all admin actions (create, update, delete)
- Store: action, user_id, target_id, timestamp, IP
- Add middleware to log after successful operations
- Create audit log viewer in admin dashboard

### Related Data Impact in Delete Dialogs
- Fetch counts before showing delete dialog
- Display: "This will affect X comments, Y ratings, Z watchlist entries"
- Show warning for high-impact deletes
- Allow user to confirm with full knowledge

### "No Results" States
- Add to anime search in EpisodeEditor
- Add to user search in admin/users
- Show friendly message instead of empty list
- Include suggestion (e.g., "Try different search terms")

---

## Verification Checklist

After completing priorities:

**Security:**
- [ ] Upload endpoint returns 429 after rate limit
- [ ] Invalid stream links rejected in frontend
- [ ] Invalid stream links rejected in backend
- [ ] Duplicate episode numbers prevented

**Schema:**
- [ ] Migration file 008 created
- [ ] Clean database test passes
- [ ] All migrations run without errors
- [ ] Schema matches dev database structure

**Documentation:**
- [ ] .env.production.example created
- [ ] All variables documented with descriptions
- [ ] Email service provider chosen
- [ ] Deployment checklist complete

---

## Technical Notes

### Rate Limiter Implementation
```go
// Already exists in codebase (used for auth endpoints)
// Just need to apply to upload routes

rateLimiter.Limit("10/m") // 10 requests per minute
rateLimiter.Limit("10/m|100/h") // 10/min AND 100/hour
```

### Stream Link Validation
```typescript
// Frontend validation in EpisodeEditor.tsx
const validateStreamLinks = (links: string[]): string[] => {
  return links
    .map(link => link.trim())
    .filter(link => {
      if (!link) return false;
      try {
        const url = new URL(link);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    });
};
```

### Duplicate Episode Check
```go
// Backend repository method
func (r *EpisodeRepository) EpisodeExists(ctx context.Context, animeID int64, episodeNumber string) (bool, error) {
    query := `
        SELECT EXISTS(
            SELECT 1 FROM episodes
            WHERE anime_id = $1 AND episode_number = $2
        )
    `
    var exists bool
    err := r.pool.QueryRow(ctx, query, animeID, episodeNumber).Scan(&exists)
    return exists, err
}

// In CreateEpisode handler
exists, err := repo.EpisodeExists(ctx, req.AnimeID, req.EpisodeNumber)
if err != nil {
    return err
}
if exists {
    return c.JSON(409, gin.H{"error": "episode already exists for this anime"})
}
```

---

## Migration File Template

```sql
-- 008_add_missing_columns.sql
-- Date: 2026-02-13
-- Description: Add columns that were missing from initial schema

BEGIN;

-- Episodes table additions
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS filename VARCHAR(255);
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS stream_links TEXT;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS raw_proc INT NOT NULL DEFAULT 0;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS translate_proc INT NOT NULL DEFAULT 0;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS time_proc INT NOT NULL DEFAULT 0;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS typeset_proc INT NOT NULL DEFAULT 0;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS logo_proc INT NOT NULL DEFAULT 0;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS edit_proc INT NOT NULL DEFAULT 0;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS karatime_proc INT NOT NULL DEFAULT 0;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS karafx_proc INT NOT NULL DEFAULT 0;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS qc_proc INT NOT NULL DEFAULT 0;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS encode_proc INT NOT NULL DEFAULT 0;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS legacy_episode_id INT;

-- Anime table additions
ALTER TABLE anime ADD COLUMN IF NOT EXISTS anisearch_id VARCHAR(50);
ALTER TABLE anime ADD COLUMN IF NOT EXISTS source VARCHAR(100);
ALTER TABLE anime ADD COLUMN IF NOT EXISTS sub_comment TEXT;
ALTER TABLE anime ADD COLUMN IF NOT EXISTS stream_comment TEXT;
ALTER TABLE anime ADD COLUMN IF NOT EXISTS is_self_subbed BOOLEAN DEFAULT false;
ALTER TABLE anime ADD COLUMN IF NOT EXISTS folder_name VARCHAR(255);
ALTER TABLE anime ADD COLUMN IF NOT EXISTS legacy_anime_id INT;

-- Comments table addition
ALTER TABLE comments ADD COLUMN IF NOT EXISTS user_id BIGINT;

COMMIT;
```

---

## Production .env Template

```bash
# Database Configuration
DATABASE_URL=postgres://team4s:CHANGE_ME@postgres.production:5432/team4s?sslmode=require
DATABASE_MAX_CONNS=20
DATABASE_MIN_CONNS=5

# Redis Configuration
REDIS_URL=redis://:CHANGE_ME@redis.production:6379
REDIS_MAX_CONNS=10

# Security
JWT_SECRET=GENERATE_32_BYTE_HEX_STRING_HERE
BCRYPT_COST=12

# Server
PORT=8080
GIN_MODE=release
CORS_ORIGIN=https://team4s.yourdomain.com

# Email Service
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=YOUR_SENDGRID_API_KEY
FROM_EMAIL=noreply@team4s.yourdomain.com
FRONTEND_URL=https://team4s.yourdomain.com

# Upload Configuration
UPLOAD_MAX_SIZE=5242880
UPLOAD_DIR=/var/uploads/covers
```

---

## Email Service Comparison

### SendGrid
- Pricing: Free up to 100 emails/day, $19.95/mo for 40K emails
- Pros: Easy setup, good documentation, reliable
- Cons: More expensive at scale
- Setup: API key + verification

### AWS SES
- Pricing: $0.10 per 1,000 emails (cheapest)
- Pros: Cheapest, integrates with AWS
- Cons: Requires AWS account, sandbox mode initially
- Setup: IAM credentials + domain verification

### Mailgun
- Pricing: Free up to 5,000 emails/month, $35/mo for 50K
- Pros: Good API, reliable, developer-friendly
- Cons: Mid-range pricing
- Setup: API key + domain verification

**Recommendation:** SendGrid for simplicity, AWS SES if already on AWS

---

## Context from Yesterday

### Completed (2026-02-13)
- QA Testing of all P4 features
- Fixed 4 High severity bugs
- Fixed 1 Medium severity bug
- Documented 7 additional bugs for future fixes
- All admin workflows now fully functional
- MVP progress: 97% complete

### Bugs Fixed
1. Cover display in Edit Dialog (URL construction)
2. Missing database columns (episodes, anime, comments)
3. Missing database tables (ratings, watchlist)
4. Data migration not executed (30K episodes)

### Remaining Bugs (Priority Order)
1. Rate limiting on uploads (P1 - Security)
2. Stream link validation (P1 - Security)
3. Duplicate episode check (P1 - Data Integrity)
4. Delete impact warnings (P2 - UX)
5. No results states (P2 - UX)
6. Admin audit logging (P3 - Observability)
7. Optimistic UI for deletes (P3 - UX)

---

## Questions to Answer

### Q1: Which email service should we use?
**Options:** SendGrid, AWS SES, Mailgun
**Decision needed:** Tomorrow (for documentation)
**Factors:** Cost, ease of setup, reliability

### Q2: Should we add UNIQUE constraint for episode numbers?
**Options:**
1. Database constraint: `UNIQUE(anime_id, episode_number)`
2. Repository-level check only
3. Both (belt and suspenders)

**Recommendation:** Both - constraint for data integrity, check for better error message

### Q3: Should we implement optimistic UI for deletes?
**Trade-offs:**
- Pro: Faster perceived performance
- Con: Need rollback logic if delete fails
- Con: More complex state management

**Recommendation:** Defer to P5 (nice-to-have, not critical)

---

## Session Goals

### Must Complete
1. Rate limiting on upload endpoint
2. Stream link validation (frontend + backend)
3. Duplicate episode check
4. Schema migration file created

### Should Complete
5. Production .env.example documented
6. Email service provider chosen
7. Deployment checklist drafted

### Nice to Have
8. Admin audit logging
9. Delete impact warnings
10. "No results" states

---

## Success Criteria

By end of tomorrow:
- [ ] All P1 security issues resolved
- [ ] Schema migration file tested on clean DB
- [ ] Production deployment documented
- [ ] Ready to implement email service
- [ ] No blocking issues for production deployment

**Target MVP Progress:** 98%

---

**Generated:** 2026-02-13 (End of Day)
**For:** 2026-02-14 (Next Day)
**Session Type:** Security Hardening + Production Prep
