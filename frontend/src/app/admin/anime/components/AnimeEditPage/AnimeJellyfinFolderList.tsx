'use client'

import { useEffect, useState } from 'react'

import { Badge, Button } from '@/components/ui'
import { ApiError, removeAdminAnimeJellyfinFolder } from '@/lib/api'
import type { AdminAnimeJellyfinFolderOption } from '@/types/admin'

/**
 * Wandelt einen unbekannten Fehler beim Entfernen eines Jellyfin-Ordners in
 * eine lesbare Fehlermeldung um.
 */
function formatRemovalError(error: unknown): string {
  if (error instanceof ApiError) {
    return `(${error.status}) ${error.message}`
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return 'Ordner konnte nicht entfernt werden.'
}

interface AnimeJellyfinFolderListProps {
  animeID: number
  folders?: AdminAnimeJellyfinFolderOption[]
  onFolderRemoved: () => void
}

/**
 * Listet alle mit einem Anime verbundenen Jellyfin-Ordner (D-18). Der
 * Haupt-Ordner ist rein informativ (keine Aktion, auch nicht deaktiviert --
 * der Button existiert für diese Zeile gar nicht erst). Jeder Zusatz-Ordner
 * trägt eine sofortige "Ordner entfernen"-Aktion ohne Bestätigungsdialog
 * (Design-Entscheidung 15 -- reversibel über den bestehenden "Verbinden"-Pfad).
 *
 * Strukturell an AnimeContextFansubManager.tsx angelehnt (Pro-Zeile-
 * Ladezustand), bewusst ohne dessen Bestätigungsdialog-Schritt.
 */
export function AnimeJellyfinFolderList({ animeID, folders, onFolderRemoved }: AnimeJellyfinFolderListProps) {
  const [localFolders, setLocalFolders] = useState<AdminAnimeJellyfinFolderOption[]>(folders ?? [])
  const [isMutating, setIsMutating] = useState(false)
  const [mutatingSource, setMutatingSource] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    setLocalFolders(folders ?? [])
  }, [folders])

  if (localFolders.length === 0) {
    return null
  }

  const handleRemove = async (source: string) => {
    setIsMutating(true)
    setMutatingSource(source)
    setErrorMessage(null)
    try {
      await removeAdminAnimeJellyfinFolder(animeID, source)
      setLocalFolders((current) => current.filter((folder) => folder.jellyfin_item_id !== source))
      setStatusMessage('Ordner entfernt. Der Eintrag erscheint wieder als „offen" in der Bibliothek.')
      onFolderRemoved()
    } catch (error) {
      setErrorMessage(formatRemovalError(error))
    } finally {
      setIsMutating(false)
      setMutatingSource(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <h3>Verbundene Jellyfin-Ordner</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {localFolders.map((folder) => (
          <div
            key={folder.jellyfin_item_id}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}
          >
            <span>{folder.jellyfin_item_id}</span>
            {folder.is_main ? (
              <Badge variant="muted">Haupt-Ordner</Badge>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Badge variant="muted">Zusatz-Ordner</Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isMutating}
                  onClick={() => {
                    void handleRemove(folder.jellyfin_item_id)
                  }}
                >
                  {mutatingSource === folder.jellyfin_item_id ? 'Wird entfernt…' : 'Ordner entfernen'}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
      {statusMessage ? <p role="status">{statusMessage}</p> : null}
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
    </div>
  )
}
