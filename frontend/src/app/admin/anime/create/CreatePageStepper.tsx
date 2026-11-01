"use client";

import createStyles from "./page.pageShell.module.css";
import stepperStyles from "./page.stepper.module.css";

const STEPS = [
  { id: 1, label: "Anime finden", sub: "AniSearch & Jellyfin" },
  { id: 2, label: "Assets", sub: "Cover, Banner, Logo & Hintergründe" },
  { id: 3, label: "Details", sub: "Infos & Beschreibung" },
  { id: 4, label: "Prüfen & Anlegen", sub: "" },
] as const;

interface CreatePageStepperProps {
  activeStep?: 1 | 2 | 3 | 4;
  steps?: ReadonlyArray<{
    id: 1 | 2 | 3 | 4;
    label: string;
    sub: string;
  }>;
}

export function CreatePageStepper({
  activeStep = 1,
  steps = STEPS,
}: CreatePageStepperProps) {
  return (
    <nav className={createStyles.stepper} aria-label="Erstellungsschritte">
      {steps.map((step) => {
        const isActive = step.id === activeStep;
        const isDone = step.id < activeStep;
        return (
          <a
            key={step.id}
            href={`#section-${step.id}`}
            className={[
              stepperStyles.stepperItem,
              isActive ? stepperStyles.stepperItemActive : "",
              isDone ? stepperStyles.stepperItemDone : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-current={isActive ? "step" : undefined}
          >
            <span className={stepperStyles.stepperNumber}>{step.id}</span>
            <span className={stepperStyles.stepperLabel}>
              <strong>{step.label}</strong>
              <small>{step.sub}</small>
            </span>
          </a>
        );
      })}
    </nav>
  );
}
