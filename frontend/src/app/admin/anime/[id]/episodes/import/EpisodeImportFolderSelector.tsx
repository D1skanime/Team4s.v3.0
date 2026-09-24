import { FormField, Select } from '@/components/ui'
import type { JellyfinFolderOption } from '@/types/episodeImport'

export interface EpisodeImportFolderSelectorProps {
  folders: JellyfinFolderOption[]
  /** Currently selected Jellyfin folder ID. Falls back to the main folder when unset. */
  value: string | null
  onChange: (jellyfinItemId: string) => void
}

/** Splits on both / and \ (Jellyfin paths in this deployment can be Windows-style), trims trailing
 * separators, and returns the last non-empty path segment, or null when no segment is found. */
function lastPathSegment(path?: string | null): string | null {
  if (!path) {
    return null
  }
  const trimmed = path.replace(/[/\\]+$/, '')
  const segments = trimmed.split(/[/\\]+/).filter((segment) => segment.length > 0)
  return segments.length > 0 ? segments[segments.length - 1] : null
}

/**
 * Folder picker for the episode-import screen, shown only when an anime has
 * more than one connected Jellyfin folder (D-05). Uses only @/components/ui
 * primitives (D-13) -- built as a standalone file rather than inline markup
 * in page.tsx, which is already 567 lines (over CLAUDE.md's 450-line limit).
 *
 * Label fallback chain (GAP-01): backend-hydrated folder_display_name, then
 * the last segment of folder_path, then the raw Jellyfin ID as a last
 * resort when neither is available (e.g. Jellyfin unreachable). The main
 * folder's label is additionally suffixed with " (Haupt-Ordner)"; the full
 * path (when known) is set as the option's title attribute for a tooltip.
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
        {folders.map((folder) => {
          const baseLabel = folder.folder_display_name?.trim() || lastPathSegment(folder.folder_path) || folder.jellyfin_item_id
          const label = folder.is_main ? `${baseLabel} (Haupt-Ordner)` : baseLabel
          return (
            <option key={folder.jellyfin_item_id} value={folder.jellyfin_item_id} title={folder.folder_path ?? undefined}>
              {label}
            </option>
          )
        })}
      </Select>
    </FormField>
  )
}
