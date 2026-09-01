// Deutsches Rollen-Label -> Rollen-Code. Git-verifiziert wiederhergestellt aus Commit 6c35c59d
// (vor der presentationForRole-Delegation in 15ac1f3d). Die frühere Quelle
// FANSUB_GROUP_ROLE_OPTIONS (@/types/fansub) wurde in Commit fa98ce8d (Phase 136-08,
// "remove residual runtime role catalogs") entfernt; PublicNoteCard.tsx kennt hier nur das
// Label (keinen Rollen-Code, keinen Katalog), daher bleibt eine lokale Label->Code-Map nötig.
const ROLE_CODE_BY_LABEL = new Map<string, string>([
  ['Gruppenleitung', 'fansub_lead'],
  ['Projektleitung', 'project_lead'],
  ['Übersetzung', 'translator'],
  ['Timing', 'timer'],
  ['Typesetting / FX', 'typesetter'],
  ['Editing', 'editor'],
  ['Encoding', 'encoder'],
  ['Raw-Bereitstellung', 'raw_provider'],
  ['Qualitätsprüfung', 'quality_checker'],
  ['Design', 'designer'],
  ['Technische Administration', 'techadmin'],
  ['Grafik', 'gfxler'],
])

// Mappt ein deutsches Rollen-Label auf den data-role-code der globalen Team4s-Rollenfarben
// (CSS-Tokens --role-accent-*). Unbekannte Rollen -> 'other'. Spiegelt die Logik aus
// MemberCurrentProjectsSection, damit die Rollenfarben app-weit konsistent sind.
export function roleColorCode(roleLabel: string): string {
  const code = ROLE_CODE_BY_LABEL.get(roleLabel)
  if (code === 'techadmin') return 'admin'
  if (code === 'gfxler') return 'designer'
  return code ?? 'other'
}
