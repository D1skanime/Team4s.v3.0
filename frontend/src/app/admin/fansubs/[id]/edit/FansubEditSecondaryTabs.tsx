"use client";

import type { FansubGroup, FansubGroupCapabilities } from "@/types/fansub";
import { NotesTab } from "./NotesTab";
import { GroupHistorySection } from "@/components/groups/GroupHistorySection";
import { ReadinessTab } from "./ReadinessTab";
import { ContributionsReviewSection } from "./ContributionsReviewSection";
import type { MainTab } from "./fansubEditTypes";

type FansubEditSecondaryTabsProps = {
  activeMainTab: MainTab;
  fansubID: number;
  group: FansubGroup | null;
  capabilities: FansubGroupCapabilities | null;
};

export function FansubEditSecondaryTabs({
  activeMainTab,
  fansubID,
  group,
  capabilities,
}: FansubEditSecondaryTabsProps) {
  return (
    <>
      {activeMainTab === "notes" ? (
        <>
          <NotesTab fansubId={fansubID} />
          <GroupHistorySection fansubGroupId={fansubID} />
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
