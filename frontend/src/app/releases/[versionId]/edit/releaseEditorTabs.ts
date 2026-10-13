/**
 * D-02: Tab-Sichtbarkeits-Matrix der zusammengefuehrten Release-Bearbeitungsseite. Rein additiv:
 * `isPlatformAdmin || capability` je Tab, admin-exklusive Tabs (`files`, `changelog`) haengen
 * ausschliesslich an `isPlatformAdmin`. Diese Funktion entscheidet nur, WELCHE Tabs angezeigt
 * werden (reine Display-Entscheidung) -- die tatsaechliche Durchsetzung bleibt serverseitig
 * (`isReleaseMetadataOnlyPatch`), siehe Threat-Register T-181-05.
 */
export const RELEASE_EDITOR_TAB_IDS = [
  'metadata',
  'files',
  'segments',
  'media',
  'changelog',
  'notes',
] as const

export type ReleaseEditorTabId = (typeof RELEASE_EDITOR_TAB_IDS)[number]

export interface ReleaseEditorTabInputs {
  isPlatformAdmin: boolean
  canEditMetadata: boolean // capabilities.can_edit_metadata === true
  canManageSegments: boolean // capabilities.can_manage_segments
  canUseMedia: boolean // capabilities.can_view_media
  canUseNotes: boolean // capabilities.can_edit_notes && memberId != null
}

export function buildReleaseEditorTabIds(input: ReleaseEditorTabInputs): ReleaseEditorTabId[] {
  const ids: ReleaseEditorTabId[] = []
  if (input.isPlatformAdmin || input.canEditMetadata) ids.push('metadata')
  if (input.isPlatformAdmin) ids.push('files')
  if (input.isPlatformAdmin || input.canManageSegments) ids.push('segments')
  if (input.isPlatformAdmin || input.canUseMedia) ids.push('media')
  if (input.isPlatformAdmin) ids.push('changelog')
  if (input.isPlatformAdmin || input.canUseNotes) ids.push('notes')
  return ids
}
