// Aliases ("Tags") section, extracted verbatim from AdminFansubCreateContent
// (174-14, D-14). Props-driven, presentational; state and mutation logic
// (addAlias/removeAlias) stay owned by the page component / its action hook.

import { Dispatch, SetStateAction } from "react";

import sharedStyles from "../../admin.module.css";
import fansubEditStyles from "../[id]/edit/FansubEdit.module.css";

const styles = { ...sharedStyles, ...fansubEditStyles };

interface AdminFansubCreateAliasesSectionProps {
  aliasDrafts: string[];
  aliasInput: string;
  setAliasInput: Dispatch<SetStateAction<string>>;
  setAliasError: Dispatch<SetStateAction<string | null>>;
  aliasError: string | null;
  aliasBusy: boolean;
  addAlias: () => Promise<void>;
  removeAlias: (aliasValue: string) => Promise<void>;
}

export function AdminFansubCreateAliasesSection({
  aliasDrafts,
  aliasInput,
  setAliasInput,
  setAliasError,
  aliasError,
  aliasBusy,
  addAlias,
  removeAlias,
}: AdminFansubCreateAliasesSectionProps) {
  return (
    <details className={styles.fansubEditSection} open>
      <summary className={styles.fansubEditSectionSummary}>Tags</summary>
      <div className={styles.fansubEditSectionBody}>
        <p className={styles.fansubEditHint}>
          Alternative Gruppennamen. Vor dem ersten Speichern werden sie lokal
          gesammelt und danach in dieselbe Alias-Tabelle geschrieben wie im
          Edit-Flow.
        </p>
        <div className={styles.inputRow}>
          <input
            value={aliasInput}
            onChange={(event) => {
              setAliasInput(event.target.value);
              setAliasError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void addAlias();
              }
            }}
          />
          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={() => void addAlias()}
            disabled={aliasBusy}
          >
            Hinzufügen
          </button>
        </div>
        {aliasError ? (
          <p className={styles.fansubEditInlineError}>{aliasError}</p>
        ) : null}
        <div className={styles.chipBox}>
          <div className={styles.chipRow}>
            {aliasDrafts.map((alias) => (
              <button
                key={alias}
                type="button"
                className={`${styles.chip} ${styles.aliasChipDanger}`}
                onClick={() => void removeAlias(alias)}
                disabled={aliasBusy}
              >
                {alias} x
              </button>
            ))}
          </div>
        </div>
      </div>
    </details>
  );
}
