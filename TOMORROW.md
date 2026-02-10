# Tomorrow's Plan - 2026-02-11

## Top 3 Priorities

### 1. End-to-End QA Testing of P4 Features
Verify all new admin features work correctly before moving forward.

**Episode Management Testing:**
- [ ] Create new episode for existing anime
- [ ] Edit episode metadata (title, status, duration)
- [ ] Update fansub progress (all 10 fields)
- [ ] Delete episode and verify removal
- [ ] Test pagination and filtering in episode list
- [ ] Verify episodes display correctly on anime detail page

**Cover Upload Testing:**
- [ ] Upload new cover via CoverUpload component
- [ ] Verify file validation (type, size)
- [ ] Check image preview before save
- [ ] Verify cover displays after upload
- [ ] Test cover replacement for existing anime
- [ ] Delete cover and verify removal

**User Management Testing:**
- [ ] List all users with search/filter
- [ ] View user details
- [ ] Edit user profile (display name, bio)
- [ ] Ban/unban user
- [ ] Add role to user
- [ ] Remove role from user
- [ ] Delete user (verify cascade behavior)

---

### 2. P5-1: Stream Links Parser (Optional)
If QA testing completes successfully, begin stream links parser.

**Analyze Legacy Data:**
```sql
-- Sample stream links HTML
SELECT id, anime_id, stream_links_legacy
FROM episodes
WHERE stream_links_legacy IS NOT NULL
  AND stream_links_legacy != ''
LIMIT 10;
```

**Expected HTML Structure:**
```html
<a href="https://example.com/stream1">HD 1080p</a>
<a href="https://example.com/stream2">SD 720p</a>
```

**Parser Implementation:**
1. Create `internal/services/parser.go`
2. Use Go's html package for parsing
3. Extract href and link text
4. Store in structured format (JSON array or new table)

**Frontend Update:**
- Update Episode Detail to show parsed links
- Display as clickable buttons/links

---

### 3. Production Prep Checklist
Begin preparing for production deployment.

**Environment:**
- [ ] Create production `.env.example`
- [ ] Document required environment variables
- [ ] Set up separate production database credentials

**Security:**
- [ ] Review CORS settings for production
- [ ] Ensure JWT secret is production-grade (not dev default)
- [ ] Verify rate limiting is appropriate

**Email Service:**
- [ ] Research SendGrid pricing/setup
- [ ] Create SendGrid account (or alternative)
- [ ] Implement SendGridEmailService

---

## First 15-Minute Task

**Test Episode Creation Flow:**

1. Start backend and frontend
2. Login as admin (admin / admin123)
3. Navigate to `/admin/episodes`
4. Click "Create Episode"
5. Select an anime from dropdown
6. Fill in episode number, title, status
7. Set some progress values
8. Submit and verify creation
9. Check episode appears in list
10. Navigate to anime detail and verify episode shows

This tests the full E2E flow for the most critical P4 feature.

---

## Dependencies to Unblock Early

1. **Docker running**
   ```bash
   docker ps
   # Shows: postgres, redis, adminer
   ```

2. **Backend compiles**
   ```bash
   cd backend && go build ./cmd/server
   ```

3. **Frontend builds**
   ```bash
   cd frontend && npm run build
   ```

4. **Admin user exists**
   - user_id=1 has admin role
   - Login: admin / admin123

---

## If Ahead of Schedule

### Comment Threading Display
- Fetch comments with reply_to_id relationships
- Build nested comment structure in frontend
- Add "Reply" button to each comment
- Implement nested display with indentation
- Consider max depth limit (3 levels)

### Moderation Tools
- GET /api/v1/admin/comments - All comments (for moderation)
- DELETE /api/v1/admin/comments/:id - Delete any comment
- Comment flagging system
- Moderation queue page

### Audit Logging
- Create admin_audit_log table
- Log admin actions (create, update, delete)
- View action history in admin dashboard

---

## Verification Checklist

After completing priorities:

**QA Testing:**
- [ ] Episode CRUD works end-to-end
- [ ] Cover upload works with preview
- [ ] User management works with role control
- [ ] No console errors in browser
- [ ] No server errors in backend logs

**Production Prep:**
- [ ] Production env file documented
- [ ] Security settings reviewed
- [ ] Email service plan identified

---

## Technical Notes

### Test Data for Episode Creation
```json
{
  "anime_id": 1,
  "episode_number": 999,
  "title": "Test Episode",
  "title_de": "Test Folge",
  "title_en": "Test Episode",
  "status": "private",
  "duration": 24,
  "raw_proc": 100,
  "translate_proc": 50,
  "time_proc": 0,
  "typeset_proc": 0,
  "logo_proc": 0,
  "edit_proc": 0,
  "karatime_proc": 0,
  "karafx_proc": 0,
  "qc_proc": 0,
  "encode_proc": 0
}
```

### Stream Links Parser Pseudocode
```go
import "golang.org/x/net/html"

type StreamLink struct {
    URL   string `json:"url"`
    Label string `json:"label"`
}

func ParseStreamLinks(htmlContent string) ([]StreamLink, error) {
    doc, _ := html.Parse(strings.NewReader(htmlContent))
    var links []StreamLink

    var f func(*html.Node)
    f = func(n *html.Node) {
        if n.Type == html.ElementNode && n.Data == "a" {
            var link StreamLink
            for _, attr := range n.Attr {
                if attr.Key == "href" {
                    link.URL = attr.Val
                }
            }
            if n.FirstChild != nil {
                link.Label = n.FirstChild.Data
            }
            links = append(links, link)
        }
        for c := n.FirstChild; c != nil; c = c.NextSibling {
            f(c)
        }
    }
    f(doc)

    return links, nil
}
```

### Production Environment Variables
```bash
# Production .env template
DATABASE_URL=postgres://user:pass@host:5432/team4s?sslmode=require
REDIS_URL=redis://user:pass@host:6379
JWT_SECRET=<generate-32-byte-random-hex>
CORS_ORIGIN=https://team4s.example.com
SENDGRID_API_KEY=<sendgrid-api-key>
FROM_EMAIL=noreply@team4s.example.com
```

---

## Context from P4 Completion

**Completed yesterday (2026-02-10):**
- P4-1: Episode Management (CRUD endpoints, EpisodeEditor, admin/episodes page)
- P4-2: Cover Upload (Upload service, file validation, CoverUpload component)
- P4-3: User Management (6 admin endpoints, full management UI)
- Fixed anime_status enum mismatch
- Added missing database columns

**Ready for QA:**
- All P0-P4 features implemented
- Admin system fully functional
- ~95% MVP complete

---

## Questions Resolved

1. **Episode soft delete or hard delete?**
   - Answer: Hard delete (simpler, episodes less critical)

2. **Fansub progress update API?**
   - Answer: Full episode update via PUT (simpler API)

3. **Cover filename strategy?**
   - Answer: UUID-based (prevents cache issues)
