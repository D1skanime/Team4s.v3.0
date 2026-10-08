// Basic-information section, extracted from AdminFansubCreateContent as part
// of the D-04 primitive migration (176-07): name/slug/status/country
// plus the founded/dissolved year pickers move into their own presentational
// component, matching the AdminFansubCreateAliasesSection/
// AdminFansubCreateLinksSection/AdminFansubCreateMediaSection split already
// established for this page (174-14) and keeping page.tsx under the 450-line
// cap (D-22). Field state stays owned by the page component; this is a pure
// props-driven swap of native <input>/<select> for @/components/ui
// primitives, mirroring FansubBasicInfoTab.tsx's already-migrated pattern.

import { Dispatch, SetStateAction } from "react";

import { Input, Select, YearPicker } from "@/components/ui";
import { FansubGroupKuerzelField } from "@/components/admin/FansubGroupKuerzelField";
import { getFansubStatusLabel } from "@/lib/fansub-labels";
import { FansubStatus } from "@/types/fansub";

import sharedStyles from "../../admin.module.css";
import fansubEditStyles from "../[id]/edit/FansubEdit.module.css";
import { FormState, slugify } from "./adminFansubCreateHelpers";

const styles = { ...sharedStyles, ...fansubEditStyles };

const STATUS_OPTIONS: FansubStatus[] = ["active", "inactive", "dissolved"];

interface AdminFansubCreateBasicInfoSectionProps {
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  setManualSlug: Dispatch<SetStateAction<boolean>>;
  nameError: string | null;
  slugFormatError: string | null;
  slugConflict: boolean;
  slugChecking: boolean;
  foundedError: string | null;
  dissolvedError: string | null;
  dissolvedAfterFoundedError: string | null;
  yearMin: number;
  yearMax: number;
}

export function AdminFansubCreateBasicInfoSection({
  form,
  setForm,
  setManualSlug,
  nameError,
  slugFormatError,
  slugConflict,
  slugChecking,
  foundedError,
  dissolvedError,
  dissolvedAfterFoundedError,
  yearMin,
  yearMax,
}: AdminFansubCreateBasicInfoSectionProps) {
  return (
    <details className={styles.fansubEditSection} open>
      <summary className={styles.fansubEditSectionSummary}>
        Grunddaten
      </summary>
      <div className={styles.fansubEditSectionBody}>
        <div className={styles.responsiveFieldGrid}>
          <div className={styles.field}>
            <label>
              Name{" "}
              <span className={styles.fansubEditRequired}>*</span>
            </label>
            <Input
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              required
              minLength={2}
              invalid={Boolean(nameError)}
            />
            {nameError ? (
              <p className={styles.fansubEditInlineError}>{nameError}</p>
            ) : null}
          </div>
          <div className={styles.field}>
            <FansubGroupKuerzelField
              value={form.kuerzel}
              disabled={false}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  kuerzel: value,
                }))
              }
            />
          </div>
          <div className={styles.field}>
            <label>
              Slug{" "}
              <span className={styles.fansubEditRequired}>*</span>
            </label>
            <div className={styles.fansubEditSlugRow}>
              <Input
                value={form.slug}
                onChange={(event) => {
                  setManualSlug(true);
                  setForm((current) => ({
                    ...current,
                    slug: event.target.value,
                  }));
                }}
                invalid={Boolean(slugFormatError) || slugConflict}
              />
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={() => {
                  setManualSlug(false);
                  setForm((current) => ({
                    ...current,
                    slug: slugify(current.name),
                  }));
                }}
              >
                Auto
              </button>
            </div>
            {slugChecking ? (
              <p className={styles.fansubEditHint}>Prüfe Slug...</p>
            ) : null}
            {slugFormatError ? (
              <p className={styles.fansubEditInlineError}>
                {slugFormatError}
              </p>
            ) : null}
            {!slugFormatError && slugConflict ? (
              <p className={styles.fansubEditInlineError}>
                Slug ist bereits vergeben.
              </p>
            ) : null}
          </div>
          <div className={styles.field}>
            <label>
              Status{" "}
              <span className={styles.fansubEditRequired}>*</span>
            </label>
            <Select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as FansubStatus,
                }))
              }
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {getFansubStatusLabel(option)}
                </option>
              ))}
            </Select>
          </div>
          <div className={styles.field}>
            <label>Land</label>
            <Input
              value={form.country}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  country: event.target.value,
                }))
              }
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="fansub-group-create-founded-year">
              Gründungsjahr
            </label>
            <YearPicker
              id="fansub-group-create-founded-year"
              label="Gründungsjahr"
              value={form.foundedYear}
              minYear={yearMin}
              maxYear={yearMax}
              invalid={Boolean(foundedError)}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  foundedYear: value,
                }))
              }
            />
            {foundedError ? (
              <p className={styles.fansubEditInlineError}>{foundedError}</p>
            ) : null}
          </div>
          <div className={styles.field}>
            <label htmlFor="fansub-group-create-dissolved-year">
              Auflösungsjahr
            </label>
            <YearPicker
              id="fansub-group-create-dissolved-year"
              label="Auflösungsjahr"
              value={form.dissolvedYear}
              minYear={yearMin}
              maxYear={yearMax}
              invalid={
                Boolean(dissolvedError) || Boolean(dissolvedAfterFoundedError)
              }
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  dissolvedYear: value,
                }))
              }
            />
            {dissolvedError ? (
              <p className={styles.fansubEditInlineError}>
                {dissolvedError}
              </p>
            ) : null}
          </div>
        </div>
        {dissolvedAfterFoundedError ? (
          <p className={styles.fansubEditInlineError}>
            {dissolvedAfterFoundedError}
          </p>
        ) : null}
      </div>
    </details>
  );
}
