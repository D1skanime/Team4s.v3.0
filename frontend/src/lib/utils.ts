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

/**
 * Format a date as relative time (German)
 * Examples: "vor 5 Minuten", "vor 2 Stunden", "vor 3 Tagen"
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) {
    return 'gerade eben';
  }
  if (diffMinutes === 1) {
    return 'vor 1 Minute';
  }
  if (diffMinutes < 60) {
    return `vor ${diffMinutes} Minuten`;
  }
  if (diffHours === 1) {
    return 'vor 1 Stunde';
  }
  if (diffHours < 24) {
    return `vor ${diffHours} Stunden`;
  }
  if (diffDays === 1) {
    return 'gestern';
  }
  if (diffDays < 7) {
    return `vor ${diffDays} Tagen`;
  }
  if (diffWeeks === 1) {
    return 'vor 1 Woche';
  }
  if (diffWeeks < 4) {
    return `vor ${diffWeeks} Wochen`;
  }
  if (diffMonths === 1) {
    return 'vor 1 Monat';
  }
  if (diffMonths < 12) {
    return `vor ${diffMonths} Monaten`;
  }
  if (diffYears === 1) {
    return 'vor 1 Jahr';
  }
  return `vor ${diffYears} Jahren`;
}

/**
 * Format a date as absolute date string (German)
 * Example: "15. Januar 2024, 14:30"
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get default avatar URL for a user
 */
export function getAvatarUrl(avatarUrl: string | null | undefined, username: string): string {
  if (avatarUrl) {
    return avatarUrl;
  }
  // Generate initials-based placeholder
  const initial = username.charAt(0).toUpperCase();
  // Use a simple color based on the first letter
  const colors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e'
  ];
  const colorIndex = initial.charCodeAt(0) % colors.length;
  const color = colors[colorIndex];
  // Return a data URL for a simple SVG avatar
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="${color}"/><text x="20" y="26" text-anchor="middle" fill="white" font-size="18" font-family="system-ui, sans-serif" font-weight="600">${initial}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
