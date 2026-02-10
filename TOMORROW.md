# Tomorrow's Plan - 2026-02-11

## Top 3 Priorities

### 1. P4-1: Episode Management (CRUD)
Implement admin interface for managing episodes.

**Backend:**
```go
// Admin episode endpoints
GET    /api/v1/admin/episodes           - List all episodes (paginated, filterable)
GET    /api/v1/admin/episodes/:id       - Get episode details (admin view)
POST   /api/v1/admin/anime/:id/episodes - Create episode for anime
PUT    /api/v1/admin/episodes/:id       - Update episode
DELETE /api/v1/admin/episodes/:id       - Delete episode
```

**Frontend:**
- `/admin/episodes` - Episode listing with filters (anime, status)
- `/admin/episodes/:id` - Episode editor page
- EpisodeEditor component with form fields
- FansubProgress editor (10 sliders for process tracking)

**Tasks:**
1. Add Episode CRUD methods to repository
2. Create AdminEpisodeHandler
3. Add routes to admin group
4. Create EpisodeEditor component
5. Create episode management page
6. Add to admin navigation

---

### 2. P4-2: Cover Upload
Add cover image upload to anime management.

**Backend:**
```go
// File upload endpoint
POST /api/v1/admin/anime/:id/cover - Upload cover image

// Implementation
- Accept multipart/form-data
- Validate file type (jpg, png, webp)
- Validate file size (max 5MB)
- Generate filename (anime_id.ext)
- Save to covers/ directory
- Return new cover URL
```

**Frontend:**
- Add file input to AnimeEditor
- Image preview before upload
- Progress indicator
- Replace existing cover option

**Tasks:**
1. Create upload handler in backend
2. Add file validation (type, size)
3. Implement file storage
4. Add file input to AnimeEditor
5. Create ImageUpload component
6. Add preview functionality

---

### 3. P4-3: User Management (Admin)
Admin interface for viewing and managing users.

**Backend:**
```go
// Admin user endpoints
GET    /api/v1/admin/users            - List users (paginated, searchable)
GET    /api/v1/admin/users/:id        - User details (admin view)
PUT    /api/v1/admin/users/:id        - Update user (ban, role change)
DELETE /api/v1/admin/users/:id        - Delete user (soft delete)
POST   /api/v1/admin/users/:id/roles  - Add role to user
DELETE /api/v1/admin/users/:id/roles/:role - Remove role
```

**Frontend:**
- `/admin/users` - User listing with search
- `/admin/users/:id` - User detail/edit page
- Ban/unban toggle
- Role management dropdown
- Activity summary

**Tasks:**
1. Add user management methods to repository
2. Create AdminUserHandler
3. Add routes to admin group
4. Create UserManagement page
5. Create UserEditor component
6. Add role management UI

---

## First 15-Minute Task

**Create Episode CRUD repository methods:**

1. Open `backend/internal/repository/episode.go` (create if not exists)
2. Add these methods:
```go
func (r *EpisodeRepository) Create(ctx context.Context, episode *models.CreateEpisodeRequest) (int64, error)
func (r *EpisodeRepository) Update(ctx context.Context, id int64, episode *models.UpdateEpisodeRequest) error
func (r *EpisodeRepository) Delete(ctx context.Context, id int64) error
func (r *EpisodeRepository) ListForAdmin(ctx context.Context, filter EpisodeFilter) ([]Episode, int64, error)
```

3. Wire up in `cmd/server/main.go`

---

## Dependencies to Unblock Early

1. **Admin middleware working**
   - Already implemented (2026-02-10)
   - AdminRequired() in middleware/admin.go

2. **Episode model exists**
   - Episode struct in models/episode.go
   - Need to add CreateEpisodeRequest, UpdateEpisodeRequest

3. **Docker running**
   ```bash
   docker ps
   # Shows: postgres, redis, adminer
   ```

4. **Test admin user**
   - user_id=1 has admin role
   - Can test with existing token

---

## If Ahead of Schedule

### Stream Links Parser
- Analyze legacy HTML format
- Create Go parser for stream links
- Store structured data
- Update Episode model

### Moderation Tools
- GET /api/v1/admin/comments - All comments (for moderation)
- DELETE /api/v1/admin/comments/:id - Delete any comment
- Comment flagging system
- Moderation queue page

### Audit Logging
- Log admin actions (create, update, delete)
- admin_audit_log table
- View action history

---

## Verification Checklist

After completing priorities:
- [ ] Admin can list all episodes
- [ ] Admin can create new episode
- [ ] Admin can edit episode details
- [ ] Admin can update fansub progress
- [ ] Admin can delete episode
- [ ] Cover upload works
- [ ] Image preview displays correctly
- [ ] Admin can list all users
- [ ] Admin can ban/unban users
- [ ] Admin can manage user roles

---

## P4 Feature Roadmap (Reference)

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| P4-1 | Episode Management | HIGH | TODO |
| P4-2 | Cover Upload | HIGH | TODO |
| P4-3 | User Management | MEDIUM | TODO |
| P4-4 | Stream Links Parser | MEDIUM | TODO |
| P4-5 | Moderation Tools | LOW | TODO |
| P4-6 | Audit Logging | LOW | TODO |

---

## Technical Notes

### Episode Create Query
```sql
INSERT INTO episodes (
    anime_id, episode_number, title, title_de, title_en,
    status, duration, raw_proc, translate_proc, time_proc,
    typeset_proc, logo_proc, edit_proc, karatime_proc,
    karafx_proc, qc_proc, encode_proc, stream_links_legacy, filename
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
RETURNING id;
```

### File Upload Handler Pattern
```go
func (h *AdminHandler) UploadCover(c *gin.Context) {
    animeID := c.Param("id")
    file, err := c.FormFile("cover")
    if err != nil {
        c.JSON(400, gin.H{"error": "no file uploaded"})
        return
    }

    // Validate file type
    ext := filepath.Ext(file.Filename)
    if ext != ".jpg" && ext != ".png" && ext != ".webp" {
        c.JSON(400, gin.H{"error": "invalid file type"})
        return
    }

    // Validate size (5MB max)
    if file.Size > 5*1024*1024 {
        c.JSON(400, gin.H{"error": "file too large"})
        return
    }

    // Save file
    filename := fmt.Sprintf("%s%s", animeID, ext)
    path := filepath.Join("covers", filename)
    if err := c.SaveUploadedFile(file, path); err != nil {
        c.JSON(500, gin.H{"error": "failed to save file"})
        return
    }

    c.JSON(200, gin.H{"cover_url": "/covers/" + filename})
}
```

### Admin Routes Structure (Extended)
```
/api/v1/admin/
  # Dashboard
  GET  /stats              - Dashboard statistics
  GET  /activity           - Recent activity

  # Anime Management (existing)
  GET  /anime              - List anime (paginated, all statuses)
  POST /anime              - Create anime
  GET  /anime/:id          - Anime details (admin view)
  PUT  /anime/:id          - Update anime
  DELETE /anime/:id        - Delete anime
  POST /anime/:id/cover    - Upload cover (NEW)

  # Episode Management (NEW)
  GET  /episodes           - List all episodes
  GET  /episodes/:id       - Episode details
  POST /anime/:id/episodes - Create episode for anime
  PUT  /episodes/:id       - Update episode
  DELETE /episodes/:id     - Delete episode

  # User Management (NEW)
  GET  /users              - List users
  GET  /users/:id          - User details
  PUT  /users/:id          - Update user
  DELETE /users/:id        - Delete user
  POST /users/:id/roles    - Add role
  DELETE /users/:id/roles/:role - Remove role

  # Moderation (future)
  GET  /comments           - All comments (for moderation)
  DELETE /comments/:id     - Delete any comment
```

---

## Context from P3 Completion

**Completed yesterday (2026-02-10):**
- P3-1: Admin Role & Middleware (AdminRequired, HasRole)
- P3-2: Admin Dashboard (stats, activity)
- P3-3: Anime Management (CRUD + AnimeEditor)

**Ready for P4:**
- Admin system fully functional
- Role-based access working
- Dashboard provides overview
- Anime CRUD as template for Episode CRUD

---

## Questions to Resolve

1. **Episode soft delete or hard delete?**
   - Option A: Hard delete (remove from database)
   - Option B: Soft delete (is_deleted flag)
   - Recommendation: Hard delete (episodes less critical than anime)

2. **Fansub progress update API?**
   - Option A: Full episode update (PUT /episodes/:id)
   - Option B: Dedicated progress endpoint (PATCH /episodes/:id/progress)
   - Recommendation: Full episode update (simpler, fewer endpoints)

3. **Cover filename strategy?**
   - Option A: anime_id.ext (1234.jpg)
   - Option B: anime_id_timestamp.ext (1234_1707580800.jpg)
   - Recommendation: Option A (simpler, overwrites old covers)
