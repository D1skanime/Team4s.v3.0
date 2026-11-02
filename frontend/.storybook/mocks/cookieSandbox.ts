import { AUTH_DISPLAY_NAME_COOKIE_NAME, AUTH_REFRESH_COOKIE_NAME, AUTH_TOKEN_COOKIE_NAME } from '@/lib/api/client'

/**
 * Isoliert die Rollen-Simulation vollständig vom echten Browser-Cookie-Speicher.
 *
 * `persistAuthSession`/`clearAuthSession` (@/lib/api) schreiben echte `document.cookie`-Einträge
 * ohne `Domain`-Attribut -- nach RFC 6265 sind Cookies NICHT portgebunden, nur an den Hostnamen.
 * Storybook (Port 6006) und das echte Frontend (Port 3000) laufen auf demselben Host. Ohne diese
 * Isolierung würde jedes Öffnen von Storybook im selben Browserprofil eine echte, laufende
 * Team4s-Sitzung sofort zerstören -- die Standard-Rolle "anonym" ruft `clearAuthSession()` bereits
 * beim allerersten Story-Render auf, ganz ohne dass jemand den Rollen-Umschalter berührt.
 *
 * Überschreibt `document.cookie` NUR innerhalb des Storybook-Preview-Bundles (dieses Modul wird
 * nie in den Next.js-Produktions-Build eingebunden) und NUR für die drei bekannten
 * Auth-Cookie-Namen -- jeder andere Cookie-Lese-/Schreibzugriff läuft unverändert über den
 * nativen Browser-Mechanismus. `localStorage`/`BroadcastChannel` (die anderen beiden Kanäle in
 * `client.ts`s Cross-Tab-Benachrichtigung) sind bereits ungefährlich, da sie -- anders als
 * Cookies -- vom Browser vollständig originscoped (inkl. Port) gehalten werden.
 */
const SANDBOXED_COOKIE_NAMES: ReadonlySet<string> = new Set([
  AUTH_TOKEN_COOKIE_NAME,
  AUTH_REFRESH_COOKIE_NAME,
  AUTH_DISPLAY_NAME_COOKIE_NAME,
])

let installed = false

function parseCookieAssignment(cookieString: string): { name: string; value: string; maxAge: number } {
  const [pair, ...attributes] = cookieString.split(';').map((part) => part.trim())
  const separatorIndex = pair.indexOf('=')
  const name = separatorIndex === -1 ? pair : pair.slice(0, separatorIndex)
  const value = separatorIndex === -1 ? '' : pair.slice(separatorIndex + 1)
  const maxAgeAttribute = attributes.find((attribute) => attribute.toLowerCase().startsWith('max-age='))
  const maxAge = maxAgeAttribute ? Number(maxAgeAttribute.slice('max-age='.length)) : -1
  return { name, value, maxAge }
}

/** Einmalig beim Laden des Storybook-Previews aufrufen, bevor die erste Story rendert. */
export function installAuthCookieSandbox(): void {
  if (installed || typeof document === 'undefined') {
    return
  }

  const nativeDescriptor =
    Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') ?? Object.getOwnPropertyDescriptor(document, 'cookie')
  if (!nativeDescriptor?.get || !nativeDescriptor?.set) {
    // Kein bekannter Cookie-Accessor gefunden (z. B. ungewöhnliche Testumgebung) -- lieber
    // nichts überschreiben, als eine falsche Annahme über die Browser-Implementierung zu treffen.
    return
  }
  const nativeGet = nativeDescriptor.get.bind(document)
  const nativeSet = nativeDescriptor.set.bind(document)
  const sandboxStore = new Map<string, string>()
  installed = true

  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get() {
      const native = nativeGet()
      const sandboxed = Array.from(sandboxStore.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join('; ')
      if (!sandboxed) return native
      return native ? `${native}; ${sandboxed}` : sandboxed
    },
    set(cookieString: string) {
      const { name, value, maxAge } = parseCookieAssignment(cookieString)
      if (SANDBOXED_COOKIE_NAMES.has(name)) {
        if (maxAge === 0 || !value) {
          sandboxStore.delete(name)
        } else {
          sandboxStore.set(name, value)
        }
        return
      }
      nativeSet(cookieString)
    },
  })
}
