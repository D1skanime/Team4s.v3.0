import Link from "next/link";
import { notFound } from "next/navigation";

import { ProjectPage } from "@/app/anime/[id]/group/[groupId]/ProjectPage";
import styles from "@/app/anime/[id]/group/[groupId]/page.module.css";
import { loadPublicFansubProjectPageData } from "@/app/anime/[id]/group/[groupId]/projectPageData";
import { ApiError, getPublicFansubProfileBySlug } from "@/lib/api";

interface PrettyFansubProjectPageProps {
  params:
    | { fansubSlug: string; animeSlug: string }
    | Promise<{ fansubSlug: string; animeSlug: string }>;
}

export default async function PrettyFansubProjectPage({ params }: PrettyFansubProjectPageProps) {
  const resolvedParams = await params;
  const fansubSlug = resolvedParams.fansubSlug?.trim();
  const animeSlug = resolvedParams.animeSlug?.trim();

  if (!fansubSlug || !animeSlug) return notFound();

  let profileResponse: Awaited<ReturnType<typeof getPublicFansubProfileBySlug>>;
  try {
    profileResponse = await getPublicFansubProfileBySlug(fansubSlug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return notFound();
    throw error;
  }

  const profile = profileResponse.data;
  const project = profile.projects.find((item) => item.anime_slug?.trim() === animeSlug);
  if (!project) return notFound();

  const result = await loadPublicFansubProjectPageData({
    animeID: project.id,
    groupID: profile.group.id,
  });
  if (result.status === "not-found") return notFound();

  if (result.status === "error") {
    return (
      <main className={styles.page}>
        <p className={styles.backLink}>
          <Link href={`/fansubs/${profile.group.slug}`}>Zurück zur Fansubgruppe</Link>
        </p>
        <div className={styles.errorBox}>{result.message}</div>
      </main>
    );
  }

  return <ProjectPage data={result.data} />;
}
