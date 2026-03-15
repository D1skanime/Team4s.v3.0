# AnimeDetail Page Redesign

## Status: IN PROGRESS

## Ziel
Komplettes Redesign der AnimeDetail-Seite im Stil von AniList/Netflix/Plex mit Glassmorphism-Design.

## Layout-Spezifikation

```
------------------------------------------------------------
BANNER (blurred background image, 380px height)
------------------------------------------------------------

            HERO CONTAINER (glass card, glassmorphism)

   +---------------+   +-------------------------------+
   |               |   |                               |
   |               |   |  Title                        |
   |               |   |  [Status] [TV] [Anime] [2007] |
   |               |   |                               |
   |   POSTER      |   |  Description                  |
   |   (260px)     |   |                               |
   |   fade out    |   |                               |
   |   bottom      |   |  Views / Episodes             |
   |               |   |                               |
   +---------------+   +-------------------------------+

   [ + Zur Watchlist ] (gradient button, full width)

   Genres:
   [Fantasy] [Comedy] [Romance] (chips)

   -------------------------------------------------- (divider)

   Related
   [poster] [poster] [poster] [poster] [poster] (horizontal scroll)
```

## Design Tokens (neu/angepasst)

### Banner
- height: 380px
- filter: blur(20px)
- overlay: linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.2))

### Hero Container (Glassmorphism)
- background: rgba(255,255,255,0.1)
- backdrop-filter: blur(20px)
- border-radius: 24px
- box-shadow: 0 8px 32px rgba(0,0,0,0.3)

### Grid Layout
- grid-template-columns: 260px 1fr

### Poster
- width: 260px
- fade overlay: linear-gradient(to bottom, transparent, rgba(0,0,0,0.85))
- fade height: 120px

### Watchlist Button
- width: 100%
- height: 46px
- border-radius: 24px
- background: linear-gradient(90deg, #ffb36b, #ff8a4c)

### Genre Chips
- padding: 6px 12px
- border-radius: 14px
- background: rgba(255,255,255,0.1)
- border: 1px solid rgba(255,255,255,0.2)

### Related Cards
- width: 160px
- height: 220px
- border-radius: 12px
- gradient overlay with title at bottom

## Dateien

### Zu aendern
1. `frontend/src/app/anime/[id]/page.tsx` - Komplett neu
2. `frontend/src/app/anime/[id]/page.module.css` - Komplett neu
3. `frontend/src/components/anime/AnimeRelations.tsx` - Anpassen
4. `frontend/src/components/anime/AnimeRelations.module.css` - Anpassen

### Zu behalten
- API-Calls bleiben identisch
- Bestehende Komponenten (WatchlistAddButton, StatusBadge, etc.)

## HTML Struktur (neu)

```html
<main class="page">
  <!-- Banner mit Blur-Hintergrund -->
  <div class="heroBanner">
    <div class="bannerImage" style="background-image: url(...)"></div>
    <div class="bannerOverlay"></div>
  </div>

  <!-- Hero Container (Glassmorphism Card) -->
  <section class="heroContainer">
    <!-- 2-Column Grid -->
    <div class="heroTop">
      <!-- Left: Poster Column -->
      <div class="posterColumn">
        <div class="posterWrapper">
          <Image ... class="poster" />
          <div class="posterFade"></div>
        </div>
        <WatchlistButton class="watchlistButton" />
        <div class="genres">
          <span class="genreChip">Fantasy</span>
          ...
        </div>
      </div>

      <!-- Right: Info Card -->
      <div class="infoCard">
        <h1 class="title">...</h1>
        <div class="badges">
          <StatusBadge />
          <span class="badge">TV</span>
          ...
        </div>
        <p class="description">...</p>
        <div class="stats">...</div>
      </div>
    </div>

    <!-- Divider -->
    <hr class="divider" />

    <!-- Related Section -->
    <section class="relatedSection">
      <h2>Related</h2>
      <div class="relatedSlider">
        <RelatedCard />
        ...
      </div>
    </section>
  </section>

  <!-- Episodes Section (bleibt ausserhalb) -->
  <section class="episodesSection">...</section>
</main>
```

## Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| >= 992px   | 2-column grid (260px + 1fr) |
| 768-991px  | 2-column grid (200px + 1fr) |
| < 768px    | Single column, poster centered |

## Tasks

### 1. UX Review (team4s-ux)
- [ ] Layout-Validierung
- [ ] Responsive-Breakpoints definieren
- [ ] Accessibility pruefen

### 2. Frontend Implementation (team4s-frontend)
- [ ] page.tsx neu schreiben
- [ ] page.module.css komplett neu
- [ ] AnimeRelations.tsx anpassen
- [ ] AnimeRelations.module.css anpassen

### 3. Integration Test
- [ ] Visueller Check
- [ ] Responsive Test
- [ ] Funktionalitaet (Watchlist, Links, etc.)

## Abhaengigkeiten
- WatchlistAddButton: Styling anpassen (gradient button)
- StatusBadge: Bleibt unveraendert
- AnimeBackdropRotator: Wird ersetzt durch statisches Banner

## Notizen
- API bleibt unveraendert (team4s-go: keine Aenderungen)
- Genres kommen aus anime.genres (falls vorhanden)
- Falls keine Genres: Section ausblenden
