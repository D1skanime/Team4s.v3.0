export const ANIME_CONTRIBUTION_ROLES: { code: string; label: string }[] = [
  { code: 'translator', label: 'Übersetzung' },
  { code: 'timer', label: 'Timing' },
  { code: 'typesetter', label: 'Typesetting / FX' },
  { code: 'editor', label: 'Editing' },
  { code: 'encoder', label: 'Encoding' },
  { code: 'raw_provider', label: 'Raw-Bereitstellung' },
  { code: 'quality_checker', label: 'Qualitätsprüfung' },
  { code: 'project_lead', label: 'Projektleitung' },
  { code: 'designer', label: 'Design' },
]

export function normalizeRoleCodes(codes: string[]): string[] {
  const selected = new Set(codes.filter(Boolean))
  const known = ANIME_CONTRIBUTION_ROLES
    .map((role) => role.code)
    .filter((code) => selected.has(code))
  const unknown = codes.filter(
    (code) => code && !ANIME_CONTRIBUTION_ROLES.some((role) => role.code === code),
  )
  return Array.from(new Set([...known, ...unknown]))
}

export function sameRoleCodes(a: string[], b: string[]): boolean {
  const left = normalizeRoleCodes(a)
  const right = normalizeRoleCodes(b)
  return left.length === right.length && left.every((code, index) => code === right[index])
}

export function roleLabels(codes: string[]): string[] {
  return normalizeRoleCodes(codes).map(
    (code) => ANIME_CONTRIBUTION_ROLES.find((role) => role.code === code)?.label ?? code,
  )
}
