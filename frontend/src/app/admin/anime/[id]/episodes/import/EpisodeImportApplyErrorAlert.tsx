"use client";

import { useEffect, useRef } from "react";

import { ErrorState } from "@/components/ui";
import styles from "./page.module.css";

interface EpisodeImportApplyErrorAlertProps {
  message: string | null;
}

/**
 * Rendert eine fehlgeschlagene „Mapping anwenden"-Aktion direkt beim auslösenden Button statt nur
 * im allgemeinen, weit entfernten Fehler-Bereich oben auf der Seite -- sonst wirkt ein
 * Fehlschlag wie ein stiller Nichts-passiert-Klick. Scrollt bei jeder neuen Meldung automatisch
 * dorthin und setzt den Fokus; die role="alert"-Ansage für Screenreader kommt bereits vom
 * verschachtelten ErrorState selbst (kein zweites, redundantes role="alert" auf diesem Wrapper).
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
