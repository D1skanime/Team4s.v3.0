'use client'

import { useEffect, useState } from 'react'

import { resolveBreakpoint, type Breakpoint } from './fansubProjectsLayout'

// Startet mit 'desktop' (identischer Wert auf Server und erstem Client-Render), damit
// kein Hydration-Mismatch entsteht. Die tatsaechliche Breite wird erst nach dem Mount
// per Effekt ermittelt und danach bei jedem Resize aktualisiert.
export function useFansubProjectsBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop')

  useEffect(() => {
    const updateFromWindow = () => setBreakpoint(resolveBreakpoint(window.innerWidth))
    updateFromWindow()
    window.addEventListener('resize', updateFromWindow)
    return () => window.removeEventListener('resize', updateFromWindow)
  }, [])

  return breakpoint
}
