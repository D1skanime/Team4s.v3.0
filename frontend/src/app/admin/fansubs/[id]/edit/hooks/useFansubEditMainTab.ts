"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { FansubGroupCapabilities } from "@/types/fansub";
import {
  canUseMainTab,
  resolveMainTabForAccess,
  visibleMainTabs,
} from "../fansubEditAccess";
import type { MainTab } from "../fansubEditTypes";
import { parseMainTab } from "../mainTabRouting";

type UseFansubEditMainTabArgs = {
  isPlatformAdmin: boolean;
  capabilities: FansubGroupCapabilities | null;
};

export function useFansubEditMainTab({
  isPlatformAdmin,
  capabilities,
}: UseFansubEditMainTabArgs) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mainTabFromQuery = parseMainTab(searchParams.get("tab"));
  const initialMainTab = resolveMainTabForAccess(
    mainTabFromQuery,
    isPlatformAdmin,
    capabilities,
  );
  const [activeMainTab, setActiveMainTab] = useState<MainTab>(initialMainTab);
  const availableMainTabs = useMemo(
    () => visibleMainTabs(isPlatformAdmin, capabilities),
    [capabilities, isPlatformAdmin],
  );

  useEffect(() => {
    const nextTab = resolveMainTabForAccess(
      mainTabFromQuery,
      isPlatformAdmin,
      capabilities,
    );
    // Synchronisiert den aktiven Tab aus der URL; verhaltensgleich zum Vor-Refactor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveMainTab((current) => (current === nextTab ? current : nextTab));
  }, [capabilities, isPlatformAdmin, mainTabFromQuery]);

  const handleMainTabChange = useCallback(
    (tab: MainTab) => {
      if (!canUseMainTab(tab, isPlatformAdmin, capabilities)) return;
      setActiveMainTab(tab);

      const nextSearchParams = new URLSearchParams(searchParams.toString());
      if (tab === "basic") {
        nextSearchParams.delete("tab");
      } else {
        nextSearchParams.set("tab", tab);
      }

      const query = nextSearchParams.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [capabilities, isPlatformAdmin, pathname, router, searchParams],
  );

  return {
    activeMainTab,
    availableMainTabs,
    handleMainTabChange,
  };
}
