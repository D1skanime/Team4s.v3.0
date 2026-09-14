// Shared prefers-reduced-motion-aware in-page scroll helper. Extracted verbatim from the
// mechanic formerly inline in the now-deleted project-member sticky nav component (GAP-02 V6)
// so it has exactly one implementation instead of a copy-paste duplicate.
export function scrollToSection(id: string): void {
  if (typeof document === 'undefined') return
  const el = document.getElementById(id)
  if (!el) return
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' })
}
