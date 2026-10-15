"use client";

import { WIZARD_STEPS, type WizardStep } from "./useMergeFansubsWizard";

import sharedStyles from "../../admin.module.css";
import mergeStyles from "./MergeWizard.module.css";

const styles = { ...sharedStyles, ...mergeStyles };

export function MergeWizardProgress({
  currentStep,
  merging,
  isStepEnabled,
  onGoToStep,
}: {
  currentStep: WizardStep;
  merging: boolean;
  isStepEnabled: (step: WizardStep) => boolean;
  onGoToStep: (step: WizardStep) => void;
}) {
  return (
    <div className={styles.panel}>
      <div className={styles.mergeWizardProgressBar} aria-hidden="true">
        <div
          className={styles.mergeWizardProgressFill}
          style={{ width: `${(currentStep / WIZARD_STEPS.length) * 100}%` }}
        />
      </div>
      <ol className={styles.mergeWizardSteps} aria-label="Merge Schritte">
        {WIZARD_STEPS.map((step) => {
          const isActive = step.id === currentStep;
          const isDone = step.id < currentStep;
          const disabled = !isStepEnabled(step.id);
          return (
            <li
              key={step.id}
              className={`${styles.mergeWizardStepItem} ${isActive ? styles.mergeWizardStepActive : ""} ${isDone ? styles.mergeWizardStepDone : ""} ${disabled ? styles.mergeWizardStepDisabled : ""}`}
            >
              <button
                type="button"
                className={styles.mergeWizardStepButton}
                onClick={() => onGoToStep(step.id)}
                disabled={disabled || merging}
              >
                <span className={styles.mergeWizardStepIndex}>{step.id}</span>
                <span>{step.title}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
