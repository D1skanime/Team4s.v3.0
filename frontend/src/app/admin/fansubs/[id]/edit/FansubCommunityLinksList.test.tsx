// @vitest-environment jsdom

import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FansubCommunityLinksList } from "./FansubCommunityLinksList";
import type { CommunityLinkDraft } from "./fansubEditTypes";

const styles = {
  fansubEditLinksList: "fansubEditLinksList",
  fansubEditLinkRow: "fansubEditLinkRow",
  fansubEditLinkInput: "fansubEditLinkInput",
  fansubEditLinkRemoveButton: "fansubEditLinkRemoveButton",
};

function Harness() {
  const [links, setLinks] = useState<CommunityLinkDraft[]>([
    {
      key: "new-link",
      id: null,
      link_type: "website",
      name: "",
      url: "",
    },
  ]);

  return (
    <FansubCommunityLinksList
      styles={styles}
      links={links}
      setLinks={setLinks}
      linkErrors={[null]}
    />
  );
}

describe("FansubCommunityLinksList", () => {
  it("füllt bei Discord-Auswahl den Invite-Prefix vor", () => {
    render(<Harness />);

    fireEvent.change(screen.getByLabelText("Typ"), {
      target: { value: "discord" },
    });

    expect((screen.getByLabelText("URL") as HTMLInputElement).value).toBe(
      "https://discord.gg/",
    );
  });
  it("zeigt URL-Feld und Löschaktion gemeinsam", () => { render(<Harness />); expect(screen.getByLabelText("URL")).toBeTruthy(); expect(screen.getByRole("button", { name: "Link entfernen" })).toBeTruthy(); });
});
