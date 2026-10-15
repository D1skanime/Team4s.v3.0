/**
 * Merges two CSS-module style objects so that a component's own classes take
 * precedence over a shared/base module, while still falling back to the
 * shared module for keys the component does not override itself.
 *
 * Generalizes the Proxy-based merge pattern already used in
 * `frontend/src/components/ui/Select.tsx` (own ?? shared lookup via a Proxy `get` trap)
 * so that every CSS-module merge in the codebase uses exactly one implementation.
 *
 * Nestable for 3+-way merges: `mergeCssModules(a, mergeCssModules(b, c))`
 * resolves keys in priority order a > b > c.
 */
export function mergeCssModules<T extends Record<string, string>>(own: T, shared: T): T {
  return new Proxy({} as T, {
    get: (_target, prop: string) => own[prop as keyof T] ?? shared[prop as keyof T],
  })
}
