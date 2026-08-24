import { redirect } from 'next/navigation'

interface RoleCapabilitiesRedirectPageProps {
  searchParams?: Promise<{ role?: string; tab?: string }>
}

/**
 * D-01/D-08 Nachtrag 2026-08-24 (Sketch 005): "Capabilities" ist kein eigener Admin-Bereich mehr --
 * die Standardrechte-Matrix lebt als zweiter Tab im Rollen-Arbeitsbereich (/admin/roles). Diese Route
 * bleibt NUR als Weiterleitung bestehen, damit gespeicherte Links/Bookmarks mit ?role=<code>
 * weiterhin funktionieren (siehe 138-CONTEXT.md Nachtrag).
 *
 * Nachtrag 2026-08-24 (260824-ike Task 3, Defekt 3): ein vorhandener tab-Parameter wird
 * unveraendert an /admin/roles durchgereicht (manuelles encodeURIComponent je Teil, kein
 * URLSearchParams -- URLSearchParams.toString() wuerde Leerzeichen als "+" statt "%20" kodieren
 * und die bestehenden role-Tests brechen).
 */
export default async function RoleCapabilitiesRedirectPage({
  searchParams,
}: RoleCapabilitiesRedirectPageProps = {}) {
  const resolved = searchParams ? await searchParams : undefined
  const parts: string[] = []
  if (resolved?.role) parts.push(`role=${encodeURIComponent(resolved.role)}`)
  if (resolved?.tab) parts.push(`tab=${encodeURIComponent(resolved.tab)}`)
  redirect(parts.length > 0 ? `/admin/roles?${parts.join('&')}` : '/admin/roles')
}
