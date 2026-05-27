import { RichTextEditor } from '@/components/editor'
import { FormField } from '@/components/ui'

import type { MemberProfileFormState } from './profileFormTypes'

type ProfileStoryCardProps = {
  value: unknown
  disabled: boolean
  onChange: (updater: (current: MemberProfileFormState) => MemberProfileFormState) => void
}

export function ProfileStoryCard({ value, disabled, onChange }: ProfileStoryCardProps) {
  return (
    <FormField
      label="Meine Fansub-Geschichte"
      hint="Phase 53A speichert diese Geschichte weiter als Plain Text. Sichere Rich-Text-Persistenz folgt erst mit dem eigenen Contract."
    >
      <RichTextEditor
        value={value}
        onChange={(nextValue) => onChange((current) => ({ ...current, memberStory: nextValue }))}
        placeholder="Wie bist du zur Gruppe gekommen, woran hast du gearbeitet und was bleibt?"
        minHeight={170}
        disabled={disabled}
      />
    </FormField>
  )
}
