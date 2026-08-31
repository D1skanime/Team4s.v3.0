"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Badge, Tabs } from "@/components/ui";
import type { TabItem } from "@/components/ui";
import { getReleaseReviewCounts } from "@/lib/api";
import type { FansubGroup, FansubGroupCapabilities } from "@/types/fansub";
import { NotesTab } from "./NotesTab";
import { GroupHistorySection } from "@/components/groups/GroupHistorySection";
import { GroupChangesTab } from "./GroupChangesTab";
import { GroupRolesTab } from "./GroupRolesTab";
import { OwnPendingReviewsSection } from "./OwnPendingReviewsSection";
import { ReadinessTab } from "./ReadinessTab";
import { ReleaseReviewsSection } from "./ReleaseReviewsSection";
import type { MainTab } from "./fansubEditTypes";
import { canUseMainTab } from "./fansubEditAccess";
import {
  countQualifiedCompletedProjects,
  countQualifiedReleases,
  hasQualifiedCollaboration,
  hasQualifiedCompletedProject,
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

type ReviewLane = "queue" | "own-pending";

function readLane(value: string | null): ReviewLane {
  return value === "own" ? "own-pending" : "queue";
}

/**
 * Wraps the actionable review queue and the actor's own-pending lane in the global
 * Tabs primitive (UI-SPEC Component Contract 1) with independently-fetched, never
 * combined badge counts and `?lane=queue|own` URL sync nested inside `?tab=pruefungen`.
 */
function PruefungenTabs({ fansubId }: { fansubId: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [lane, setLane] = useState<ReviewLane>(() => readLane(searchParams.get("lane")));
  const [actionableCount, setActionableCount] = useState(0);
  const [ownPendingCount, setOwnPendingCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [queueCounts, ownCounts] = await Promise.all([
          getReleaseReviewCounts(fansubId, { view: "open" }),
          getReleaseReviewCounts(fansubId, { view: "own" }),
        ]);
        if (cancelled) return;
        setActionableCount(queueCounts.data.text + queueCounts.data.image);
        setOwnPendingCount(ownCounts.data.text + ownCounts.data.image);
      } catch {
        // Badge counts are advisory tab chrome; each lane surfaces its own load errors.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fansubId]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("tab", "pruefungen");
    if (lane === "own-pending") params.set("lane", "own");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [lane, pathname, router]);

  const items: TabItem[] = [
    {
      id: "queue",
      label: "Zu prüfen",
      badge: <Badge variant="info">{actionableCount}</Badge>,
      content: <ReleaseReviewsSection fansubId={fansubId} />,
    },
    {
      id: "own-pending",
      label: "Wartet auf Fremdprüfung",
      badge: <Badge variant="muted">{ownPendingCount}</Badge>,
      content: <OwnPendingReviewsSection fansubId={fansubId} />,
    },
  ];

  return (
    <Tabs
      items={items}
      activeId={lane}
      onActiveIdChange={(id) => setLane(id === "own-pending" ? "own-pending" : "queue")}
      keepMountedIds={new Set(["queue", "own-pending"])}
    />
  );
}

type FansubEditSecondaryTabsProps = {
  activeMainTab: MainTab;
  fansubID: number;
  group: FansubGroup | null;
  capabilities: FansubGroupCapabilities | null;
  isPlatformAdmin: boolean;
  releaseData: FansubReleaseData;
};

export function FansubEditSecondaryTabs({
  activeMainTab,
  fansubID,
  group,
  capabilities,
  isPlatformAdmin,
  releaseData,
}: FansubEditSecondaryTabsProps) {
  return (
    <>
      {activeMainTab === "notes" ? (
        <>
          <NotesTab fansubId={fansubID} />
          <GroupHistorySection
            fansubGroupId={fansubID}
            foundingOnly={!isPlatformAdmin && !capabilities?.can_edit_group && Boolean(capabilities?.can_edit_founding_history)}
            foundedYear={group?.founded_year ?? null}
            hasWebsiteLink={hasWebsiteCommunityLink(group)}
            hasFirstProject={hasQualifiedFirstProject(releaseData.animeCoverageMap)}
            hasFirstRelease={hasQualifiedFirstRelease(releaseData.animeCoverageMap)}
            qualifiedReleaseCount={countQualifiedReleases(releaseData.animeCoverageMap)}
            hasCompletedProject={hasQualifiedCompletedProject(releaseData.animeCoverageMap)}
            completedProjectCount={countQualifiedCompletedProjects(releaseData.animeCoverageMap)}
            hasCollaboration={hasQualifiedCollaboration(releaseData.animeCoverageMap)}
          />
        </>
      ) : null}
      {activeMainTab === "pruefungen" ? (
        <PruefungenTabs fansubId={fansubID} />
      ) : null}
      {activeMainTab === "readiness" && group ? (
        <ReadinessTab fansubId={fansubID} group={group} />
      ) : null}
      {activeMainTab === "roles" &&
      canUseMainTab("roles", isPlatformAdmin, capabilities) ? (
        <GroupRolesTab fansubId={fansubID} />
      ) : null}
      {activeMainTab === "changes" ? <GroupChangesTab fansubId={fansubID} /> : null}
    </>
  );
}
