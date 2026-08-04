import { useCallback, useEffect, useRef, useState } from 'react'

const ACTIVATION_ROOT_MARGIN = '600px 0px'

export function useNearViewportActivation<T extends HTMLElement>(deferActivation = true) {
  const targetElementRef = useRef<T | null>(null)
  const activatedRef = useRef(!deferActivation)
  const [interactionEnabled, setInteractionEnabled] = useState(!deferActivation)
  const targetRef = useCallback((target: T | null) => {
    targetElementRef.current = target
    if (!target || activatedRef.current || (deferActivation && typeof IntersectionObserver !== 'undefined')) return

    activatedRef.current = true
    setInteractionEnabled(true)
  }, [deferActivation])

  useEffect(() => {
    if (activatedRef.current || !deferActivation || typeof IntersectionObserver === 'undefined') return

    const target = targetElementRef.current
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
