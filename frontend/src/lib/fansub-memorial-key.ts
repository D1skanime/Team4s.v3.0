/**
 * Quick-Task 261022-ap1 (Rest aus Phase 190 Review WR-01): React-Key für den
 * "In Erinnerung"-Block der öffentlichen Fansub-Gruppenseite.
 *
 * Der Memorial-Block mischt Zeilen aus zwei verschiedenen DB-Tabellen
 * (aktuelle Mitglieder vs. historische Liste). Beide haben ein `id`-Feld,
 * aber die ids stammen aus unterschiedlichen Tabellen und können numerisch
 * kollidieren. Die Quelle muss deshalb Teil des Keys sein, nicht nur die id.
 */
export type FansubMemorialSource = 'member' | 'historical'

export function buildFansubMemorialKey(source: FansubMemorialSource, id: number): string {
  return `${source}-${id}`
}
