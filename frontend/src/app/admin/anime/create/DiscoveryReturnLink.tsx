"use client";

// DiscoveryReturnLink: reusable "Zurück zur Bibliothek" ghost-link, rendered
// on the Create page, Episodes page, and Edit page whenever a `return`
// query param (originating from the Discovery library flow) is present.
// Renders nothing when no valid return URL is given — no link to nowhere.

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui";

interface DiscoveryReturnLinkProps {
  returnURL?: string;
}

export function DiscoveryReturnLink({ returnURL }: DiscoveryReturnLinkProps) {
  if (!returnURL) {
    return null;
  }

  return (
    <Button
      href={returnURL}
      variant="ghost"
      size="sm"
      leftIcon={<ArrowLeft size={16} />}
    >
      Zurück zur Bibliothek
    </Button>
  );
}
