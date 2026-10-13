'use client'

import { Button, FormField, Input } from '@/components/ui'
import { formatBytes, formatDateTime } from '@/components/releaseEditor/episodeVersionEditorUtils'
import { jellyfinSourceKey } from '@/lib/jellyfinSourceIdentity'

import type { useReleaseEditorData } from './useReleaseEditorData'

interface ReleaseEditorFilesTabProps {
  editor: ReturnType<typeof useReleaseEditorData>
}

/**
 * Dateien-Tab-Inhalt (admin-exklusiv): Jellyfin-Ordner-Scan, Stream-Link, Datei-Auswahl und
 * Advanced-Mode Media-Provider-Override -- inhaltlich unveraendert aus dem alten Admin-Editor
 * portiert, nur die Chrome (native Elemente) wird auf @/components/ui-Primitive umgestellt.
 */
export function ReleaseEditorFilesTab({ editor }: ReleaseEditorFilesTabProps) {
  return (
    <>
      <Button variant="secondary" onClick={() => void editor.handleScanFolder()} disabled={editor.isScanning}>
        {editor.isScanning ? 'Ordner wird gelesen...' : 'Ordner synchronisieren'}
      </Button>

      <FormField label="Stream Link">
        <Input
          value={editor.formState.streamURL}
          onChange={(event) =>
            editor.setFormState((current) => ({ ...current, streamURL: event.target.value }))
          }
        />
      </FormField>

      <Button variant="ghost" onClick={() => editor.setShowFilePanel((current) => !current)}>
        {editor.showFilePanel ? 'Auswahl schließen' : 'Datei wechseln'}
      </Button>

      {editor.selectedFile ? (
        <div>
          <span>Datei: {editor.selectedFile.file_name}</span>
          <span>Größe: {formatBytes(editor.selectedFile.file_size_bytes)}</span>
          <span>
            Qualität: {editor.selectedFile.video_quality || editor.formState.videoQuality || 'n/a'}
          </span>
          <span>Media ID: {editor.selectedFile.media_item_id}</span>
          <span>Geändert: {formatDateTime(editor.selectedFile.last_modified)}</span>
          <span>Erkannte Episode: {editor.selectedFile.detected_episode_number || 'n/a'}</span>
        </div>
      ) : (
        <p>Noch keine Datei ausgewählt.</p>
      )}

      {editor.showFilePanel ? (
        <div>
          {editor.availableFiles.length > 0 ? (
            editor.availableFiles.map((file) => (
              <Button
                key={jellyfinSourceKey(file)}
                variant="ghost"
                fullWidth
                onClick={() => editor.applyFile(file)}
              >
                <strong>{file.file_name}</strong>
                <span>{file.video_quality || 'n/a'}</span>
                <span>{formatBytes(file.file_size_bytes)}</span>
                <span>{formatDateTime(file.last_modified)}</span>
                <span>Episode: {file.detected_episode_number || 'n/a'}</span>
              </Button>
            ))
          ) : (
            <p>Nach der Synchronisierung erscheinen hier auswählbare Dateien.</p>
          )}
        </div>
      ) : null}

      <details
        open={editor.advancedMode}
        onToggle={(event) => editor.setAdvancedMode(event.currentTarget.open)}
      >
        <summary>Advanced Mode: manuelle Media-Override</summary>
        <FormField label="Media Provider">
          <Input
            value={editor.formState.mediaProvider}
            onChange={(event) =>
              editor.setFormState((current) => ({ ...current, mediaProvider: event.target.value }))
            }
          />
        </FormField>
        <FormField label="Media ID">
          <Input
            value={editor.formState.mediaItemID}
            onChange={(event) =>
              editor.setFormState((current) => ({ ...current, mediaItemID: event.target.value }))
            }
          />
        </FormField>
      </details>
    </>
  )
}
