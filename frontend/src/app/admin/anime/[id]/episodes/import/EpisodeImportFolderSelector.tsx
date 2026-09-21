import { FormField, Select } from '@/components/ui'
import type { JellyfinFolderOption } from '@/types/episodeImport'

export interface EpisodeImportFolderSelectorProps {
  folders: JellyfinFolderOption[]
  /** Currently selected Jellyfin folder ID. Falls back to the main folder when unset. */
  value: string | null
  onChange: (jellyfinItemId: string) => void
}

/**
 * Folder picker for the episode-import screen, shown only when an anime has
 * more than one connected Jellyfin folder (D-05). Uses only @/components/ui
 * primitives (D-13) -- built as a standalone file rather than inline markup
 * in page.tsx, which is already 567 lines (over CLAUDE.md's 450-line limit).
 *
 * Fallback label rule: this component only receives Jellyfin item IDs, not
 * resolved folder paths, so the raw Jellyfin ID is rendered directly as the
 * option label ("Fallback auf die rohe Jellyfin-ID").
 */
export function EpisodeImportFolderSelector({ folders, value, onChange }: EpisodeImportFolderSelectorProps) {
  if (!folders || folders.length <= 1) {
    return null
  }

  const mainFolder = folders.find((folder) => folder.is_main)
  const selected = value ?? mainFolder?.jellyfin_item_id ?? folders[0].jellyfin_item_id

  return (
    <FormField
      label="Jellyfin-Ordner"
      htmlFor="episode-import-jellyfin-folder"
      hint="Wählen Sie den Ordner, aus dem Episoden importiert werden sollen."
    >
      <Select
        id="episode-import-jellyfin-folder"
        value={selected}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        {folders.map((folder) => (
          <option key={folder.jellyfin_item_id} value={folder.jellyfin_item_id}>
            {folder.jellyfin_item_id}
          </option>
        ))}
      </Select>
    </FormField>
  )
}
