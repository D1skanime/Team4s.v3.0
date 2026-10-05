// Community-links section, extracted verbatim from AdminFansubCreateContent
// (174-14, D-14). Props-driven, presentational; link list state stays
// owned by the page component (createDraftLink wraps the page's
// nextDraftLinkKeyRef counter, keeping that ref centralized there too).

import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { Dispatch, SetStateAction } from "react";

import { FansubGroupLinkType } from "@/types/fansub";

import sharedStyles from "../../admin.module.css";
import fansubEditStyles from "../[id]/edit/FansubEdit.module.css";
import { CommunityLinkDraft } from "./adminFansubCreateHelpers";

const styles = { ...sharedStyles, ...fansubEditStyles };

const LINK_TYPE_OPTIONS: FansubGroupLinkType[] = [
  "website",
  "discord",
  "twitter",
  "github",
  "irc",
];

interface AdminFansubCreateLinksSectionProps {
  links: CommunityLinkDraft[];
  setLinks: Dispatch<SetStateAction<CommunityLinkDraft[]>>;
  linkErrors: (string | null)[];
  createDraftLink: () => CommunityLinkDraft;
}

export function AdminFansubCreateLinksSection({
  links,
  setLinks,
  linkErrors,
  createDraftLink,
}: AdminFansubCreateLinksSectionProps) {
  return (
    <details className={styles.fansubEditSection} open>
      <summary className={styles.fansubEditSectionSummary}>
        Community Links
      </summary>
      <div className={styles.fansubEditSectionBody}>
        <div className={styles.fansubEditLinksHeader}>
          <p className={styles.fansubEditHint}>
            Generische Link-Zeilen für Website, Discord, Twitter, GitHub und
            IRC.
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
              <div key={link.key} className={styles.fansubEditLinkRow}>
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
                        : current.filter((item) => item.key !== link.key),
                    )
                  }
                >
                  <Trash2 size={14} />
                </button>
                {urlError ? (
                  <p className={styles.fansubEditInlineError}>{urlError}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </details>
  );
}
