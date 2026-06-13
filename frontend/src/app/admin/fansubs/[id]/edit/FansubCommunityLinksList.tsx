"use client";

import { type Dispatch, type SetStateAction } from "react";
import { ExternalLink, Trash2 } from "lucide-react";

import type { FansubGroupLinkType } from "@/types/fansub";
import { Button, FormField, Input, Select } from "@/components/ui";
import { createEmptyLink } from "./fansubEditFormMapping";
import type { CommunityLinkDraft } from "./fansubEditTypes";

const LINK_TYPE_OPTIONS: FansubGroupLinkType[] = [
  "website",
  "discord",
  "twitter",
  "github",
  "irc",
];

type FansubCommunityLinksListProps = {
  styles: Record<string, string>;
  links: CommunityLinkDraft[];
  setLinks: Dispatch<SetStateAction<CommunityLinkDraft[]>>;
  linkErrors: (string | null)[];
};

export function FansubCommunityLinksList({
  styles,
  links,
  setLinks,
  linkErrors,
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
              </Select>
            </FormField>
            <FormField
              label="Name"
              htmlFor={`community-link-name-${link.key}`}
            >
              <Input
                id={`community-link-name-${link.key}`}
                value={link.name}
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
                  placeholder="https://..."
                />
                {url && !urlError ? (
                  <Button
                    type="button"
                    variant="subtle"
                    size="sm"
                    iconOnly
                    aria-label="Link öffnen"
                    onClick={() => window.open(url, "_blank", "noreferrer")}
                    leftIcon={<ExternalLink size={14} />}
                  />
                ) : null}
              </div>
            </FormField>
            <Button
              type="button"
              variant="danger"
              size="sm"
              iconOnly
              className={styles.fansubEditLinkRemoveButton}
              aria-label="Link entfernen"
              onClick={() =>
                setLinks((current) =>
                  current.length === 1
                    ? [createEmptyLink()]
                    : current.filter((item) => item.key !== link.key),
                )
              }
              leftIcon={<Trash2 size={14} />}
            />
          </div>
        );
      })}
    </div>
  );
}
