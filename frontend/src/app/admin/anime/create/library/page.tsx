import { PlatformAdminGate } from "@/components/auth/PlatformAdminGate";
import { PageHeader } from "@/components/ui";

import { DiscoveryLibraryPanel } from "./DiscoveryLibraryPanel";

export const dynamic = "force-dynamic";

/**
 * Server-Komponente der Discovery-Bibliotheksliste (/admin/anime/create/library,
 * D-24). filter/q/cursor/return werden clientseitig von useDiscoveryLibraryFilters
 * bzw. DiscoveryLibraryPanel direkt aus der URL gelesen (D-11) — die searchParams
 * werden hier nur nach der bestehenden async-Promise-Konvention entgegengenommen
 * (analog admin/anime/page.tsx), ohne eigene serverseitige Logik auf ihnen.
 */
interface DiscoveryLibraryPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DiscoveryLibraryPage({ searchParams }: DiscoveryLibraryPageProps) {
  if (searchParams) {
    await searchParams;
  }

  return (
    <PlatformAdminGate>
      <main style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", padding: "var(--space-5)" }}>
        <PageHeader
          title="Bibliothek durchsuchen"
          description="Jellyfin-Einträge, die noch nicht oder bereits in Team4s vorhanden sind."
        />
        <DiscoveryLibraryPanel />
      </main>
    </PlatformAdminGate>
  );
}
