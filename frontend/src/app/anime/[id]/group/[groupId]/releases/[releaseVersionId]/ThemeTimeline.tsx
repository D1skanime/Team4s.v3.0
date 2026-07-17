"use client";

import { useEffect, useRef, useState } from "react";

import { Badge, SectionHeader } from "@/components/ui";
import { useAuthSession } from "@/lib/useAuthSession";
import type { PublicReleaseSegment } from "@/types/releaseDetail";

import styles from "./page.module.css";

interface ThemeTimelineProps {
  releaseVersionID: number;
  episodeDurationSeconds: number | null;
  segments: PublicReleaseSegment[];
  initialSegmentID?: number | null;
  autoPlayInitial?: boolean;
}

const TYPE_LABELS: Record<string, string> = { OP: "Opening", ED: "Ending", MIDDLE: "Middle", IN: "Insert", KARA: "Karaoke" };

function clock(seconds: number | null): string | null {
  if (seconds === null) return null;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

export function ThemeTimeline({ releaseVersionID, episodeDurationSeconds, segments, initialSegmentID, autoPlayInitial = false }: ThemeTimelineProps) {
  const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession();
  const hasSession = isClientInitialized && (hasAccessToken || hasRefreshToken);
  const [selected, setSelected] = useState<PublicReleaseSegment | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const initialSelectionHandled = useRef(false);

  useEffect(() => {
    if (initialSelectionHandled.current || !isClientInitialized || !initialSegmentID || !autoPlayInitial) return;
    if (!hasSession) return;
    const segment = segments.find((item) => item.theme_segment_id === initialSegmentID && item.readiness === "ready");
    initialSelectionHandled.current = true;
    if (!segment) return;
    const timeout = window.setTimeout(() => setSelected(segment), 0);
    return () => window.clearTimeout(timeout);
  }, [autoPlayInitial, hasSession, initialSegmentID, isClientInitialized, segments]);

  useEffect(() => () => {
    videoRef.current?.pause();
    videoRef.current?.removeAttribute("src");
    videoRef.current?.load();
  }, []);

  if (segments.length === 0) return null;
  const duration = episodeDurationSeconds && episodeDurationSeconds > 0
    ? episodeDurationSeconds
    : Math.max(...segments.map((item) => item.end_seconds ?? 0), 1);

  const select = (segment: PublicReleaseSegment) => {
    if (!hasSession || segment.readiness !== "ready") return;
    const player = videoRef.current;
    if (player) {
      player.pause();
      player.removeAttribute("src");
      player.load();
    }
    setSelected(segment);
  };

  return (
    <section id="op-ed-middle" className={styles.timelineSection}>
      <SectionHeader title="Karaoke-Segmente" />
      <div className={styles.episodeTimeline} aria-label="Karaoke-Zeitleiste der Episode">
        {segments.map((segment) => {
          const start = segment.start_seconds ?? 0;
          const end = segment.end_seconds ?? start;
          const left = Math.min(100, Math.max(0, start / duration * 100));
          const width = Math.max(2, Math.min(100 - left, (end - start) / duration * 100));
          const playable = hasSession && segment.readiness === "ready";
          return (
            <button
              key={segment.theme_segment_id}
              type="button"
              className={styles.timelineMark}
              style={{ left: `${left}%`, width: `${width}%` }}
              onClick={() => select(segment)}
              disabled={!playable}
              aria-label={`${segment.name}, ${clock(segment.start_seconds) ?? "Start unbekannt"} bis ${clock(segment.end_seconds) ?? "Ende unbekannt"}`}
            >
              {segment.type}
            </button>
          );
        })}
      </div>
      <div className={styles.timelineCards}>
        {segments.map((segment) => (
          <article key={segment.theme_segment_id} className={styles.timelineItem}>
            {segment.preview_url ? <img className={styles.timelineThumb} src={segment.preview_url} alt="" /> : null}
            <div className={styles.timelineMeta}>
              <strong>{segment.name}</strong>
              <div className={styles.timelineTags}>
                <Badge variant="muted">{TYPE_LABELS[segment.type.toUpperCase()] ?? segment.type}</Badge>
                <span className={styles.timelineTime}>{clock(segment.start_seconds)} – {clock(segment.end_seconds)}</span>
                {segment.duration_seconds !== null ? <span className={styles.timelineTime}>{clock(segment.duration_seconds)} Min.</span> : null}
              </div>
              {segment.participants.length > 0 ? <span className={styles.timelineTime}>{segment.participants.map((p) => `${p.name} · ${p.role_label}`).join(", ")}</span> : null}
              {segment.readiness !== "ready" ? <span className={styles.timelineUnavailable}>Noch nicht abspielbar</span> : null}
              {hasSession && segment.readiness === "ready" ? <button type="button" className={styles.timelinePlay} onClick={() => select(segment)}>Abspielen</button> : null}
            </div>
          </article>
        ))}
      </div>
      {selected ? (
        <div className={styles.timelinePlayer}>
          <h3>{selected.name}</h3>
          <video
            key={selected.theme_segment_id}
            ref={videoRef}
            src={`/api/segments/${selected.theme_segment_id}/stream?release_version_id=${releaseVersionID}`}
            controls
            autoPlay
            playsInline
            onLoadedData={(event) => { void event.currentTarget.play().catch(() => undefined); }}
          />
        </div>
      ) : null}
    </section>
  );
}
