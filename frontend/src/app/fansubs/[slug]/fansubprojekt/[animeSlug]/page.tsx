import Link from "next/link";
import { notFound } from "next/navigation";

import { ProjectPage } from "@/app/anime/[id]/group/[groupId]/ProjectPage";
import styles from "@/app/anime/[id]/group/[groupId]/page.module.css";
import { loadPublicFansubProjectPageData } from "@/app/anime/[id]/group/[groupId]/projectPageData";
import { ApiError, resolveFansubProject } from "@/lib/api";
import { buildFansubProjectNavigation } from "@/lib/fansubProjectNavigation";
import { buildPublicFansubProjectPath } from "@/lib/fansubProjectRoutes";

interface PrettyFansubProjectPageProps {
  params: Promise<{ slug: string; animeSlug: string }>;
}

export default async function PrettyFansubProjectPage({ params }: PrettyFansubProjectPageProps) {
  const resolvedParams = await params;
  const fansubSlug = resolvedParams.slug?.trim();
  const animeSlug = resolvedParams.animeSlug?.trim();

  if (!fansubSlug || !animeSlug) return notFound();

  let resolution: Awaited<ReturnType<typeof resolveFansubProject>>;
  try {
    resolution = await resolveFansubProject(fansubSlug, animeSlug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return notFound();
    throw error;
  }

  const canonicalProjectPath = buildPublicFansubProjectPath(fansubSlug, resolution.data.anime_slug);
  const fansubProjectNavigation = buildFansubProjectNavigation({
    currentAnimeID: resolution.data.anime_id,
    currentAnimeSlug: resolution.data.anime_slug,
    currentFansubGroupID: resolution.data.group_id,
    currentFansubSlug: fansubSlug,
    projects: resolution.data.projects,
  });

  const result = await loadPublicFansubProjectPageData({
    animeID: resolution.data.anime_id,
    groupID: resolution.data.group_id,
    precomputed: { canonicalProjectPath, fansubProjectNavigation },
  });
  if (result.status === "not-found") return notFound();

  if (result.status === "error") {
    return (
      <main className={styles.page}>
        <p className={styles.backLink}>
          <Link href={`/fansubs/${fansubSlug}`}>Zurück zur Fansubgruppe</Link>
        </p>
        <div className={styles.errorBox}>{result.message}</div>
      </main>
    );
  }

  return <ProjectPage data={result.data} />;
}
