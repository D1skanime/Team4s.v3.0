import { RichTextEditor, RichTextRenderer } from '@/components/editor'
import { Button, FormField } from '@/components/ui'

import type { MemberProfileFormState } from './profileFormTypes'

type ProfileStoryCardProps = {
  value: MemberProfileFormState['memberStory']
  bodyHtml?: string | null
  plainText?: string | null
  disabled: boolean
  isEditing: boolean
  onEdit: () => void
  onChange: (updater: (current: MemberProfileFormState) => MemberProfileFormState) => void
  /** Callback wenn Nutzer ein Bild auswaehlt — fuer deferred Upload beim Save */
  onPendingImageAdded?: (pendingKey: string, file: File) => void
  /** Upload-Fortschritt pro pending_key (0-100) — fuer Fortschritts-Anzeige beim Save */
  uploadProgress?: Map<string, number>
}

export function ProfileStoryCard({ value, bodyHtml, plainText, disabled, isEditing, onEdit, onChange, onPendingImageAdded, uploadProgress }: ProfileStoryCardProps) {
  return (
    <FormField label="Meine Fansub-Geschichte">
      {isEditing ? (
        <>
          <RichTextEditor
            value={value}
            onChange={(nextValue) => onChange((current) => ({ ...current, memberStory: nextValue as MemberProfileFormState['memberStory'] }))}
            placeholder="Wie bist du zur Gruppe gekommen, woran hast du gearbeitet und was bleibt?"
            minHeight={170}
            disabled={disabled}
            enableImages={true}
            onPendingImageAdded={onPendingImageAdded}
          />
          {/* Upload-Fortschritt pro Bild — nur waehrend des Speicherns sichtbar */}
          {uploadProgress && uploadProgress.size > 0 && (
            <div style={{ marginTop: 8 }}>
              {Array.from(uploadProgress.entries()).map(([key, pct]) => (
                <div key={key} style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 12 }}>Bild wird hochgeladen …</span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{pct}%</span>
                  </div>
                  <div style={{
                    height: 4,
                    borderRadius: 2,
                    background: 'color-mix(in srgb, var(--text-secondary) 18%, transparent)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: 'var(--accent-primary)',
                      transition: 'width 0.15s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {bodyHtml?.trim() ? (
            <RichTextRenderer bodyHtml={bodyHtml} bodyJson={value} editorType="tiptap" contentSchemaVersion={1} />
          ) : plainText?.trim() ? (
            <p>{plainText}</p>
          ) : (
            <p>Noch keine Geschichte hinterlegt.</p>
          )}
          <Button type="button" variant="secondary" size="sm" onClick={onEdit} disabled={disabled}>
            Bearbeiten
          </Button>
        </>
      )}
    </FormField>
  )
}
