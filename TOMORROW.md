# Tomorrow's Plan - 2026-02-10

## Top 3 Priorities

### 1. P3-1: Admin Role & Middleware
Implement role-based access control for admin features.

**Backend:**
```go
// middleware/admin.go
func AdminRequired() gin.HandlerFunc {
    return func(c *gin.Context) {
        userID := GetUserID(c)
        if !isAdmin(userID) {
            c.AbortWithStatusJSON(403, gin.H{"error": "admin access required"})
            return
        }
        c.Next()
    }
}

// repository/user.go
func (r *UserRepository) HasRole(ctx context.Context, userID int64, role string) (bool, error)
```

**Database:**
- Check existing roles table
- Ensure admin role exists
- Link admin user to admin role

**Tasks:**
1. Create AdminRequired middleware
2. Add HasRole method to UserRepository
3. Create admin user if not exists
4. Add role check to middleware
5. Test with protected endpoint

---

### 2. P3-2: Admin Dashboard Route
Create admin-only area with navigation.

**Backend:**
```go
// Admin routes group
admin := r.Group("/api/v1/admin")
admin.Use(middleware.AuthRequired(), middleware.AdminRequired())
{
    admin.GET("/stats", adminHandler.GetDashboardStats)
    admin.GET("/users", adminHandler.ListUsers)
    admin.GET("/anime", adminHandler.ListAnimeForAdmin)
}
```

**Frontend:**
- `/admin` - Dashboard with stats overview
- `/admin/users` - User management table
- `/admin/anime` - Anime management table
- Protected routes (redirect non-admin to 403)

**Tasks:**
1. Create admin routes in backend
2. Implement GetDashboardStats (counts, recent activity)
3. Create /admin page in frontend
4. Add AdminGuard component
5. Create AdminLayout with sidebar navigation

---

### 3. P3-3: Anime Management (CRUD)
Allow admins to create, update, and delete anime.

**Backend:**
```go
// Admin anime endpoints
POST   /api/v1/admin/anime         - Create anime
PUT    /api/v1/admin/anime/:id     - Update anime
DELETE /api/v1/admin/anime/:id     - Delete anime (soft delete?)
POST   /api/v1/admin/anime/:id/cover - Upload cover image
```

**Frontend:**
- AnimeEditor component (form for create/edit)
- Delete confirmation modal
- Cover upload with preview
- Status/Type enum selectors

**Tasks:**
1. Add CreateAnime, UpdateAnime, DeleteAnime to repository
2. Create AdminAnimeHandler with CRUD
3. Create AnimeEditor form component
4. Implement cover upload (local storage first)
5. Add to admin anime list page

---

## First 15-Minute Task

**Create AdminRequired middleware:**

1. Create `backend/internal/middleware/admin.go`:
```go
package middleware

import (
    "net/http"
    "github.com/gin-gonic/gin"
)

// AdminRequired checks if the authenticated user has admin role
func AdminRequired() gin.HandlerFunc {
    return func(c *gin.Context) {
        userID := GetUserID(c)
        if userID == 0 {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
            return
        }

        // TODO: Check admin role from database
        // For now, check if user_id == 1 (admin)
        if userID != 1 {
            c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "admin access required"})
            return
        }

        c.Next()
    }
}
```

2. Wire up in `cmd/server/main.go`
3. Test with `curl -H "Authorization: Bearer $TOKEN" /api/v1/admin/stats`

---

## Dependencies to Unblock Early

1. **Roles table exists**
   - users, roles, user_roles tables in schema
   - Need to verify data exists

2. **Admin user exists**
   - user_id=1 is admin
   - Check roles assignment

3. **Auth middleware working**
   - Already implemented
   - AdminRequired builds on AuthRequired

4. **Docker running**
   ```bash
   docker ps
   # Shows: postgres, redis, adminer
   ```

---

## If Ahead of Schedule

### Episode Management
- GET/POST/PUT/DELETE episodes
- Fansub progress editing
- Stream link management (parse legacy HTML)

### User Management
- List all users (admin)
- Ban/suspend user
- Edit user role
- Delete user (soft)

### Moderation Tools
- Flag comments for review
- Delete any comment (admin)
- View flagged content queue

---

## Verification Checklist

After completing priorities:
- [ ] Admin middleware blocks non-admin users
- [ ] Admin dashboard shows stats
- [ ] Admin can view user list
- [ ] Admin can create new anime
- [ ] Admin can edit existing anime
- [ ] Admin can delete anime (soft delete)
- [ ] Cover upload works

---

## P3 Feature Roadmap (Reference)

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| P3-1 | Admin Role & Middleware | HIGH | TODO |
| P3-2 | Admin Dashboard | HIGH | TODO |
| P3-3 | Anime Management | HIGH | TODO |
| P3-4 | Episode Management | MEDIUM | TODO |
| P3-5 | User Management | MEDIUM | TODO |
| P3-6 | Moderation Tools | LOW | TODO |

---

## Technical Notes

### Role Check Query
```sql
SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = $1 AND r.name = 'admin'
) AS is_admin;
```

### Dashboard Stats Query
```sql
-- User counts
SELECT COUNT(*) FROM users WHERE is_active = true;

-- Content counts
SELECT
    (SELECT COUNT(*) FROM anime) as anime_count,
    (SELECT COUNT(*) FROM episodes) as episode_count,
    (SELECT COUNT(*) FROM comments WHERE is_deleted = false) as comment_count,
    (SELECT COUNT(*) FROM ratings) as rating_count;

-- Recent activity
SELECT * FROM comments ORDER BY created_at DESC LIMIT 10;
SELECT * FROM ratings ORDER BY created_at DESC LIMIT 10;
```

### Admin Routes Structure
```
/api/v1/admin/
  GET  /stats              - Dashboard statistics
  GET  /users              - List users (paginated)
  GET  /users/:id          - User details
  PUT  /users/:id          - Update user
  DELETE /users/:id        - Delete user
  GET  /anime              - List anime (paginated, all statuses)
  POST /anime              - Create anime
  GET  /anime/:id          - Anime details (admin view)
  PUT  /anime/:id          - Update anime
  DELETE /anime/:id        - Delete anime
  GET  /comments           - All comments (for moderation)
  DELETE /comments/:id     - Delete any comment
```

---

## Context from P2 Completion

**Completed yesterday:**
- P2-3: User Ratings (RatingInput, backend CRUD)
- P2-4: Watchlist Sync (7 endpoints, hybrid mode)
- P2-5: Comments (CRUD, soft delete)
- Rate Limiting (Redis sliding window)
- Email Verification (tokens, console email)

**Ready for P3:**
- Auth system fully functional
- Role tables exist in database
- User system complete
- All user-facing features done

---

## Questions to Resolve

1. **Soft delete for anime?**
   - Option A: Hard delete (cascade episodes, ratings, etc.)
   - Option B: Soft delete (is_deleted flag, hide from users)
   - Recommendation: Soft delete (preserve history, easier undo)

2. **Cover upload storage?**
   - Option A: Local filesystem (current covers location)
   - Option B: S3/Cloud storage
   - Recommendation: Local first, S3 for production

3. **Admin audit logging?**
   - Track admin actions (create/update/delete)?
   - Recommendation: Add later if needed
