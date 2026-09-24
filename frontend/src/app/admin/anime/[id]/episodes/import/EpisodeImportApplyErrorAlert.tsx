"use client";

import { useEffect, useRef } from "react";

import { ErrorState } from "@/components/ui";
import styles from "./page.module.css";

interface EpisodeImportApplyErrorAlertProps {
  message: string | null;
}

/**
 * GAP-12 (167-UAT.md): vor diesem Fix landete ein fehlgeschlagenes „Mapping
 * anwenden" ausschließlich im allgemeinen, ganz oben gerenderten Fehler-State
 * -- weit entfernt vom Button, ohne role="alert" -- wodurch ein Fehlschlag
 * wie ein stiller Nichts-Passiert-Klick wirkte. Diese Komponente rendert die
 * Fehlermeldung stattdessen direkt beim Button, mit role="alert" und
 * automatischem Scroll/Fokus dorthin bei jeder neuen Meldung.
 */
export function EpisodeImportApplyErrorAlert({
  message,
}: EpisodeImportApplyErrorAlertProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message == null) return;
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    ref.current?.focus();
  }, [message]);

  if (message == null) {
    return null;
  }

  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className={styles.applyErrorAlert}
    >
      <ErrorState
        title="Mapping konnte nicht angewendet werden"
        description={message}
      />
    </div>
  );
}
