'use client'

import { useCallback, useEffect, useRef, useState } from "react";

import { Badge, Button, SectionHeader } from "@/components/ui";
import { ApiError, getGroupReleaseImages } from "@/lib/api";
import type { PublicReleaseImage } from "@/types/releaseDetail";
import { CATEGORY_LABELS } from "@/types/releaseVersionMedia";

import styles from "./ReleaseGallery.module.css";

interface ReleaseGalleryProps {
  animeID: number;
  groupID: number;
  releaseVersionID: number;
  /** Bereits geladene erste Seite aus dem Aggregat-Endpoint (getGroupReleaseDetail, 99-07). */
  initialImages: PublicReleaseImage[];
  totalCount: number;
}

const PAGE_LIMIT = 12;
const SKELETON_COUNT = 4;

/**
 * AO4-18: vollstaendige Bildergalerie als Grid, pro Bild Typ-Tag (AO4-05) und
 * Autor-Chip sichtbar. Erste Seite kommt als Prop aus dem bereits geladenen
 * Aggregat-Endpoint; weiteres Nachladen via Cursor-Endpoint (getGroupReleaseImages,
 * AO4-24) mit IntersectionObserver-Auto-Load UND "Mehr laden"-Button (AO4-25).
 * Nachgeladene Seiten werden per Bild-id dedupliziert, damit ein moeglicher
 * Reihenfolge-Unterschied zwischen dem vollstaendig ladenden Aggregat und der
 * Seek-Cursor-Fortschreitung nie zu doppelten Kacheln fuehrt.
 */
export function ReleaseGallery({
  animeID,
  groupID,
  releaseVersionID,
  initialImages,
  totalCount,
}: ReleaseGalleryProps) {
  const [items, setItems] = useState<PublicReleaseImage[]>(initialImages);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initialImages.length < totalCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadTriggerRef = useRef<HTMLDivElement | null>(null);

  const loadPage = useCallback(
    async (nextCursor: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const page = await getGroupReleaseImages(animeID, groupID, releaseVersionID, {
          cursor: nextCursor ?? undefined,
          limit: PAGE_LIMIT,
        });
        setItems((prev) => {
          const seenIds = new Set(prev.map((item) => item.id));
          const fresh = page.items.filter((item) => !seenIds.has(item.id));
          return [...prev, ...fresh];
        });
        setCursor(page.next_cursor);
        setHasMore(page.has_more);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Weitere Bilder konnten nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    },
    [animeID, groupID, releaseVersionID],
  );

  // Automatisches Nachladen (AO4-21: Infinite Scroll ausschliesslich hier).
  useEffect(() => {
    if (!hasMore || loading) return;

    const callback: IntersectionObserverCallback = (entries) => {
      const [entry] = entries;
      if (entry.isIntersecting) loadPage(cursor);
    };

    observerRef.current = new IntersectionObserver(callback, { rootMargin: "200px" });
    if (loadTriggerRef.current) observerRef.current.observe(loadTriggerRef.current);

    return () => observerRef.current?.disconnect();
  }, [cursor, hasMore, loading, loadPage]);

  if (totalCount === 0) return null;

  return (
    <section id="galerie" className={styles.section}>
      <SectionHeader title="Galerie" description={`${totalCount} Bilder`} />

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.grid}>
        {items.map((image) => {
          const thumbnailUrl = image.thumbnail_url;
          const originalUrl = image.original_url;
          const src = thumbnailUrl ?? originalUrl;
          // AO4-23: srcset/sizes nur, wenn zwei unterschiedliche Aufloesungen vorliegen.
          const srcSet =
            thumbnailUrl && originalUrl && thumbnailUrl !== originalUrl
              ? `${thumbnailUrl} 480w, ${originalUrl} 1280w`
              : undefined;

          return (
            <figure key={image.id} className={styles.card}>
              <div className={styles.imageShell}>
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={src}
                    srcSet={srcSet}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 220px"
                    alt={image.caption ?? CATEGORY_LABELS[image.category]}
                    className={styles.image}
                    loading="lazy"
                  />
                ) : (
                  <div className={styles.imagePlaceholder} aria-hidden="true" />
                )}
                <Badge variant="muted" className={styles.typeTag}>
                  {CATEGORY_LABELS[image.category]}
                </Badge>
              </div>
              <figcaption className={styles.authorChip}>{image.author_name ?? "Unbekannt"}</figcaption>
            </figure>
          );
        })}

        {loading
          ? Array.from({ length: SKELETON_COUNT }).map((_, index) => (
              <div key={`skeleton-${index}`} className={styles.skeletonCard} aria-hidden="true" />
            ))
          : null}
      </div>

      {hasMore ? (
        <div className={styles.loadMoreRow}>
          <div ref={loadTriggerRef} className={styles.loadTrigger} aria-hidden="true" />
          <Button variant="secondary" size="sm" onClick={() => loadPage(cursor)} loading={loading}>
            Mehr laden
          </Button>
        </div>
      ) : null}
    </section>
  );
}
