# Tomorrow's Plan - 2026-02-07

## Top 3 Priorities

### 1. Auth System Planung
Design des Authentication Systems fuer P2.

**Backend-Architektur:**
```go
// JWT + Refresh Token Pattern
type AuthHandler struct {
    userRepo    *UserRepository
    tokenService *TokenService
}

// Endpoints
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
```

**Frontend-Struktur:**
- `/login` - Login Page
- `/register` - Registrierung
- AuthContext fuer globalen State
- Protected Route HOC

**Aufgaben:**
1. Token-Strategie definieren (Access Token Lifetime, Refresh Token Rotation)
2. Password Hashing mit bcrypt implementieren
3. Middleware fuer geschuetzte Routen
4. Cookie vs localStorage fuer Token-Speicherung entscheiden

---

### 2. Login/Register Pages erstellen
Frontend-Implementation der Auth-Pages.

**Komponenten:**
```typescript
// src/components/auth/LoginForm.tsx
// src/components/auth/RegisterForm.tsx
// src/components/auth/AuthProvider.tsx
// src/app/login/page.tsx
// src/app/register/page.tsx
```

**Features:**
- Form Validation
- Error Handling
- Loading States
- Redirect nach Login

---

### 3. User Repository und Handler
Backend-Implementation fuer User-Management.

**Files zu erstellen:**
```
backend/internal/repository/user.go
backend/internal/handlers/auth.go
backend/internal/services/token.go
backend/pkg/middleware/auth.go
```

**User Model erweitern:**
```go
type User struct {
    ID           int64     `json:"id"`
    Username     string    `json:"username"`
    Email        string    `json:"email"`
    PasswordHash string    `json:"-"`
    CreatedAt    time.Time `json:"created_at"`
    UpdatedAt    time.Time `json:"updated_at"`
}
```

---

## First 15-Minute Task

**Token Service Skeleton erstellen:**

1. Erstelle `backend/internal/services/token.go`:
```go
package services

import (
    "time"
    "github.com/golang-jwt/jwt/v5"
)

type TokenService struct {
    secretKey     []byte
    accessExpiry  time.Duration
    refreshExpiry time.Duration
}

func NewTokenService(secret string) *TokenService {
    return &TokenService{
        secretKey:     []byte(secret),
        accessExpiry:  15 * time.Minute,
        refreshExpiry: 7 * 24 * time.Hour,
    }
}

func (s *TokenService) GenerateAccessToken(userID int64) (string, error) {
    // TODO: Implement
}

func (s *TokenService) GenerateRefreshToken(userID int64) (string, error) {
    // TODO: Implement
}

func (s *TokenService) ValidateToken(tokenString string) (*Claims, error) {
    // TODO: Implement
}
```

2. Teste Kompilierung mit `go build ./...`
3. JWT Library installieren: `go get github.com/golang-jwt/jwt/v5`

---

## Dependencies to Unblock Early

1. **JWT Library installieren**
   ```bash
   cd backend && go get github.com/golang-jwt/jwt/v5
   ```

2. **Redis fuer Refresh Token Store**
   - Bereits running in Docker
   - Go Redis Client: `go get github.com/redis/go-redis/v9`

3. **bcrypt fuer Passwords**
   ```bash
   go get golang.org/x/crypto/bcrypt
   ```

4. **Docker running** - `docker ps` zeigt postgres + redis

---

## If Ahead of Schedule

### User Profile Page
- GET /api/v1/users/:id (public info)
- GET /api/v1/users/me (authenticated, full info)
- PUT /api/v1/users/me (update profile)

### Watchlist Backend Migration
- POST /api/v1/watchlist
- GET /api/v1/users/me/watchlist
- localStorage zu Backend Sync bei Login

### Password Reset Flow
- POST /api/v1/auth/forgot-password
- POST /api/v1/auth/reset-password
- Email-Versand (spaeter)

---

## Verification Checklist

Nach Abschluss der Prioritaeten:
- [ ] JWT Generation funktioniert
- [ ] Password Hashing mit bcrypt
- [ ] Login Endpoint gibt Token zurueck
- [ ] Register Endpoint erstellt User
- [ ] Frontend Login Form funktioniert
- [ ] Protected Route redirected zu /login
- [ ] Refresh Token erneuert Access Token

---

## P2 Feature Roadmap (Reference)

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| P2-1 | Auth (Login/Register) | HIGH | TODO |
| P2-2 | User Profile | MEDIUM | TODO |
| P2-3 | User Ratings | MEDIUM | TODO |
| P2-4 | Watchlist Sync | MEDIUM | TODO |
| P2-5 | Comments Read | LOW | TODO |
| P2-6 | Comments Write | LOW | TODO |

---

## Technical Notes

### JWT Token Structure
```json
{
  "sub": "user_id",
  "exp": "expiration_timestamp",
  "iat": "issued_at",
  "type": "access" | "refresh"
}
```

### Auth Flow
1. User submits credentials
2. Backend validates, returns access + refresh tokens
3. Frontend stores in httpOnly cookies
4. Access token sent with each request
5. When expired, refresh endpoint called
6. If refresh fails, redirect to login

### Cookie Settings
```go
http.SetCookie(w, &http.Cookie{
    Name:     "access_token",
    Value:    token,
    HttpOnly: true,
    Secure:   true, // HTTPS only in production
    SameSite: http.SameSiteStrictMode,
    Path:     "/",
    MaxAge:   900, // 15 minutes
})
```

---

## Questions to Resolve

1. **Email Verification?**
   - Option A: Required before access
   - Option B: Optional, can use without
   - Recommendation: Option B (simpler for now)

2. **Username vs Email Login?**
   - Option A: Username only
   - Option B: Email only
   - Option C: Both
   - Recommendation: Option C (flexible)

3. **Rate Limiting?**
   - Needed for auth endpoints
   - Redis-based counter
   - 5 attempts per minute per IP
