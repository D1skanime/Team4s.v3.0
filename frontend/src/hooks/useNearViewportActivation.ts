import { useEffect, useRef, useState } from 'react'

const ACTIVATION_ROOT_MARGIN = '600px 0px'

export function useNearViewportActivation<T extends HTMLElement>(deferActivation = true) {
  const targetRef = useRef<T | null>(null)
  const activatedRef = useRef(!deferActivation)
  const [interactionEnabled, setInteractionEnabled] = useState(!deferActivation)

  useEffect(() => {
    if (activatedRef.current) return

    if (!deferActivation || typeof IntersectionObserver === 'undefined') {
      activatedRef.current = true
      setInteractionEnabled(true)
      return
    }

    const target = targetRef.current
    if (!target) return

    const observer = new IntersectionObserver((entries) => {
      if (activatedRef.current || !entries.some((entry) => entry.isIntersecting)) return

      activatedRef.current = true
      observer.disconnect()
      setInteractionEnabled(true)
    }, { rootMargin: ACTIVATION_ROOT_MARGIN })

    observer.observe(target)
    return () => observer.disconnect()
  }, [deferActivation])

  return { targetRef, interactionEnabled }
}
