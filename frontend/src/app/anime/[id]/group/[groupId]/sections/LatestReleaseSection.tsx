import Link from "next/link";

import { Badge, Card, SectionHeader } from "@/components/ui";
import { getGroupReleaseDetail } from "@/lib/api";
import { CATEGORY_LABELS } from "@/types/releaseVersionMedia";

import styles from "./LatestReleaseSection.module.css";

interface LatestReleaseSectionProps {
  animeID: number;
  groupID: number;
  releaseVersionID: number;
}

const MAX_IMAGE_PREVIEWS = 4;
const MAX_TEXT_PREVIEWS = 2;
const NOTE_EXCERPT_LENGTH = 160;

/** Entfernt HTML-Tags und kuerzt einen TipTap-body_html-Text fuer die kompakte Vorschau. */
function toNoteExcerpt(bodyHtml: string): string {
  const plain = bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return plain.length > NOTE_EXCERPT_LENGTH ? `${plain.slice(0, NOTE_EXCERPT_LENGTH)}…` : plain;
}

function formatReleaseDate(releaseDate: string | null): string | null {
  if (!releaseDate) return null;
  const parsed = new Date(releaseDate);
  if (Number.isNaN(parsed.getTime())) return releaseDate;
  return parsed.toLocaleDateString("de-DE", { year: "numeric", month: "long", day: "numeric" });
}

/**
 * AO4-11: eingebettete Vorschau des neuesten Release auf der Projektseite.
 * Laedt das aggregierte Payload selbst ueber getGroupReleaseDetail (AO4-02).
 * KEIN Infinite Scroll hier (AO4-21) — vollstaendige Galerie/Textliste liegt
 * auf der Release-Detailseite (99-12+).
 */
export async function LatestReleaseSection({ animeID, groupID, releaseVersionID }: LatestReleaseSectionProps) {
  let detail: Awaited<ReturnType<typeof getGroupReleaseDetail>> | null = null;
  try {
    detail = await getGroupReleaseDetail(animeID, groupID, releaseVersionID);
  } catch {
    // AO4-14: kein technischer Fehlertext im oeffentlichen UI — Sektion einfach ausblenden.
    return null;
  }

  const previewImages = detail.images.slice(0, MAX_IMAGE_PREVIEWS);
  const remainingImages = Math.max(detail.images_count - previewImages.length, 0);
  const previewNotes = detail.notes.slice(0, MAX_TEXT_PREVIEWS);
  const releaseDateLabel = formatReleaseDate(detail.release_date);
  const detailHref = `/anime/${animeID}/group/${groupID}/releases/${releaseVersionID}`;

  return (
    <div id="neuestes-release" className={styles.section}>
      <SectionHeader title="Neuestes Release" />
      <Card variant="section" className={styles.card}>
        <div className={styles.head}>
          <h3 className={styles.title}>{detail.title}</h3>
          {releaseDateLabel ? <span className={styles.date}>{releaseDateLabel}</span> : null}
        </div>

        <div className={styles.stats}>
          <span className={styles.statItem}>{detail.images_count} Bilder</span>
          <span className={styles.statItem}>{detail.notes_count} Texte</span>
          <span className={styles.statItem}>{detail.contributors_count} Fansubber</span>
        </div>

        {previewImages.length > 0 ? (
          <div className={styles.imageGrid}>
            {previewImages.map((image) => (
              <div key={image.id} className={styles.imageTile}>
                {image.thumbnail_url ? (
                  <img
                    src={image.thumbnail_url}
                    srcSet={
                      image.original_url
                        ? `${image.thumbnail_url} 320w, ${image.original_url} 960w`
                        : undefined
                    }
                    sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 200px"
                    loading="lazy"
                    alt={image.caption ?? CATEGORY_LABELS[image.category]}
                    className={styles.imageThumb}
                  />
                ) : (
                  <div className={styles.imageSkeleton} aria-hidden="true" />
                )}
                <Badge variant="muted" className={styles.imageBadge}>
                  {CATEGORY_LABELS[image.category]}
                </Badge>
              </div>
            ))}
            {remainingImages > 0 ? (
              <div className={styles.imageMoreTile} aria-label={`${remainingImages} weitere Bilder`}>
                <span>+{remainingImages}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {previewNotes.length > 0 ? (
          <div className={styles.noteList}>
            {previewNotes.map((note) => (
              <div key={note.id} className={styles.noteItem}>
                <span className={styles.noteAuthor}>{note.member_name}</span>
                <p className={styles.noteExcerpt}>{toNoteExcerpt(note.body_html)}</p>
              </div>
            ))}
          </div>
        ) : null}

        {detail.contributors.length > 0 ? (
          <div className={styles.contributorRow}>
            {detail.contributors.map((contributor) => (
              <div
                key={contributor.member_id}
                className={styles.contributorAvatar}
                title={`${contributor.name} – ${contributor.role_label}`}
              >
                <span aria-hidden="true">{contributor.name.charAt(0).toUpperCase()}</span>
              </div>
            ))}
          </div>
        ) : null}

        <Link href={detailHref} className={styles.detailLink}>
          Vollständiges Release ansehen
        </Link>
      </Card>
    </div>
  );
}
