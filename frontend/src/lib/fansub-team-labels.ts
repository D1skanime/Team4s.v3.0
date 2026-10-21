import type { FansubStatus } from '@/types/fansub'

/**
 * Phase 190 (D-q): Überschrift für die Mitglieder-Teilgruppe der öffentlichen
 * Fansub-Gruppenseite, abhängig vom Gruppenstatus. "Aktive Mitglieder" nur bei
 * `active`; `inactive` und `dissolved` erhalten einheitlich "Mitglieder" (keine
 * Sonderbehandlung von `dissolved`, siehe 190-CONTEXT.md D-q).
 */
export function resolveMemberSectionLabel(status: FansubStatus, count: number): string {
  const prefix = status === 'active' ? 'Aktive Mitglieder' : 'Mitglieder'
  return `${prefix} · ${count}`
}
