import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
// StoryImageNodeView wird in Task 2 (Plan 70-05) angelegt.
// Der Import ist bewusst hier — TypeScript-Fehler wird in Task 2 behoben.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { StoryImageNodeView } from './StoryImageNodeView'

// Erlaubte Ausrichtungswerte fuer Backend-Validator und Attribut-Default.
export const STORY_IMAGE_ALIGNMENTS = ['left', 'center', 'right'] as const
export type StoryImageAlignment = (typeof STORY_IMAGE_ALIGNMENTS)[number]

// StoryImageExtension: TipTap-Block-Node fuer Profilgeschichte-Bilder.
// D-01: Block-Node, kein Inline; D-02: kein alt-Text, keine Caption.
// D-11: opt-in per enableImages-Prop in RichTextEditor.
export const StoryImageExtension = Node.create({
  name: 'image',
  group: 'block',
  atom: true,      // kein Kinder-Inhalt editierbar
  draggable: true, // TipTap-native Drag-to-Reorder

  addAttributes() {
    return {
      // Persistierte Media-Asset-ID — null solange Bild noch pending (vor Upload)
      media_asset_id: { default: null },
      // Temporaerer Upload-Marker — darf NICHT in gespeichertem body_json landen.
      // Wird von uploadPendingStoryImages() auf null gesetzt.
      pending_key: { default: null },
      // Object-URL fuer Browser-Vorschau — sitzungsgebunden, nie persistiert.
      // Wird von uploadPendingStoryImages() auf null gesetzt (Pitfall 2).
      preview_url: { default: null },
      // Breite in Prozent des Textbereichs (1-100)
      width_percent: { default: 60 },
      // Ausrichtung: 'left' | 'center' | 'right'
      alignment: { default: 'center' },
    }
  },

  parseHTML() {
    return [{ tag: 'img[data-story-image]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes, { 'data-story-image': '' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(StoryImageNodeView)
  },
})
