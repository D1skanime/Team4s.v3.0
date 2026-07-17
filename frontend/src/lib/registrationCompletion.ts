// One-shot, session-scoped marker that a registration (not an ordinary login) just
// completed through the validated Keycloak PKCE callback in keycloakAuth.ts. This
// module intentionally exposes no way to set the marker from outside that validated
// callback path: an arbitrary URL/query value must never be able to create it.
const REGISTRATION_COMPLETION_STORAGE_KEY = 'team4s.registration.completed'
const REGISTRATION_COMPLETION_PRESENT_VALUE = '1'

function hasSessionStorage(): boolean {
  return typeof sessionStorage !== 'undefined'
}

/**
 * Creates the one-shot marker. Only `exchangeKeycloakCode` in `keycloakAuth.ts` may
 * call this, and only after a validated registration callback succeeded.
 */
export function markRegistrationCompleted(): void {
  if (!hasSessionStorage()) return
  sessionStorage.setItem(REGISTRATION_COMPLETION_STORAGE_KEY, REGISTRATION_COMPLETION_PRESENT_VALUE)
}

/**
 * Non-destructive check for whether a registration just completed. Used by the login
 * page to decide the post-callback redirect target without consuming the marker, so
 * the account page can still display the one-shot confirmation afterwards.
 */
export function hasPendingRegistrationCompletion(): boolean {
  if (!hasSessionStorage()) return false
  return sessionStorage.getItem(REGISTRATION_COMPLETION_STORAGE_KEY) === REGISTRATION_COMPLETION_PRESENT_VALUE
}

/**
 * Reads and removes the marker in one step. Intended for the account page to render
 * the confirmation exactly once, never again on remount, reload, or query replay.
 */
export function consumeRegistrationCompletion(): boolean {
  if (!hasSessionStorage()) return false
  const pending = sessionStorage.getItem(REGISTRATION_COMPLETION_STORAGE_KEY) === REGISTRATION_COMPLETION_PRESENT_VALUE
  sessionStorage.removeItem(REGISTRATION_COMPLETION_STORAGE_KEY)
  return pending
}

/**
 * Removes the marker without reading it. Used defensively when a login/registration
 * transaction is cancelled or fails, so a stale marker from an earlier attempt can
 * never leak into an unrelated flow.
 */
export function clearRegistrationCompletion(): void {
  if (!hasSessionStorage()) return
  sessionStorage.removeItem(REGISTRATION_COMPLETION_STORAGE_KEY)
}
