// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import type { AdminThemeSegment } from '@/types/admin'
import { SegmentPreviewImageSection } from './SegmentPreviewImageSection'

afterEach(() => {
  cleanup()
})

function segment(overrides: Partial<AdminThemeSegment> = {}): AdminThemeSegment {
  return {
    id: 7,
    theme_id: 1,
    anime_id: 1,
    theme_title: null,
    theme_type_name: 'OP',
    theme_type_kuerzel: 'OP',
    fansub_group_id: null,
    version: 'v1',
    start_episode: 1,
    end_episode: 1,
    start_time: '0:00',
    end_time: '1:30',
    source_jellyfin_item_id: null,
    preview_url: 'https://x/preview.jpg',
    preview_source: 'auto',
    created_at: '2026-10-01T00:00:00Z',
    ...overrides,
  }
}

function baseProps(overrides: Partial<Parameters<typeof SegmentPreviewImageSection>[0]> = {}) {
  return {
    editingSegment: segment(),
    isUploadingPreview: false,
    previewUploadError: null,
    isPickerOpen: false,
    pickerCandidates: [],
    isLoadingPickerCandidates: false,
    pickerError: null,
    isAttachingPreview: false,
    isResettingPreview: false,
    successMessage: null,
    onPreviewUpload: vi.fn(),
    onOpenPreviewPicker: vi.fn(),
    onClosePreviewPicker: vi.fn(),
    onAttachPreviewCandidate: vi.fn(),
    onResetPreview: vi.fn(),
    onDismissSuccess: vi.fn(),
    ...overrides,
  }
}

describe('SegmentPreviewImageSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rendert nichts, wenn editingSegment null ist (UI-SPEC Design-Entscheidung 3)', () => {
    const { container } = render(<SegmentPreviewImageSection {...baseProps({ editingSegment: null })} />)
    expect(container.firstChild).toBeNull()
  })

  it('zeigt die Badge "Manuell" und den Reset-Button nur bei preview_source=manual', () => {
    render(<SegmentPreviewImageSection {...baseProps({ editingSegment: segment({ preview_source: 'manual' }) })} />)
    expect(screen.getByText('Manuell')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Automatisches Bild verwenden' })).not.toBeNull()
  })

  it('zeigt die Badge "Automatisch" und blendet den Reset-Button bei preview_source=auto aus', () => {
    render(<SegmentPreviewImageSection {...baseProps({ editingSegment: segment({ preview_source: 'auto' }) })} />)
    expect(screen.getByText('Automatisch')).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'Automatisches Bild verwenden' })).toBeNull()
  })

  it('zeigt die Badge "Standardbild" bei preview_source=fallback', () => {
    render(<SegmentPreviewImageSection {...baseProps({ editingSegment: segment({ preview_source: 'fallback' }) })} />)
    expect(screen.getByText('Standardbild')).not.toBeNull()
  })

  it('zeigt die gemeinsame UploadDropzone fuer das Vorschaubild (D-17: echtes Drag&Drop)', () => {
    render(<SegmentPreviewImageSection {...baseProps()} />)
    expect(screen.getByRole('button', { name: 'Vorschaubild hochladen' })).not.toBeNull()
  })

  it('ruft onPreviewUpload mit der per Klick ausgewaehlten Datei auf', () => {
    const onPreviewUpload = vi.fn()
    render(<SegmentPreviewImageSection {...baseProps({ onPreviewUpload })} />)
    const input = screen.getByLabelText('Dateien') as HTMLInputElement
    const file = new File(['img'], 'preview.jpg', { type: 'image/jpeg' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(onPreviewUpload).toHaveBeenCalledWith(file)
  })

  it('ruft onPreviewUpload mit der per Drag&Drop abgelegten Datei auf', () => {
    const onPreviewUpload = vi.fn()
    render(<SegmentPreviewImageSection {...baseProps({ onPreviewUpload })} />)
    const file = new File(['img'], 'dropped.jpg', { type: 'image/jpeg' })
    fireEvent.drop(screen.getByRole('button', { name: 'Vorschaubild hochladen' }), {
      dataTransfer: { files: [file] },
    })
    expect(onPreviewUpload).toHaveBeenCalledWith(file)
  })

  it('uebernimmt bei einem Mehrfach-Drop nur die erste Datei (Single-Slot, D-16)', () => {
    const onPreviewUpload = vi.fn()
    render(<SegmentPreviewImageSection {...baseProps({ onPreviewUpload })} />)
    const first = new File(['a'], 'a.jpg', { type: 'image/jpeg' })
    const second = new File(['b'], 'b.jpg', { type: 'image/jpeg' })
    fireEvent.drop(screen.getByRole('button', { name: 'Vorschaubild hochladen' }), {
      dataTransfer: { files: [first, second] },
    })
    expect(onPreviewUpload).toHaveBeenCalledTimes(1)
    expect(onPreviewUpload).toHaveBeenCalledWith(first)
    expect(screen.getByText(/Nur die erste Datei wurde übernommen/)).not.toBeNull()
  })

  it('zeigt einen Platzhalter, wenn preview_url defensiv fehlt', () => {
    render(<SegmentPreviewImageSection {...baseProps({ editingSegment: segment({ preview_url: null }) })} />)
    expect(screen.getByText('Kein Vorschaubild verfügbar')).not.toBeNull()
  })

  it('zeigt die Erfolgsmeldung mit Schließen-Button statt der Fehlermeldung', () => {
    render(
      <SegmentPreviewImageSection
        {...baseProps({ successMessage: 'Vorschaubild hochgeladen und übernommen.', previewUploadError: 'sollte nicht erscheinen' })}
      />,
    )
    expect(screen.getByRole('status').textContent).toBe('Vorschaubild hochgeladen und übernommen.')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('button', { name: 'Schließen' })).not.toBeNull()
  })

  it('zeigt die Fehlermeldung, wenn kein Erfolgshinweis aktiv ist', () => {
    render(<SegmentPreviewImageSection {...baseProps({ previewUploadError: 'Vorschaubild konnte nicht hochgeladen werden.' })} />)
    expect(screen.getByRole('alert').textContent).toBe('Vorschaubild konnte nicht hochgeladen werden.')
  })

  it('oeffnet den Picker ueber den Trigger-Button', () => {
    const onOpenPreviewPicker = vi.fn()
    render(<SegmentPreviewImageSection {...baseProps({ onOpenPreviewPicker })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Aus Release-Bildern wählen' }))
    expect(onOpenPreviewPicker).toHaveBeenCalledTimes(1)
  })

  it('ruft onResetPreview beim Klick auf den Reset-Button auf', () => {
    const onResetPreview = vi.fn()
    render(
      <SegmentPreviewImageSection
        {...baseProps({ editingSegment: segment({ preview_source: 'manual' }), onResetPreview })}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Automatisches Bild verwenden' }))
    expect(onResetPreview).toHaveBeenCalledTimes(1)
  })
})
