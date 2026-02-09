# Team4s.v3.0 - Current Status

**Last Updated:** 2026-02-09
**Phase:** P2 Features In Progress
**Overall Progress:** ~80%

---

## Milestone Overview

| Milestone | Status | Progress |
|-----------|--------|----------|
| P0: Core Browse/View | DONE | 100% |
| P1: Enhanced Features | DONE | 100% |
| P2: User Features | IN PROGRESS | 40% |
| P3: Admin Features | TODO | 0% |

---

## P0 Features (Complete)

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Anime Liste | GET /api/v1/anime | /anime | DONE |
| A-Z Filter | ?letter=A | AlphabetNav | DONE |
| Pagination | ?page=1&per_page=24 | Pagination | DONE |
| Anime Detail | GET /api/v1/anime/:id | /anime/:id | DONE |
| Episode Liste | GET /api/v1/anime/:id/episodes | EpisodeList | DONE |
| Cover Images | - | 2.386 migriert | DONE |
| Fansub Logos | - | 105 migriert | DONE |

---

## P1 Features (Complete)

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Anime Search | GET /api/v1/anime/search | /search + SearchBar | DONE |
| Status Filter | ?status=ongoing | AnimeFilters | DONE |
| Type Filter | ?type=tv | AnimeFilters | DONE |
| Related Anime | GET /api/v1/anime/:id/relations | RelatedAnime | DONE |
| Episode Detail | GET /api/v1/episodes/:id | /episode/:id | DONE |
| Watchlist UI | localStorage | WatchlistButton + /watchlist | DONE |
| Rating Display | GET /api/v1/anime/:id/rating/stats | StarRating + RatingDisplay | DONE |

---

## P2 Features (In Progress)

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Auth (Login/Register) | JWT + Refresh + Redis | /login, /register, AuthContext | DONE |
| User Profile | GET/PUT /api/v1/users | /user/[username], /settings | DONE |
| User Ratings | POST /api/v1/anime/:id/ratings | RatingInput | TODO |
| Watchlist Sync | POST /api/v1/watchlist | Backend Migration | TODO |
| Comments | GET/POST /api/v1/anime/:id/comments | CommentList, CommentForm | TODO |

---

## What Works Now

**Frontend (http://localhost:3000):**
- `/anime` - Anime-Liste mit A-Z Filter, Status/Type Filter, Pagination
- `/anime/:id` - Anime-Detail mit Cover, Infos, Episoden, Related Anime, Rating, Watchlist
- `/episode/:id` - Episode-Detail mit Fansub-Progress
- `/search?q=query` - Suchergebnisse
- `/watchlist` - Persoenliche Watchlist (localStorage)
- `/login` - Login mit Email oder Username
- `/register` - Benutzerregistrierung
- `/settings` - Profil bearbeiten, Passwort aendern, Account loeschen
- `/user/[username]` - Oeffentliches Benutzerprofil mit Stats
- Header mit SearchBar, User Menu und Navigation auf allen Seiten
- Dark Theme, Responsive Design, CSS Modules

**Backend API (http://localhost:8080):**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check mit DB-Status |
| GET | /api/v1/anime | Liste mit Filtern und Pagination |
| GET | /api/v1/anime/:id | Anime-Detail |
| GET | /api/v1/anime/:id/episodes | Episoden eines Anime |
| GET | /api/v1/anime/:id/relations | Verwandte Anime |
| GET | /api/v1/anime/:id/rating/stats | Rating Statistiken |
| GET | /api/v1/anime/search | Suche nach Anime (q=query) |
| GET | /api/v1/episodes/:id | Episode Detail mit FansubProgress |
| POST | /api/v1/auth/register | Benutzer registrieren |
| POST | /api/v1/auth/login | Login (JWT + Refresh Token) |
| POST | /api/v1/auth/refresh | Access Token erneuern |
| POST | /api/v1/auth/logout | Aktuelle Session beenden |
| POST | /api/v1/auth/logout-all | Alle Sessions beenden |
| GET | /api/v1/auth/me | Aktueller Benutzer |
| GET | /api/v1/users/:username | Oeffentliches Profil |
| PUT | /api/v1/users/me | Eigenes Profil bearbeiten |
| PUT | /api/v1/users/me/password | Passwort aendern |
| DELETE | /api/v1/users/me | Account loeschen |

### How to Verify
```bash
# Backend starten
cd backend && go run cmd/server/main.go

# API testen (Public)
curl http://localhost:8080/api/v1/anime?letter=A
curl http://localhost:8080/api/v1/anime?status=ongoing&type=tv
curl http://localhost:8080/api/v1/anime/1/relations
curl http://localhost:8080/api/v1/episodes/1

# API testen (Auth)
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"testpass123"}'

curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"test","password":"testpass123"}'

# Frontend starten
cd frontend && npm run dev
# Browser: http://localhost:3000/anime
```

---

## Infrastructure Status

| Component | Status | Notes |
|-----------|--------|-------|
| PostgreSQL 16 | Running | Docker, Port 5432 |
| Redis 7 | Running | Docker, Port 6379, Auth Token Storage |
| Go Backend | Running | Port 8080 |
| Next.js Frontend | Running | Port 3000 |
| Adminer | Running | Port 8081 |

---

## Data Status

| Table | Records | Migrated |
|-------|---------|----------|
| anime | 13,326 | Yes |
| episodes | 30,179 | Yes |
| anime_relations | 2,323 | Yes |
| comments | 145 | Yes |
| ratings | 456 | Yes |
| watchlist | 716 | Yes |
| users | 1+ (admin + new) | Partial |
| covers | 2,386 | Yes (files) |
| fansub logos | 105 | Yes (files) |

---

## Technical Debt

1. **FK Constraints Disabled** - Re-enable after user migration
2. **User References** - All legacy data points to user_id=1
3. **Stream Links** - Still in legacy HTML format
4. **API Docs** - No OpenAPI spec yet
5. **StarRating clipPath IDs** - Need unique IDs per instance
6. **Rate Limiting** - Auth endpoints not rate-limited
7. **Email Verification** - Not implemented

---

## Known Risks / Blockers

- **User Migration Pending:** Legacy users not yet migrated from WCF
- **Password Migration:** WCF uses crypt-compatible hashes; bcrypt compatibility not tested
- **Stream Links Parsing:** Legacy HTML needs parser for Episode Detail
- **Rate Limiting:** Auth endpoints vulnerable to brute force

---

## Top 3 Next Steps

1. **P2-3: User Ratings** - Let users rate anime
2. **P2-4: Watchlist Sync** - Move localStorage to backend
3. **P2-5: Comments** - Read and write comments

---

## Owner

- **Developer:** D1skanime (GitHub)
- **AI Assistant:** Claude (development support)
