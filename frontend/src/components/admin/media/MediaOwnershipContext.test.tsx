// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MediaOwnershipContext } from './MediaOwnershipContext'
import type { MediaOwnershipContextValue } from './MediaOwnershipContext'

vi.mock('next/image', () => ({
  default: () => null,
}))

describe('MediaOwnershipContext - D-06: ownerID-Validierung', () => {
  it('ownerID=null meldet ownerResolved=false und zeigt einen ErrorState', () => {
    const onContextChange = vi.fn<(ctx: MediaOwnershipContextValue) => void>()

    render(
      <MediaOwnershipContext
        ownerType="fansub_group"
        ownerID={null}
        ownerLabel="Test-Gruppe"
        categoryMode="slot"
        categoryValue="logo"
        statusPolicy="immediate"
        onContextChange={onContextChange}
      />,
    )

    expect(onContextChange).toHaveBeenCalledWith(
      expect.objectContaining({ ownerResolved: false }),
    )
    expect(screen.getByText('Upload nicht möglich')).toBeTruthy()
  })

  it('ownerID=0 meldet ownerResolved=false', () => {
    const onContextChange = vi.fn<(ctx: MediaOwnershipContextValue) => void>()

    render(
      <MediaOwnershipContext
        ownerType="fansub_group"
        ownerID={0}
        ownerLabel="Test-Gruppe"
        categoryMode="slot"
        categoryValue="logo"
        statusPolicy="immediate"
        onContextChange={onContextChange}
      />,
    )

    expect(onContextChange).toHaveBeenCalledWith(
      expect.objectContaining({ ownerResolved: false }),
    )
  })

  it('ownerID=5 meldet ownerResolved=true und rendert keinen ErrorState', () => {
    const onContextChange = vi.fn<(ctx: MediaOwnershipContextValue) => void>()

    render(
      <MediaOwnershipContext
        ownerType="fansub_group"
        ownerID={5}
        ownerLabel="Test-Gruppe"
        categoryMode="slot"
        categoryValue="logo"
        statusPolicy="immediate"
        onContextChange={onContextChange}
      />,
    )

    expect(onContextChange).toHaveBeenCalledWith(
      expect.objectContaining({ ownerResolved: true }),
    )
    expect(screen.queryByText('Upload nicht möglich')).toBeNull()
  })
})

describe('MediaOwnershipContext - D-03/D-09: statusPolicy', () => {
  it('statusPolicy=in_review meldet reviewStatusCode=in_review und visibilityCode=private', () => {
    const onContextChange = vi.fn<(ctx: MediaOwnershipContextValue) => void>()

    render(
      <MediaOwnershipContext
        ownerType="release_version"
        ownerID={5}
        ownerLabel="Version 1.0"
        categoryMode="slot"
        categoryValue="screenshot"
        statusPolicy="in_review"
        onContextChange={onContextChange}
      />,
    )

    expect(onContextChange).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewStatusCode: 'in_review',
        visibilityCode: 'private',
      }),
    )
  })

  it('statusPolicy=immediate meldet reviewStatusCode=approved und visibilityCode=public', () => {
    const onContextChange = vi.fn<(ctx: MediaOwnershipContextValue) => void>()

    render(
      <MediaOwnershipContext
        ownerType="fansub_group"
        ownerID={5}
        ownerLabel="Gruppe X"
        categoryMode="slot"
        categoryValue="logo"
        statusPolicy="immediate"
        onContextChange={onContextChange}
      />,
    )

    expect(onContextChange).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewStatusCode: 'approved',
        visibilityCode: 'public',
      }),
    )
  })
})

describe('MediaOwnershipContext - D-05: Owner-Kontext bleibt intern', () => {
  it('rendert keine technischen Owner-Typ- oder Owner-Label-Hinweise', () => {
    const onContextChange = vi.fn<(ctx: MediaOwnershipContextValue) => void>()

    render(
      <MediaOwnershipContext
        ownerType="fansub_group"
        ownerID={5}
        ownerLabel="Gruppe X"
        categoryMode="slot"
        categoryValue="logo"
        statusPolicy="immediate"
        onContextChange={onContextChange}
      />,
    )

    expect(screen.queryByText(/Gruppe X/)).toBeNull()
    expect(screen.queryByText(/Owner-Typ/)).toBeNull()
    expect(screen.queryByText(/Upload für:/)).toBeNull()
    expect(screen.queryByText(/Der Owner ergibt sich/)).toBeNull()
  })
})

describe('MediaOwnershipContext - D-08: categoryMode', () => {
  it('categoryMode=slot rendert die Kategorie als Badge und kein Select', () => {
    const onContextChange = vi.fn<(ctx: MediaOwnershipContextValue) => void>()

    render(
      <MediaOwnershipContext
        ownerType="fansub_group"
        ownerID={5}
        ownerLabel="Test-Gruppe"
        categoryMode="slot"
        categoryValue="logo"
        statusPolicy="immediate"
        onContextChange={onContextChange}
      />,
    )

    expect(screen.getByText('logo')).toBeTruthy()
    expect(document.querySelectorAll('select')).toHaveLength(0)
  })

  it('categoryMode=dropdown rendert die Kategorieoptionen', () => {
    const onContextChange = vi.fn<(ctx: MediaOwnershipContextValue) => void>()

    render(
      <MediaOwnershipContext
        ownerType="release_version"
        ownerID={5}
        ownerLabel="Version 1.0"
        categoryMode="dropdown"
        categoryOptions={[{ value: 'screenshot', label: 'Screenshot' }]}
        statusPolicy="in_review"
        onContextChange={onContextChange}
      />,
    )

    expect(screen.getByText('Screenshot')).toBeTruthy()
    expect(document.querySelectorAll('select').length).toBeGreaterThanOrEqual(1)
  })
})
