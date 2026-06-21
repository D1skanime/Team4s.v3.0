"use client";

import { useCallback, useEffect, useState } from "react";

import type { SectionKey } from "../fansubEditTypes";

const DEFAULT_OPEN_SECTIONS: Record<SectionKey, boolean> = {
  basic: true,
  media: true,
  links: true,
  collaboration: true,
  releases: true,
  notes: true,
  mitglieder: true,
  claims: true,
  vorschlaege: true,
  readiness: true,
};

export function useFansubEditMobileSections() {
  const [isMobile, setIsMobile] = useState(false);
  const [openSections, setOpenSections] = useState(DEFAULT_OPEN_SECTIONS);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const onChange = () => setIsMobile(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const isSectionOpen = useCallback(
    (section: SectionKey): boolean =>
      isMobile ? openSections[section] : true,
    [isMobile, openSections],
  );

  const onSectionToggle = useCallback(
    (section: SectionKey, open: boolean) => {
      if (!isMobile) return;
      setOpenSections((current) => ({ ...current, [section]: open }));
    },
    [isMobile],
  );

  return {
    isSectionOpen,
    onSectionToggle,
  };
}
