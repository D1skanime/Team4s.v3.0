// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ArtworkHero } from './ArtworkHero'

describe('ArtworkHero', () => {
  it('rendert den Titel als Heading und den Avatar mit den Initialen des Namens', () => {
    render(
      <ArtworkHero
        ariaLabel="C-Subs Profil"
        title="C-Subs"
        avatarLabel="C-Subs"
        context="Fansub-Gruppe"
        actions={<button type="button">Öffnen</button>}
      />,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'C-Subs' })).not.toBeNull()
    expect(screen.getByText('C')).not.toBeNull()
  })
})
