"use client";

// DiscoveryEntryCard: static, non-destructive entry point to the Discovery
// library, rendered above the existing provider grid on /admin/anime/create
// (wired in a later plan — 165-08). Presentational only, no props, no state.

import { Button, Card } from "@/components/ui";

import createStyles from "./page.module.css";

export function DiscoveryEntryCard() {
  return (
    <Card
      variant="elevated"
      header={
        <div className={createStyles.resultsTitleBlock}>
          <p className={createStyles.resultsEyebrow}>Neu</p>
          <h3 className={createStyles.resultsTitle}>Aus meiner Bibliothek</h3>
        </div>
      }
    >
      <p className={createStyles.resultsText}>
        Jellyfin-Bibliothek durchsuchen und offene Titel gezielt anlegen.
      </p>
      <Button href="/admin/anime/create/library" variant="primary">
        Bibliothek durchsuchen
      </Button>
    </Card>
  );
}
