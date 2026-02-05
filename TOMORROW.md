# Tomorrow's Plan - 2026-02-07

## Top 3 Priorities

### 1. Status/Type Filter im Frontend
Erweiterte Filter fuer die Anime-Liste.

**Komponente:** `src/components/anime/AnimeFilters.tsx`

**Filter-Optionen:**
- Status: ongoing, done, aborted, licensed
- Type: tv, ova, film, special, ona

**Backend:** Bereits unterstuetzt via Query-Parameter:
```bash
curl "http://localhost:8080/api/v1/anime?status=ongoing&type=tv"
```

**Frontend-Aufgaben:**
1. Filter-Komponente erstellen
2. URL-State synchronisieren
3. Mit A-Z Navigation kombinieren

---

### 2. Related Anime Section
Zeige verwandte Anime auf der Detail-Page.

**Backend:**
```go
// GET /api/v1/anime/:id/relations
// Repository: GetRelations(animeID int64)
// Nutzt anime_relations Tabelle (2.323 records)
```

**Frontend:**
- Horizontale Scroll-Liste unter Episoden
- Relation-Type als Badge (Sequel, Prequel, etc.)
- Klickbare Cover-Cards

---

### 3. Episode Detail View
Einzelne Episode mit Stream-Links.

**Backend:**
```go
// GET /api/v1/episodes/:id
type EpisodeDetail struct {
    Episode
    StreamLinks []StreamLink `json:"stream_links"`
}
```

**Frontend:**
- Route: `/episode/:id`
- Stream-Links parsen (legacy HTML -> strukturiert)
- Fansub-Progress anzeigen

---

## First 15-Minute Task

**Filter-Komponente erstellen:**

1. Erstelle `src/components/anime/AnimeFilters.tsx`:
```tsx
'use client';
import { useRouter, useSearchParams } from 'next/navigation';

const STATUS_OPTIONS = ['ongoing', 'done', 'aborted', 'licensed'];
const TYPE_OPTIONS = ['tv', 'ova', 'film', 'special', 'ona'];

export default function AnimeFilters() {
  // URL-Parameter lesen und setzen
}
```

2. In `/anime/page.tsx` einbinden
3. Testen mit verschiedenen Kombinationen

---

## Dependencies to Unblock Early

1. **Docker running** - `docker ps` zeigt postgres Container
2. **Backend running** - Port 8080
3. **Frontend running** - Port 3000 mit `npm run dev`
4. **anime_relations Daten pruefen** - 2.323 records vorhanden

---

## If Ahead of Schedule

### Watchlist Toggle (P1-5)
- Button auf Anime-Detail-Page
- Lokal ohne Auth (localStorage)
- Spaeter: Backend-Integration

### Search Verbesserungen
- Debounce bei Eingabe
- Suchvorschlaege/Autocomplete
- Highlight matched text

### Mobile Navigation
- Hamburger Menu
- Touch-friendly Filter
- Swipe fuer Pagination

---

## Verification Checklist

Nach Abschluss der Prioritaeten:
- [ ] Filter-UI aendert URL-Parameter korrekt
- [ ] Backend gibt gefilterte Ergebnisse zurueck
- [ ] Related Anime werden auf Detail-Page angezeigt
- [ ] Episode-Detail zeigt Stream-Links
- [ ] Keine Regression bei Search Feature

---

## P1 Feature Roadmap (Reference)

| ID | Feature | Status |
|----|---------|--------|
| P1-1 | Anime Search | DONE |
| P1-2 | Advanced Filters | TODO |
| P1-3 | Anime Relations | TODO |
| P1-4 | Episode Detail | TODO |
| P1-5 | Watchlist UI | TODO |
| P1-6 | Rating Display | TODO |
