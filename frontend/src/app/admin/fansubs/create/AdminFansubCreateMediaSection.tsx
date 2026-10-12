// Logo/banner media-upload section, extracted verbatim from
// AdminFansubCreateContent (174-14, D-14). Props-driven, presentational;
// media state stays owned by the page component.

import { Dispatch, SetStateAction } from "react";

import { EditableMediaValue, MediaUpload } from "@/components/admin/MediaUpload";
import { FansubGroup } from "@/types/fansub";

import sharedStyles from "../../admin.module.css";
import fansubEditStyles from "../[id]/edit/FansubEdit.module.css";

const styles = { ...sharedStyles, ...fansubEditStyles };

interface AdminFansubCreateMediaSectionProps {
  createdGroup: FansubGroup | null;
  formName: string;
  hasRuntimeAuthToken: boolean;
  saving: boolean;
  logoMedia: EditableMediaValue | null;
  setLogoMedia: Dispatch<SetStateAction<EditableMediaValue | null>>;
  setInitialLogoMedia: Dispatch<SetStateAction<EditableMediaValue | null>>;
  bannerMedia: EditableMediaValue | null;
  setBannerMedia: Dispatch<SetStateAction<EditableMediaValue | null>>;
  setInitialBannerMedia: Dispatch<SetStateAction<EditableMediaValue | null>>;
  setMediaBusy: Dispatch<SetStateAction<Record<"logo" | "banner", boolean>>>;
  setToast: Dispatch<SetStateAction<string | null>>;
}

export function AdminFansubCreateMediaSection({
  createdGroup,
  formName,
  hasRuntimeAuthToken,
  saving,
  logoMedia,
  setLogoMedia,
  setInitialLogoMedia,
  bannerMedia,
  setBannerMedia,
  setInitialBannerMedia,
  setMediaBusy,
  setToast,
}: AdminFansubCreateMediaSectionProps) {
  return (
    <details className={styles.fansubEditSection} open>
      <summary className={styles.fansubEditSectionSummary}>Logo und Banner</summary>
      <div className={styles.fansubEditSectionBody}>
        {createdGroup ? (
          <div className={styles.fansubEditMediaGrid}>
            <MediaUpload
              type="logo"
              fansubID={createdGroup.id}
              value={logoMedia}
              disabled={!hasRuntimeAuthToken || saving}
              onBusyChange={(isBusy) =>
                setMediaBusy((current) =>
                  current.logo === isBusy ? current : { ...current, logo: isBusy },
                )
              }
              onChange={(nextValue) => {
                setLogoMedia(nextValue);
                setInitialLogoMedia(nextValue);
                setToast(
                  nextValue?.publicURL
                    ? "Logo aktualisiert."
                    : "Logo entfernt.",
                );
              }}
            />
            <MediaUpload
              type="banner"
              fansubID={createdGroup.id}
              value={bannerMedia}
              disabled={!hasRuntimeAuthToken || saving}
              onBusyChange={(isBusy) =>
                setMediaBusy((current) =>
                  current.banner === isBusy ? current : { ...current, banner: isBusy },
                )
              }
              onChange={(nextValue) => {
                setBannerMedia(nextValue);
                setInitialBannerMedia(nextValue);
                setToast(
                  nextValue?.publicURL
                    ? "Banner aktualisiert."
                    : "Banner entfernt.",
                );
              }}
            />
          </div>
        ) : (
          <p className={styles.fansubEditHint}>
            Logo und Banner laufen hier ueber denselben DB-/Media-Asset-Flow
            wie im Edit-Screen. Nach dem ersten Speichern wird der Upload
            direkt in dieser Ansicht freigeschaltet.
          </p>
        )}
      </div>
    </details>
  );
}
