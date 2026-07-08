import { Badge, SectionHeader } from "@/components/ui";
import { getGroupThemes } from "@/lib/api";
import type { PublicGroupTheme } from "@/types/groupContributors";

import styles from "./page.module.css";

interface ThemeTimelineProps {
  animeID: number;
  groupID: number;
}

const THEME_TYPE_LABELS: Record<string, string> = {
  OP: "Opening",
  ED: "Ending",
  MIDDLE: "Middle",
};

/** Baut aus start_time/end_time (HH:MM:SS oder null, AO4-04) eine Zeitcode-Spanne. Kein Platzhalter bei fehlenden Werten. */
function formatTimeRange(startTime: string | null, endTime: string | null): string | null {
  if (startTime && endTime) return `${startTime} – ${endTime}`;
  if (startTime) return startTime;
  if (endTime) return endTime;
  return null;
}

/**
 * AO4-20: OP/ED/Middle-Timeline aus den Projekt-Themes (getGroupThemes) — reine
 * Vorschau-Darstellung (Thumbnail + Zeitcode + Typ-Tag). KEIN Video-Player,
 * keine Abspielsteuerung.
 */
export async function ThemeTimeline({ animeID, groupID }: ThemeTimelineProps) {
  let themes: PublicGroupTheme[] = [];
  try {
    const response = await getGroupThemes(animeID, groupID);
    themes = response.themes;
  } catch {
    // AO4-14: kein technischer Fehlertext im oeffentlichen UI — Sektion ausblenden.
    return null;
  }

  if (themes.length === 0) return null;

  return (
    <section id="op-ed-middle" className={styles.timelineSection}>
      <SectionHeader title="OP / ED / Middle" />
      <div className={styles.timelineList}>
        {themes.map((theme) => {
          const typeKey = theme.type.toUpperCase();
          const timeRangeLabel = formatTimeRange(theme.start_time, theme.end_time);
          const thumbnailUrl = theme.assets.find((asset) => asset.thumbnail_url)?.thumbnail_url ?? null;
          return (
            <div key={theme.id} className={styles.timelineItem}>
              <div className={styles.timelineThumbShell}>
                {thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbnailUrl}
                    alt={theme.title}
                    loading="lazy"
                    className={styles.timelineThumb}
                  />
                ) : (
                  <div className={styles.timelineThumbPlaceholder} aria-hidden="true" />
                )}
              </div>
              <div className={styles.timelineMeta}>
                <span className={styles.timelineTitle}>{theme.title}</span>
                <div className={styles.timelineTags}>
                  <Badge variant="muted">{THEME_TYPE_LABELS[typeKey] ?? theme.type}</Badge>
                  {timeRangeLabel ? <span className={styles.timelineTime}>{timeRangeLabel}</span> : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
