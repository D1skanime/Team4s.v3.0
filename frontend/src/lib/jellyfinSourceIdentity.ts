/** A reviewed source is an actual Jellyfin Item plus one of its MediaSources.
 * JSON tuple encoding prevents delimiter collisions; paths are display data only.
 * A missing selector remains visibly unresolved, never inferred from the Item ID.
 */
export function jellyfinSourceKey(source: { media_item_id: string; media_source_id?: string | null }): string {
  return JSON.stringify([source.media_item_id, source.media_source_id ?? null])
}
