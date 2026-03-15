# UX Review: AnimeDetail Redesign

## Status: APPROVED

## Layout-Validierung

### Responsive Breakpoints (finalisiert)

| Breakpoint | Container | Poster | Grid |
|------------|-----------|--------|------|
| >= 1024px  | max-width: 1200px | 260px | 260px + 1fr |
| 768-1023px | max-width: 100% - 48px | 220px | 220px + 1fr |
| < 768px    | 100% - 32px | 180px centered | single column |

### Touch Targets
- Watchlist Button: 46px height - OK (>44px minimum)
- Genre Chips: 6px + content + 6px - Erhoehe auf 8px padding fuer bessere Touch-Targets
- Related Cards: 160x220px - OK
- Navigation Links: Standard-Groesse beibehalten

### Glassmorphism Accessibility

**Problem**: backdrop-filter kann Performance-Probleme verursachen und Kontrast reduzieren.

**Loesung**:
1. Fallback-Background fuer Browser ohne backdrop-filter Support
2. Text-Kontrast sicherstellen mit text-shadow oder dunkleren Backgrounds
3. `@supports` Query fuer backdrop-filter

```css
.heroContainer {
  /* Fallback */
  background: rgba(30, 30, 35, 0.95);
}

@supports (backdrop-filter: blur(20px)) {
  .heroContainer {
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(20px);
  }
}
```

### Fokus-States

Alle interaktiven Elemente benoetigen sichtbare Fokus-Indikatoren:

```css
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

### Farb-Kontrast

- Titel auf Glassmorphism: Weiss (#fff) - Kontrast OK bei dunklem Overlay
- Description: rgba(255,255,255,0.85) - OK
- Badges: Heller Hintergrund mit dunklem Text - Invertieren fuer Dark-Theme

## Empfehlungen

### 1. Banner-Hoehe responsiv machen
```css
.heroBanner {
  height: clamp(280px, 35vh, 420px);
}
```

### 2. Poster-Fade verstaerken
Originale 120px Fade ist zu subtil. Empfehlung: 160px mit staerkerem Gradient.

### 3. Related Section Scroll-Padding
Horizontaler Scroll braucht Padding damit letzte Card nicht am Rand klebt:
```css
.relatedSlider {
  padding-right: 24px;
  scroll-padding-inline: 24px;
}
```

### 4. Reduced Motion Support
```css
@media (prefers-reduced-motion: reduce) {
  .relationCard:hover {
    transform: none;
  }
}
```

## Finale Design-Tokens

```css
/* Banner */
--banner-height: clamp(280px, 35vh, 420px);
--banner-blur: 20px;

/* Hero Container */
--hero-bg: rgba(30, 30, 35, 0.92);
--hero-bg-glass: rgba(255, 255, 255, 0.08);
--hero-backdrop-blur: blur(20px);
--hero-radius: 24px;
--hero-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);

/* Grid */
--poster-width-lg: 260px;
--poster-width-md: 220px;
--poster-width-sm: 180px;

/* Poster Fade */
--poster-fade-height: 160px;

/* Watchlist Button */
--watchlist-height: 46px;
--watchlist-radius: 24px;
--watchlist-gradient: linear-gradient(90deg, #ffb36b, #ff8a4c);

/* Genre Chips */
--chip-padding: 8px 14px;
--chip-radius: 14px;
--chip-bg: rgba(255, 255, 255, 0.12);
--chip-border: 1px solid rgba(255, 255, 255, 0.2);

/* Related Cards */
--related-card-width: 160px;
--related-card-height: 220px;
--related-card-radius: 12px;
```

## Approved Changes
- Layout wie spezifiziert
- Breakpoints wie oben definiert
- Accessibility-Verbesserungen integrieren
- Responsive Banner-Hoehe
