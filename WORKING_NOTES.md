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
    database/         # DB connection, migrations (TODO: create postgres.go)
    handlers/         # HTTP handlers
    models/           # Data structures
    services/         # Business logic
  pkg/
    middleware/       # Auth, logging, CORS
```

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
