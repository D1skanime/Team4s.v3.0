'use client'

import { useCallback, useEffect, useRef, useState } from "react";

import { RichTextRenderer } from "@/components/editor";
import { Button, Card, SectionHeader } from "@/components/ui";
import { ApiError, getGroupReleaseNotes } from "@/lib/api";
import type { PublicReleaseNote } from "@/types/releaseDetail";

import styles from "./ReleaseNotesList.module.css";

interface ReleaseNotesListProps {
  animeID: number;
  groupID: number;
  releaseVersionID: number;
  /** Bereits geladene erste Seite aus dem Aggregat-Endpoint (getGroupReleaseDetail, 99-07). */
  initialNotes: PublicReleaseNote[];
  totalCount: number;
}

const PAGE_LIMIT = 10;
const SKELETON_COUNT = 2;

function formatNoteTimestamp(createdAt: string): string {
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) return createdAt;
  return parsed.toLocaleString("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * AO4-19: vollstaendige Textliste als Karten (Avatar, Name, Zeitpunkt, Inhalt).
 * Erste Seite kommt als Prop aus dem Aggregat-Endpoint; weiteres Nachladen via
 * Cursor-Endpoint (getGroupReleaseNotes, AO4-24) mit IntersectionObserver-
 * Auto-Load UND "Mehr laden"-Button (AO4-25). Dedupe per id analog ReleaseGallery.
 * Kein avatar_url im Payload (99-07-Entscheidung) — Initiale-Placeholder analog
 * ContributorsRow/LatestReleaseSection.
 */
export function ReleaseNotesList({
  animeID,
  groupID,
  releaseVersionID,
  initialNotes,
  totalCount,
}: ReleaseNotesListProps) {
  const [items, setItems] = useState<PublicReleaseNote[]>(initialNotes);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initialNotes.length < totalCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadTriggerRef = useRef<HTMLDivElement | null>(null);

  const loadPage = useCallback(
    async (nextCursor: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const page = await getGroupReleaseNotes(animeID, groupID, releaseVersionID, {
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
        setError(err instanceof ApiError ? err.message : "Weitere Beiträge konnten nicht geladen werden.");
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
    <section id="textbeitraege" className={styles.section}>
      <SectionHeader title="Textbeiträge" description={`${totalCount} Beiträge`} />

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.list}>
        {items.map((note) => (
          <Card key={note.id} variant="flat" className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.avatar} aria-hidden="true">
                {note.member_name.charAt(0).toUpperCase()}
              </div>
              <div className={styles.cardMeta}>
                <span className={styles.memberName}>{note.member_name}</span>
                <span className={styles.roleAndTime}>
                  {note.role_label ? `${note.role_label} · ` : ""}
                  {formatNoteTimestamp(note.created_at)}
                </span>
              </div>
            </div>
            <div className={styles.cardBody}>
              <RichTextRenderer bodyHtml={note.body_html} editorType="tiptap" contentSchemaVersion={1} />
            </div>
          </Card>
        ))}

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
