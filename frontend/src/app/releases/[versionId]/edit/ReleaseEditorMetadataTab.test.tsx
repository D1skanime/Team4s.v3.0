// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { EpisodeVersionEditorContext } from '@/types/episodeVersion'
import type { FansubGroupSummary } from '@/types/fansub'

import { ReleaseEditorMetadataTab } from './ReleaseEditorMetadataTab'
import type { useReleaseEditorData } from './useReleaseEditorData'

type Editor = ReturnType<typeof useReleaseEditorData>

function buildContext(overrides: Partial<EpisodeVersionEditorContext> = {}): EpisodeVersionEditorContext {
  return {
    version: {
      id: 42,
      variant_id: 42,
      release_version_id: 942,
      anime_id: 1,
      episode_number: 5,
      media_provider: 'jellyfin',
      media_item_id: 'fixture',
      segment_count: 0,
      has_segment_asset: false,
      created_at: '',
      updated_at: '',
    },
    anime_title: 'Fixture Anime',
    selected_groups: [],
    date_neighbors: [],
    ...overrides,
  }
}

function buildEditor(overrides: Partial<Editor> = {}): Editor {
  const base: Partial<Editor> = {
    contextData: buildContext(),
    formState: {
      title: '',
      mediaProvider: 'jellyfin',
      mediaItemID: 'fixture',
      videoQuality: '',
      subtitleType: '',
      productionStartedOn: '',
      releaseDate: '',
      crc32: '',
      streamURL: '',
      durationSeconds: '',
    },
    setFormState: vi.fn(),
    selectedGroups: [] as FansubGroupSummary[],
    folderPath: '',
    groupQuery: '',
    setGroupQuery: vi.fn(),
    groupResults: [] as FansubGroupSummary[],
    isSearching: false,
    searchMessage: null,
    isSaving: false,
    errorMessage: null,
    successMessage: null,
    addGroup: vi.fn(),
    removeGroup: vi.fn(),
    handleSave: vi.fn(),
  }
  return { ...base, ...overrides } as Editor
}

const projectTimeline = null

afterEach(cleanup)

describe('ReleaseEditorMetadataTab', () => {
  it('shows only the base metadata form for a non-admin contributor with canEditMetadata', () => {
    const editor = buildEditor()
    render(
      <ReleaseEditorMetadataTab
        editor={editor}
        isPlatformAdmin={false}
        canEditMetadata
        projectTimeline={projectTimeline}
      />,
    )

    expect(screen.getByText('Basisdaten speichern')).not.toBeNull()
    expect(screen.queryByText('Episode-Klassifikation')).toBeNull()
    expect(screen.queryByText('Speicherort')).toBeNull()
    expect(screen.queryByText('Fansub Gruppen')).toBeNull()
    expect(screen.queryByText(/Medienanreicherung/)).toBeNull()
  })

  it('shows all 4 admin-only blocks for a platform admin', () => {
    const editor = buildEditor({
      contextData: buildContext({
        episode: {
          episode_id: 5,
          episode_number: '5',
          filler_type: 'canon',
          filler_type_source: 'manual',
          episode_type: 'episode',
          episode_type_source: 'manual',
        },
        jellyfin_enrichment_degraded: true,
      }),
    })
    render(
      <ReleaseEditorMetadataTab
        editor={editor}
        isPlatformAdmin
        canEditMetadata={false}
        projectTimeline={projectTimeline}
      />,
    )

    expect(screen.getByText('Episode-Klassifikation')).not.toBeNull()
    expect(screen.getByText('Speicherort')).not.toBeNull()
    expect(screen.getByText('Fansub Gruppen')).not.toBeNull()
    expect(screen.getByText(/Medienanreicherung/)).not.toBeNull()
  })

  it('calls handleSave with the exact !isPlatformAdmin && canEditMetadata formula', () => {
    const handleSaveAdmin = vi.fn()
    const adminEditor = buildEditor({ handleSave: handleSaveAdmin })
    const { unmount } = render(
      <ReleaseEditorMetadataTab
        editor={adminEditor}
        isPlatformAdmin
        canEditMetadata={false}
        projectTimeline={projectTimeline}
      />,
    )
    fireEvent.submit(screen.getByText('Basisdaten speichern').closest('form')!)
    expect(handleSaveAdmin).toHaveBeenCalledWith(expect.anything(), false)
    unmount()

    const handleSaveContributor = vi.fn()
    const contributorEditor = buildEditor({ handleSave: handleSaveContributor })
    render(
      <ReleaseEditorMetadataTab
        editor={contributorEditor}
        isPlatformAdmin={false}
        canEditMetadata
        projectTimeline={projectTimeline}
      />,
    )
    fireEvent.submit(screen.getByText('Basisdaten speichern').closest('form')!)
    expect(handleSaveContributor).toHaveBeenCalledWith(expect.anything(), true)
  })
})
