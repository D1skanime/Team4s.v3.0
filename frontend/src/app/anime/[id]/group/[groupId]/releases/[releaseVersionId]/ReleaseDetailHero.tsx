import { SectionHeader } from "@/components/ui";
import type { PublicReleaseImage } from "@/types/releaseDetail";

import styles from "./page.module.css";

interface ReleaseDetailHeroProps {
  episodeNumber: string;
  title: string;
  releaseDate: string | null;
  imagesCount: number;
  notesCount: number;
  contributorsCount: number;
  heroImage: PublicReleaseImage | null;
  fallbackPosterUrl: string | null;
}

function formatReleaseDate(releaseDate: string | null): string | null {
  if (!releaseDate) return null;
  const parsed = new Date(releaseDate);
  if (Number.isNaN(parsed.getTime())) return releaseDate;
  return parsed.toLocaleDateString("de-DE", { year: "numeric", month: "long", day: "numeric" });
}

/** AO4-16: Hero mit Kennzahlen (Bilder/Texte/Beteiligte) + Veroeffentlichungsdatum. */
export function ReleaseDetailHero({
  episodeNumber,
  title,
  releaseDate,
  imagesCount,
  notesCount,
  contributorsCount,
  heroImage,
  fallbackPosterUrl,
}: ReleaseDetailHeroProps) {
  const releaseDateLabel = formatReleaseDate(releaseDate);
  const thumbnailUrl = heroImage?.thumbnail_url ?? null;
  const originalUrl = heroImage?.original_url ?? null;
  const imageSrc = thumbnailUrl ?? originalUrl ?? fallbackPosterUrl;
  // AO4-23: srcset/sizes nur, wenn zwei unterschiedliche Aufloesungen vorliegen.
  const srcSet =
    thumbnailUrl && originalUrl && thumbnailUrl !== originalUrl
      ? `${thumbnailUrl} 480w, ${originalUrl} 1280w`
      : undefined;

  return (
    <section className={styles.hero}>
      {imageSrc ? (
        <div className={styles.heroImageShell}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            srcSet={srcSet}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 960px"
            alt={heroImage?.caption ?? title}
            className={styles.heroImage}
            loading="eager"
          />
        </div>
      ) : null}

      <div className={styles.heroContent}>
        <SectionHeader eyebrow={`Episode ${episodeNumber}`} title={title} />
        {releaseDateLabel ? (
          <p className={styles.releaseDate}>Veröffentlicht am {releaseDateLabel}</p>
        ) : null}

        <div className={styles.statsRow}>
          <span className={styles.statItem}>{imagesCount} Bilder</span>
          <span className={styles.statItem}>{notesCount} Texte</span>
          <span className={styles.statItem}>{contributorsCount} Beteiligte</span>
        </div>
      </div>
    </section>
  );
}
