"use client";

import { type Dispatch, type SetStateAction } from "react";
import { ExternalLink, Trash2 } from "lucide-react";

import type { FansubGroupLinkType } from "@/types/fansub";
import { FormField, IconButton, Input, Select } from "@/components/ui";
import { getFansubLinkTypeLabel } from "@/lib/fansub-labels";
import { createEmptyLink } from "./fansubEditFormMapping";
import { defaultCommunityLinkURL } from "./fansubEditFormatters";
import type { CommunityLinkDraft } from "./fansubEditTypes";

const LINK_TYPE_OPTIONS: FansubGroupLinkType[] = [
  "website",
  "discord",
  "twitter",
  "github",
  "irc",
];

function placeholderForLinkType(linkType: FansubGroupLinkType): string {
  if (linkType === "irc") return "ircs://irc.example.net/#channel";
  if (linkType === "discord") return "https://discord.gg/...";
  return "https://...";
}

type FansubCommunityLinksListProps = {
  styles: Record<string, string>;
  links: CommunityLinkDraft[];
  setLinks: Dispatch<SetStateAction<CommunityLinkDraft[]>>;
  linkErrors: (string | null)[];
  canUpdate?: boolean;
  canManage?: boolean;
};

export function FansubCommunityLinksList({
  styles,
  links,
  setLinks,
  linkErrors,
  canUpdate = true,
  canManage = true,
}: FansubCommunityLinksListProps) {
  return (
    <div className={styles.fansubEditLinksList}>
      {links.map((link, index) => {
        const url = link.url.trim();
        const urlError = linkErrors[index];
        return (
          <div key={link.key} className={styles.fansubEditLinkRow}>
            <FormField label="Typ" htmlFor={`community-link-type-${link.key}`}>
              <Select
                id={`community-link-type-${link.key}`}
                value={link.link_type}
                disabled={link.id == null ? !canManage : !canUpdate}
                onChange={(event) => {
                  const nextType = event.target.value as FansubGroupLinkType;
                  setLinks((current) =>
                    current.map((item) =>
                      item.key === link.key
                        ? {
                            ...item,
                            link_type: nextType,
                            url: item.url.trim()
                              ? item.url
                              : defaultCommunityLinkURL(nextType),
                          }
                        : item,
                    ),
                  );
                }}
              >
                {LINK_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {getFansubLinkTypeLabel(option)}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              label="Name"
              htmlFor={`community-link-name-${link.key}`}
            >
              <Input
                id={`community-link-name-${link.key}`}
                value={link.name}
                disabled={link.id == null ? !canManage : !canUpdate}
                onChange={(event) =>
                  setLinks((current) =>
                    current.map((item) =>
                      item.key === link.key
                        ? {
                            ...item,
                            name: event.target.value,
                          }
                        : item,
                    ),
                  )
                }
                placeholder="Optionaler Anzeigename"
              />
            </FormField>
            <FormField
              label="URL"
              htmlFor={`community-link-url-${link.key}`}
              error={urlError || undefined}
            >
              <div className={styles.fansubEditLinkInput}>
                <Input
                  id={`community-link-url-${link.key}`}
                  value={link.url}
                  disabled={link.id == null ? !canManage : !canUpdate}
                  invalid={Boolean(urlError)}
                  onChange={(event) =>
                    setLinks((current) =>
                      current.map((item) =>
                        item.key === link.key
                          ? {
                              ...item,
                              url: event.target.value,
                            }
                          : item,
                      ),
                    )
                  }
                  placeholder={placeholderForLinkType(link.link_type)}
                />
                {url && !urlError ? (
                  <IconButton
                    type="button"
                    variant="accent"
                    size="sm"
                    aria-label="Link öffnen"
                    onClick={() => window.open(url, "_blank", "noreferrer")}
                    icon={<ExternalLink size={14} />}
                  />
                ) : null}
              </div>
            </FormField>
            {canManage ? (
            <IconButton
              type="button"
              variant="ghost"
              tone="danger"
              size="sm"
              className={styles.fansubEditLinkRemoveButton}
              aria-label="Link entfernen"
              onClick={() =>
                setLinks((current) =>
                  current.length === 1
                    ? [createEmptyLink()]
                    : current.filter((item) => item.key !== link.key),
                )
              }
              icon={<Trash2 size={14} />}
            />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
