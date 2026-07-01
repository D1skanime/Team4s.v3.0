"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

import { buildFansubLogoFallback } from "@/components/admin/MediaUpload";
import { labelForFansubStatus } from "./fansubEditFormatters";
import { visibleMainTabs } from "./fansubEditAccess";
import type { FansubGroupCapabilities } from "@/types/fansub";
import type { FormState, MainTab } from "./fansubEditTypes";

type FansubEditHeaderCardProps = {
  styles: Record<string, string>;
  form: FormState;
  isPlatformAdmin: boolean;
  capabilities: FansubGroupCapabilities | null;
  bannerPreviewURL: string | null;
  logoPreviewURL: string | null;
  activeMainTab: MainTab;
  availableMainTabs: ReturnType<typeof visibleMainTabs>;
  onMainTabChange: (tab: MainTab) => void;
};

export function FansubEditHeaderCard({
  styles,
  form,
  isPlatformAdmin,
  bannerPreviewURL,
  logoPreviewURL,
  activeMainTab,
  availableMainTabs,
  onMainTabChange,
}: FansubEditHeaderCardProps) {
  const logoFallback = buildFansubLogoFallback(form.name);
  const tabRowRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const activeButton = tabRowRef.current?.querySelector<HTMLButtonElement>(
      '[data-active-tab="true"]',
    );
    if (!activeButton || typeof activeButton.scrollIntoView !== "function") {
      return;
    }
    activeButton.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeMainTab]);

  return (
    <header className={styles.fansubEditHeaderCard}>
      <div className={styles.fansubEditBannerShell}>
        {bannerPreviewURL ? (
          <div className={styles.fansubEditBannerImage}>
            <Image
              src={bannerPreviewURL}
              alt=""
              className={styles.fansubEditBannerImageElement}
              width={1200}
              height={220}
              unoptimized
            />
          </div>
        ) : (
          <div className={styles.fansubEditBannerPlaceholder}>
            Kein Banner vorhanden
          </div>
        )}
      </div>
      <div className={styles.fansubEditProfileRow}>
        <div className={styles.fansubEditLogoBadge}>
          {logoPreviewURL ? (
            <Image
              src={logoPreviewURL}
              alt={`${form.name.trim() || "Fansub"} Logo`}
              className={styles.fansubEditLogoImage}
              width={78}
              height={78}
              unoptimized
            />
          ) : (
            <span
              style={{
                backgroundColor: logoFallback.background,
                color: logoFallback.color,
              }}
            >
              {logoFallback.initials}
            </span>
          )}
        </div>
        <div className={styles.fansubEditIdentity}>
          <div className={styles.fansubEditIdentityTop}>
            <h1 className={styles.title}>
              {form.name.trim() || "Fansub bearbeiten"}
            </h1>
            <span
              className={`${styles.fansubEditStatusBadge} ${form.status === "active" ? styles.fansubEditStatusActive : form.status === "inactive" ? styles.fansubEditStatusInactive : styles.fansubEditStatusDissolved}`}
            >
              {labelForFansubStatus(form.status)}
            </span>
          </div>
          {isPlatformAdmin ? (
            <p className={styles.fansubEditUrlPreview}>
              /fansubs/{form.slug.trim() || "slug"}
            </p>
          ) : null}
        </div>
      </div>
      <nav
        ref={tabRowRef}
        className={styles.fansubEditMainTabRow}
        aria-label="Fansub Bearbeitungsbereiche"
      >
        {availableMainTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            data-active-tab={activeMainTab === tab.key ? "true" : undefined}
            className={`${styles.fansubEditMainTabButton} ${activeMainTab === tab.key ? styles.fansubEditMainTabButtonActive : ""}`}
            onClick={() => onMainTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
