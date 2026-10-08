"use client";

import { useEffect, useState } from "react";

import { getFansubByID } from "@/lib/api";
import type { FansubGroup } from "@/types/fansub";
import { errMessage } from "../fansubEditFormatters";

type UseFansubEditGroupLoadArgs = {
  fansubID: number;
  applyGroup: (group: FansubGroup) => void;
  onGroupLoaded: (group: FansubGroup) => void;
  onError: (message: string | null) => void;
};

export function useFansubEditGroupLoad({
  fansubID,
  applyGroup,
  onGroupLoaded,
  onError,
}: UseFansubEditGroupLoadArgs) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(fansubID) || fansubID <= 0) {
      onError("Ungültige Fansub-ID.");
      // Lade-/Fehlerzustand im Fetch-Effekt; verhaltensgleich zum Vor-Refactor.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    getFansubByID(fansubID)
      .then((groupResponse) => {
        if (!active) return;
        const nextGroup = groupResponse.data;
        onGroupLoaded(nextGroup);
        applyGroup(nextGroup);
      })
      .catch((nextError) => {
        if (active) onError(errMessage(nextError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fansubID, applyGroup, onError, onGroupLoaded]);

  return { loading };
}
