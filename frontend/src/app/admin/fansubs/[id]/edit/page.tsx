"use client";

import Link from "next/link";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getFansubAliases, getFansubByID } from "@/lib/api";
import { useAuthSession } from "@/lib/useAuthSession";
import {
  FansubGroupCapabilities,
  FansubGroup,
} from "@/types/fansub";
import { buildMediaPreviewURL } from "@/components/admin/MediaUpload";
import { AnimeReleasesCockpit } from "./AnimeReleasesCockpit";
import { FansubEditHeaderCard } from "./FansubEditHeaderCard";
import { FansubEditSecondaryTabs } from "./FansubEditSecondaryTabs";
import { parseMainTab } from "./mainTabRouting";
import { FansubDetailsTab } from "./FansubDetailsTab";
import { useFansubDetailsForm } from "./useFansubDetailsForm";
import { ReleaseMediaDrawer } from "./ReleaseMediaDrawer";
import { useReleaseMediaDrawer } from "./useReleaseMediaDrawer";
import { useFansubReleaseData } from "./useFansubReleaseData";
import { useReleaseContributions } from "./useReleaseContributions";
import type { FansubReleaseGroup, MainTab, SectionKey } from "./fansubEditTypes";
import { errMessage } from "./fansubEditFormatters";
import {
  canEditReleaseNotes,
  canUploadReleaseMedia,
  canUseMainTab,
  canViewReleaseContributors,
  canViewReleaseMedia,
  readFansubIDFromParams,
  resolveMainTabForAccess,
  visibleMainTabs,
} from "./fansubEditAccess";
import { FansubEditAccessGate } from "./FansubEditAccessGate";
import sharedStyles from "../../../admin.module.css";
import fansubEditStyles from "./FansubEdit.module.css";

const styles = { ...sharedStyles, ...fansubEditStyles };

// MAIN_TABS und parseMainTab werden aus mainTabRouting.ts importiert (testbar ohne page.tsx-Kontext)

function AdminFansubEditContent({
  fansubID,
  isPlatformAdmin,
  capabilities,
}: {
  fansubID: number;
  isPlatformAdmin: boolean;
  capabilities: FansubGroupCapabilities | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mainTabFromQuery = parseMainTab(searchParams.get("tab"));
  const initialMainTab = resolveMainTabForAccess(
    mainTabFromQuery,
    isPlatformAdmin,
    capabilities,
  );
  const [group, setGroup] = useState<FansubGroup | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<MainTab>(initialMainTab);
  const [isMobile, setIsMobile] = useState(false);
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>(
    {
      basic: true,
      media: true,
      links: true,
      collaboration: true,
      releases: true,
      notes: true,
      mitglieder: true,
      claims: true,
      vorschlaege: true,
      readiness: true,
    },
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { hasAccessToken, hasRefreshToken, isClientInitialized } =
    useAuthSession();
  const hasAuthSession = hasAccessToken || hasRefreshToken;
  const handleDetailsToast = useCallback((message: string) => {
    setToast(message);
  }, []);
  const handleDetailsError = useCallback((message: string | null) => {
    setError(message);
  }, []);
  const handleDetailsGroupUpdated = useCallback((nextGroup: FansubGroup) => {
    setGroup(nextGroup);
  }, []);
  const details = useFansubDetailsForm({
    fansubID,
    isPlatformAdmin,
    hasAuthSession,
    onGroupUpdated: handleDetailsGroupUpdated,
    onToast: handleDetailsToast,
    onError: handleDetailsError,
  });
  const { form, logoMedia, bannerMedia, applyGroup, setAliasesFromLoad } =
    details;
  const availableMainTabs = useMemo(
    () => visibleMainTabs(isPlatformAdmin, capabilities),
    [capabilities, isPlatformAdmin],
  );
  const canOpenReleaseContributors = canViewReleaseContributors(
    isPlatformAdmin,
    capabilities,
  );
  const canManageReleaseThemeAssets = canUploadReleaseMedia(
    isPlatformAdmin,
    capabilities,
  );
  const canUseReleaseMedia = canViewReleaseMedia(isPlatformAdmin, capabilities);
  const canUseReleaseNotes = canEditReleaseNotes(isPlatformAdmin, capabilities);
  const canUseProjectNotes = canUseMainTab(
    "notes",
    isPlatformAdmin,
    capabilities,
  );
  const canUseAdminReleaseDetails = isPlatformAdmin;
  const canOpenReleaseDrawer = canUseAdminReleaseDetails || canUseReleaseMedia;

  // Der Gruppenwechsel-Reset spannt alle drei Release-Hooks (Daten/Contributions/Drawer)
  // auf. Damit der Load-Effect in useFansubReleaseData stabile Callbacks bekommt, ohne
  // dass die Hook-Aufrufreihenfolge zirkulär wird, werden die zusammengesetzten
  // Reset/Invalidate-Funktionen über einen Ref indirekt aufgerufen.
  const workspaceLifecycleRef = useRef<{
    reset: () => void;
    invalidate: () => void;
  }>({ reset: () => {}, invalidate: () => {} });
  const resetReleaseWorkspaceState = useCallback(() => {
    workspaceLifecycleRef.current.reset();
  }, []);
  const invalidateReleaseWorkspaceRequests = useCallback(() => {
    workspaceLifecycleRef.current.invalidate();
  }, []);

  const releaseData = useFansubReleaseData({
    fansubID,
    hasAuthSession,
    resetReleaseWorkspaceState,
    invalidateReleaseWorkspaceRequests,
  });
  const {
    setExpandedAnimeKeys,
    setExpandedReleaseIds,
    releaseSegmentCards,
    setReleaseSegmentCards,
    setReleaseSegmentErrors,
    selectedReleaseSegment,
    setSelectedReleaseSegment,
    loadReleaseSegmentCards,
    loadAnimeReleases,
    refreshAnimeCoverage,
    invalidateReleaseDataRequests,
    resetReleaseDataState,
  } = releaseData;

  const contributions = useReleaseContributions({
    fansubID,
    refreshAnimeCoverage,
  });
  const {
    loadAnimeContributionRows,
    resetContributionsState,
  } = contributions;

  const drawer = useReleaseMediaDrawer({
    hasAuthSession,
    canOpenReleaseDrawer,
    canUseAdminReleaseDetails,
    canManageReleaseThemeAssets,
    selectedReleaseSegment,
    setSelectedReleaseSegment,
    releaseSegmentCards,
    setReleaseSegmentCards,
    setReleaseSegmentErrors,
    setExpandedReleaseIds,
    loadReleaseSegmentCards,
    onToast: handleDetailsToast,
  });
  const { openReleaseDrawer, openThemeDrawer } = drawer;
  const { resetDrawerState, invalidateDrawerRequests } = drawer;

  useEffect(() => {
    const nextTab = resolveMainTabForAccess(
      mainTabFromQuery,
      isPlatformAdmin,
      capabilities,
    );
    // Synchronisiert den aktiven Tab aus der URL — idempotent (gleiche Referenz bei
    // gleichem Tab). Bewusst State-Sync im Effekt; verhaltensgleich zum Vor-Refactor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveMainTab((current) => (current === nextTab ? current : nextTab));
  }, [capabilities, isPlatformAdmin, mainTabFromQuery]);

  const handleMainTabChange = useCallback(
    (tab: MainTab) => {
      if (!canUseMainTab(tab, isPlatformAdmin, capabilities)) return;
      setActiveMainTab(tab);

      const nextSearchParams = new URLSearchParams(searchParams.toString());
      if (tab === "basic") {
        nextSearchParams.delete("tab");
      } else {
        nextSearchParams.set("tab", tab);
      }

      const query = nextSearchParams.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [capabilities, isPlatformAdmin, pathname, router, searchParams],
  );

  // Hält die zusammengesetzten Lifecycle-Callbacks aktuell (siehe workspaceLifecycleRef).
  useEffect(() => {
    workspaceLifecycleRef.current = {
      invalidate: () => {
        invalidateReleaseDataRequests();
        invalidateDrawerRequests();
      },
      reset: () => {
        invalidateReleaseDataRequests();
        invalidateDrawerRequests();
        resetReleaseDataState();
        resetContributionsState();
        resetDrawerState();
      },
    };
  }, [
    invalidateDrawerRequests,
    invalidateReleaseDataRequests,
    resetContributionsState,
    resetDrawerState,
    resetReleaseDataState,
  ]);

  const toggleAnime = useCallback(
    (releaseGroup: FansubReleaseGroup) => {
      setExpandedAnimeKeys((current) => {
        const next = new Set(current);
        if (next.has(releaseGroup.key)) {
          next.delete(releaseGroup.key);
        } else {
          next.add(releaseGroup.key);
          void loadAnimeReleases(releaseGroup);
          void loadAnimeContributionRows(releaseGroup.anime.id);
        }
        return next;
      });
    },
    [loadAnimeContributionRows, loadAnimeReleases, setExpandedAnimeKeys],
  );

  const openAnimeProjectNote = useCallback(
    (releaseGroup: FansubReleaseGroup) => {
      setExpandedAnimeKeys((current) => {
        if (current.has(releaseGroup.key)) return current;
        const next = new Set(current);
        next.add(releaseGroup.key);
        return next;
      });
      void loadAnimeReleases(releaseGroup);
      void loadAnimeContributionRows(releaseGroup.anime.id);
    },
    [loadAnimeContributionRows, loadAnimeReleases, setExpandedAnimeKeys],
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const onChange = () => setIsMobile(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!Number.isFinite(fansubID) || fansubID <= 0) {
      // Lade-/Fehlerzustand im Fetch-Effekt; verhaltensgleich zum Vor-Refactor.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError("Ungültige Fansub-ID.");
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    Promise.all([getFansubByID(fansubID), getFansubAliases(fansubID)])
      .then(([groupResponse, aliasResponse]) => {
        if (!active) return;
        const nextGroup = groupResponse.data;
        setGroup(nextGroup);
        applyGroup(nextGroup);
        setAliasesFromLoad(aliasResponse.data);
      })
      .catch((nextError) => {
        if (active) setError(errMessage(nextError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fansubID, applyGroup, setAliasesFromLoad]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const isSectionOpen = (section: SectionKey): boolean =>
    isMobile ? openSections[section] : true;
  const onSectionToggle = (section: SectionKey, open: boolean) => {
    if (!isMobile) return;
    setOpenSections((current) => ({ ...current, [section]: open }));
  };

  const bannerPreviewURL = buildMediaPreviewURL(bannerMedia);
  const logoPreviewURL = buildMediaPreviewURL(logoMedia);

  if (loading)
    return (
      <main className={styles.page}>
        <section className={styles.panel}>
          <p>Lade...</p>
        </section>
      </main>
    );

  return (
    <main className={styles.page}>
      <p className={styles.backLinks}>
        {isPlatformAdmin ? (
          <>
            <Link href="/admin">Admin</Link> /{" "}
            <Link href="/admin/fansubs">Fansubs</Link>
          </>
        ) : (
          <>
            <Link href="/manage/groups">Meine Gruppen</Link> /{" "}
            <span>{form.name.trim() || "Gruppe"}</span>
          </>
        )}
      </p>
      {toast ? <div className={styles.fansubEditToast}>{toast}</div> : null}

      <section className={`${styles.panel} ${styles.fansubEditWorkspacePanel}`}>
        <FansubEditHeaderCard
          styles={styles}
          form={form}
          isPlatformAdmin={isPlatformAdmin}
          capabilities={capabilities}
          bannerPreviewURL={bannerPreviewURL}
          logoPreviewURL={logoPreviewURL}
          activeMainTab={activeMainTab}
          availableMainTabs={availableMainTabs}
          onMainTabChange={handleMainTabChange}
        />

        {activeMainTab !== "releases" &&
        activeMainTab !== "notes" &&
        activeMainTab !== "vorschlaege" &&
        activeMainTab !== "readiness" ? (
          <FansubDetailsTab
            styles={styles}
            details={details}
            fansubID={fansubID}
            group={group}
            capabilities={capabilities}
            isPlatformAdmin={isPlatformAdmin}
            hasAuthSession={hasAuthSession}
            isClientInitialized={isClientInitialized}
            activeMainTab={activeMainTab}
            error={error}
            onToast={handleDetailsToast}
            isSectionOpen={isSectionOpen}
            onSectionToggle={onSectionToggle}
          />
        ) : null}
        {activeMainTab === "releases" ? (
          <AnimeReleasesCockpit
            styles={styles}
            fansubID={fansubID}
            releaseData={releaseData}
            contributions={contributions}
            canUseProjectNotes={canUseProjectNotes}
            canOpenReleaseContributors={canOpenReleaseContributors}
            canUseReleaseMedia={canUseReleaseMedia}
            canUseReleaseNotes={canUseReleaseNotes}
            canUseAdminReleaseDetails={canUseAdminReleaseDetails}
            canOpenReleaseDrawer={canOpenReleaseDrawer}
            isSectionOpen={isSectionOpen}
            onSectionToggle={onSectionToggle}
            onToggleAnime={toggleAnime}
            onOpenAnimeProjectNote={openAnimeProjectNote}
            onOpenReleaseDrawer={openReleaseDrawer}
            onOpenThemeDrawer={openThemeDrawer}
          />
        ) : null}
        <FansubEditSecondaryTabs
          activeMainTab={activeMainTab}
          fansubID={fansubID}
          group={group}
          capabilities={capabilities}
        />
      </section>
      <ReleaseMediaDrawer
        styles={styles}
        drawer={drawer}
        capabilities={capabilities}
        hasAuthSession={hasAuthSession}
        canUseAdminReleaseDetails={canUseAdminReleaseDetails}
        canUseReleaseMedia={canUseReleaseMedia}
        canManageReleaseThemeAssets={canManageReleaseThemeAssets}
        selectedReleaseSegment={selectedReleaseSegment}
        releaseSegmentCards={releaseSegmentCards}
      />
    </main>
  );
}

export default function AdminFansubEditPage() {
  const params = useParams<{ id: string }>();
  const fansubID = readFansubIDFromParams(params);

  return (
    <FansubEditAccessGate fansubID={fansubID}>
      {({ isPlatformAdmin, capabilities }) => (
        <AdminFansubEditContent
          fansubID={fansubID}
          isPlatformAdmin={isPlatformAdmin}
          capabilities={capabilities}
        />
      )}
    </FansubEditAccessGate>
  );
}
