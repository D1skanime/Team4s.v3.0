import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { ApiError, getAnimeByID, getGroupDetail, getGroupReleaseDetail } from "@/lib/api";

import { ContributorsRow } from "./ContributorsRow";
import { ReleaseDetailHero } from "./ReleaseDetailHero";
import { ReleaseGallery } from "./ReleaseGallery";
import { ReleaseNotesList } from "./ReleaseNotesList";
import { ThemeTimeline } from "./ThemeTimeline";
import styles from "./page.module.css";

interface ReleaseDetailPageProps {
  params:
    | { id: string; groupId: string; releaseVersionId: string }
    | Promise<{ id: string; groupId: string; releaseVersionId: string }>;
}

/**
 * AO4-15: eigenstaendige oeffentliche Release-Detailseite, gespeist vom
 * aggregierenden Endpoint getGroupReleaseDetail (AO4-02, 99-07). Diese Route
 * ersetzt fuer neue Verlinkungen die alte episodes/[id]?releaseId=-Umleitung.
 * Reihenfolge: Hero -> Beteiligte -> Galerie -> Textliste -> OP/ED/Middle (99-13).
 */
export default async function ReleaseDetailPage({ params }: ReleaseDetailPageProps) {
  const resolvedParams = await params;
  const animeID = Number.parseInt(resolvedParams.id, 10);
  const groupID = Number.parseInt(resolvedParams.groupId, 10);
  const releaseVersionID = Number.parseInt(resolvedParams.releaseVersionId, 10);
  if (
    Number.isNaN(animeID) || animeID <= 0 ||
    Number.isNaN(groupID) || groupID <= 0 ||
    Number.isNaN(releaseVersionID) || releaseVersionID <= 0
  ) {
    return notFound();
  }

  // Anime-/Gruppenkontext nur fuer Breadcrumb/Zurueck-Link und Poster-Fallback —
  // ein Fehlschlag hier blendet nur die Beschriftung generisch aus (AO4-14),
  // ohne die Detailseite selbst zu blockieren.
  let animeTitle: string | null = null;
  let groupName: string | null = null;
  let animePoster: string | null = null;
  try {
    const [animeResponse, groupResponse] = await Promise.all([
      getAnimeByID(animeID),
      getGroupDetail(animeID, groupID),
    ]);
    animeTitle = animeResponse.data.title;
    animePoster = animeResponse.data.cover_image ?? null;
    groupName = groupResponse.data.fansub.name;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return notFound();
  }

  let detail: Awaited<ReturnType<typeof getGroupReleaseDetail>> | null = null;
  try {
    detail = await getGroupReleaseDetail(animeID, groupID, releaseVersionID);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return notFound();
    return (
      <main className={styles.page}>
        <p className={styles.backLink}>
          <Link href={`/anime/${animeID}/group/${groupID}`}>Zurück zum Projekt</Link>
        </p>
        <div className={styles.errorBox}>Release konnte nicht geladen werden.</div>
      </main>
    );
  }

  const breadcrumbItems = [
    { label: "Anime", href: "/anime" },
    { label: animeTitle ?? "Anime", href: `/anime/${animeID}` },
    { label: groupName ?? "Gruppe", href: `/anime/${animeID}/group/${groupID}` },
    { label: "Releases", href: `/anime/${animeID}/group/${groupID}/releases` },
    { label: `Episode ${detail.episode_number}` },
  ];

  const heroImage = detail.images.find((image) => image.thumbnail_url || image.original_url) ?? null;

  return (
    <main className={styles.page}>
      <Breadcrumbs items={breadcrumbItems} />
      <p className={styles.backLink}>
        <Link href={`/anime/${animeID}/group/${groupID}`}>Zurück zum Projekt</Link>
      </p>

      <ReleaseDetailHero
        episodeNumber={detail.episode_number}
        title={detail.title}
        releaseDate={detail.release_date}
        imagesCount={detail.images_count}
        notesCount={detail.notes_count}
        contributorsCount={detail.contributors_count}
        heroImage={heroImage}
        fallbackPosterUrl={animePoster}
      />

      <ContributorsRow contributors={detail.contributors} />

      <ReleaseGallery
        animeID={animeID}
        groupID={groupID}
        releaseVersionID={releaseVersionID}
        initialImages={detail.images}
        totalCount={detail.images_count}
      />

      <ReleaseNotesList
        animeID={animeID}
        groupID={groupID}
        releaseVersionID={releaseVersionID}
        initialNotes={detail.notes}
        totalCount={detail.notes_count}
      />

      <ThemeTimeline animeID={animeID} groupID={groupID} />
    </main>
  );
}
