"use client";

// DiscoveryReturnLink: reusable "Zurück zur Bibliothek" ghost-link, rendered
// on the Create page, Episodes page, and Edit page whenever a `return`
// query param (originating from the Discovery library flow) is present.
// Renders nothing when no valid return URL is given — no link to nowhere.
//
// SECURITY: `returnURL` is attacker-controllable end-to-end (sourced from a
// `?return=` query string param). It is rendered as a plain <a href> by
// Button (see @/components/ui/Button.tsx), which performs no validation of
// its own. isValidDiscoveryReturnURL() enforces that only relative
// `/admin/`-prefixed paths are ever used as href, closing an open-redirect /
// javascript: XSS vector on an authenticated admin page.

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui";

interface DiscoveryReturnLinkProps {
  returnURL?: string;
}

/**
 * Prueft, ob `url` ein sicherer, relativer Admin-Pfad ist, der als `href`
 * verwendet werden darf. Nur Werte, die exakt mit "/admin/" beginnen, keine
 * protokollrelative "//"-Form sind und kein eingebettetes Schema (z. B.
 * "javascript:") vor dem eigentlichen Pfad enthalten, gelten als gueltig.
 */
export function isValidDiscoveryReturnURL(url: string | undefined | null): boolean {
  if (!url) return false;

  // Reject protocol-relative URLs explicitly (defense in depth — the
  // "/admin/" prefix check below already excludes "//..." forms, since
  // "/admin/" does not start with "//", but an explicit check guards
  // against future changes to the prefix rule).
  if (url.startsWith("//")) return false;

  // Reject anything not starting with the exact relative admin prefix.
  if (!url.startsWith("/admin/")) return false;

  // Reject control characters (newlines, tabs, etc.) anywhere in the value
  // — these can be used to smuggle a scheme past naive prefix checks in
  // some contexts (e.g. "/admin/\njavascript:...").
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f]/.test(url)) return false;

  // Defensive check against embedded-scheme tricks (e.g. "javascript:"
  // appearing later in the string, encoded colons, etc.): a colon must not
  // appear anywhere in the value at all. Legitimate admin paths never need
  // a literal colon.
  if (url.includes(":")) return false;

  // Reject path-traversal segments that could resolve outside of /admin/
  // once the browser normalizes the relative URL (e.g. "/admin/../evil").
  if (url.split("/").includes("..")) return false;

  return true;
}

export function DiscoveryReturnLink({ returnURL }: DiscoveryReturnLinkProps) {
  if (!isValidDiscoveryReturnURL(returnURL)) {
    return null;
  }

  return (
    <Button
      href={returnURL as string}
      variant="ghost"
      size="sm"
      leftIcon={<ArrowLeft size={16} />}
    >
      Zurück zur Bibliothek
    </Button>
  );
}
