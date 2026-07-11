"use client";

import type { FansubGroup, FansubGroupCapabilities } from "@/types/fansub";
import { NotesTab } from "./NotesTab";
import { GroupHistorySection } from "@/components/groups/GroupHistorySection";
import { ReadinessTab } from "./ReadinessTab";
import { ContributionsReviewSection } from "./ContributionsReviewSection";
import type { MainTab } from "./fansubEditTypes";
import {
  hasQualifiedFirstProject,
  hasQualifiedFirstRelease,
} from "./fansubEditReleaseHelpers";
import type { FansubReleaseData } from "./useFansubReleaseData";

function hasWebsiteCommunityLink(group: FansubGroup | null): boolean {
  if (!group) return false;
  return Boolean(
    group.links?.some(
      (link) => link.link_type === "website" && link.url.trim() !== "",
    ),
  );
}

type FansubEditSecondaryTabsProps = {
  activeMainTab: MainTab;
  fansubID: number;
  group: FansubGroup | null;
  capabilities: FansubGroupCapabilities | null;
  releaseData: FansubReleaseData;
};

export function FansubEditSecondaryTabs({
  activeMainTab,
  fansubID,
  group,
  capabilities,
  releaseData,
}: FansubEditSecondaryTabsProps) {
  return (
    <>
      {activeMainTab === "notes" ? (
        <>
          <NotesTab fansubId={fansubID} />
          <GroupHistorySection
            fansubGroupId={fansubID}
            foundedYear={group?.founded_year ?? null}
            hasWebsiteLink={hasWebsiteCommunityLink(group)}
            hasFirstProject={hasQualifiedFirstProject(releaseData.animeCoverageMap)}
            hasFirstRelease={hasQualifiedFirstRelease(releaseData.animeCoverageMap)}
          />
        </>
      ) : null}
      {activeMainTab === "vorschlaege" && capabilities ? (
        <ContributionsReviewSection
          fansubId={fansubID}
          capabilities={capabilities}
        />
      ) : null}
      {activeMainTab === "readiness" && group ? (
        <ReadinessTab fansubId={fansubID} group={group} />
      ) : null}
    </>
  );
}
