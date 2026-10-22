// Reine, DOM-freie Breakpoint-/Layout-Entscheidung fuer die Projektkarten auf der
// oeffentlichen Gruppenseite. Die Breakpoint-Grenzen (639/640, 999/1000) sind bewusst
// exakt an die bestehenden Medienqueries des Medien-Kachelrasters angelehnt
// (`.mediaItemGrid` in FansubPublicSections.module.css: `max-width: 999px` -> Tablet,
// `max-width: 639px` -> Mobile), damit Projekt- und Medienraster bei derselben Breite
// umschalten.

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

export const COLUMNS_BY_BREAKPOINT: Record<Breakpoint, 1 | 2 | 3> = {
  mobile: 1,
  tablet: 2,
  desktop: 3,
}

export function resolveBreakpoint(width: number): Breakpoint {
  if (width >= 1000) return 'desktop'
  if (width >= 640) return 'tablet'
  return 'mobile'
}

export type ProjectsLayoutMode = 'grid' | 'carousel-peek' | 'scroll-strip'

export type ProjectsLayoutDecision = {
  mode: ProjectsLayoutMode
  columns: 1 | 2 | 3
}

export function decideProjectsLayout(
  projectCount: number,
  breakpoint: Breakpoint,
): ProjectsLayoutDecision {
  if (projectCount <= 1) {
    return { mode: 'grid', columns: COLUMNS_BY_BREAKPOINT[breakpoint] }
  }
  if (breakpoint === 'mobile') {
    return { mode: 'carousel-peek', columns: 1 }
  }
  const columns = COLUMNS_BY_BREAKPOINT[breakpoint]
  return { mode: projectCount <= columns ? 'grid' : 'scroll-strip', columns }
}
