import Link from "next/link";

import { PlatformAdminGate } from "@/components/auth/PlatformAdminGate";
import type { AnimeListItem } from "@/types/anime";
import { AdminAnimeOverviewClient } from "./components/AdminAnimeOverviewClient";

import styles from "./AdminStudio.module.css";

export const dynamic = "force-dynamic";

/**
 * Props der Admin-Anime-Listenseite.
 * Optionale searchParams enthalten die ID eines neu angelegten Anime (`created`),
 * damit dieser nach dem Erstellen in der Liste hervorgehoben werden kann.
 */
interface AdminAnimePageProps {
  searchParams?: Promise<{
    created?: string;
  }>;
}

/**
 * Server-Komponente der Admin-Anime-Listenseite.
 * Laedt die erste Seite der Anime-Liste serverseitig und gibt sie an
 * `AdminAnimeOverviewClient` weiter. Fehler beim Laden werden als
 * Fehlermeldung an die Client-Komponente uebergeben.
 */
export default async function AdminAnimePage({
  searchParams,
}: AdminAnimePageProps = {}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const createdID = Number.parseInt(resolvedSearchParams?.created || "", 10);
  const animeItems: AnimeListItem[] = [];
  const listError: string | null = null;

  return (
    <PlatformAdminGate>
      <main className={styles.page}>
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Link href="/admin">Admin</Link>
          <span>/</span>
          <span>Anime</span>
        </nav>

        <header className={styles.headerCard}>
          <div>
            <h1 className={styles.pageTitle}>Anime</h1>
            <p className={styles.pageSubtitle}>
              Neue Einträge anlegen und bestehende Anime verwalten.
            </p>
          </div>
          <div className={styles.headerActions}>
            <Link
              href="/admin/anime/create"
              className={`${styles.button} ${styles.buttonPrimary}`}
            >
              Anime erstellen
            </Link>
          </div>
        </header>

        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Vorhandene Anime</h2>
              <p className={styles.sectionMeta}>
                Bearbeiten, ansehen oder direkt wieder entfernen.
              </p>
            </div>
          </div>
          <AdminAnimeOverviewClient
            initialItems={animeItems}
            initialError={listError}
            loadOnMount
            createdID={
              Number.isFinite(createdID) && createdID > 0 ? createdID : null
            }
          />
        </section>
      </main>
    </PlatformAdminGate>
  );
}
