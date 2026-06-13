"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import {
  createFansubAlias,
  deleteFansubAlias,
  getFansubByID,
  getFansubList,
  updateFansubGroup,
} from "@/lib/api";
import type { EditableMediaValue } from "@/components/admin/MediaUpload";
import type { FansubAlias, FansubGroup } from "@/types/fansub";
import { errMessage, isAbsoluteURL, isValidSlug, slugify } from "./fansubEditFormatters";
import { parseYear } from "./fansubEditFormatters";
import {
  emptyForm,
  formToPayload,
  mapGroupLinks,
  mapGroupMedia,
  mapGroupToForm,
  syncFansubLinks,
} from "./fansubEditFormMapping";
import { YEAR_MAX, YEAR_MIN } from "./YearSelectField";
import type { CommunityLinkDraft, FormState } from "./fansubEditTypes";

type UseFansubDetailsFormArgs = {
  fansubID: number;
  isPlatformAdmin: boolean;
  hasAuthSession: boolean;
  onGroupUpdated: (group: FansubGroup) => void;
  onToast: (message: string) => void;
  onError: (message: string | null) => void;
  onDirtyChange?: (dirty: boolean) => void;
};

export type FansubDetailsForm = ReturnType<typeof useFansubDetailsForm>;

export function useFansubDetailsForm({
  fansubID,
  isPlatformAdmin,
  hasAuthSession,
  onGroupUpdated,
  onToast,
  onError,
  onDirtyChange,
}: UseFansubDetailsFormArgs) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [initialForm, setInitialForm] = useState<FormState>(emptyForm);
  const [aliases, setAliases] = useState<FansubAlias[]>([]);
  const [aliasInput, setAliasInput] = useState("");
  const [aliasError, setAliasError] = useState<string | null>(null);
  const [links, setLinks] = useState<CommunityLinkDraft[]>([]);
  const [initialLinks, setInitialLinks] = useState<CommunityLinkDraft[]>([]);
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

  // Übernimmt eine geladene Gruppe in den Formularzustand. Wird vom Parent
  // beim initialen Laden aufgerufen (der Parent besitzt group/loading).
  const applyGroup = useCallback((group: FansubGroup) => {
    const nextForm = mapGroupToForm(group);
    const nextMedia = mapGroupMedia(group);
    const nextLinks = mapGroupLinks(group);
    setForm(nextForm);
    setInitialForm(nextForm);
    setLinks(nextLinks);
    setInitialLinks(nextLinks);
    setLogoMedia(nextMedia.logo);
    setBannerMedia(nextMedia.banner);
    setInitialLogoMedia(nextMedia.logo);
    setInitialBannerMedia(nextMedia.banner);
    setManualSlug(nextForm.slug !== slugify(nextForm.name));
  }, []);

  const setAliasesFromLoad = useCallback((next: FansubAlias[]) => {
    setAliases(next);
  }, []);

  const handleLogoMediaBusyChange = useCallback((isBusy: boolean) => {
    setMediaBusy((current) =>
      current.logo === isBusy ? current : { ...current, logo: isBusy },
    );
  }, []);

  const handleBannerMediaBusyChange = useCallback((isBusy: boolean) => {
    setMediaBusy((current) =>
      current.banner === isBusy ? current : { ...current, banner: isBusy },
    );
  }, []);

  useEffect(() => {
    if (!isPlatformAdmin) return;
    if (manualSlug) return;
    setForm((current) => ({ ...current, slug: slugify(current.name) }));
  }, [form.name, isPlatformAdmin, manualSlug]);

  useEffect(() => {
    if (!isPlatformAdmin) {
      setSlugChecking(false);
      setSlugConflict(false);
      return;
    }
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
            (item) => item.id !== fansubID && item.slug === slug,
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
  }, [fansubID, form.slug, isPlatformAdmin]);

  const dirty = useMemo(
    () =>
      JSON.stringify(form) !== JSON.stringify(initialForm) ||
      JSON.stringify(links) !== JSON.stringify(initialLinks) ||
      JSON.stringify(logoMedia) !== JSON.stringify(initialLogoMedia) ||
      JSON.stringify(bannerMedia) !== JSON.stringify(initialBannerMedia),
    [
      bannerMedia,
      form,
      initialBannerMedia,
      initialForm,
      initialLinks,
      initialLogoMedia,
      links,
      logoMedia,
    ],
  );

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (!dirty) return;
    const onUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [dirty]);

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
    !isPlatformAdmin
      ? null
      : slugValue.length === 0
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
    !hasAuthSession ||
    Boolean(nameError) ||
    (isPlatformAdmin && Boolean(slugFormatError)) ||
    (isPlatformAdmin && slugConflict) ||
    Boolean(foundedError) ||
    Boolean(dissolvedError) ||
    Boolean(dissolvedAfterFoundedError) ||
    linkErrors.some(Boolean) ||
    (isPlatformAdmin && slugChecking) ||
    anyMediaBusy;

  const addAlias = useCallback(async () => {
    const value = aliasInput.trim();
    if (!value || !hasAuthSession) return;
    if (
      aliases.some((item) => item.alias.toLowerCase() === value.toLowerCase())
    ) {
      setAliasError("Tag existiert bereits.");
      return;
    }
    setAliasBusy(true);
    setAliasError(null);
    try {
      const response = await createFansubAlias(fansubID, { alias: value });
      setAliases((current) =>
        [...current, response.data].sort((a, b) =>
          a.alias.localeCompare(b.alias, "de"),
        ),
      );
      setAliasInput("");
    } catch (nextError) {
      onError(errMessage(nextError));
    } finally {
      setAliasBusy(false);
    }
  }, [aliasInput, aliases, fansubID, hasAuthSession, onError]);

  const removeAlias = useCallback(
    async (alias: FansubAlias) => {
      if (!hasAuthSession) return;
      setAliasBusy(true);
      setAliasError(null);
      try {
        await deleteFansubAlias(fansubID, alias.id);
        setAliases((current) => current.filter((item) => item.id !== alias.id));
      } catch (nextError) {
        onError(errMessage(nextError));
      } finally {
        setAliasBusy(false);
      }
    },
    [fansubID, hasAuthSession, onError],
  );

  const save = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!hasAuthSession || invalid) return;
      setSaving(true);
      onError(null);
      try {
        await updateFansubGroup(
          fansubID,
          formToPayload(form, logoMedia, bannerMedia, {
            includeSlug: isPlatformAdmin,
          }),
        );
        await syncFansubLinks(fansubID, initialLinks, links);
        const response = await getFansubByID(fansubID);
        const next = mapGroupToForm(response.data);
        const nextMedia = mapGroupMedia(response.data);
        const nextLinks = mapGroupLinks(response.data);
        onGroupUpdated(response.data);
        setForm(next);
        setInitialForm(next);
        setLinks(nextLinks);
        setInitialLinks(nextLinks);
        setLogoMedia(nextMedia.logo);
        setBannerMedia(nextMedia.banner);
        setInitialLogoMedia(nextMedia.logo);
        setInitialBannerMedia(nextMedia.banner);
        setManualSlug(next.slug !== slugify(next.name));
        onToast("Änderungen gespeichert.");
      } catch (nextError) {
        onError(errMessage(nextError));
      } finally {
        setSaving(false);
      }
    },
    [
      bannerMedia,
      fansubID,
      form,
      hasAuthSession,
      initialLinks,
      invalid,
      isPlatformAdmin,
      links,
      logoMedia,
      onError,
      onGroupUpdated,
      onToast,
    ],
  );

  return {
    // state
    form,
    setForm,
    aliases,
    aliasInput,
    setAliasInput,
    aliasError,
    setAliasError,
    links,
    setLinks,
    manualSlug,
    setManualSlug,
    saving,
    aliasBusy,
    logoMedia,
    setLogoMedia,
    bannerMedia,
    setBannerMedia,
    setInitialLogoMedia,
    setInitialBannerMedia,
    mediaBusy,
    slugConflict,
    slugChecking,
    // derived
    dirty,
    nameError,
    slugFormatError,
    foundedError,
    dissolvedError,
    dissolvedAfterFoundedError,
    linkErrors,
    invalid,
    // setters used by parent loader
    applyGroup,
    setAliasesFromLoad,
    // handlers
    handleLogoMediaBusyChange,
    handleBannerMediaBusyChange,
    addAlias,
    removeAlias,
    save,
  };
}
