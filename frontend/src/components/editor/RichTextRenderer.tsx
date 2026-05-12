import styles from './RichTextRenderer.module.css'

type RichTextRendererProps = {
  bodyHtml?: string | null
  bodyJson?: unknown | null
  editorType?: string | null
  contentSchemaVersion?: number | null
}

// SICHERHEITSINVARIANTE: dangerouslySetInnerHTML NUR mit body_html (serverseitig sanitisiert).
// Niemals body_json direkt rendern ohne serverseitiges Sanitizing.
export function RichTextRenderer({ bodyHtml }: RichTextRendererProps) {
  if (!bodyHtml?.trim()) return null
  return (
    <div
      className={styles.richTextOutput}
      dangerouslySetInnerHTML={{ __html: bodyHtml }}
    />
  )
}
