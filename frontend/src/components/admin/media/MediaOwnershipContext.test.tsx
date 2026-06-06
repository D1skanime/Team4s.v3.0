// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MediaOwnershipContext } from './MediaOwnershipContext'
import type { MediaOwnershipContextValue } from './MediaOwnershipContext'

// Minimale Mocks für Next.js-Umgebung
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return null
  },
}))

describe('MediaOwnershipContext — D-06: ownerID-Validierung', () => {
  it('ownerID=null → onContextChange mit ownerResolved=false; ErrorState sichtbar', () => {
    const onContextChange = vi.fn<[MediaOwnershipContextValue], void>()

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

  it('ownerID=0 → ownerResolved=false', () => {
    const onContextChange = vi.fn<[MediaOwnershipContextValue], void>()

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

  it('ownerID=5 → ownerResolved=true; ErrorState NICHT gerendert', () => {
    const onContextChange = vi.fn<[MediaOwnershipContextValue], void>()

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

describe('MediaOwnershipContext — D-03/D-09: statusPolicy', () => {
  it('statusPolicy=in_review, ownerID=5 → onContextChange mit reviewStatusCode=in_review + visibilityCode=private', () => {
    const onContextChange = vi.fn<[MediaOwnershipContextValue], void>()

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

  it('statusPolicy=immediate, ownerID=5 → onContextChange mit reviewStatusCode=approved + visibilityCode=public', () => {
    const onContextChange = vi.fn<[MediaOwnershipContextValue], void>()

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

describe('MediaOwnershipContext — D-05: Owner-Chip', () => {
  it('ownerLabel=Gruppe X ist als read-only Text sichtbar; kein editierbares Feld', () => {
    const onContextChange = vi.fn<[MediaOwnershipContextValue], void>()

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

    expect(screen.getByText(/Gruppe X/)).toBeTruthy()
    // kein Input mit dem Owner-Label
    const inputs = document.querySelectorAll('input')
    inputs.forEach((input) => {
      expect(input.value).not.toBe('Gruppe X')
    })
  })
})

describe('MediaOwnershipContext — D-08: categoryMode', () => {
  it('categoryMode=slot, categoryValue=logo → Badge mit logo gerendert; kein Select', () => {
    const onContextChange = vi.fn<[MediaOwnershipContextValue], void>()

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
    // Bei slot-Mode: kein Kategorie-Select vorhanden
    const selects = document.querySelectorAll('select')
    // Bei statusPolicy=immediate gibt es auch keinen Status-Select → 0 Selects erwartet
    expect(selects).toHaveLength(0)
  })

  it('categoryMode=dropdown, categoryOptions=[{value:screenshot,label:Screenshot}] → Select gerendert', () => {
    const onContextChange = vi.fn<[MediaOwnershipContextValue], void>()

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
    // Bei dropdown-Mode + in_review: Kategorie-Select + Status-Select = 2 Selects
    const selects = document.querySelectorAll('select')
    expect(selects.length).toBeGreaterThanOrEqual(1)
  })
})
