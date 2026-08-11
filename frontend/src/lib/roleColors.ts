import { FANSUB_GROUP_ROLE_OPTIONS } from '@/types/fansub'

const ROLE_CODE_BY_LABEL = new Map(
  FANSUB_GROUP_ROLE_OPTIONS.map((option) => [option.label, option.code]),
)

// Mappt ein deutsches Rollen-Label auf den data-role-code der globalen Team4s-Rollenfarben
// (CSS-Tokens --role-accent-*). Unbekannte Rollen -> 'other'. Spiegelt die Logik aus
// MemberCurrentProjectsSection, damit die Rollenfarben app-weit konsistent sind.
export function roleColorCode(roleLabel: string): string {
  const code = ROLE_CODE_BY_LABEL.get(roleLabel)
  if (code === 'techadmin') return 'admin'
  if (code === 'gfxler') return 'designer'
  return code ?? 'other'
}
