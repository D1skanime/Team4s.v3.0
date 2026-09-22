// GAP-19 (165-UAT.md) — Jellyfins eigene Serien-Metadaten sind beim Auftraggeber unzuverlässig (v. a.
// Bonus/Spezial/OVA-Ordner), verlässlich ist nur der Ordnername selbst. Diese Datei bündelt die kleine,
// wiederverwendbare Logik, die sowohl DiscoveryLibraryCard.tsx (Task 2) als auch
// useCreatePageDiscoveryHandoff.ts (Task 3) brauchen, um aus einem rohen Jellyfin-Pfad- bzw.
// Ordnernamen-String einen sauberen Anzeige-/Suchbegriff abzuleiten, ohne die Regex-Logik an beiden
// Stellen zu duplizieren.

/**
 * Entfernt ein angehängtes "(YYYY)"-Jahres-Suffix (genau vier Ziffern in Klammern) vom Ende des
 * Strings. Andere Klammerinhalte (z. B. "(Jellyfin)", "(Uncut)") bleiben unangetastet, weil das Muster
 * exakt vier Ziffern verlangt.
 */
export function stripTrailingYearSuffix(value: string): string {
  return value.replace(/\s*\(\d{4}\)\s*$/, "").trim();
}

/**
 * Extrahiert das letzte, nicht-leere Pfadsegment aus einem rohen Jellyfin-Pfad. Slash-tolerant
 * (Backslash wird wie im Backend, siehe path.Base(strings.ReplaceAll(path, "\\", "/")), zu Slash
 * normalisiert).
 */
export function extractFolderNameFromPath(rawPath?: string | null): string {
  const normalized = (rawPath ?? "").trim().replace(/\\/g, "/");
  const segments = normalized
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment !== "");

  return segments.length > 0 ? segments[segments.length - 1] : "";
}

/**
 * Kombiniert extractFolderNameFromPath + stripTrailingYearSuffix: liefert den bereinigten
 * Ordnernamen (letztes Pfadsegment, ohne angehängtes Jahres-Suffix), oder "" wenn kein Pfad
 * vorliegt — der Aufrufer entscheidet selbst über einen Fallback-Wert (z. B. item.name).
 */
export function buildDisplayFolderName(rawPath?: string | null): string {
  return stripTrailingYearSuffix(extractFolderNameFromPath(rawPath));
}
