export function formatMemberPeriod(joinedYear: number | null, leftYear: number | null): string {
  if (joinedYear !== null && leftYear !== null) {
    return joinedYear + '–' + leftYear
  }

  if (joinedYear !== null) {
    return 'seit ' + joinedYear
  }

  if (leftYear !== null) {
    return 'bis ' + leftYear
  }

  return ''
}
