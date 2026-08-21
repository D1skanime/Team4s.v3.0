"use client";

import { type ReactNode } from "react";
import { Plus, X } from "lucide-react";

import type { FansubGroup, FansubGroupCapabilities, FansubStatus } from "@/types/fansub";
import {
  EditableMediaValue,
  MediaUpload,
} from "@/components/admin/MediaUpload";
import { Badge, Button, Card, FormField, Input, Select } from "@/components/ui";
import { labelForFansubStatus, slugify } from "./fansubEditFormatters";
import { createEmptyLink } from "./fansubEditFormMapping";
import { YEAR_MAX, YEAR_MIN, YearSelectField } from "./YearSelectField";
import type { FansubDetailsForm } from "./useFansubDetailsForm";

// Untergrenze fuer den Aufloesungsjahr-Picker: nie vor dem Gruendungsjahr (sonst YEAR_MIN).
function dissolvedYearMin(foundedYear: string): number {
  const parsed = Number.parseInt(foundedYear, 10);
  return Number.isInteger(parsed) && parsed >= YEAR_MIN && parsed <= YEAR_MAX
    ? parsed
    : YEAR_MIN;
}

const STATUS_OPTIONS: FansubStatus[] = ["active", "inactive", "dissolved"];

type FansubBasicInfoTabProps = {
  styles: Record<string, string>;
  details: FansubDetailsForm;
  fansubID: number;
  group: FansubGroup | null;
  capabilities: FansubGroupCapabilities | null;
  isPlatformAdmin: boolean;
  hasAuthSession: boolean;
  onToast: (message: string) => void;
  communityLinksList: ReactNode;
};

export function FansubBasicInfoTab({
  styles,
  details,
  fansubID,
  group,
  capabilities,
  isPlatformAdmin,
  hasAuthSession,
  onToast,
  communityLinksList,
}: FansubBasicInfoTabProps) {
  const {
    form,
    setForm,
    aliases,
    aliasInput,
    setAliasInput,
    aliasError,
    setAliasError,
    setLinks,
    setManualSlug,
    saving,
    aliasBusy,
    logoMedia,
    setLogoMedia,
    bannerMedia,
    setBannerMedia,
    setInitialLogoMedia,
    setInitialBannerMedia,
    nameError,
    slugFormatError,
    foundedError,
    dissolvedError,
    dissolvedAfterFoundedError,
    technicalLinkErrors,
    slugConflict,
    slugChecking,
    handleLogoMediaBusyChange,
    handleBannerMediaBusyChange,
    addAlias,
    removeAlias,
  } = details;

  const canEditBroad = isPlatformAdmin || Boolean(capabilities?.can_edit_group);
  const canEditGeneral = canEditBroad || Boolean(capabilities?.can_edit_group_general);
  const canEditFounding = canEditBroad || Boolean(capabilities?.can_edit_founding_history);
  const canEditTechnicalLinks = canEditBroad || Boolean(capabilities?.can_edit_technical_links);
  const canEditMedia = canEditBroad || Boolean(capabilities?.can_update_group_media);
  const canManageLinks = canEditBroad || Boolean(capabilities?.can_manage_links);

  return (
    <section className={styles.fansubEditBasicWorkspace}>
      <div className={styles.fansubEditSectionBody}>
        <Card
          variant="section"
          className={styles.fansubEditBasicSurface}
        >
          <div className={styles.fansubEditBasicGrid}>
            <div
              className={`${styles.field} ${styles.fansubEditBasicField} ${styles.fansubEditBasicFieldWide}`}
            >
              <label htmlFor="fansub-group-name">
                Fansubgruppen-Name{" "}
                <span className={styles.fansubEditRequired}>
                  *
                </span>
              </label>
              <Input
                id="fansub-group-name"
                disabled={!canEditGeneral}
                value={form.name}
                onChange={(e) =>
                  setForm((c) => ({
                    ...c,
                    name: e.target.value,
                  }))
                }
                required
                minLength={2}
                invalid={Boolean(nameError)}
              />
              {nameError ? (
                <p className={styles.fansubEditInlineError}>
                  {nameError}
                </p>
              ) : null}
            </div>
            {isPlatformAdmin ? (
              <div
                className={`${styles.field} ${styles.fansubEditBasicField} ${styles.fansubEditBasicFieldWide}`}
              >
              <label htmlFor="fansub-group-slug">
                Slug{" "}
                <span className={styles.fansubEditRequired}>
                  *
                </span>
              </label>
              <div className={styles.fansubEditSlugRow}>
                <Input
                  id="fansub-group-slug"
                  value={form.slug}
                  onChange={(e) => {
                    setManualSlug(true);
                    setForm((c) => ({
                      ...c,
                      slug: e.target.value,
                    }));
                  }}
                  invalid={
                    Boolean(slugFormatError) || slugConflict
                  }
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setManualSlug(false);
                    setForm((c) => ({
                      ...c,
                      slug: slugify(c.name),
                    }));
                  }}
                >
                  Auto
                </Button>
              </div>
              {slugChecking ? (
                <p className={styles.fansubEditHint}>
                  Prüfe Slug...
                </p>
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
            ) : null}
            <div
              className={`${styles.field} ${styles.fansubEditBasicField}`}
            >
              <label htmlFor="fansub-group-status">
                Status{" "}
                <span className={styles.fansubEditRequired}>
                  *
                </span>
              </label>
              <Select
                id="fansub-group-status"
                disabled={!canEditBroad}
                value={form.status}
                onChange={(e) =>
                  setForm((c) => ({
                    ...c,
                    status: e.target.value as FansubStatus,
                    dissolvedYear:
                      e.target.value === "active"
                        ? ""
                        : c.dissolvedYear,
                  }))
                }
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {labelForFansubStatus(s)}
                  </option>
                ))}
              </Select>
            </div>
            <div className={`${styles.field} ${styles.fansubEditBasicField}`}>
              <label htmlFor="fansub-group-type">Gruppentyp</label>
              <Select
                id="fansub-group-type"
                value={form.groupType}
                disabled={!canEditBroad}
                onChange={(event) => setForm((current) => ({ ...current, groupType: event.target.value as typeof current.groupType }))}
              >
                <option value="group">Fansubgruppe</option>
              </Select>
            </div>
            <div
              className={`${styles.field} ${styles.fansubEditBasicField}`}
            >
              <label htmlFor="fansub-group-country">Land</label>
              <Input
                id="fansub-group-country"
                disabled={!canEditGeneral}
                value={form.country}
                onChange={(e) =>
                  setForm((c) => ({
                    ...c,
                    country: e.target.value,
                  }))
                }
                placeholder="z. B. Deutschland"
              />
            </div>
            <div
              className={`${styles.field} ${styles.fansubEditBasicField}`}
            >
              <label htmlFor="fansub-group-founded-year">
                Gründungsjahr
              </label>
              <YearSelectField
                id="fansub-group-founded-year"
                disabled={!canEditFounding}
                label="Gründungsjahr"
                value={form.foundedYear}
                error={foundedError}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    foundedYear: value,
                  }))
                }
              />
              {foundedError ? (
                <p className={styles.fansubEditInlineError}>
                  {foundedError}
                </p>
              ) : null}
            </div>
            <div
              className={`${styles.field} ${styles.fansubEditBasicField}`}
            >
              <label htmlFor="fansub-group-dissolved-year">
                Auflösungsjahr
              </label>
              <YearSelectField
                disabled={!canEditFounding || form.status === "active"}
                id="fansub-group-dissolved-year"
                label="Auflösungsjahr"
                minYear={dissolvedYearMin(form.foundedYear)}
                value={form.dissolvedYear}
                error={
                  dissolvedError || dissolvedAfterFoundedError
                }
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    dissolvedYear: value,
                  }))
                }
              />
              {dissolvedError || dissolvedAfterFoundedError ? (
                <p className={styles.fansubEditInlineError}>
                  {dissolvedError || dissolvedAfterFoundedError}
                </p>
              ) : null}
            </div>
            <div
              className={`${styles.fansubEditBasicField} ${styles.fansubEditBasicFieldWide}`}
            >
              <FormField
                label="Aliase"
                htmlFor="fansub-group-alias-input"
                error={aliasError || undefined}
              >
                <div className={styles.fansubEditAliasControls}>
                  <Input
                    id="fansub-group-alias-input"
                    value={aliasInput}
                    invalid={Boolean(aliasError)}
                    onChange={(e) => {
                      setAliasInput(e.target.value);
                      setAliasError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void addAlias();
                      }
                    }}
                    placeholder="Alias hinzufügen"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    leftIcon={<Plus size={14} />}
                    onClick={() => void addAlias()}
                    disabled={aliasBusy}
                  >
                    Hinzufügen
                  </Button>
                </div>
              </FormField>
              <div className={styles.fansubEditAliasBadgeBox}>
                <div className={styles.fansubEditAliasBadgeRow}>
                  {aliases.map((alias) => (
                    <span
                      key={alias.id}
                      className={styles.fansubEditAliasBadgeItem}
                    >
                      <Badge variant="muted">
                        {alias.alias}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        iconOnly
                        aria-label={`Alias ${alias.alias} entfernen`}
                        onClick={() => void removeAlias(alias)}
                        disabled={aliasBusy}
                        leftIcon={<X size={14} />}
                      />
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className={`${styles.field} ${styles.fansubEditBasicField}`}>
              <label htmlFor="fansub-group-website-url">Website</label>
              <Input
                id="fansub-group-website-url"
                type="url"
                disabled={!canEditTechnicalLinks}
                value={form.websiteURL}
                invalid={Boolean(technicalLinkErrors.website)}
                onChange={(event) => setForm((current) => ({ ...current, websiteURL: event.target.value }))}
                placeholder="https://example.org"
              />
              {technicalLinkErrors.website ? <p className={styles.fansubEditInlineError}>{technicalLinkErrors.website}</p> : null}
            </div>
            <div className={`${styles.field} ${styles.fansubEditBasicField}`}>
              <label htmlFor="fansub-group-discord-url">Discord</label>
              <Input
                id="fansub-group-discord-url"
                type="url"
                disabled={!canEditTechnicalLinks}
                value={form.discordURL}
                invalid={Boolean(technicalLinkErrors.discord)}
                onChange={(event) => setForm((current) => ({ ...current, discordURL: event.target.value }))}
                placeholder="https://discord.gg/..."
              />
              {technicalLinkErrors.discord ? <p className={styles.fansubEditInlineError}>{technicalLinkErrors.discord}</p> : null}
            </div>
            <div className={`${styles.field} ${styles.fansubEditBasicField}`}>
              <label htmlFor="fansub-group-irc-url">IRC</label>
              <Input
                id="fansub-group-irc-url"
                disabled={!canEditTechnicalLinks}
                value={form.ircURL}
                invalid={Boolean(technicalLinkErrors.irc)}
                onChange={(event) => setForm((current) => ({ ...current, ircURL: event.target.value }))}
                placeholder="ircs://irc.example.org/channel"
              />
              {technicalLinkErrors.irc ? <p className={styles.fansubEditInlineError}>{technicalLinkErrors.irc}</p> : null}
            </div>
          </div>
        </Card>
        <div className={styles.fansubEditBasicSupplementGrid}>
          <section className={styles.fansubEditBrandingCard}>
            <h3 className={styles.fansubEditBasicPanelTitle}>
              Logo und Banner
            </h3>
            <div className={styles.fansubEditMediaGrid}>
              <MediaUpload
                type="logo"
                fansubID={fansubID}
                groupName={form.name.trim() || group?.name || ""}
                value={logoMedia}
                disabled={!hasAuthSession || saving || !canEditMedia}
                onBusyChange={handleLogoMediaBusyChange}
                onChange={(nextValue: EditableMediaValue | null) => {
                  setLogoMedia(nextValue);
                  setInitialLogoMedia(nextValue);
                  onToast(
                    nextValue?.publicURL
                      ? "Logo aktualisiert."
                      : "Logo entfernt.",
                  );
                }}
              />
              <MediaUpload
                type="banner"
                fansubID={fansubID}
                groupName={form.name.trim() || group?.name || ""}
                value={bannerMedia}
                disabled={!hasAuthSession || saving || !canEditMedia}
                onBusyChange={handleBannerMediaBusyChange}
                onChange={(nextValue: EditableMediaValue | null) => {
                  setBannerMedia(nextValue);
                  setInitialBannerMedia(nextValue);
                  onToast(
                    nextValue?.publicURL
                      ? "Banner aktualisiert."
                      : "Banner entfernt.",
                  );
                }}
              />
            </div>
          </section>
          <Card
            variant="section"
            className={styles.fansubEditCommunityCard}
            header={
              <div className={styles.fansubEditBasicPanelHeader}>
                <h3 className={styles.fansubEditBasicPanelTitle}>
                  Community-Links
                </h3>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<Plus size={14} />}
                  disabled={!canManageLinks}
                  onClick={() =>
                    setLinks((current) => [
                      ...current,
                      createEmptyLink(),
                    ])
                  }
                >
                  Link hinzufügen
                </Button>
              </div>
            }
          >
            <div className={styles.fansubEditCommunityBody}>
              {communityLinksList}
            </div>
          </Card>
        </div>
        {dissolvedAfterFoundedError ? (
          <p className={styles.fansubEditInlineError}>
            {dissolvedAfterFoundedError}
          </p>
        ) : null}
      </div>
    </section>
  );
}
