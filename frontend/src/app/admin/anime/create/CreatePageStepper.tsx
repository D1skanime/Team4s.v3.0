"use client";

import createStyles from "./page.module.css";

const STEPS = [
  { id: 1, label: "Anime finden", sub: "AniSearch & Jellyfin" },
  { id: 2, label: "Assets", sub: "Cover, Banner, Logo & Hintergründe" },
  { id: 3, label: "Details", sub: "Infos & Beschreibung" },
  { id: 4, label: "Prüfen & Anlegen", sub: "Abschließende Kontrolle" },
] as const;

interface CreatePageStepperProps {
  activeStep?: 1 | 2 | 3 | 4;
}

export function CreatePageStepper({ activeStep = 1 }: CreatePageStepperProps) {
  return (
    <nav className={createStyles.stepper} aria-label="Erstellungsschritte">
      {STEPS.map((step) => {
        const isActive = step.id === activeStep;
        const isDone = step.id < activeStep;
        return (
          <a
            key={step.id}
            href={`#section-${step.id}`}
            className={[
              createStyles.stepperItem,
              isActive ? createStyles.stepperItemActive : "",
              isDone ? createStyles.stepperItemDone : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-current={isActive ? "step" : undefined}
          >
            <span className={createStyles.stepperNumber}>{step.id}</span>
            <span className={createStyles.stepperLabel}>
              <strong>{step.label}</strong>
              <small>{step.sub}</small>
            </span>
          </a>
        );
      })}
    </nav>
  );
}
