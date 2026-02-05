# Tomorrow's Plan - 2026-02-06

## Top 3 Priorities

### 1. Search Endpoint implementieren
Full-Text-Suche ueber Anime-Titel.

**Backend:**
```go
// GET /api/v1/anime/search?q=attack
func (h *AnimeHandler) Search(c *gin.Context)
```

**Anforderungen:**
- Suche in: title, title_de, title_en
- Mindestens 2 Zeichen Query
- Pagination wie bei List
- Case-insensitive

**PostgreSQL Query:**
```sql
SELECT * FROM anime
WHERE title ILIKE '%query%'
   OR title_de ILIKE '%query%'
   OR title_en ILIKE '%query%'
LIMIT 24 OFFSET 0;
```

---

### 2. Filter-UI im Frontend
Erweiterte Filter fuer Anime-Liste.

**Komponente:** `src/components/anime/AnimeFilters.tsx`

**Filter-Optionen:**
- Status: ongoing, done, aborted, licensed
- Type: tv, ova, film, special, ona
- Content Type: anime, hentai (Toggle)

**Design:**
- Kompaktes Dropdown/Chip-UI
- Filter in URL als Query-Parameter
- Kompatibel mit A-Z Navigation

---

### 3. Related Anime Section
Zeige verwandte Anime auf Detail-Page.

**Backend:**
```go
// GET /api/v1/anime/:id/relations
type AnimeRelation struct {
    RelatedAnimeID int64  `json:"related_anime_id"`
    RelationType   string `json:"relation_type"`
    Title          string `json:"title"`
    CoverImage     string `json:"cover_image"`
}
```

**Frontend:**
- Horizontale Scroll-Liste unter Episoden
- Relation-Type als Badge (Sequel, Prequel, etc.)

---

## First 15-Minute Task

**Route fuer Search hinzufuegen:**

1. In `cmd/server/main.go`:
```go
v1.GET("/anime/search", animeHandler.Search)
```

2. In `internal/handlers/anime.go`:
```go
func (h *AnimeHandler) Search(c *gin.Context) {
    q := c.Query("q")
    if len(q) < 2 {
        c.JSON(400, gin.H{"error": "query too short"})
        return
    }
    // TODO: implement
}
```

3. Kompilieren + testen

---

## Dependencies to Unblock Early

1. **Docker running** - `docker ps` zeigt postgres Container
2. **Backend running** - Port 8080
3. **Frontend running** - Port 3000 mit `npm run dev`

---

## If Ahead of Schedule

### Anime Watchlist (P1-3)
- Watchlist-Status Toggle auf Detail-Page
- Erfordert: Auth-Session pruefen
- Vereinfacht: Lokaler State ohne Backend

### Episode Detail View (P1-4)
- Stream-Links parsen und anzeigen
- Fansub-Info (wenn vorhanden)

### Responsive Polish
- Mobile Navigation
- Touch-friendly Filter
- Swipe fuer Pagination

---

## Verification Checklist

Nach Abschluss der Prioritaeten:
- [ ] `/api/v1/anime/search?q=attack` liefert Ergebnisse
- [ ] Filter-UI aendert URL-Parameter
- [ ] Related Anime werden auf Detail-Page angezeigt
- [ ] Keine Regression bei bestehenden Features

---

## P1 Feature Roadmap (Reference)

| ID | Feature | Status |
|----|---------|--------|
| P1-1 | Anime Search | TODO |
| P1-2 | Advanced Filters | TODO |
| P1-3 | Anime Relations | TODO |
| P1-4 | Episode Detail | TODO |
| P1-5 | Watchlist UI | TODO |
| P1-6 | Rating Display | TODO |
