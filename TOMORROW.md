# Tomorrow's Plan - 2026-02-10

## Top 3 Priorities

### 1. P2-3: User Ratings Implementation
Benutzer sollen eigene Bewertungen fuer Anime abgeben koennen.

**Backend:**
```go
// Rating Handler erweitern
POST /api/v1/anime/:id/ratings    - Bewertung abgeben/aktualisieren
GET  /api/v1/anime/:id/ratings/me - Eigene Bewertung abrufen
DELETE /api/v1/anime/:id/ratings  - Bewertung loeschen
```

**Frontend:**
- RatingInput Komponente (klickbare Sterne)
- Integration in AnimeDetail Page
- Aktualisierung der Gesamtbewertung nach Submit

**Aufgaben:**
1. Backend: Rating Handler mit Create/Update/Delete
2. Backend: Rating Repository erweitern
3. Frontend: RatingInput Komponente
4. Frontend: Integration mit AuthContext (nur eingeloggt)
5. Frontend: Optimistic UI Update

---

### 2. P2-4: Watchlist Backend Sync
localStorage Watchlist zu Backend migrieren.

**Backend:**
```go
POST   /api/v1/watchlist           - Anime zur Watchlist hinzufuegen
GET    /api/v1/watchlist           - Eigene Watchlist abrufen
PUT    /api/v1/watchlist/:animeId  - Status aendern
DELETE /api/v1/watchlist/:animeId  - Von Watchlist entfernen
```

**Frontend:**
- WatchlistContext fuer zentralen State
- Migration von localStorage bei Login
- Sync bei jeder Aenderung
- Offline-Fallback auf localStorage

**Aufgaben:**
1. Backend: Watchlist Handler implementieren
2. Backend: Watchlist Repository
3. Frontend: WatchlistContext erstellen
4. Frontend: Migration-Logic bei Login
5. Frontend: WatchlistButton anpassen

---

### 3. Rate Limiting fuer Auth Endpoints
Schutz gegen Brute-Force Angriffe.

**Implementation:**
```go
// middleware/ratelimit.go
type RateLimiter struct {
    redis  *redis.Client
    limit  int           // Anfragen pro Zeitfenster
    window time.Duration // Zeitfenster
}

// 5 Versuche pro Minute pro IP fuer Login
// 3 Versuche pro Minute pro IP fuer Register
```

**Aufgaben:**
1. RateLimiter Middleware erstellen
2. Redis-basierter Counter
3. Anwenden auf /auth/login und /auth/register
4. Error Response mit Retry-After Header

---

## First 15-Minute Task

**RatingInput Komponente Skeleton erstellen:**

1. Erstelle `frontend/src/components/anime/RatingInput.tsx`:
```typescript
'use client';

import { useState } from 'react';
import styles from './RatingInput.module.css';

interface RatingInputProps {
  animeId: number;
  currentRating?: number;
  onRatingChange?: (rating: number) => void;
}

export default function RatingInput({
  animeId,
  currentRating,
  onRatingChange
}: RatingInputProps) {
  const [rating, setRating] = useState(currentRating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClick = async (value: number) => {
    // TODO: Implement API call
    setRating(value);
    onRatingChange?.(value);
  };

  return (
    <div className={styles.container}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
        <button
          key={value}
          className={`${styles.star} ${value <= (hoveredRating || rating) ? styles.filled : ''}`}
          onMouseEnter={() => setHoveredRating(value)}
          onMouseLeave={() => setHoveredRating(0)}
          onClick={() => handleClick(value)}
          disabled={isSubmitting}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
```

2. Erstelle `frontend/src/components/anime/RatingInput.module.css`
3. Teste Kompilierung mit `npm run build`

---

## Dependencies to Unblock Early

1. **Rating Repository bereits vorhanden**
   - `backend/internal/repository/rating.go` existiert
   - Nur Handler fehlt

2. **Watchlist Table existiert**
   - Schema mit user_id, anime_id, status
   - 716 Legacy-Eintraege migriert

3. **Redis bereits konfiguriert**
   - Verbindung in `database/redis.go`
   - Kann fuer Rate Limiting wiederverwendet werden

4. **Docker running**
   ```bash
   docker ps
   # Zeigt: postgres, redis, adminer
   ```

---

## If Ahead of Schedule

### P2-5: Comments System
- GET /api/v1/anime/:id/comments - Kommentare laden
- POST /api/v1/anime/:id/comments - Kommentar schreiben
- DELETE /api/v1/comments/:id - Eigenen Kommentar loeschen (oder Mod)
- CommentList und CommentForm Komponenten

### Password Reset Flow
- POST /api/v1/auth/forgot-password
- POST /api/v1/auth/reset-password
- Token per Email (spaeter)

### Avatar Upload
- Multipart Form statt URL
- Lokale Speicherung oder S3
- Image Resize/Crop

---

## Verification Checklist

Nach Abschluss der Prioritaeten:
- [ ] User kann Anime bewerten (1-10)
- [ ] Bewertung wird in DB gespeichert
- [ ] Gesamtbewertung aktualisiert sich
- [ ] Watchlist wird bei Login synchronisiert
- [ ] localStorage wird nach Sync geleert
- [ ] Rate Limiting blockiert nach 5 Versuchen
- [ ] Retry-After Header wird gesendet

---

## P2 Feature Roadmap (Reference)

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| P2-1 | Auth (Login/Register) | HIGH | DONE |
| P2-2 | User Profile | MEDIUM | DONE |
| P2-3 | User Ratings | MEDIUM | TODO |
| P2-4 | Watchlist Sync | MEDIUM | TODO |
| P2-5 | Comments | LOW | TODO |

---

## Technical Notes

### Rating API Design
```json
// POST /api/v1/anime/:id/ratings
// Request
{
  "rating": 8
}

// Response
{
  "id": 123,
  "anime_id": 456,
  "user_id": 1,
  "rating": 8,
  "created_at": "2026-02-10T10:00:00Z"
}
```

### Watchlist Sync Strategy
1. Bei Login: localStorage lesen
2. Fuer jeden Eintrag: POST an Backend
3. Bei Konflikt: Backend-Version gewinnt (neuerer Timestamp)
4. Nach Sync: localStorage leeren
5. Danach: Alle Aenderungen direkt an Backend

### Rate Limiter Redis Keys
```
ratelimit:login:192.168.1.1   -> Counter (TTL: 60s)
ratelimit:register:192.168.1.1 -> Counter (TTL: 60s)
```

---

## Questions to Resolve

1. **Rating Update vs Create?**
   - Option A: Separater PUT Endpoint
   - Option B: POST macht Upsert
   - Empfehlung: Option B (einfacher fuer Frontend)

2. **Watchlist Konfliktloesung?**
   - Option A: Server gewinnt immer
   - Option B: Neuester Timestamp gewinnt
   - Option C: User entscheidet
   - Empfehlung: Option B

3. **Rate Limit Response Code?**
   - 429 Too Many Requests (Standard)
   - Retry-After Header mit Sekunden
