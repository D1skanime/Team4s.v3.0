import { PublicNoteCard } from '@/components/public/PublicNoteCard'
import type { ProjectMemberNote } from '@/types/projectMember'

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${date.getFullYear()}`
}

// Adapter: mappt eine ProjectMemberNote auf die geteilte PublicNoteCard (Rollen-Variante,
// Member ist bereits der Seitenkontext → kein Autor-Header). Sekundaerzeile „Notiz zu Folge X",
// Footer verlinkt aufs Release.
export function ProjectMemberNoteCard({
  note,
  projectPath,
}: {
  note: ProjectMemberNote
  projectPath: string
}) {
  const versionSuffix = note.release_version_label ? ` · ${note.release_version_label}` : ''
  return (
    <PublicNoteCard
      roleLabel={note.role_label}
      roleCode={note.role_code}
      dateLabel={formatDate(note.created_at)}
      contextLine={note.episode_label ? `Notiz zu Folge ${note.episode_label}` : null}
      title={note.title}
      bodyHtml={note.body_html}
      bodyText={note.body_text}
      clampThreshold={180}
      footer={{
        href: `${projectPath}/releases/${note.release_version_id}`,
        label: `Folge ${note.episode_label}${versionSuffix} →`,
      }}
    />
  )
}
