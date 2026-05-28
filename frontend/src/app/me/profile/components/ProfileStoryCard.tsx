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
}

export function ProfileStoryCard({ value, bodyHtml, plainText, disabled, isEditing, onEdit, onChange }: ProfileStoryCardProps) {
  return (
    <FormField label="Meine Fansub-Geschichte">
      {isEditing ? (
        <RichTextEditor
          value={value}
          onChange={(nextValue) => onChange((current) => ({ ...current, memberStory: nextValue as MemberProfileFormState['memberStory'] }))}
          placeholder="Wie bist du zur Gruppe gekommen, woran hast du gearbeitet und was bleibt?"
          minHeight={170}
          disabled={disabled}
        />
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
