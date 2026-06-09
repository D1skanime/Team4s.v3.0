"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Plus, Save, Trash2, X } from "lucide-react";

import {
  ApiError,
  createFansubAlias,
  createFansubGroup,
  createFansubLink,
  deleteFansubAlias,
  deleteFansubLink,
  getFansubAliases,
  getFansubByID,
  getFansubList,
  updateFansubGroup,
  updateFansubLink,
} from "@/lib/api";
import { PlatformAdminGate } from "@/components/auth/PlatformAdminGate";
import { YearPicker } from "@/components/ui";
import { useAuthSession } from "@/lib/useAuthSession";
import {
  FansubAlias,
  FansubGroup,
  FansubGroupLink,
  FansubGroupLinkType,
  FansubGroupCreateRequest,
  FansubGroupPatchRequest,
  FansubGroupType,
  FansubStatus,
} from "@/types/fansub";
import {
  buildFansubLogoFallback,
  buildMediaPreviewURL,
  EditableMediaValue,
  MediaUpload,
} from "@/components/admin/MediaUpload";

import sharedStyles from "../../admin.module.css";
import fansubEditStyles from "../[id]/edit/FansubEdit.module.css";

const styles = { ...sharedStyles, ...fansubEditStyles };

const STATUS_OPTIONS: FansubStatus[] = ["active", "inactive", "dissolved"];

const LINK_TYPE_OPTIONS: FansubGroupLinkType[] = [
  "website",
  "discord",
  "twitter",
  "github",
  "irc",
];
const YEAR_MIN = 1900;
const YEAR_MAX = new Date().getFullYear();
const URL_PROTOCOLS = new Set(["http:", "https:", "irc:", "ircs:"]);

type FormState = {
  name: string;
  slug: string;
  status: FansubStatus;
  groupType: FansubGroupType;
  country: string;
  foundedYear: string;
  dissolvedYear: string;
};

type CommunityLinkDraft = {
  key: string;
  id: number | null;
  link_type: FansubGroupLinkType;
  name: string;
  url: string;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

function isValidSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function parseYear(value: string): number | null | typeof Number.NaN {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function toOptional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isAbsoluteURL(value: string): boolean {
  if (!value.trim()) return false;
  try {
    const parsed = new URL(value.trim());
    return URL_PROTOCOLS.has(parsed.protocol.toLowerCase());
  } catch {
    return false;
  }
}

function mapGroupToForm(group: FansubGroup): FormState {
  return {
    name: group.name || "",
    slug: group.slug || "",
    status: group.status,
    groupType: group.group_type,
    country: group.country || "",
    foundedYear: group.founded_year ? String(group.founded_year) : "",
    dissolvedYear: group.dissolved_year ? String(group.dissolved_year) : "",
  };
}

function mapGroupMedia(group: FansubGroup): {
  logo: EditableMediaValue | null;
  banner: EditableMediaValue | null;
} {
  const logo = group.logo_url
    ? { id: group.logo_id ?? null, publicURL: group.logo_url }
    : null;
  const banner = group.banner_url
    ? { id: group.banner_id ?? null, publicURL: group.banner_url }
    : null;
  return { logo, banner };
}

function legacyLinksFromGroup(group: FansubGroup): FansubGroupLink[] {
  const links: FansubGroupLink[] = [];
  if (group.website_url) {
    links.push({
      id: -1,
      group_id: group.id,
      link_type: "website",
      name: null,
      url: group.website_url,
      created_at: group.updated_at,
    });
  }
  if (group.discord_url) {
    links.push({
      id: -2,
      group_id: group.id,
      link_type: "discord",
      name: null,
      url: group.discord_url,
      created_at: group.updated_at,
    });
  }
  if (group.irc_url) {
    links.push({
      id: -3,
      group_id: group.id,
      link_type: "irc",
      name: null,
      url: group.irc_url,
      created_at: group.updated_at,
    });
  }
  return links;
}

function mapGroupLinks(group: FansubGroup): CommunityLinkDraft[] {
  const links =
    group.links && group.links.length > 0
      ? group.links
      : legacyLinksFromGroup(group);
  return links.length > 0
    ? links.map((link, index) => ({
        key: `${link.id}-${index}`,
        id: link.id,
        link_type: link.link_type,
        name: link.name || "",
        url: link.url || "",
      }))
    : [createEmptyLink("draft-link-initial")];
}

function emptyForm(): FormState {
  return {
    name: "",
    slug: "",
    status: "active",
    groupType: "group",
    country: "",
    foundedYear: "",
    dissolvedYear: "",
  };
}

function createEmptyLink(key: string): CommunityLinkDraft {
  return { key, id: null, link_type: "website", name: "", url: "" };
}

function errMessage(error: unknown): string {
  return error instanceof ApiError
    ? `(${error.status}) ${error.message}`
    : "Anfrage fehlgeschlagen.";
}

function formToCreatePayload(form: FormState): FansubGroupCreateRequest {
  const founded = parseYear(form.foundedYear);
  const dissolved = parseYear(form.dissolvedYear);
  return {
    name: form.name.trim(),
    slug: form.slug.trim(),
    status: form.status,
    group_type: form.groupType,
    country: toOptional(form.country),
    founded_year: founded === null ? null : founded,
    dissolved_year: dissolved === null ? null : dissolved,
  };
}

function formToPatchPayload(
  form: FormState,
  logo: EditableMediaValue | null,
  banner: EditableMediaValue | null,
): FansubGroupPatchRequest {
  const founded = parseYear(form.foundedYear);
  const dissolved = parseYear(form.dissolvedYear);
  return {
    name: form.name.trim(),
    slug: form.slug.trim(),
    status: form.status,
    group_type: form.groupType,
    country: toOptional(form.country),
    founded_year: founded === null ? null : founded,
    dissolved_year: dissolved === null ? null : dissolved,
    logo_id: logo?.id ?? null,
    banner_id: banner?.id ?? null,
    logo_url: logo?.publicURL?.trim() ? logo.publicURL.trim() : null,
    banner_url: banner?.publicURL?.trim() ? banner.publicURL.trim() : null,
  };
}

function sortAliases(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b, "de"));
}

async function syncFansubLinks(
  fansubID: number,
  initialLinks: CommunityLinkDraft[],
  currentLinks: CommunityLinkDraft[],
): Promise<void> {
  const initialById = new Map(
    initialLinks
      .filter((item) => item.id != null && item.id > 0)
      .map((item) => [item.id as number, item]),
  );
  const currentById = new Map(
    currentLinks
      .filter((item) => item.id != null && item.id > 0)
      .map((item) => [item.id as number, item]),
  );

  for (const [id] of initialById) {
    if (!currentById.has(id)) {
      await deleteFansubLink(fansubID, id);
    }
  }

  for (const link of currentLinks) {
    const url = link.url.trim();
    const name = link.name.trim();
    if (!url && !name) continue;
    if (link.id != null && link.id > 0) {
      const previous = initialById.get(link.id);
      if (
        !previous ||
        previous.link_type !== link.link_type ||
        previous.name.trim() !== name ||
        previous.url.trim() !== url
      ) {
        await updateFansubLink(fansubID, link.id, {
          link_type: link.link_type,
          name: name || null,
          url,
        });
      }
      continue;
    }

    await createFansubLink(fansubID, {
      link_type: link.link_type,
      name: name || null,
      url,
    });
  }
}

function AdminFansubCreateContent() {
  const nextDraftLinkKeyRef = useRef(1);
  const createDraftLink = () =>
    createEmptyLink(`draft-link-${nextDraftLinkKeyRef.current++}`);
  const [createdGroup, setCreatedGroup] = useState<FansubGroup | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [initialForm, setInitialForm] = useState<FormState>(emptyForm);
  const [aliases, setAliases] = useState<FansubAlias[]>([]);
  const [aliasDrafts, setAliasDrafts] = useState<string[]>([]);
  const [initialAliasDrafts, setInitialAliasDrafts] = useState<string[]>([]);
  const [aliasInput, setAliasInput] = useState("");
  const [aliasError, setAliasError] = useState<string | null>(null);
  const [links, setLinks] = useState<CommunityLinkDraft[]>([
    createEmptyLink("draft-link-initial"),
  ]);
  const [initialLinks, setInitialLinks] = useState<CommunityLinkDraft[]>([
    createEmptyLink("draft-link-initial"),
  ]);
  const [manualSlug, setManualSlug] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aliasBusy, setAliasBusy] = useState(false);
  const [logoMedia, setLogoMedia] = useState<EditableMediaValue | null>(null);
  const [bannerMedia, setBannerMedia] = useState<EditableMediaValue | null>(
    null,
  );
  const [initialLogoMedia, setInitialLogoMedia] =
    useState<EditableMediaValue | null>(null);
  const [initialBannerMedia, setInitialBannerMedia] =
    useState<EditableMediaValue | null>(null);
  const [mediaBusy, setMediaBusy] = useState<
    Record<"logo" | "banner", boolean>
  >({ logo: false, banner: false });
  const [slugConflict, setSlugConflict] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { hasAccessToken: hasRuntimeAuthToken, isClientInitialized } =
    useAuthSession();

  useEffect(() => {
    if (manualSlug) return;
    setForm((current) => ({ ...current, slug: slugify(current.name) }));
  }, [form.name, manualSlug]);

  useEffect(() => {
    const slug = form.slug.trim();
    if (!slug || !isValidSlug(slug)) {
      setSlugChecking(false);
      setSlugConflict(false);
      return;
    }
    let active = true;
    const timeout = window.setTimeout(async () => {
      try {
        setSlugChecking(true);
        const response = await getFansubList({ q: slug, per_page: 200 });
        if (!active) return;
        setSlugConflict(
          response.data.some(
            (item) => item.id !== createdGroup?.id && item.slug === slug,
          ),
        );
      } catch {
        if (active) setSlugConflict(false);
      } finally {
        if (active) setSlugChecking(false);
      }
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [createdGroup?.id, form.slug]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const years = useMemo(
    () => ({
      founded: parseYear(form.foundedYear),
      dissolved: parseYear(form.dissolvedYear),
    }),
    [form.dissolvedYear, form.foundedYear],
  );
  const nameError =
    form.name.trim().length === 0
      ? "Name ist erforderlich."
      : form.name.trim().length < 2
        ? "Mindestens 2 Zeichen."
        : null;
  const slugValue = form.slug.trim();
  const slugFormatError =
    slugValue.length === 0
      ? "Slug ist erforderlich."
      : !isValidSlug(slugValue)
        ? "Slug muss lowercase kebab-case sein."
        : null;
  const foundedError = Number.isNaN(years.founded)
    ? "Gründungsjahr muss eine Zahl sein."
    : years.founded !== null &&
        (years.founded < YEAR_MIN || years.founded > YEAR_MAX)
      ? `Gründungsjahr muss zwischen ${YEAR_MIN} und ${YEAR_MAX} liegen.`
      : null;
  const dissolvedError = Number.isNaN(years.dissolved)
    ? "Auflösungsjahr muss eine Zahl sein."
    : years.dissolved !== null &&
        (years.dissolved < YEAR_MIN || years.dissolved > YEAR_MAX)
      ? `Auflösungsjahr muss zwischen ${YEAR_MIN} und ${YEAR_MAX} liegen.`
      : null;
  const dissolvedAfterFoundedError =
    years.founded !== null &&
    years.dissolved !== null &&
    years.dissolved < years.founded
      ? "Auflösungsjahr muss größer oder gleich dem Gründungsjahr sein."
      : null;
  const linkErrors = links.map((link) =>
    link.url.trim().length > 0 && !isAbsoluteURL(link.url)
      ? "Bitte absolute URL mit Protokoll verwenden."
      : null,
  );
  const anyMediaBusy = mediaBusy.logo || mediaBusy.banner;
  const invalid =
    !hasRuntimeAuthToken ||
    Boolean(nameError) ||
    Boolean(slugFormatError) ||
    slugConflict ||
    Boolean(foundedError) ||
    Boolean(dissolvedError) ||
    Boolean(dissolvedAfterFoundedError) ||
    linkErrors.some(Boolean) ||
    slugChecking ||
    anyMediaBusy;

  const dirty = useMemo(
    () =>
      JSON.stringify(form) !== JSON.stringify(initialForm) ||
      JSON.stringify(links) !== JSON.stringify(initialLinks) ||
      JSON.stringify(aliasDrafts) !== JSON.stringify(initialAliasDrafts) ||
      JSON.stringify(logoMedia) !== JSON.stringify(initialLogoMedia) ||
      JSON.stringify(bannerMedia) !== JSON.stringify(initialBannerMedia),
    [
      aliasDrafts,
      bannerMedia,
      form,
      initialAliasDrafts,
      initialBannerMedia,
      initialForm,
      initialLinks,
      initialLogoMedia,
      links,
      logoMedia,
    ],
  );

  useEffect(() => {
    if (!dirty) return;
    const onUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [dirty]);

  async function refreshCreatedState(fansubID: number): Promise<void> {
    const [groupResponse, aliasResponse] = await Promise.all([
      getFansubByID(fansubID),
      getFansubAliases(fansubID),
    ]);
    const nextGroup = groupResponse.data;
    const nextForm = mapGroupToForm(nextGroup);
    const nextMedia = mapGroupMedia(nextGroup);
    const nextLinks = mapGroupLinks(nextGroup);
    const nextAliases = aliasResponse.data.sort((a, b) =>
      a.alias.localeCompare(b.alias, "de"),
    );

    setCreatedGroup(nextGroup);
    setForm(nextForm);
    setInitialForm(nextForm);
    setLogoMedia(nextMedia.logo);
    setBannerMedia(nextMedia.banner);
    setInitialLogoMedia(nextMedia.logo);
    setInitialBannerMedia(nextMedia.banner);
    setLinks(nextLinks);
    setInitialLinks(nextLinks);
    setAliases(nextAliases);
    setAliasDrafts(nextAliases.map((item) => item.alias));
    setInitialAliasDrafts(nextAliases.map((item) => item.alias));
    setManualSlug(nextForm.slug !== slugify(nextForm.name));

  }

  const addAlias = async () => {
    const value = aliasInput.trim();
    if (!value) return;
    if (
      aliasDrafts.some((item) => item.toLowerCase() === value.toLowerCase())
    ) {
      setAliasError("Tag existiert bereits.");
      return;
    }

    setAliasBusy(true);
    setAliasError(null);
    try {
      if (!createdGroup || !hasRuntimeAuthToken) {
        setAliasDrafts((current) => sortAliases([...current, value]));
        setAliasInput("");
        return;
      }

      const response = await createFansubAlias(createdGroup.id, {
        alias: value,
      });
      const nextAliases = [...aliases, response.data].sort((a, b) =>
        a.alias.localeCompare(b.alias, "de"),
      );
      const nextDrafts = nextAliases.map((item) => item.alias);
      setAliases(nextAliases);
      setAliasDrafts(nextDrafts);
      setInitialAliasDrafts(nextDrafts);
      setAliasInput("");
      setToast("Tag hinzugefuegt.");
    } catch (nextError) {
      setError(errMessage(nextError));
    } finally {
      setAliasBusy(false);
    }
  };

  const removeAlias = async (aliasValue: string) => {
    if (!createdGroup || !hasRuntimeAuthToken) {
      setAliasDrafts((current) =>
        current.filter((item) => item !== aliasValue),
      );
      return;
    }

    const alias = aliases.find((item) => item.alias === aliasValue);
    if (!alias) {
      setAliasDrafts((current) =>
        current.filter((item) => item !== aliasValue),
      );
      return;
    }

    setAliasBusy(true);
    setAliasError(null);
    try {
      await deleteFansubAlias(createdGroup.id, alias.id);
      const nextAliases = aliases.filter((item) => item.id !== alias.id);
      const nextDrafts = nextAliases.map((item) => item.alias);
      setAliases(nextAliases);
      setAliasDrafts(nextDrafts);
      setInitialAliasDrafts(nextDrafts);
      setToast("Tag entfernt.");
    } catch (nextError) {
      setError(errMessage(nextError));
    } finally {
      setAliasBusy(false);
    }
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasRuntimeAuthToken || invalid) return;

    setSaving(true);
    setError(null);
    try {
      if (!createdGroup) {
        const createResponse = await createFansubGroup(
          formToCreatePayload(form),
        );
        const fansubID = createResponse.data.id;

        for (const alias of aliasDrafts) {
          await createFansubAlias(fansubID, { alias });
        }

        await syncFansubLinks(fansubID, [], links);
        await refreshCreatedState(fansubID);
        setToast(
          "Fansub angelegt. Medien können jetzt direkt ueber den DB-Asset-Flow hochgeladen werden.",
        );
      } else {
        await updateFansubGroup(
          createdGroup.id,
          formToPatchPayload(form, logoMedia, bannerMedia),
        );
        await syncFansubLinks(createdGroup.id, initialLinks, links);
        await refreshCreatedState(createdGroup.id);
        setToast("Änderungen gespeichert.");
      }
    } catch (nextError) {
      setError(errMessage(nextError));
    } finally {
      setSaving(false);
    }
  };

  const logoFallback = buildFansubLogoFallback(form.name);
  const bannerPreviewURL = buildMediaPreviewURL(bannerMedia);
  const logoPreviewURL = buildMediaPreviewURL(logoMedia);

  return (
    <main className={styles.page}>
      <p className={styles.backLinks}>
        <Link href="/admin/fansubs">Fansubs</Link>
      </p>
      {toast ? <div className={styles.fansubEditToast}>{toast}</div> : null}

      <section className={styles.panel}>
        <header className={styles.fansubEditHeaderCard}>
          <div className={styles.fansubEditBannerShell}>
            {bannerPreviewURL ? (
              <div
                className={styles.fansubEditBannerImage}
                style={{ backgroundImage: `url(${bannerPreviewURL})` }}
              />
            ) : (
              <div className={styles.fansubEditBannerPlaceholder}>
                Kein Banner vorhanden
              </div>
            )}
          </div>
          <div className={styles.fansubEditProfileRow}>
            <div className={styles.fansubEditLogoBadge}>
              {logoPreviewURL ? (
                <Image
                  src={logoPreviewURL}
                  alt={`${form.name.trim() || "Fansub"} Logo`}
                  className={styles.fansubEditLogoImage}
                  width={78}
                  height={78}
                  unoptimized
                />
              ) : (
                <span
                  style={{
                    backgroundColor: logoFallback.background,
                    color: logoFallback.color,
                  }}
                >
                  {logoFallback.initials}
                </span>
              )}
            </div>
            <div className={styles.fansubEditIdentity}>
              <div className={styles.fansubEditIdentityTop}>
                <h1 className={styles.title}>
                  {form.name.trim() || "Fansub erstellen"}
                </h1>
                <span
                  className={`${styles.fansubEditStatusBadge} ${form.status === "active" ? styles.fansubEditStatusActive : form.status === "inactive" ? styles.fansubEditStatusInactive : styles.fansubEditStatusDissolved}`}
                >
                  {form.status}
                </span>
              </div>
              <p className={styles.fansubEditUrlPreview}>
                /fansubs/{form.slug.trim() || "slug"}
              </p>
            </div>
            <span className={styles.fansubEditHint}>
              Nach dem ersten Speichern werden Medien und weitere Admin-Aktionen
              direkt aktiviert. Ein eigener Mitglieder-Bereich folgt später als
              definierter Reiter.
            </span>
          </div>
        </header>

        <form className={styles.fansubEditForm} onSubmit={save}>
          <div className={styles.fansubEditStickyActions}>
            <button
              type="submit"
              className={createdGroup ? `${styles.button} ${styles.buttonSuccess}` : styles.button}
              disabled={invalid || saving}
            >
              <Save size={14} />
              {saving ? "Speichern..." : createdGroup ? "Speichern" : "Anlegen"}
            </button>
            <button
              type="button"
              className={styles.buttonSecondary}
              onClick={() =>
                dirty && !window.confirm("Ungespeicherte Änderungen verwerfen?")
                  ? undefined
                  : (window.location.href = "/admin/fansubs")
              }
            >
              <X size={14} />
              Abbrechen
            </button>
            {createdGroup ? (
              <Link
                href={`/admin/fansubs/${createdGroup.id}/edit`}
                className={styles.buttonSecondary}
              >
                Edit-Seite
              </Link>
            ) : null}
          </div>

          {error ? <div className={styles.errorBox}>{error}</div> : null}
          {isClientInitialized && !hasRuntimeAuthToken ? (
            <div className={styles.errorBox}>
              Anmeldung erforderlich. Bitte zuerst anmelden.
            </div>
          ) : null}

          <div className={styles.fansubEditColumns}>
            <div className={styles.fansubEditLeftColumn}>
              <details className={styles.fansubEditSection} open>
                <summary className={styles.fansubEditSectionSummary}>
                  Basic Information
                </summary>
                <div className={styles.fansubEditSectionBody}>
                  <div className={styles.responsiveFieldGrid}>
                    <div className={styles.field}>
                      <label>
                        Name{" "}
                        <span className={styles.fansubEditRequired}>*</span>
                      </label>
                      <input
                        value={form.name}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        required
                        minLength={2}
                        aria-invalid={Boolean(nameError)}
                        className={
                          nameError ? styles.fansubEditInputInvalid : undefined
                        }
                      />
                      {nameError ? (
                        <p className={styles.fansubEditInlineError}>
                          {nameError}
                        </p>
                      ) : null}
                    </div>
                    <div className={styles.field}>
                      <label>
                        Slug{" "}
                        <span className={styles.fansubEditRequired}>*</span>
                      </label>
                      <div className={styles.fansubEditSlugRow}>
                        <input
                          value={form.slug}
                          onChange={(event) => {
                            setManualSlug(true);
                            setForm((current) => ({
                              ...current,
                              slug: event.target.value,
                            }));
                          }}
                          aria-invalid={
                            Boolean(slugFormatError) || slugConflict
                          }
                          className={
                            slugFormatError || slugConflict
                              ? styles.fansubEditInputInvalid
                              : undefined
                          }
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
                        <p className={styles.fansubEditHint}>Pruefe Slug...</p>
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
                      <select
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
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label>
                        Typ <span className={styles.fansubEditRequired}>*</span>
                      </label>
                      <select
                        value={form.groupType}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            groupType: event.target.value as FansubGroupType,
                          }))
                        }
                      >
                        <option value="group">Gruppe</option>
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label>Country</label>
                      <input
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
                        minYear={YEAR_MIN}
                        maxYear={YEAR_MAX}
                        invalid={Boolean(foundedError)}
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
                    <div className={styles.field}>
                      <label htmlFor="fansub-group-create-dissolved-year">
                        Auflösungsjahr
                      </label>
                      <YearPicker
                        id="fansub-group-create-dissolved-year"
                        label="Auflösungsjahr"
                        value={form.dissolvedYear}
                        minYear={YEAR_MIN}
                        maxYear={YEAR_MAX}
                        invalid={
                          Boolean(dissolvedError) ||
                          Boolean(dissolvedAfterFoundedError)
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

              <details className={styles.fansubEditSection} open>
                <summary className={styles.fansubEditSectionSummary}>
                  Tags
                </summary>
                <div className={styles.fansubEditSectionBody}>
                  <p className={styles.fansubEditHint}>
                    Alternative Gruppennamen. Vor dem ersten Speichern werden
                    sie lokal gesammelt und danach in dieselbe Alias-Tabelle
                    geschrieben wie im Edit-Flow.
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
            </div>

            <div className={styles.fansubEditRightColumn}>
              <details className={styles.fansubEditSection} open>
                <summary className={styles.fansubEditSectionSummary}>
                  Media
                </summary>
                <div className={styles.fansubEditSectionBody}>
                  {createdGroup ? (
                    <div className={styles.fansubEditMediaGrid}>
                      <MediaUpload
                        type="logo"
                        fansubID={createdGroup.id}
                        groupName={form.name.trim() || createdGroup.name}
                        value={logoMedia}
                        disabled={!hasRuntimeAuthToken || saving}
                        onBusyChange={(isBusy) =>
                          setMediaBusy((current) => ({
                            ...current,
                            logo: isBusy,
                          }))
                        }
                        onChange={(nextValue) => {
                          setLogoMedia(nextValue);
                          setInitialLogoMedia(nextValue);
                          setToast(
                            nextValue?.publicURL
                              ? "Logo aktualisiert."
                              : "Logo entfernt.",
                          );
                        }}
                      />
                      <MediaUpload
                        type="banner"
                        fansubID={createdGroup.id}
                        groupName={form.name.trim() || createdGroup.name}
                        value={bannerMedia}
                        disabled={!hasRuntimeAuthToken || saving}
                        onBusyChange={(isBusy) =>
                          setMediaBusy((current) => ({
                            ...current,
                            banner: isBusy,
                          }))
                        }
                        onChange={(nextValue) => {
                          setBannerMedia(nextValue);
                          setInitialBannerMedia(nextValue);
                          setToast(
                            nextValue?.publicURL
                              ? "Banner aktualisiert."
                              : "Banner entfernt.",
                          );
                        }}
                      />
                    </div>
                  ) : (
                    <p className={styles.fansubEditHint}>
                      Logo und Banner laufen hier ueber denselben
                      DB-/Media-Asset-Flow wie im Edit-Screen. Nach dem ersten
                      Speichern wird der Upload direkt in dieser Ansicht
                      freigeschaltet.
                    </p>
                  )}
                </div>
              </details>

              <details className={styles.fansubEditSection} open>
                <summary className={styles.fansubEditSectionSummary}>
                  Community Links
                </summary>
                <div className={styles.fansubEditSectionBody}>
                  <div className={styles.fansubEditLinksHeader}>
                    <p className={styles.fansubEditHint}>
                      Generische Link-Zeilen für Website, Discord, Twitter,
                      GitHub und IRC.
                    </p>
                    <button
                      type="button"
                      className={styles.buttonSecondary}
                      onClick={() =>
                        setLinks((current) => [...current, createDraftLink()])
                      }
                    >
                      <Plus size={14} />
                      Link
                    </button>
                  </div>
                  <div className={styles.fansubEditLinksList}>
                    {links.map((link, index) => {
                      const url = link.url.trim();
                      const urlError = linkErrors[index];
                      return (
                        <div
                          key={link.key}
                          className={styles.fansubEditLinkRow}
                        >
                          <select
                            value={link.link_type}
                            onChange={(event) =>
                              setLinks((current) =>
                                current.map((item) =>
                                  item.key === link.key
                                    ? {
                                        ...item,
                                        link_type: event.target
                                          .value as FansubGroupLinkType,
                                      }
                                    : item,
                                ),
                              )
                            }
                          >
                            {LINK_TYPE_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          <input
                            value={link.name}
                            onChange={(event) =>
                              setLinks((current) =>
                                current.map((item) =>
                                  item.key === link.key
                                    ? { ...item, name: event.target.value }
                                    : item,
                                ),
                              )
                            }
                            placeholder="Name (optional)"
                          />
                          <div
                            className={`${styles.fansubEditLinkInput} ${urlError ? styles.fansubEditLinkInputInvalid : ""}`}
                          >
                            <input
                              value={link.url}
                              onChange={(event) =>
                                setLinks((current) =>
                                  current.map((item) =>
                                    item.key === link.key
                                      ? { ...item, url: event.target.value }
                                      : item,
                                  ),
                                )
                              }
                              placeholder="https://..."
                            />
                            {url && !urlError ? (
                              <button
                                type="button"
                                className={styles.fansubEditPreviewLinkButton}
                                onClick={() =>
                                  window.open(url, "_blank", "noreferrer")
                                }
                              >
                                <ExternalLink size={14} />
                              </button>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            className={`${styles.buttonSecondary} ${styles.buttonDanger}`}
                            onClick={() =>
                              setLinks((current) =>
                                current.length === 1
                                  ? [createDraftLink()]
                                  : current.filter(
                                      (item) => item.key !== link.key,
                                    ),
                              )
                            }
                          >
                            <Trash2 size={14} />
                          </button>
                          {urlError ? (
                            <p className={styles.fansubEditInlineError}>
                              {urlError}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </details>

            </div>
          </div>
        </form>
      </section>
    </main>
  );
}

export default function AdminFansubCreatePage() {
  return (
    <PlatformAdminGate>
      <AdminFansubCreateContent />
    </PlatformAdminGate>
  );
}
