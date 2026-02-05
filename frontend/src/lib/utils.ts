/**
 * Get the full URL for a cover image
 */
export function getCoverUrl(coverImage: string | null | undefined): string {
  if (!coverImage || coverImage === '') {
    return '/covers/placeholder.jpg';
  }
  return `/covers/${coverImage}`;
}

/**
 * Get status color CSS variable
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ongoing: 'var(--status-ongoing)',
    done: 'var(--status-done)',
    aborted: 'var(--status-aborted)',
    licensed: 'var(--status-licensed)',
    disabled: 'var(--status-disabled)',
  };
  return colors[status] || 'var(--text-muted)';
}

/**
 * Get status display label
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ongoing: 'Ongoing',
    done: 'Abgeschlossen',
    aborted: 'Abgebrochen',
    licensed: 'Lizenziert',
    disabled: 'Deaktiviert',
  };
  return labels[status] || status;
}

/**
 * Get anime type display label
 */
export function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    tv: 'TV',
    film: 'Film',
    ova: 'OVA',
    ona: 'ONA',
    special: 'Special',
    bonus: 'Bonus',
  };
  return labels[type] || type.toUpperCase();
}

/**
 * Alphabet for navigation (A-Z + 0-9 + All)
 */
export const ALPHABET = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  '0', // For numbers
];
