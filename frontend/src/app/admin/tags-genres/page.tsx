import { PlatformAdminGate } from "@/components/auth/PlatformAdminGate";

import { TagsGenresAdminClient } from "./TagsGenresAdminClient";

export const dynamic = "force-dynamic";

export default function AdminTagsGenresPage() {
  return (
    <PlatformAdminGate>
      <main>
        <TagsGenresAdminClient />
      </main>
    </PlatformAdminGate>
  );
}
