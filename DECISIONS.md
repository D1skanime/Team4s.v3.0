# Team4s.v3.0 - Architectural Decisions

## ADR-001: Tech Stack Selection
**Date:** 2026-02-02
**Status:** Accepted

### Context
Need to select a modern tech stack to replace the legacy WoltLab WBB4/WCF + PHP system. Requirements:
- Better performance than PHP
- Type safety
- Modern developer experience
- Good ecosystem for web applications

### Options Considered
1. **Node.js + Next.js full-stack** - All JavaScript, simpler stack
2. **Go + Next.js** - Go backend for performance, Next.js for modern frontend
3. **Rust + Next.js** - Maximum performance but steeper learning curve
4. **Python (FastAPI) + Next.js** - Good DX but performance concerns

### Decision
**Go + Next.js 14 + PostgreSQL + Redis**

### Why This Option Won
- Go provides excellent performance and concurrency (important for streaming/downloads)
- Strong typing in both Go and TypeScript
- PostgreSQL is robust and well-suited for relational data
- Redis handles sessions and caching efficiently
- Next.js 14 App Router provides modern React patterns with SSR
- All technologies have strong communities and long-term viability

### Consequences
**Good:**
- Fast API responses
- Type safety across the stack
- Clear separation of concerns
- Scalable architecture

**Bad:**
- Two languages to maintain (Go + TypeScript)
- Slightly more complex deployment than monolithic PHP

### Follow-ups
- [x] Select specific Go web framework (Gin/Echo/Fiber) - **Decided: Gin**
- [ ] Set up shared type definitions (OpenAPI spec?)

---

## ADR-002: Project Structure
**Date:** 2026-02-02
**Status:** Accepted

### Context
Need to organize the codebase for the new system.

### Decision
Monorepo structure:
```
/backend     - Go API server
/frontend    - Next.js application
/database    - Migration files and init scripts
/docs        - Documentation and day logs
/context     - AI context files
```

### Why
- Single repository simplifies version control
- Shared documentation and context
- Easier CI/CD configuration
- Clear separation between backend and frontend

### Consequences
- Need to manage dependencies for both Go and Node.js
- May need workspace tooling if repo grows

---

## ADR-003: Authentication Strategy
**Date:** 2026-02-02
**Status:** Accepted (Implemented 2026-02-09)

### Context
Replacing WCF's session-based authentication.

### Decision
JWT + Refresh Token pattern with Redis session store

### Why
- Stateless authentication scales well
- Refresh tokens provide security without frequent re-login
- Redis provides fast session validation and revocation capability

### Consequences
- Need to implement token refresh logic on frontend
- Must handle token storage securely (httpOnly cookies)

### Follow-ups
- [x] Define token expiration times - **See ADR-020**
- [x] Design refresh token rotation strategy - **See ADR-021**
- [x] Plan logout/revocation mechanism - **Implemented**

---

## ADR-004: Go Web Framework Selection
**Date:** 2026-02-02
**Status:** Accepted

### Context
Need to select a Go web framework for the backend API.

### Options Considered
1. **Gin** - Most popular, extensive middleware ecosystem, excellent documentation
2. **Echo** - Fast, minimalist, good middleware support
3. **Fiber** - Express-inspired, very fast, newer community

### Decision
**Gin**

### Why This Option Won
- Most popular Go web framework (largest community)
- Excellent documentation and tutorials
- Mature middleware ecosystem (auth, CORS, logging, etc.)
- Battle-tested in production
- Easy to find help and examples

### Consequences
**Good:**
- Large community means easy troubleshooting
- Familiar patterns for developers from other frameworks
- Rich middleware ecosystem

**Bad:**
- Not the absolute fastest (Fiber is faster)
- Uses reflection (minor performance overhead)

### Implementation
- Gin v1.11.0 installed
- Basic server structure created in `backend/cmd/server/main.go`
- Health check and placeholder routes implemented

---

## ADR-005: Local Development Database Strategy
**Date:** 2026-02-02
**Status:** Accepted

### Context
Need a local development database setup that is:
- Easy to set up and tear down
- Consistent across development machines
- Close to production environment

### Options Considered
1. **Native PostgreSQL installation** - Direct install on Windows
2. **Docker Compose** - Containerized PostgreSQL + Redis
3. **Cloud-hosted dev database** - Remote development DB

### Decision
**Docker Compose with local volume storage**

### Why This Option Won
- Easy to start/stop entire stack with one command
- Data persists in `./data/` folder
- Adminer UI for visual DB management
- Matches production container setup
- No system-level installation required

### Configuration
```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes: ["./data/redis:/data"]
  adminer:
    image: adminer
    ports: ["8081:8080"]
```

### Consequences
**Good:**
- Consistent environment
- Easy to reset (delete data/ folder)
- Visual management via Adminer
- Portable setup
- Auto-runs init.sql on first start

**Bad:**
- Requires Docker Desktop running
- Docker Desktop needs manual start on Windows
- **Requires WSL2 on Windows 11** - RESOLVED 2026-02-03

---

## ADR-006: Primary Key Strategy
**Date:** 2026-02-03
**Status:** Accepted

### Context
Need to decide on primary key type for all tables.

### Options Considered
1. **UUID** - Globally unique, no collision risk, 36 characters
2. **BIGSERIAL** - Auto-incrementing 64-bit integer, simple, 8 bytes

### Decision
**BIGSERIAL for all primary keys**

### Why This Option Won
- Simpler to work with in development and debugging
- Better index performance (8 bytes vs 36 characters)
- Smaller storage footprint
- Sufficient for our scale (not building distributed system)
- Easier to reference in URLs and logs (can remember IDs)

### Consequences
**Good:**
- Simple, familiar pattern
- Fast index lookups
- Small storage footprint
- Easy debugging (sequential IDs)

**Bad:**
- IDs are guessable (mitigated by auth)
- Not suitable if we ever need distributed ID generation

### Implementation
All 13 tables use `id BIGSERIAL PRIMARY KEY`

---

## ADR-007: Database Status Fields as ENUMs
**Date:** 2026-02-03
**Status:** Accepted

### Context
Many tables have status fields with a fixed set of values (e.g., anime_status, episode_status).

### Options Considered
1. **VARCHAR** - Flexible but no type safety
2. **INTEGER with constants** - Fast but not self-documenting
3. **PostgreSQL ENUM** - Type-safe, self-documenting, enforced by DB

### Decision
**PostgreSQL ENUM types for all status fields**

### Why This Option Won
- Type safety at the database level
- Self-documenting (enum values visible in schema)
- Cannot insert invalid values
- Good performance (stored as integers internally)
- Works well with Go struct tags

### ENUMs Created
```sql
CREATE TYPE anime_status AS ENUM ('disabled', 'ongoing', 'done', 'aborted', 'licensed');
CREATE TYPE anime_type AS ENUM ('tv', 'ova', 'film', 'bonus', 'special', 'ona', 'music');
CREATE TYPE content_type AS ENUM ('anime', 'hentai');
CREATE TYPE episode_status AS ENUM ('disabled', 'private', 'public');
CREATE TYPE watchlist_status AS ENUM ('watching', 'done', 'break', 'planned', 'dropped');
CREATE TYPE fansub_role AS ENUM ('raw', 'translate', 'time', 'typeset', 'logo', 'edit', 'karatime', 'karafx', 'qc', 'encode');
```

### Consequences
**Good:**
- Invalid data impossible at DB level
- Clear schema documentation
- IDE autocomplete in Go with proper mapping

**Bad:**
- Adding new enum values requires ALTER TYPE
- Need to keep Go constants in sync

### Follow-ups
- [ ] Create Go enum constants matching PostgreSQL types
- [ ] Add migration strategy for adding new enum values

---

## ADR-008: Schema Scope - Anime Portal Only
**Date:** 2026-02-03
**Status:** Accepted

### Context
Legacy system has both WoltLab WBB4/WCF forum tables and custom anime portal tables. Need to decide scope of new schema.

### Options Considered
1. **Full migration** - Migrate both forum and portal tables
2. **Portal only** - Only migrate anime-related tables, replace forum
3. **Hybrid** - Keep WCF for forum, new system for portal

### Decision
**Anime portal tables only - clean break from WCF**

### Why This Option Won
- Clean architecture without legacy baggage
- Modern RBAC system replacing WCF groups
- Simpler codebase to maintain
- Forum functionality can be added later with modern solution
- Focus on core value: anime portal

### Tables Created (13)
**Authentication:**
- users (replacing wcf4_user)
- roles (replacing wcf4_user_group)
- user_roles (replacing wcf4_user_to_group)

**Content:**
- anime (from anmi1_anime)
- anime_relations (from verwandt)
- episodes (from anmi1_episode)

**Social:**
- comments (from anmi1_comments)
- ratings (from anmi1_rating)
- watchlist (from anmi1_watch)
- messages (new, simplified PM system)

**Fansub:**
- attendants (from anmi1_attendants)
- fansub_groups (new)
- anime_fansub_groups (new)

### Consequences
**Good:**
- Clean, maintainable schema
- No legacy dependencies
- Modern role-based permissions
- Focused feature set

**Bad:**
- No forum out of the box
- Need to rebuild all integrations

---

## ADR-009: VARCHAR to TEXT for HTML Content
**Date:** 2026-02-03
**Status:** Accepted

### Context
During migration, discovered that legacy data contained HTML content longer than VARCHAR(255) limit.

### Problem
Fields like `stream_comment`, `sub_comment`, and `description` contained full HTML blocks that exceeded 255 characters.

### Decision
**Change VARCHAR(255) to TEXT for content fields that may contain HTML**

### Implementation
```sql
-- Applied via schema_update.sql
ALTER TABLE anime ALTER COLUMN stream_comment TYPE TEXT;
ALTER TABLE anime ALTER COLUMN sub_comment TYPE TEXT;
ALTER TABLE anime ALTER COLUMN description TYPE TEXT;
```

### Consequences
**Good:**
- No length limit issues
- Can store rich HTML content
- Migration completes successfully

**Bad:**
- TEXT slightly slower for indexing (but we don't index these fields)
- Larger storage footprint

---

## ADR-010: Migration Strategy - Temporary FK Disable
**Date:** 2026-02-03
**Status:** Accepted (temporary)

### Context
Bulk import of legacy data fails due to FK constraints when user table is not yet populated.

### Problem
- Episodes, comments, ratings, watchlist reference user_id
- User migration not yet complete
- FK constraints prevent import

### Decision
**Temporarily disable FK constraints, import with placeholder user_id=1**

### Implementation
```sql
-- Disable constraints
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
-- etc.

-- Import with user_id=1 for all records
INSERT INTO comments (..., user_id, ...) VALUES (..., 1, ...);
```

### Consequences
**Good:**
- Allows complete data import
- Core content (anime, episodes) fully accessible
- Can fix user references later

**Bad:**
- User attribution temporarily lost
- Must remember to re-enable FK constraints
- Referential integrity not enforced until fixed

### Follow-up Required
- [ ] Extract and migrate WCF users
- [ ] Update user_id references in migrated tables
- [ ] Re-enable FK constraints
- [ ] Verify integrity

---

## ADR-011: Idempotent Migration with ON CONFLICT
**Date:** 2026-02-03
**Status:** Accepted

### Context
Migration scripts may need to be run multiple times during development. Need to prevent duplicate key errors.

### Decision
**Use ON CONFLICT DO NOTHING for all INSERT statements**

### Implementation
```sql
INSERT INTO anime (id, title, ...) VALUES (1, 'Title', ...)
ON CONFLICT (id) DO NOTHING;
```

### Consequences
**Good:**
- Safe to re-run migration scripts
- No errors on duplicate data
- Predictable behavior

**Bad:**
- Won't update existing records (use DO UPDATE if needed)
- Silent failures if data should have been inserted

---

## ADR-012: CSS Modules over Tailwind
**Date:** 2026-02-05
**Status:** Accepted

### Context
Need to decide on CSS strategy for the Next.js frontend.

### Options Considered
1. **Tailwind CSS** - Utility-first, rapid prototyping, large bundle
2. **CSS Modules** - Scoped styles, native CSS, small bundle
3. **Styled Components** - CSS-in-JS, dynamic styling, runtime overhead

### Decision
**CSS Modules**

### Why This Option Won
- Zero runtime overhead (pure CSS)
- Scoped styles prevent conflicts
- Full CSS feature support (custom properties, animations)
- Smaller bundle size than Tailwind
- IDE autocomplete with TypeScript
- More control over design details

### Consequences
**Good:**
- Fast performance
- Clean separation of concerns
- Easy to customize
- No build-time CSS generation

**Bad:**
- More verbose than utility classes
- No built-in design system

### Implementation
All components have `.module.css` files:
- `AnimeCard.module.css`
- `AnimeGrid.module.css`
- `Pagination.module.css`
- etc.

---

## ADR-013: Server Components as Default
**Date:** 2026-02-05
**Status:** Accepted

### Context
Next.js 14 App Router supports React Server Components (RSC) by default.

### Decision
**Use Server Components for all pages and data-fetching components**

### Why
- Faster initial page load (no JS hydration for static content)
- Direct database/API access without client-side fetching
- Smaller JavaScript bundle
- Better SEO (content rendered on server)

### Implementation
```typescript
// Server Component (default)
export default async function AnimePage() {
  const data = await api.getAnimeList(); // Server-side fetch
  return <AnimeGrid anime={data} />;
}
```

### Consequences
**Good:**
- Faster Time-to-First-Byte
- Better Core Web Vitals
- Simplified data fetching

**Bad:**
- Cannot use React hooks directly
- Need "use client" for interactive components

---

## ADR-014: Repository Pattern for Database Access
**Date:** 2026-02-05
**Status:** Accepted

### Context
Need to structure Go backend database access cleanly.

### Options Considered
1. **Direct SQL in handlers** - Simple but hard to test
2. **Repository Pattern** - Abstraction layer, testable
3. **ORM (GORM)** - Full ORM, magic, potential performance issues

### Decision
**Repository Pattern with raw SQL**

### Why
- Clear separation between HTTP handlers and database logic
- Easy to test (mock repositories)
- Full control over SQL queries
- No ORM overhead or magic

### Implementation
```go
// repository/anime.go
type AnimeRepository struct {
    pool *pgxpool.Pool
}

func (r *AnimeRepository) List(ctx context.Context, filter AnimeFilter) ([]AnimeListItem, int64, error)
func (r *AnimeRepository) GetByID(ctx context.Context, id int64) (*Anime, error)

// handlers/anime.go
type AnimeHandler struct {
    repo *AnimeRepository
}
```

### Consequences
**Good:**
- Testable handlers
- Reusable queries
- Clear boundaries

**Bad:**
- More boilerplate than ORM
- Manual SQL management

---

## ADR-015: AnimeFilters als Client Component
**Date:** 2026-02-06
**Status:** Accepted

### Context
Filter-Komponente fuer Status/Type auf der Anime-Liste benoetigt.

### Options Considered
1. **Server Component** - Filter als URL-Parameter, kein JS
2. **Client Component** - Interaktive Dropdowns mit URL-State Sync
3. **Mixed** - Server Component mit Client-Side Filter-UI

### Decision
**Client Component mit URL-State Synchronisation**

### Why This Option Won
- useSearchParams Hook erfordert Client Component
- Interaktive Dropdowns benoetigen State
- URL-State ermoeglicht Bookmarking und Sharing
- Page-Reset bei Filter-Aenderung moeglich

### Implementation
```typescript
'use client';
import { useRouter, useSearchParams } from 'next/navigation';

const updateFilter = (key: string, value: string) => {
  const params = new URLSearchParams(searchParams.toString());
  if (value) params.set(key, value);
  else params.delete(key);
  params.delete('page'); // Reset pagination
  router.push(`/anime?${params.toString()}`);
};
```

### Consequences
**Good:**
- Shareable URLs mit Filter-State
- Browser-History funktioniert korrekt
- SEO-freundlich (Server kann Filter auslesen)

**Bad:**
- Zusaetzliches JS Hydration
- Kleine Verzoegerung bei URL-Update

---

## ADR-016: Horizontaler Scroll fuer Related Anime
**Date:** 2026-02-06
**Status:** Accepted

### Context
Verwandte Anime auf Anime-Detail-Page anzeigen.

### Options Considered
1. **Grid Layout** - Mehrere Reihen, alle sichtbar
2. **Carousel** - Mit Prev/Next Buttons, Animation
3. **Horizontal Scroll** - Native Browser-Scroll, touch-freundlich

### Decision
**Horizontale Scroll-Liste**

### Why This Option Won
- Native Touch-Gesten funktionieren out-of-the-box
- Keine zusaetzliche JS-Bibliothek noetig
- Platzsparend auf Desktop und Mobile
- Einfache Implementation mit CSS overflow-x

### Implementation
```css
.scrollContainer {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}

.cardList {
  display: flex;
  gap: 1rem;
  padding-bottom: 0.5rem;
}
```

### Consequences
**Good:**
- Natuerliches Scrollverhalten
- Touch-freundlich ohne JS
- Keine externe Abhaengigkeit

**Bad:**
- Kein visueller Hinweis auf mehr Content (optional: Fade-Edge hinzufuegen)
- Keine Pagination bei sehr vielen Relations

---

## ADR-017: localStorage fuer Watchlist (Pre-Auth)
**Date:** 2026-02-06
**Status:** Accepted (Temporary)

### Context
Watchlist-Feature benoetigt, aber Auth-System noch nicht implementiert.

### Options Considered
1. **Warten auf Auth** - Feature erst mit P2 Auth
2. **Backend ohne Auth** - Anonymous Watchlist via Session
3. **localStorage** - Client-seitige Speicherung

### Decision
**localStorage mit Migration zu Backend bei Auth**

### Why This Option Won
- Feature sofort nutzbar ohne Login
- Einfache Implementation
- Klare Migration-Path zu Backend
- localStorage persistent ueber Sessions

### Implementation
```typescript
interface WatchlistEntry {
  animeId: number;
  status: WatchlistStatus;
  addedAt: string;
}

// localStorage Key: 'team4s_watchlist'
```

### Consequences
**Good:**
- Sofort nutzbar
- Keine Backend-Aenderungen noetig
- Progressive Enhancement

**Bad:**
- Daten nur lokal (kein Cross-Device)
- Datenverlust bei Browser-Clear moeglich
- Migration bei Auth-Einbau noetig

### Follow-ups
- [x] Auth System implementiert (ADR-020)
- [ ] Backend Watchlist Endpoint mit P2-4
- [ ] Migration von localStorage zu Backend bei Login
- [ ] Merge-Strategie fuer Konflikte

---

## ADR-018: SVG clipPath fuer StarRating
**Date:** 2026-02-06
**Status:** Accepted

### Context
Rating-Anzeige mit 0-10 Skala auf 5 Sterne mappen, halbe Sterne unterstuetzen.

### Options Considered
1. **Icon-Austausch** - Volle/Halbe/Leere Star-Icons
2. **CSS Width** - Icon mit overflow:hidden beschneiden
3. **SVG clipPath** - Praezise Beschneidung im SVG selbst

### Decision
**SVG clipPath fuer praezise Partial-Fills**

### Why This Option Won
- Beliebige Fill-Prozentsaetze moeglich (nicht nur 0/50/100)
- Kein Icon-Wechsel bei Wertaenderung
- Saubere Animation moeglich
- Ein SVG pro Stern, keine externen Assets

### Implementation
```tsx
<svg viewBox="0 0 24 24">
  {/* Empty star background */}
  <path className={styles.starEmpty} d="M12 2l3.09 6.26..." />

  {/* Filled star with clip */}
  <defs>
    <clipPath id={`star-clip-${i}`}>
      <rect x="0" y="0" width={`${fillPercent}%`} height="100%" />
    </clipPath>
  </defs>
  <path className={styles.starFilled} clipPath={`url(#star-clip-${i})`} d="..." />
</svg>
```

### Consequences
**Good:**
- Praezise Wertdarstellung
- Smooth, keine Icon-Spruenge
- Kein externes Icon-Set noetig

**Bad:**
- clipPath ID muss unique sein (potentielle Kollision)
- Etwas komplexeres SVG

### Follow-ups
- [ ] Unique ID Generation mit useId() Hook
- [ ] Test mit mehreren Ratings auf einer Page

---

## ADR-019: FansubProgress mit 10 Progress-Bars
**Date:** 2026-02-06
**Status:** Accepted

### Context
Legacy-System hatte 10 Prozentspalten fuer Fansub-Fortschritt pro Episode.

### Options Considered
1. **Single Progress Bar** - Gesamtfortschritt als ein Wert
2. **10 Progress Bars** - Jeder Schritt einzeln
3. **Hybrid** - Gesamtfortschritt + Detail-Aufklapp

### Decision
**10 einzelne Progress-Bars mit Farbcodierung**

### Why This Option Won
- Kompatibel mit Legacy-Datenstruktur
- Detaillierte Information fuer Fansub-Teams
- Bekannt von altem System
- Klare visuelle Unterscheidung per Farbe

### Implementation
```typescript
const steps = ['raw', 'translate', 'time', 'typeset', 'logo',
               'edit', 'karatime', 'karafx', 'qc', 'encode'];

// Farbcodierung:
// 0% -> Grau (nicht gestartet)
// 1-99% -> Gelb (in Arbeit)
// 100% -> Gruen (abgeschlossen)
```

### Consequences
**Good:**
- Detaillierte Information
- Legacy-kompatibel
- Visuell klar

**Bad:**
- Mehr vertikaler Platz benoetigt
- Kann unuebersichtlich wirken fuer Casual Users

---

## ADR-020: JWT Access Token Expiry (15 Minuten)
**Date:** 2026-02-09
**Status:** Accepted

### Context
Need to define access token lifetime for the JWT-based auth system.

### Options Considered
1. **5 minutes** - Very secure, frequent refresh needed
2. **15 minutes** - Good balance of security and UX
3. **1 hour** - Convenient but longer exposure window
4. **24 hours** - Maximum convenience, security concern

### Decision
**15 minutes access token expiry**

### Why This Option Won
- Industry standard for web applications
- Short enough to limit damage if token is compromised
- Long enough to not require constant refreshing during active use
- Matches common user session patterns

### Implementation
```go
// services/token.go
const (
    AccessTokenExpiry = 15 * time.Minute
)

func (s *TokenService) GenerateAccessToken(userID int64) (string, error) {
    claims := jwt.MapClaims{
        "sub": userID,
        "exp": time.Now().Add(AccessTokenExpiry).Unix(),
        "iat": time.Now().Unix(),
        "type": "access",
    }
    // ...
}
```

### Consequences
**Good:**
- Good security/UX balance
- Stateless validation (no DB lookup)
- Fast authentication checks

**Bad:**
- Need refresh token mechanism
- Frontend must handle token refresh

---

## ADR-021: Refresh Token Strategy (Random Hex in Redis)
**Date:** 2026-02-09
**Status:** Accepted

### Context
Need to implement refresh tokens for session continuity.

### Options Considered
1. **JWT Refresh Token** - Stateless, longer expiry
2. **Random Hex in Redis** - Stateful, revocable
3. **Database-stored sessions** - Traditional, slower

### Decision
**32-byte random hex string stored in Redis with 7-day TTL**

### Why This Option Won
- Cryptographically random, unpredictable
- Easy revocation (delete from Redis)
- Fast lookup (Redis in-memory)
- Supports multiple devices (multiple tokens per user)
- No JWT size overhead

### Implementation
```go
// services/token.go
func (s *TokenService) GenerateRefreshToken(userID int64) (string, error) {
    tokenBytes := make([]byte, 32)
    rand.Read(tokenBytes)
    token := hex.EncodeToString(tokenBytes)

    // Store in Redis: key = refresh:token, value = userID, TTL = 7 days
    s.redis.Set(ctx, "refresh:"+token, userID, 7*24*time.Hour)
    return token, nil
}
```

### Consequences
**Good:**
- Easy invalidation on logout
- Supports "logout all devices"
- Fast validation via Redis
- No token bloat

**Bad:**
- Requires Redis availability
- Stateful (Redis must be persistent)

---

## ADR-022: bcrypt Cost Factor 10
**Date:** 2026-02-09
**Status:** Accepted

### Context
Need to choose bcrypt cost factor for password hashing.

### Options Considered
1. **Cost 8** - Fast but potentially weak for modern hardware
2. **Cost 10** - Standard, ~100ms hash time
3. **Cost 12** - More secure, ~400ms hash time
4. **Cost 14** - Very secure, ~1.6s hash time

### Decision
**bcrypt cost factor 10**

### Why This Option Won
- Industry standard default
- ~100ms hash time on modern hardware
- Good balance of security and performance
- Can be increased later if needed
- Not noticeable delay on login/register

### Implementation
```go
// services/auth.go
import "golang.org/x/crypto/bcrypt"

const bcryptCost = 10

func (s *AuthService) HashPassword(password string) (string, error) {
    hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
    return string(hash), err
}

func (s *AuthService) CheckPassword(password, hash string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
    return err == nil
}
```

### Consequences
**Good:**
- Secure against brute force
- Acceptable performance
- Future-proof (cost can be increased)

**Bad:**
- Login slightly slower than plain hash
- Higher CPU usage under load

---

## ADR-023: AuthContext with refreshUser()
**Date:** 2026-02-09
**Status:** Accepted

### Context
Frontend needs centralized auth state management with ability to update user data without re-login.

### Options Considered
1. **Redux/Zustand** - Global state management library
2. **React Context** - Built-in, simpler
3. **Server-side only** - No client state

### Decision
**React Context with refreshUser() method**

### Why This Option Won
- Built-in to React, no extra dependency
- Sufficient for auth state (not complex)
- refreshUser() allows profile updates to reflect immediately
- Works well with Next.js App Router

### Implementation
```typescript
// contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;  // <-- Key addition
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const refreshUser = async () => {
    const response = await fetch('/api/v1/auth/me');
    const data = await response.json();
    setUser(data.user);
  };

  // Used after profile update, password change, etc.
}
```

### Consequences
**Good:**
- Simple implementation
- No extra dependencies
- Header updates immediately after profile changes
- Single source of truth for auth state

**Bad:**
- Context re-renders all consumers on change
- Must wrap app in provider

---

## ADR-024: Settings Page with Tab Navigation
**Date:** 2026-02-09
**Status:** Accepted

### Context
Need to organize user settings (profile, password, account deletion).

### Options Considered
1. **Separate routes** - /settings/profile, /settings/password, /settings/account
2. **Single page with tabs** - /settings with client-side tab switching
3. **Modal dialogs** - Settings in modal overlays

### Decision
**Single /settings route with tab navigation**

### Why This Option Won
- Cleaner URL structure
- Faster navigation between settings (no page reload)
- All settings visible at a glance
- Familiar UX pattern

### Implementation
```typescript
// app/settings/page.tsx
'use client';

const tabs = ['profile', 'password', 'account'] as const;
const [activeTab, setActiveTab] = useState<typeof tabs[number]>('profile');

return (
  <div className={styles.settings}>
    <nav className={styles.tabs}>
      {tabs.map(tab => (
        <button
          key={tab}
          className={activeTab === tab ? styles.active : ''}
          onClick={() => setActiveTab(tab)}
        >
          {tab}
        </button>
      ))}
    </nav>
    <div className={styles.content}>
      {activeTab === 'profile' && <ProfileForm />}
      {activeTab === 'password' && <PasswordForm />}
      {activeTab === 'account' && <DeleteAccountForm />}
    </div>
  </div>
);
```

### Consequences
**Good:**
- Clean single URL
- Fast tab switching
- Related settings grouped
- Mobile-friendly tab bar

**Bad:**
- Cannot link directly to specific tab (could add ?tab= param)
- All tab components loaded (even if not visible)

---

---

## ADR-025: Rating Input as 10 Stars
**Date:** 2026-02-09
**Status:** Accepted

### Context
Need to design user rating input for 1-10 scale.

### Options Considered
1. **5 half-stars** - 10 values mapped to 5 stars with half-star precision
2. **10 full stars** - Direct 1:1 mapping to rating scale
3. **Slider** - Continuous slider from 1-10
4. **Number input** - Simple text/number field

### Decision
**10 clickable full stars with German hover labels**

### Why This Option Won
- Direct, intuitive mapping (star 7 = rating 7)
- No confusion about half-star meaning
- Hover labels provide context (1=Katastrophal, 10=Meisterwerk)
- Familiar interaction pattern
- Works well on mobile (larger tap targets)

### Implementation
```typescript
{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
  <button
    onClick={() => handleRatingClick(value)}
    onMouseEnter={() => setHoveredRating(value)}
  >
    <Star fill={value <= displayRating ? 'currentColor' : 'none'} />
  </button>
))}
```

### Consequences
**Good:**
- Very intuitive
- Works well on all devices
- Clear visual feedback

**Bad:**
- Takes more horizontal space than 5 stars
- May need responsive adjustments

---

## ADR-026: Watchlist Hybrid Mode
**Date:** 2026-02-09
**Status:** Accepted

### Context
Need to migrate localStorage watchlist to backend while maintaining UX for anonymous users.

### Options Considered
1. **Backend only** - Require login to use watchlist
2. **localStorage only** - Keep current implementation
3. **Hybrid mode** - localStorage as cache, backend as source of truth
4. **Progressive enhancement** - localStorage first, sync on login

### Decision
**Hybrid mode with localStorage cache and backend source of truth**

### Why This Option Won
- Anonymous users can still use watchlist immediately
- No data loss for authenticated users (cross-device sync)
- Backend wins on conflicts (simpler merge strategy)
- Seamless transition when user logs in
- Graceful degradation if backend unavailable

### Implementation Strategy
1. Anonymous: Use localStorage only
2. Login: POST /api/v1/watchlist/sync with localStorage data
3. Backend merges (newer timestamp or backend wins)
4. Clear localStorage, use backend data going forward
5. All subsequent changes go directly to backend

### Consequences
**Good:**
- Best of both worlds
- No breaking change for existing users
- Progressive enhancement

**Bad:**
- Slightly more complex frontend logic
- Potential edge cases in sync

---

## ADR-027: Sliding Window Rate Limiting
**Date:** 2026-02-09
**Status:** Accepted

### Context
Need to protect auth endpoints from brute force attacks.

### Options Considered
1. **Fixed window** - Simple counter reset at interval (10:00, 10:01, etc.)
2. **Sliding window** - Rolling time window
3. **Token bucket** - Tokens regenerate over time
4. **Leaky bucket** - Fixed output rate

### Decision
**Redis ZSET-based sliding window algorithm**

### Why This Option Won
- More accurate than fixed window (no burst at boundaries)
- Simpler than token/leaky bucket
- Redis ZSET provides atomic operations
- Natural cleanup with TTL
- Easy to configure per-endpoint

### Implementation
```go
// Key: ratelimit:login:<ip>
// Score: timestamp in milliseconds
// Member: unique request identifier

// Check: ZCard after ZRemRangeByScore (cleanup old)
// Allow: ZAdd new entry, Expire for cleanup
```

### Rate Limits Applied
- Login: 5/minute per IP
- Register: 3/minute per IP
- Token refresh: 10/minute per IP
- Verification email: 10/minute per IP + 3/hour per user

### Consequences
**Good:**
- Accurate rate limiting
- Atomic operations
- Auto-cleanup
- Configurable per endpoint

**Bad:**
- Requires Redis availability
- Memory usage scales with traffic

---

## ADR-028: Soft Delete for Comments
**Date:** 2026-02-09
**Status:** Accepted

### Context
Need to handle comment deletion while preserving discussion context.

### Options Considered
1. **Hard delete** - Remove from database
2. **Soft delete** - Set is_deleted flag
3. **Archive** - Move to separate table
4. **Replace content** - Keep row, replace message with "[deleted]"

### Decision
**Soft delete with is_deleted boolean flag**

### Why This Option Won
- Preserves reply chain integrity
- Enables audit trail for moderation
- Easy to implement and query
- Can show "[deleted]" placeholder in UI
- Recoverable if needed

### Implementation
```sql
-- Column
is_deleted BOOLEAN NOT NULL DEFAULT false

-- Query (exclude deleted unless admin)
WHERE is_deleted = false OR user_id = $currentUserId
```

### Consequences
**Good:**
- Reply chains remain intact
- Audit trail preserved
- Simple implementation

**Bad:**
- Database grows with "deleted" data
- Need to filter in queries

---

## ADR-029: Console Email Service for Development
**Date:** 2026-02-09
**Status:** Accepted

### Context
Need email service for verification without external dependencies in development.

### Options Considered
1. **Real email service** - Use SendGrid/SES from start
2. **Local SMTP** - Run MailHog or similar
3. **Console logging** - Log email content to stdout
4. **File-based** - Write emails to files

### Decision
**Console email service that logs to stdout**

### Why This Option Won
- Zero external dependencies
- Easy to copy verification links from terminal
- Same interface as production service
- No configuration required
- Works in any environment

### Implementation
```go
type ConsoleEmailService struct{}

func (s *ConsoleEmailService) SendVerificationEmail(ctx context.Context, to, username, token string) error {
    url := fmt.Sprintf("http://localhost:3000/verify-email?token=%s", token)
    log.Printf("\n=== VERIFICATION EMAIL ===\nTo: %s\nSubject: Email verifizieren\nLink: %s\n", to, url)
    return nil
}
```

### Production Swap
```go
// Just change the implementation
var emailService EmailService
if config.IsDevelopment {
    emailService = NewConsoleEmailService()
} else {
    emailService = NewSendGridEmailService(config.SendGridAPIKey)
}
```

### Consequences
**Good:**
- Instant development setup
- Easy debugging
- No credentials needed

**Bad:**
- Not testing actual email delivery
- Must swap before production

---

## ADR-030: Database-Based Role Checking
**Date:** 2026-02-10
**Status:** Accepted

### Context
Need to verify admin access for protected admin endpoints.

### Options Considered
1. **JWT Claims** - Embed roles in JWT token
2. **Database Query** - Check user_roles + roles tables on each request
3. **Redis Cache** - Cache role lookups in Redis

### Decision
**Database query via HasRole method in UserRepository**

### Why This Option Won
- Roles can change without requiring token refresh
- Single source of truth in database
- Simple implementation
- No cache invalidation complexity
- Performance acceptable for admin operations (not high-frequency)

### Implementation
```go
// repository/user.go
func (r *UserRepository) HasRole(ctx context.Context, userID int64, role string) (bool, error) {
    query := `
        SELECT EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = $1 AND r.name = $2
        )
    `
    var hasRole bool
    err := r.pool.QueryRow(ctx, query, userID, role).Scan(&hasRole)
    return hasRole, err
}

// middleware/admin.go
func AdminRequired(userRepo *repository.UserRepository) gin.HandlerFunc {
    return func(c *gin.Context) {
        userID := GetUserID(c)
        isAdmin, _ := userRepo.HasRole(c.Request.Context(), userID, "admin")
        if !isAdmin {
            c.AbortWithStatusJSON(403, gin.H{"error": "admin access required"})
            return
        }
        c.Next()
    }
}
```

### Consequences
**Good:**
- Role changes take effect immediately
- No JWT bloat with role claims
- Clear audit trail in database
- Extensible for multiple roles

**Bad:**
- Additional database query per admin request
- Could add Redis caching if performance becomes issue

---

## ADR-031: Admin Routes Under /api/v1/admin/ Prefix
**Date:** 2026-02-10
**Status:** Accepted

### Context
Need to organize admin-only API endpoints.

### Options Considered
1. **/api/admin/v1/** - Separate version prefix for admin
2. **/api/v1/admin/** - Admin as sub-path under versioned API
3. **/admin/api/v1/** - Admin prefix before API

### Decision
**/api/v1/admin/** prefix for all admin endpoints

### Why This Option Won
- Consistent versioning across all endpoints
- Clear hierarchy (API > Version > Feature Area)
- Easy to apply middleware to entire route group
- Matches common REST API conventions

### Implementation
```go
// cmd/server/main.go
admin := r.Group("/api/v1/admin")
admin.Use(middleware.AuthRequired(), middleware.AdminRequired(userRepo))
{
    admin.GET("/stats", adminHandler.GetStats)
    admin.GET("/activity", adminHandler.GetActivity)
    admin.POST("/anime", animeHandler.CreateAnime)
    admin.PUT("/anime/:id", animeHandler.UpdateAnime)
    admin.DELETE("/anime/:id", animeHandler.DeleteAnime)
}
```

### Consequences
**Good:**
- Clean, predictable URL structure
- Single middleware application point
- Easy to document
- Version upgrades affect all endpoints uniformly

**Bad:**
- Slightly longer URLs than dedicated /admin path

---

## ADR-032: Form-Based Anime Editor
**Date:** 2026-02-10
**Status:** Accepted

### Context
Need admin interface for creating and editing anime entries.

### Options Considered
1. **WYSIWYG Editor** - Rich text editor for description, inline image placement
2. **Form-Based Editor** - Standard form inputs for all fields
3. **Markdown Editor** - Markdown input with preview

### Decision
**Standard form-based editor with separate inputs for each field**

### Why This Option Won
- Simpler implementation
- All fields have known types and constraints
- Description field is plain text (HTML handled separately)
- No additional WYSIWYG library required
- Consistent with other admin forms
- Easier validation

### Implementation
```typescript
// components/admin/AnimeEditor.tsx
const AnimeEditor = ({ anime, onSave }) => {
  const [form, setForm] = useState({
    title: anime?.title || '',
    title_de: anime?.title_de || '',
    title_en: anime?.title_en || '',
    type: anime?.type || 'tv',
    status: anime?.status || 'ongoing',
    year: anime?.year || new Date().getFullYear(),
    description: anime?.description || '',
  });

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" value={form.title} onChange={handleChange} />
      <select name="type" value={form.type} onChange={handleChange}>
        <option value="tv">TV Series</option>
        <option value="ova">OVA</option>
        <option value="film">Film</option>
        {/* ... */}
      </select>
      <textarea name="description" value={form.description} onChange={handleChange} />
      <button type="submit">Save</button>
    </form>
  );
};
```

### Consequences
**Good:**
- Fast to implement
- Easy to validate
- Predictable behavior
- Works on all devices

**Bad:**
- No rich text formatting in description
- Limited inline preview
- May need WYSIWYG later for complex content

---

## Pending Decisions

### Database Migration Tool
**Options:** golang-migrate vs goose vs Atlas
**Considerations:**
- golang-migrate: Simple CLI, good Go integration
- goose: Go-native, embeddable
- Atlas: Modern, declarative, more complex
**Recommendation:** golang-migrate (simple, proven)
**Decision needed by:** Before second schema change

### API Documentation
**Options:** OpenAPI/Swagger vs manual documentation
**Decision needed by:** Before external API consumers

### Email Service Provider
**Options:** SendGrid vs AWS SES vs Mailgun
**Considerations:**
- SendGrid: Easy setup, good free tier
- AWS SES: Cheapest at scale, requires AWS
- Mailgun: Good deliverability, API-first
**Recommendation:** SendGrid (simplest for starting)
**Decision needed by:** Before production deployment
