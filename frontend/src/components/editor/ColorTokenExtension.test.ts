import { describe, it, expect } from 'vitest'
import { COLOR_TOKENS } from './ColorTokenExtension'

describe('ColorTokenExtension — COLOR_TOKENS Allowlist', () => {
  it('enthält genau 8 Tokens', () => {
    expect(COLOR_TOKENS).toHaveLength(8)
  })

  it('enthält alle erlaubten Tokens', () => {
    expect(COLOR_TOKENS).toContain('default')
    expect(COLOR_TOKENS).toContain('gray')
    expect(COLOR_TOKENS).toContain('red')
    expect(COLOR_TOKENS).toContain('orange')
    expect(COLOR_TOKENS).toContain('yellow')
    expect(COLOR_TOKENS).toContain('green')
    expect(COLOR_TOKENS).toContain('blue')
    expect(COLOR_TOKENS).toContain('purple')
  })

  it('enthält keine Hex-Werte (kein Token beginnt mit #)', () => {
    COLOR_TOKENS.forEach((token) => {
      expect(token).not.toMatch(/^#/)
    })
  })

  it('enthält kein nicht-erlaubtes Token (pink, cyan, violet)', () => {
    expect(COLOR_TOKENS).not.toContain('pink')
    expect(COLOR_TOKENS).not.toContain('cyan')
    expect(COLOR_TOKENS).not.toContain('violet')
  })
})
