"use client";

import { useEffect, useState } from "react";

import { getFansubAliases, getFansubByID } from "@/lib/api";
import type { FansubAlias, FansubGroup } from "@/types/fansub";
import { errMessage } from "../fansubEditFormatters";

type UseFansubEditGroupLoadArgs = {
  fansubID: number;
  applyGroup: (group: FansubGroup) => void;
  setAliasesFromLoad: (aliases: FansubAlias[]) => void;
  onGroupLoaded: (group: FansubGroup) => void;
  onError: (message: string | null) => void;
};

export function useFansubEditGroupLoad({
  fansubID,
  applyGroup,
  setAliasesFromLoad,
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
    Promise.all([getFansubByID(fansubID), getFansubAliases(fansubID)])
      .then(([groupResponse, aliasResponse]) => {
        if (!active) return;
        const nextGroup = groupResponse.data;
        onGroupLoaded(nextGroup);
        applyGroup(nextGroup);
        setAliasesFromLoad(aliasResponse.data);
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
  }, [fansubID, applyGroup, onError, onGroupLoaded, setAliasesFromLoad]);

  return { loading };
}
