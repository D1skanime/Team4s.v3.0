import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type AnimeEditorContext = 'edit' | 'create'

export interface AnimeEditorControllerInput {
  isDirty: boolean
  isSubmitting: boolean
  onSubmit?: () => void
  formID?: string
  submitLabel?: string
  submitButtonType?: ButtonHTMLAttributes<HTMLButtonElement>['type']
  savedStateTitle?: string
  savedStateMessage?: string
  dirtyStateTitle?: string
  dirtyStateMessage?: string
}

export interface AnimeEditorController {
  context: AnimeEditorContext
  isDirty: boolean
  isSubmitting: boolean
  onSubmit?: () => void
  formID?: string
  submitLabel: string
  submitButtonType: ButtonHTMLAttributes<HTMLButtonElement>['type']
  saveStateTitle: string
  saveStateMessage: string
}

export interface AnimeEditorShellProps {
  editor: AnimeEditorController
  title?: string
  subtitle?: string
  header?: ReactNode
  children: ReactNode
}
