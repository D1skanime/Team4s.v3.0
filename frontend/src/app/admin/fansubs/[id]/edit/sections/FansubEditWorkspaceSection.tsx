import type {
  AdminFansubRelease,
  FansubGroup,
  FansubGroupCapabilities,
} from "@/types/fansub";
import { AnimeReleasesCockpit } from "../AnimeReleasesCockpit";
import { FansubDetailsTab } from "../FansubDetailsTab";
import { FansubEditHeaderCard } from "../FansubEditHeaderCard";
import { FansubEditSecondaryTabs } from "../FansubEditSecondaryTabs";
import type { FansubDetailsForm } from "../useFansubDetailsForm";
import type { FansubReleaseData } from "../useFansubReleaseData";
import type { ReleaseContributions } from "../useReleaseContributions";
import type {
  FansubReleaseGroup,
  MainTab,
  ReleaseDrawerContext,
  ReleaseSegmentCard,
  SectionKey,
} from "../fansubEditTypes";
import { visibleMainTabs } from "../fansubEditAccess";

type FansubEditWorkspaceSectionProps = {
  styles: Record<string, string>;
  fansubID: number;
  group: FansubGroup | null;
  capabilities: FansubGroupCapabilities | null;
  isPlatformAdmin: boolean;
  hasAuthSession: boolean;
  isClientInitialized: boolean;
  activeMainTab: MainTab;
  availableMainTabs: ReturnType<typeof visibleMainTabs>;
  onMainTabChange: (tab: MainTab) => void;
  details: FansubDetailsForm;
  bannerPreviewURL: string;
  logoPreviewURL: string;
  error: string | null;
  releaseData: FansubReleaseData;
  contributions: ReleaseContributions;
  canViewProjectNotes: boolean;
  canEditProjectNotes: boolean;
  canViewReleaseContributors: boolean;
  canEditReleaseContributors: boolean;
  canUseReleaseMedia: boolean;
  canUseReleaseNotes: boolean;
  canUseAdminReleaseDetails: boolean;
  canOpenReleaseDrawer: boolean;
  isSectionOpen: (section: SectionKey) => boolean;
  onSectionToggle: (section: SectionKey, open: boolean) => void;
  onToast: (message: string) => void;
  onToggleAnime: (releaseGroup: FansubReleaseGroup) => void;
  onOpenReleaseDrawer: (context: ReleaseDrawerContext) => void;
  onOpenThemeDrawer: (
    release: AdminFansubRelease,
    card: ReleaseSegmentCard,
  ) => void;
};

export function FansubEditWorkspaceSection({
  styles,
  fansubID,
  group,
  capabilities,
  isPlatformAdmin,
  hasAuthSession,
  isClientInitialized,
  activeMainTab,
  availableMainTabs,
  onMainTabChange,
  details,
  bannerPreviewURL,
  logoPreviewURL,
  error,
  releaseData,
  contributions,
  canViewProjectNotes,
  canEditProjectNotes,
  canViewReleaseContributors,
  canEditReleaseContributors,
  canUseReleaseMedia,
  canUseReleaseNotes,
  canUseAdminReleaseDetails,
  canOpenReleaseDrawer,
  isSectionOpen,
  onSectionToggle,
  onToast,
  onToggleAnime,
  onOpenReleaseDrawer,
  onOpenThemeDrawer,
}: FansubEditWorkspaceSectionProps) {
  const { form } = details;

  return (
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
        onMainTabChange={onMainTabChange}
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
          onToast={onToast}
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
          canViewProjectNotes={canViewProjectNotes}
          canEditProjectNotes={canEditProjectNotes}
          canViewReleaseContributors={canViewReleaseContributors}
          canEditReleaseContributors={canEditReleaseContributors}
          canUseReleaseMedia={canUseReleaseMedia}
          canUseReleaseNotes={canUseReleaseNotes}
          canUseAdminReleaseDetails={canUseAdminReleaseDetails}
          canOpenReleaseDrawer={canOpenReleaseDrawer}
          isSectionOpen={isSectionOpen}
          onSectionToggle={onSectionToggle}
          onToggleAnime={onToggleAnime}
          onOpenReleaseDrawer={onOpenReleaseDrawer}
          onOpenThemeDrawer={onOpenThemeDrawer}
        />
      ) : null}
      <FansubEditSecondaryTabs
        activeMainTab={activeMainTab}
        fansubID={fansubID}
        group={group}
        capabilities={capabilities}
      />
    </section>
  );
}
