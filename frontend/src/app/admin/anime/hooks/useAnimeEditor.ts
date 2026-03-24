import { useMemo } from 'react'

import type { AnimeEditorContext, AnimeEditorController, AnimeEditorControllerInput } from '../types/admin-anime-editor'

const DEFAULT_COPY: Record<
  AnimeEditorContext,
  {
    submitLabel: string
    savedStateTitle: string
    savedStateMessage: string
    dirtyStateTitle: string
    dirtyStateMessage: string
  }
> = {
  edit: {
    submitLabel: 'Aenderungen speichern',
    savedStateTitle: 'Alle Aenderungen gespeichert',
    savedStateMessage: 'Kein offener Patch im Formular.',
    dirtyStateTitle: 'Ungespeicherte Aenderungen',
    dirtyStateMessage: 'Pruefe die Sektionen und speichere den allgemeinen Anime-Kontext.',
  },
  create: {
    submitLabel: 'Anime erstellen',
    savedStateTitle: 'Noch kein Entwurf vorhanden',
    savedStateMessage: 'Trage mindestens die Pflichtfelder ein, um einen neuen Anime anzulegen.',
    dirtyStateTitle: 'Entwurf bereit zum Anlegen',
    dirtyStateMessage: 'Pruefe die Felder und lege den neuen Anime dann ueber die zentrale Leiste an.',
  },
}

export function useAnimeEditor(context: AnimeEditorContext, input: AnimeEditorControllerInput): AnimeEditorController {
  return useMemo(() => {
    const copy = DEFAULT_COPY[context]
    const canSubmit = input.canSubmit ?? input.isDirty
    return {
      context,
      isDirty: input.isDirty,
      canSubmit,
      isSubmitting: input.isSubmitting,
      onSubmit: input.onSubmit,
      formID: input.formID,
      submitLabel: input.submitLabel ?? copy.submitLabel,
      submitButtonType: input.submitButtonType ?? 'button',
      saveStateTitle: input.isDirty
        ? (input.dirtyStateTitle ?? copy.dirtyStateTitle)
        : (input.savedStateTitle ?? copy.savedStateTitle),
      saveStateMessage: input.isDirty
        ? (input.dirtyStateMessage ?? copy.dirtyStateMessage)
        : (input.savedStateMessage ?? copy.savedStateMessage),
    }
  }, [context, input])
}
