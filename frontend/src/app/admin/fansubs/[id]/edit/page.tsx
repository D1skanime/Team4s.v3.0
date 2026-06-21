"use client";

import { useParams } from "next/navigation";

import { readFansubIDFromParams } from "./fansubEditAccess";
import { FansubEditAccessGate } from "./FansubEditAccessGate";
import { FansubEditClient } from "./FansubEditClient";

export default function AdminFansubEditPage() {
  const params = useParams<{ id: string }>();
  const fansubID = readFansubIDFromParams(params);

  return (
    <FansubEditAccessGate fansubID={fansubID}>
      {({ isPlatformAdmin, capabilities }) => (
        <FansubEditClient
          fansubID={fansubID}
          isPlatformAdmin={isPlatformAdmin}
          capabilities={capabilities}
        />
      )}
    </FansubEditAccessGate>
  );
}
