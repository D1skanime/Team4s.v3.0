"use client";

// DiscoveryEntryCard: statischer, folgenloser Einstiegspunkt in die Discovery-Bibliothek,
// dargestellt oberhalb des bestehenden Provider-Rasters auf /admin/anime/create. Rein
// darstellend, ohne eigene Props oder Zustand -- die Verdrahtung mit echten Daten erfolgt in
// einem späteren Auftrag.

import { Button, Card } from "@/components/ui";

import createStyles from "./page.pageShell.module.css";
import sharedStyles from "./page.shared.module.css";

export function DiscoveryEntryCard() {
  return (
    <Card
      header={
        <div className={sharedStyles.resultsTitleBlock}>
          <p className={createStyles.resultsEyebrow}>Neu</p>
          <h3 className={sharedStyles.resultsTitle}>Aus meiner Bibliothek</h3>
        </div>
      }
      footer={
        <Button href="/admin/anime/create/library" variant="primary">
          Bibliothek durchsuchen
        </Button>
      }
    >
    </Card>
  );
}
