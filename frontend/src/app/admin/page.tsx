import Link from "next/link";

import { PlatformAdminGate } from "@/components/auth/PlatformAdminGate";

import styles from "./admin.module.css";

/**
 * Einstiegsseite des Admin-Bereichs.
 * Rendert Navigationskarten zu den wichtigsten Admin-Bereichen:
 * Studio (Anime + Episoden), Contributor-Dashboard, Profil und Fansubs.
 */
export default function AdminOverviewPage() {
  return (
    <PlatformAdminGate>
      <main className={styles.page}>
        <p className={styles.backLinks}>
          <Link href="/">Start</Link>
          <span> | </span>
          <Link href="/anime">Anime</Link>
          <span> | </span>
          <Link href="/login">Anmeldung</Link>
        </p>

        <header className={styles.header}>
          <h1 className={styles.title}>Admin Content</h1>
          <p className={styles.subtitle}>
            Anime und Episoden in einem zusammenhängenden Studio-Workflow
            verwalten.
          </p>
        </header>

        <section className={styles.panel}>
          <h2>Bereiche</h2>
          <p className={styles.hint}>
            Empfohlen: zuerst Anime-Kontext wählen, dann Episoden direkt darin
            pflegen.
          </p>
          <div className={styles.actions}>
            <Link href="/admin/anime" className={styles.button}>
              Studio (Anime + Episoden)
            </Link>
            <Link href="/manage/groups" className={styles.buttonSecondary}>
              Meine Gruppen
            </Link>
            <Link href="/me/profile" className={styles.buttonSecondary}>
              Mein Profil
            </Link>
            <Link href="/admin/episodes" className={styles.buttonSecondary}>
              Separater Episoden-Modus
            </Link>
            <Link href="/admin/fansubs" className={styles.buttonSecondary}>
              Fansubs
            </Link>
          </div>
        </section>
      </main>
    </PlatformAdminGate>
  );
}
