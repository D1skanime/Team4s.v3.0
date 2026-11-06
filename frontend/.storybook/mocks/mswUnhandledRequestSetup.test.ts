import { describe, expect, it, vi } from 'vitest'

import { isCommonStorybookRequest, onUnhandledRequestStrict } from './mswUnhandledRequestSetup'

function fakePrint() {
  return { warning: vi.fn(), error: vi.fn() }
}

describe('isCommonStorybookRequest', () => {
  it.each([
    'http://localhost:6006/iframe.html',
    'http://localhost:6006/sb-common-assets/favicon.svg',
    'http://localhost:6006/@vite/client',
    'http://localhost:6006/node_modules/.vite/deps/@react-refresh',
    'http://localhost:6006/virtual:storybook-stories.json',
    'http://localhost:6006/src/components/ui/Button.stories.tsx',
    'http://localhost:6006/fonts/icon.eot',
    'http://localhost:6006/src/components/ui/Button.mdx',
  ])('erkennt %s als Storybook-/Build-Rauschen', (url) => {
    expect(isCommonStorybookRequest(new Request(url))).toBe(true)
  })

  it('erkennt eine echte API-Anfrage NICHT als Rauschen', () => {
    expect(isCommonStorybookRequest(new Request('http://localhost:6006/api/v1/me/profile'))).toBe(false)
  })
})

describe('onUnhandledRequestStrict', () => {
  it('meldet einen echten, nicht gemockten API-Request als Fehler statt nur als Warnung', () => {
    const print = fakePrint()
    onUnhandledRequestStrict(new Request('http://localhost:6006/api/v1/this-endpoint-is-never-mocked'), print)
    expect(print.error).toHaveBeenCalledOnce()
    expect(print.warning).not.toHaveBeenCalled()
  })

  it('ignoriert Storybooks eigenes Asset-/HMR-Rauschen weiterhin vollständig (weder Fehler noch Warnung)', () => {
    const print = fakePrint()
    onUnhandledRequestStrict(new Request('http://localhost:6006/iframe.html'), print)
    expect(print.error).not.toHaveBeenCalled()
    expect(print.warning).not.toHaveBeenCalled()
  })
})
