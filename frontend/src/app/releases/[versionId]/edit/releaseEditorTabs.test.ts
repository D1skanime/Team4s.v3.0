import { describe, expect, it } from 'vitest'

import { buildReleaseEditorTabIds } from './releaseEditorTabs'

describe('buildReleaseEditorTabIds (D-02)', () => {
  it('zeigt einem Nicht-Admin ohne sonstige Rechte nur den Media-Tab, wenn nur dieses Recht vorliegt', () => {
    expect(
      buildReleaseEditorTabIds({
        isPlatformAdmin: false,
        canEditMetadata: false,
        canManageSegments: false,
        canUseMedia: true,
        canUseNotes: false,
      }),
    ).toEqual(['media'])
  })

  it('zeigt einem voll berechtigten Nicht-Admin die 4 gemeinsamen Tabs, aber keine Admin-exklusiven Tabs', () => {
    expect(
      buildReleaseEditorTabIds({
        isPlatformAdmin: false,
        canEditMetadata: true,
        canManageSegments: true,
        canUseMedia: true,
        canUseNotes: true,
      }),
    ).toEqual(['metadata', 'segments', 'media', 'notes'])
  })

  it('zeigt einem Plattform-Admin alle 6 Tabs unabhaengig von den Capability-Flags', () => {
    expect(
      buildReleaseEditorTabIds({
        isPlatformAdmin: true,
        canEditMetadata: false,
        canManageSegments: false,
        canUseMedia: false,
        canUseNotes: false,
      }),
    ).toEqual(['metadata', 'files', 'segments', 'media', 'changelog', 'notes'])
  })

  it('liefert eine leere Liste ohne jegliche Berechtigung', () => {
    expect(
      buildReleaseEditorTabIds({
        isPlatformAdmin: false,
        canEditMetadata: false,
        canManageSegments: false,
        canUseMedia: false,
        canUseNotes: false,
      }),
    ).toEqual([])
  })
})
