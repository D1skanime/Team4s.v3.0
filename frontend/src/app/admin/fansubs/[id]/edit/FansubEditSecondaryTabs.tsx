"use client";

import type { FansubGroup, FansubGroupCapabilities } from "@/types/fansub";
import { NotesTab } from "./NotesTab";
import { GroupHistorySection } from "@/components/groups/GroupHistorySection";
import { ReadinessTab } from "./ReadinessTab";
import { ContributionsReviewSection } from "./ContributionsReviewSection";
import { UserSuggestionsInbox } from "./UserSuggestionsInbox";
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
          {capabilities ? (
            <UserSuggestionsInbox
              fansubId={fansubID}
              domain="notes"
              capabilities={capabilities}
            />
          ) : null}
        </>
      ) : null}
      {activeMainTab === "vorschlaege" && capabilities ? (
        <>
          <ContributionsReviewSection
            fansubId={fansubID}
            capabilities={capabilities}
          />
          <UserSuggestionsInbox
            fansubId={fansubID}
            domain="contribution"
            capabilities={capabilities}
          />
        </>
      ) : null}
      {activeMainTab === "readiness" && group ? (
        <ReadinessTab fansubId={fansubID} group={group} />
      ) : null}
    </>
  );
}
