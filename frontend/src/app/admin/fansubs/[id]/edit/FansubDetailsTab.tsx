"use client";

import { Plus, Save } from "lucide-react";

import type { FansubGroup, FansubGroupCapabilities } from "@/types/fansub";
import { Button } from "@/components/ui";
import { createEmptyLink } from "./fansubEditFormMapping";
import { GroupMediaReviewSection } from "./GroupMediaReviewSection";
import { UserSuggestionsInbox } from "./UserSuggestionsInbox";
import { FansubAppMembersSection } from "./FansubAppMembersSection";
import { FansubCommunityLinksList } from "./FansubCommunityLinksList";
import { FansubBasicInfoTab } from "./FansubBasicInfoTab";
import type { MainTab, SectionKey } from "./fansubEditTypes";
import type { FansubDetailsForm } from "./useFansubDetailsForm";

type FansubDetailsTabProps = {
  styles: Record<string, string>;
  details: FansubDetailsForm;
  fansubID: number;
  group: FansubGroup | null;
  capabilities: FansubGroupCapabilities | null;
  isPlatformAdmin: boolean;
  hasAuthSession: boolean;
  isClientInitialized: boolean;
  activeMainTab: MainTab;
  error: string | null;
  onToast: (message: string) => void;
  isSectionOpen: (section: SectionKey) => boolean;
  onSectionToggle: (section: SectionKey, open: boolean) => void;
};

export function FansubDetailsTab({
  styles,
  details,
  fansubID,
  group,
  capabilities,
  isPlatformAdmin,
  hasAuthSession,
  isClientInitialized,
  activeMainTab,
  error,
  onToast,
  isSectionOpen,
  onSectionToggle,
}: FansubDetailsTabProps) {
  const { links, setLinks, linkErrors, saving, invalid, save } = details;

  const tabUsesLeftWorkspace = activeMainTab === "basic";
  const tabUsesRightWorkspace =
    activeMainTab === "media" ||
    activeMainTab === "links" ||
    activeMainTab === "collaboration";
  const fansubEditColumnsClassName = `${styles.fansubEditColumns}${tabUsesLeftWorkspace ? ` ${styles.fansubEditColumnsSingleLeft}` : ""}${tabUsesRightWorkspace ? ` ${styles.fansubEditColumnsSingleRight}` : ""}`;

  const communityLinksList = (
    <FansubCommunityLinksList
      styles={styles}
      links={links}
      setLinks={setLinks}
      linkErrors={linkErrors}
    />
  );

  return (
    <form className={styles.fansubEditForm} onSubmit={save}>
      {activeMainTab !== "collaboration" ? (
        <div className={styles.fansubEditStickyActions}>
          <Button
            type="submit"
            variant="success"
            disabled={invalid || saving}
            loading={saving}
            leftIcon={<Save size={14} />}
          >
            {saving ? "Speichern..." : "Speichern"}
          </Button>
        </div>
      ) : null}
      {error ? <div className={styles.errorBox}>{error}</div> : null}
      {isClientInitialized && !hasAuthSession ? (
        <div className={styles.errorBox}>
          Anmeldung erforderlich. Bitte zuerst anmelden.
        </div>
      ) : null}

      <div className={fansubEditColumnsClassName}>
        {tabUsesLeftWorkspace ? (
          <div className={styles.fansubEditLeftColumn}>
            {activeMainTab === "basic" ? (
              <FansubBasicInfoTab
                styles={styles}
                details={details}
                fansubID={fansubID}
                group={group}
                isPlatformAdmin={isPlatformAdmin}
                hasAuthSession={hasAuthSession}
                onToast={onToast}
                communityLinksList={communityLinksList}
              />
            ) : null}
          </div>
        ) : null}

        {tabUsesRightWorkspace ? (
          <div className={styles.fansubEditRightColumn}>
            {activeMainTab === "media" ? (
              <>
                {capabilities ? (
                  <>
                    <GroupMediaReviewSection fansubId={fansubID} capabilities={capabilities} />
                    <UserSuggestionsInbox fansubId={fansubID} domain="media" capabilities={capabilities} />
                  </>
                ) : null}
              </>
            ) : null}

            {activeMainTab === "links" ? (
              <details
                className={styles.fansubEditSection}
                open={isSectionOpen("links")}
                onToggle={(event) =>
                  onSectionToggle("links", event.currentTarget.open)
                }
              >
                <summary className={styles.fansubEditSectionSummary}>
                  Community-Links
                </summary>
                <div className={styles.fansubEditSectionBody}>
                  <div className={styles.fansubEditLinksHeader}>
                    <p className={styles.fansubEditHint}>
                      Generische Link-Zeilen für Website, Discord,
                      Twitter, GitHub und IRC.
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      leftIcon={<Plus size={14} />}
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
                  {communityLinksList}
                </div>
              </details>
            ) : null}

            {activeMainTab === "collaboration" ? (
              <FansubAppMembersSection
                fansubId={fansubID}
                hasAccessToken={hasAuthSession}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {activeMainTab !== "collaboration" ? (
        <div className={styles.fansubEditMobileActionBar}>
          <Button
            type="submit"
            variant="success"
            disabled={invalid || saving}
            loading={saving}
            fullWidth
          >
            {saving ? "Speichern..." : "Speichern"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
