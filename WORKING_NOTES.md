# Team4s.v3.0 - Working Notes

## Current Scratchpad

### Docker Commands Quick Reference
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f postgres

# Reset database (delete all data)
docker-compose down
rm -rf data/postgres data/redis
docker-compose up -d

# Connect to PostgreSQL directly
docker exec -it team4sv30-postgres-1 psql -U team4s

# Connect to Redis
docker exec -it team4sv30-redis-1 redis-cli
```

### Database Verification Queries
```sql
-- Count all records
SELECT 'anime' as table_name, COUNT(*) as count FROM anime
UNION ALL SELECT 'episodes', COUNT(*) FROM episodes
UNION ALL SELECT 'anime_relations', COUNT(*) FROM anime_relations
UNION ALL SELECT 'comments', COUNT(*) FROM comments
UNION ALL SELECT 'ratings', COUNT(*) FROM ratings
UNION ALL SELECT 'watchlist', COUNT(*) FROM watchlist;

-- Sample anime data
SELECT id, title, type, status, year FROM anime LIMIT 10;

-- Episodes for an anime
SELECT id, anime_id, episode_number, title, status FROM episodes WHERE anime_id = 1;

-- New: Count users
SELECT COUNT(*) FROM users;
```

---

## Auth System Notes (2026-02-09)

### API Endpoints
```
POST /api/v1/auth/register    - Create new user
POST /api/v1/auth/login       - Authenticate user
POST /api/v1/auth/refresh     - Refresh access token
POST /api/v1/auth/logout      - Invalidate current session
POST /api/v1/auth/logout-all  - Invalidate all sessions
GET  /api/v1/auth/me          - Get current user
GET  /api/v1/users/:username  - Get user profile (public)
PUT  /api/v1/users/me         - Update own profile
PUT  /api/v1/users/me/password - Change password
DELETE /api/v1/users/me       - Delete account
```

### Token Configuration
```go
const (
    AccessTokenExpiry  = 15 * time.Minute
    RefreshTokenExpiry = 7 * 24 * time.Hour
    BcryptCost         = 10
)
```

### Redis Keys
```
refresh:<token>  -> user_id (TTL: 7 days)
```

### Test User Creation
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"testpass123"}'
```

### Test Login
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"testuser","password":"testpass123"}'
```

---

## Migration Notes (2026-02-03)

### Migration Script Location
`database/migrate_mysql_to_postgres.py`

### Generated SQL Files
```
database/migration_data/
  anime.sql           (11.2 MB, 13,326 records)
  episodes.sql        (15.1 MB, 30,179 records)
  comments.sql        (57 KB, 145 records)
  ratings.sql         (57 KB, 456 records)
  watchlist.sql       (97 KB, 716 records)
  anime_relations.sql (295 KB, 2,323 records)
```

### Migration Command Sequence
```bash
# 1. Start Docker stack
docker-compose up -d

# 2. Apply schema updates
docker exec -i team4sv30-postgres-1 psql -U team4s < database/schema_update.sql

# 3. Run Python migration script
python database/migrate_mysql_to_postgres.py

# 4. Import generated SQL files
docker exec -i team4sv30-postgres-1 psql -U team4s < database/migration_data/anime.sql
docker exec -i team4sv30-postgres-1 psql -U team4s < database/migration_data/episodes.sql
docker exec -i team4sv30-postgres-1 psql -U team4s < database/migration_data/comments.sql
docker exec -i team4sv30-postgres-1 psql -U team4s < database/migration_data/ratings.sql
docker exec -i team4sv30-postgres-1 psql -U team4s < database/migration_data/watchlist.sql
docker exec -i team4sv30-postgres-1 psql -U team4s < database/migration_data/anime_relations.sql
```

### Type Conversions Applied
- MySQL `Serie` -> PostgreSQL `tv`
- MySQL `Film` -> PostgreSQL `film`
- MySQL `OVA` -> PostgreSQL `ova`
- MySQL enum values normalized to lowercase

### Schema Updates Applied
- Added `title_de` and `title_en` columns to anime table
- Added `stream_links_legacy` and `filename` columns to episodes table
- Changed VARCHAR(255) to TEXT for HTML content fields
- Temporarily dropped FK constraints for bulk import

---

## Schema Design Notes (2026-02-03)

### ENUMs Created
Six PostgreSQL ENUM types for type-safe status fields:
1. `anime_status` - disabled, ongoing, done, aborted, licensed
2. `anime_type` - tv, ova, film, bonus, special, ona, music
3. `content_type` - anime, hentai
4. `episode_status` - disabled, private, public
5. `watchlist_status` - watching, done, break, planned, dropped
6. `fansub_role` - raw, translate, time, typeset, logo, edit, karatime, karafx, qc, encode

### Fansub Process Tracking
Episodes table has 10 percentage columns (0-100):
- raw_proc, translate_proc, time_proc, typeset_proc, logo_proc
- edit_proc, karatime_proc, karafx_proc, qc_proc, encode_proc

Each has a corresponding `*_proc_by` user reference.

### Roles System (27 roles)
Replaced WCF group system with granular RBAC:
- Core: admin, moderator, registered
- Anime: anime_create, anime_modify, anime_delete, anime_status
- Stream: stream_create, stream_modify, stream_delete, stream_status
- Comment: comment_modify, comment_delete
- Fansub: fansub_create, fansub_modify, fansub_delete
- Special: private
- Process: raw_proc, translate_proc, time_proc, typeset_proc, logo_proc, edit_proc, karatime_proc, karafx_proc, qc_proc, encode_proc

### Legacy ID Columns
All main tables have `legacy_*_id` columns for migration:
- users.legacy_wcf_user_id
- anime.legacy_anime_id
- episodes.legacy_episode_id
- comments.legacy_comment_id
- messages.legacy_message_id

---

## Go Backend Structure
```
backend/
  cmd/
    server/
      main.go         # Entry point, router setup
  internal/
    config/           # Configuration loading
    database/         # DB connection (postgres.go, redis.go)
    handlers/         # HTTP handlers (anime, auth, user, rating)
    models/           # Data structures
    repository/       # Database access (anime, user, rating)
    services/         # Business logic (token, auth)
  pkg/
    middleware/       # Auth, logging, CORS
```

---

## Frontend Structure
```
frontend/src/
  app/
    anime/[id]/       # Anime detail
    episode/[id]/     # Episode detail
    login/            # Login page
    register/         # Register page
    search/           # Search results
    settings/         # User settings
    user/[username]/  # User profile
    watchlist/        # Watchlist page
  components/
    anime/            # AnimeCard, AnimeGrid, AnimeFilters, etc.
    auth/             # LoginForm, RegisterForm, AuthGuard
    layout/           # Header, Pagination
    settings/         # ProfileForm, PasswordForm, DeleteAccountForm
    user/             # ProfileCard, StatsGrid
  contexts/
    AuthContext.tsx   # Auth state management
  lib/
    api.ts            # API client
    auth.ts           # Auth utilities
```

---

## Mental Unload (End of Day 2026-02-09)

**P2-1 Auth und P2-2 Profile KOMPLETT!**

Grosser Tag heute. Das Auth-System ist jetzt vollstaendig implementiert - JWT mit Refresh Tokens, Redis Storage, Login/Register/Logout. Und gleich danach das Profil-System mit Settings Page.

**Highlights:**
- TokenService mit 15min Access / 7 Tage Refresh funktioniert sauber
- AuthContext mit refreshUser() loest das Problem der State-Updates elegant
- Settings Page mit Tabs ist sehr aufgeraeumt geworden
- UserStats Query zeigt schoene Statistiken auf dem Profil

**Technische Learnings:**
- bcrypt Cost 10 ist der Sweet Spot fuer Performance/Sicherheit
- Redis fuer Refresh Tokens ist perfekt - einfache Invalidierung
- React Context reicht fuer Auth State voellig aus
- Tab-Navigation besser als separate Routes fuer Settings

**Was noch fehlt bei Auth:**
- Rate Limiting (muss vor Production rein)
- Email Verification (kann warten)
- Avatar Upload (nur URL momentan)

**Gefuehl:**
Sehr zufrieden. P2 ist jetzt 40% fertig. Die grossen Features (Auth, Profile) sind erledigt. Der Rest (Ratings, Watchlist Sync, Comments) baut darauf auf und sollte schneller gehen.

**Morgen:**
P2-3 User Ratings. Die RatingInput Komponente ist der erste Schritt. Das Rating Repository existiert bereits, braucht nur den Handler.

---

## Mental Unload (End of Day 2026-02-06)

**P1 KOMPLETT! Alle 6 Features implementiert.**

Heute war ein produktiver Tag. Alle P1 Features sind fertig - Advanced Filters, Related Anime, Episode Detail, Watchlist, und Rating Display. Das Projekt hat jetzt eine solide Basis fuer die naechste Phase.

**Highlights:**
- AnimeFilters mit URL-State funktioniert sehr sauber
- RelatedAnime mit horizontalem Scroll sieht gut aus
- FansubProgress zeigt detaillierten Fortschritt (10 Bars!)
- WatchlistButton mit Dropdown ist intuitiv
- StarRating mit halben Sternen via clipPath clever geloest

**Technische Learnings:**
- useSearchParams ist die richtige Wahl fuer URL-gebundene Filter
- Native horizontal scroll > Carousel fuer Touch-Devices
- localStorage ist ein guter Zwischenschritt vor Auth

**Offene Gedanken fuer spaeter:**
- clipPath IDs muessen unique werden bevor Ratings auf Listen kommen
- Stream Links Parser wird interessant - HTML Parsing in Go
- User Migration sollte bald angegangen werden

**Gefuehl:**
Zufrieden. P0+P1 in wenigen Tagen komplett. Gute Architektur zahlt sich aus - Repository Pattern, Server Components, CSS Modules. Alles fuegt sich sauber zusammen.

**Morgen:**
P2 starten mit Auth. JWT + Refresh Tokens, Login/Register Pages. Das ist der Grundstein fuer alle Social Features.

---

## Mental Unload (End of Day 2026-02-05/06)

**Search Feature komplett implementiert!**

Das P1-1 Feature (Anime Search) ist jetzt vollstaendig funktionsfaehig - Backend und Frontend. Die Suche durchsucht title, title_de und title_en mit ILIKE fuer case-insensitive Matching.

**Was heute erreicht wurde:**
- Search Handler im Backend hinzugefuegt
- Search Repository-Methode mit parametrisiertem Query
- SearchResponse Model fuer strukturierte API-Antwort
- Search Page im Frontend mit Ergebnisanzeige
- SearchBar Komponente (wiederverwendbar)
- Header Komponente mit globaler Navigation
- Layout.tsx refactored

**Technische Entscheidungen:**
- ILIKE statt Full-Text-Search: Fuer 13k Records performant genug, einfacher zu implementieren
- SearchBar als eigenstaendige Komponente: Kann in Header, Mobile-Menu etc. wiederverwendet werden
- Server-seitige Suche: Keine Client-seitige Filterung, skaliert besser

**Ueberlegungen fuer spaeter:**
- Bei Wachstum: PostgreSQL Full-Text-Search mit tsvector/tsquery
- Debounce/Autocomplete fuer bessere UX
- Suchhistorie/Vorschlaege

**Gefuehl zum Fortschritt:**
Solider Tag. P1-1 ist abgeschlossen, das Projekt hat jetzt eine nutzbare Suchfunktion. Die Architektur mit Repository-Pattern und wiederverwendbaren Komponenten zahlt sich aus.

---

## Mental Unload (End of Day 2026-02-03)

**Major milestone achieved today!**

WSL2 installation and Docker setup resolved the critical blocker. But the real win was completing the full MySQL to PostgreSQL migration - 47,145+ records of real production data now in the new database.

**Key accomplishments:**
- WSL2 installed (required BIOS changes for virtualization)
- Docker Desktop running successfully
- PostgreSQL container with full schema
- Python migration script created and tested
- All anime portal data migrated

**Technical discoveries:**
- Legacy data had VARCHAR overflow issues - fixed with TEXT
- FK constraints needed to be disabled for bulk import
- ON CONFLICT DO NOTHING makes migrations idempotent

**Tomorrow's focus:**
Connect Go backend to database and implement real API endpoints. The data is ready - time to build the API.

**Feeling about progress:**
Excellent day. Went from blocked to having a fully populated database. The migration script is reusable if we need to re-import. Ready for actual feature development.

---

## Session Log

### 2026-02-09 (P2 Auth + Profile Session)
- P2-1 Auth System implementiert
- P2-2 User Profile implementiert
- ~25 neue Frontend-Dateien
- 11 neue Backend-Dateien
- 10 neue API Endpoints
- Git commit vorbereitet

### 2026-02-06 (P1 Completion Session)
- P1-2 AnimeFilters mit Status/Type Dropdowns
- P1-3 RelatedAnime mit horizontalem Scroll
- P1-4 Episode Detail mit FansubProgress
- P1-5 WatchlistButton + /watchlist Page
- P1-6 StarRating + RatingDisplay
- 17 neue Dateien erstellt
- 19 bestehende Dateien modifiziert
- Alle Tests bestanden, Build erfolgreich

### 2026-02-05/06 (Search Feature Session)
- P1-1 Anime Search Feature implementiert
- Backend: Search Handler, Repository-Methode, Model
- Frontend: Search Page, SearchBar, Header
- Layout.tsx refactored fuer globale Navigation
- Alle neuen Dateien erstellt und getestet
- Git commit vorbereitet

### 2026-02-03 Evening (Migration Session)
- WSL2 installed after BIOS virtualization enabled
- Docker Desktop started successfully
- Created Python migration script
- Migrated 47,145+ records from MySQL dump
- Fixed schema issues (VARCHAR->TEXT)
- All data now in PostgreSQL

### 2026-02-03 Morning
- Day-start agent ran successfully
- Read Final.md for complete legacy analysis
- Planned schema migration approach

### 2026-02-03 Afternoon (Schema Session)
- Created migration files 001-005
- Built init.sql with combined schema + test data
- Updated docker-compose.yml
- Attempted to start Docker - failed
- Discovered WSL2 not installed

### 2026-02-02 Morning
- Day-start agent ran successfully
- Recovered missing schemas from .frm files
- Updated Final.md with complete documentation

### 2026-02-02 Afternoon
- Installed GitHub CLI, authenticated
- Installed Go 1.25.6 + VS Code extension
- Created Go module, installed dependencies
- Built backend skeleton with Gin
- Compiled server.exe successfully

### 2026-02-02 Evening
- Installed Docker Desktop
- Created docker-compose.yml
- Set up data directories
- Updated .gitignore
- Created .env.example
- Created analyzer agents for legacy code
- Running day-closeout

---

## Questions to Answer
- [x] Primary keys: UUID vs BIGSERIAL? **Answer: BIGSERIAL**
- [x] Auth Token Storage: Cookies vs localStorage? **Answer: Cookies recommended, localStorage for dev**
- [x] Settings Page Layout: Tabs vs separate routes? **Answer: Tabs**
- [ ] How are anime covers currently stored? Path pattern?
- [ ] What's the download key generation algorithm exactly?
- [ ] Are there any rate limits we need to preserve?
- [ ] WCF password hash compatibility with Go bcrypt?

---

## Database Connection Info
| Setting | Value |
|---------|-------|
| Host | localhost |
| Port | 5432 |
| Database | team4s |
| User | team4s |
| Password | team4s_dev_password |
| Adminer | http://localhost:8081 |
| Redis | localhost:6379 |

---

## Record Counts (2026-02-03)
| Table | Records |
|-------|---------|
| anime | 13,326 |
| episodes | 30,179 |
| anime_relations | 2,323 |
| comments | 145 |
| ratings | 456 |
| watchlist | 716 |
| **TOTAL** | **47,145** |

---

## API Quick Reference

### Public Endpoints
```
GET  /health
GET  /api/v1/anime
GET  /api/v1/anime/:id
GET  /api/v1/anime/:id/episodes
GET  /api/v1/anime/:id/relations
GET  /api/v1/anime/:id/rating/stats
GET  /api/v1/anime/search?q=
GET  /api/v1/episodes/:id
GET  /api/v1/users/:username
```

### Auth Endpoints
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/logout-all
GET  /api/v1/auth/me
```

### Protected Endpoints (require auth)
```
PUT    /api/v1/users/me
PUT    /api/v1/users/me/password
DELETE /api/v1/users/me
```
