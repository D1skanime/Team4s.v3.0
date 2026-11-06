// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'

import { AUTH_TOKEN_COOKIE_NAME } from '@/lib/api/client'

import { installAuthCookieSandbox } from './cookieSandbox'

describe('installAuthCookieSandbox', () => {
  afterEach(() => {
    // Jede Testdatei startet mit einem frischen jsdom-`document` (Vitest-Isolation), daher
    // reicht es, den eigenen überschriebenen Accessor zurückzusetzen, falls ein Test ihn
    // installiert hat -- verhindert Überschneidungen zwischen den Testfällen dieser Datei.
    const nativeDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')
    if (nativeDescriptor) {
      Object.defineProperty(document, 'cookie', nativeDescriptor)
    }
    document.cookie.split(';').forEach((entry) => {
      const name = entry.split('=')[0]?.trim()
      if (name) document.cookie = `${name}=; Max-Age=0; Path=/`
    })
  })

  it('hält den Auth-Cookie vollständig aus dem echten Browser-Cookie-Speicher heraus', () => {
    const nativeDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')
    const nativeGet = nativeDescriptor!.get!.bind(document)

    installAuthCookieSandbox()
    document.cookie = `${AUTH_TOKEN_COOKIE_NAME}=storybook-secret; Path=/; Max-Age=3600; SameSite=Lax`

    // Über den (jetzt überschriebenen) öffentlichen Accessor ist der Wert sichtbar -- das ist
    // genau das Verhalten, das `useAuthSession`/`readBrowserCookie` innerhalb von Storybook sehen
    // sollen (die Rollen-Simulation muss weiterhin funktionieren).
    expect(document.cookie).toContain(`${AUTH_TOKEN_COOKIE_NAME}=storybook-secret`)

    // Der NATIVE Accessor (vor der Sandbox gespeichert) darf den Wert NIE gesehen haben -- das
    // ist der eigentliche Sicherheits-Nachweis: ein Request oder eine andere Browser-Instanz, die
    // den echten Cookie-Speicher dieses Hosts liest, bekommt den Storybook-Demo-Token nicht zu
    // Gesicht, selbst wenn Storybook und die echte App dieselbe Host-Cookie-Domäne teilen.
    expect(nativeGet()).not.toContain('storybook-secret')
  })

  it('lässt nicht-sandboxed Cookies unverändert durch den nativen Speicher laufen', () => {
    const nativeDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')
    const nativeGet = nativeDescriptor!.get!.bind(document)

    installAuthCookieSandbox()
    document.cookie = 'ein_anderer_cookie=unveraendert; Path=/'

    expect(nativeGet()).toContain('ein_anderer_cookie=unveraendert')
    expect(document.cookie).toContain('ein_anderer_cookie=unveraendert')
  })

  it('entfernt den sandboxed Cookie wieder, wenn er mit Max-Age=0 gelöscht wird', () => {
    installAuthCookieSandbox()
    document.cookie = `${AUTH_TOKEN_COOKIE_NAME}=temporaer; Path=/; Max-Age=3600; SameSite=Lax`
    expect(document.cookie).toContain(AUTH_TOKEN_COOKIE_NAME)

    document.cookie = `${AUTH_TOKEN_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`
    expect(document.cookie).not.toContain(AUTH_TOKEN_COOKIE_NAME)
  })
})
