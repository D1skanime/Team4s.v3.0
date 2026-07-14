import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectPage } from "./ProjectPage";
import styles from "./page.module.css";
import {
  loadPublicFansubProjectPageData,
  parsePublicFansubProjectRouteParams,
  resolvePublicFansubProjectCanonicalPath,
} from "./projectPageData";

interface GroupStoryPageProps {
  params: { id: string; groupId: string } | Promise<{ id: string; groupId: string }>;
}

export async function generateMetadata({ params }: GroupStoryPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const ids = parsePublicFansubProjectRouteParams(resolvedParams);
  if (!ids) return {};

  const canonicalPath = await resolvePublicFansubProjectCanonicalPath(ids);
  if (!canonicalPath) return {};

  return {
    alternates: {
      canonical: canonicalPath,
    },
  };
}

export default async function GroupStoryPage({ params }: GroupStoryPageProps) {
  const resolvedParams = await params;
  const ids = parsePublicFansubProjectRouteParams(resolvedParams);
  if (!ids) return notFound();

  const result = await loadPublicFansubProjectPageData(ids);
  if (result.status === "not-found") return notFound();

  if (result.status === "error") {
    return (
      <main className={styles.page}>
        <p className={styles.backLink}>
          <Link href={`/anime/${result.animeID}`}>Zurück zum Anime</Link>
        </p>
        <div className={styles.errorBox}>{result.message}</div>
      </main>
    );
  }

  return <ProjectPage data={result.data} />;
}
