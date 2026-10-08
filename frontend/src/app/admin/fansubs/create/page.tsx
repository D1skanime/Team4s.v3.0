"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Save, X } from "lucide-react";

import { getFansubList } from "@/lib/api";
import { PlatformAdminGate } from "@/components/auth/PlatformAdminGate";
import { useConfirmDialog } from "@/components/ui";
import { useAuthSession } from "@/lib/useAuthSession";
import { FansubAlias, FansubGroup } from "@/types/fansub";
import {
  buildFansubLogoFallback,
  buildMediaPreviewURL,
  EditableMediaValue,
} from "@/components/admin/MediaUpload";

import sharedStyles from "../../admin.module.css";
import fansubEditStyles from "../[id]/edit/FansubEdit.module.css";
import {
  CommunityLinkDraft,
  FormState,
  createEmptyLink,
  emptyForm,
  isAbsoluteURL,
  isValidSlug,
  parseYear,
  slugify,
} from "./adminFansubCreateHelpers";
import { useAdminFansubCreateActions } from "./useAdminFansubCreateActions";
import { AdminFansubCreateAliasesSection } from "./AdminFansubCreateAliasesSection";
import { AdminFansubCreateBasicInfoSection } from "./AdminFansubCreateBasicInfoSection";
import { AdminFansubCreateLinksSection } from "./AdminFansubCreateLinksSection";
import { AdminFansubCreateMediaSection } from "./AdminFansubCreateMediaSection";

const styles = { ...sharedStyles, ...fansubEditStyles };

const YEAR_MIN = 1900;
const YEAR_MAX = new Date().getFullYear();

function AdminFansubCreateContent() {
  const nextDraftLinkKeyRef = useRef(1);
  const createDraftLink = () =>
    createEmptyLink(`draft-link-${nextDraftLinkKeyRef.current++}`);
  const { confirm, confirmDialog } = useConfirmDialog();
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

  const { addAlias, removeAlias, save } = useAdminFansubCreateActions({
    createdGroup,
    setCreatedGroup,
    form,
    setForm,
    setInitialForm,
    aliases,
    setAliases,
    aliasDrafts,
    setAliasDrafts,
    setInitialAliasDrafts,
    aliasInput,
    setAliasInput,
    setAliasError,
    setAliasBusy,
    links,
    setLinks,
    initialLinks,
    setInitialLinks,
    logoMedia,
    setLogoMedia,
    setInitialLogoMedia,
    bannerMedia,
    setBannerMedia,
    setInitialBannerMedia,
    setManualSlug,
    setSaving,
    hasRuntimeAuthToken,
    invalid,
    setError,
    setToast,
  });

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
              onClick={async () => {
                if (
                  dirty &&
                  !(await confirm({
                    title: "Ungespeicherte Änderungen verwerfen?",
                    confirmLabel: "Verwerfen",
                    tone: "danger",
                  }))
                )
                  return;
                window.location.href = "/admin/fansubs";
              }}
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
              <AdminFansubCreateBasicInfoSection
                form={form}
                setForm={setForm}
                setManualSlug={setManualSlug}
                nameError={nameError}
                slugFormatError={slugFormatError}
                slugConflict={slugConflict}
                slugChecking={slugChecking}
                foundedError={foundedError}
                dissolvedError={dissolvedError}
                dissolvedAfterFoundedError={dissolvedAfterFoundedError}
                yearMin={YEAR_MIN}
                yearMax={YEAR_MAX}
              />

              <AdminFansubCreateAliasesSection
                aliasDrafts={aliasDrafts}
                aliasInput={aliasInput}
                setAliasInput={setAliasInput}
                setAliasError={setAliasError}
                aliasError={aliasError}
                aliasBusy={aliasBusy}
                addAlias={addAlias}
                removeAlias={removeAlias}
              />
            </div>

            <div className={styles.fansubEditRightColumn}>
              <AdminFansubCreateMediaSection
                createdGroup={createdGroup}
                formName={form.name}
                hasRuntimeAuthToken={hasRuntimeAuthToken}
                saving={saving}
                logoMedia={logoMedia}
                setLogoMedia={setLogoMedia}
                setInitialLogoMedia={setInitialLogoMedia}
                bannerMedia={bannerMedia}
                setBannerMedia={setBannerMedia}
                setInitialBannerMedia={setInitialBannerMedia}
                setMediaBusy={setMediaBusy}
                setToast={setToast}
              />

              <AdminFansubCreateLinksSection
                links={links}
                setLinks={setLinks}
                linkErrors={linkErrors}
                createDraftLink={createDraftLink}
              />
            </div>
          </div>
        </form>
      </section>
      {confirmDialog}
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
