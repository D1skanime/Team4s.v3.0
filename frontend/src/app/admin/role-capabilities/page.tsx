import { redirect } from 'next/navigation'

interface RoleCapabilitiesRedirectPageProps {
  searchParams?: Promise<{ role?: string }>
}

/**
 * D-01/D-08 Nachtrag 2026-08-24 (Sketch 005): "Capabilities" ist kein eigener Admin-Bereich mehr --
 * die Standardrechte-Matrix lebt als zweiter Tab im Rollen-Arbeitsbereich (/admin/roles). Diese Route
 * bleibt NUR als Weiterleitung bestehen, damit gespeicherte Links/Bookmarks mit ?role=<code>
 * weiterhin funktionieren (siehe 138-CONTEXT.md Nachtrag).
 */
export default async function RoleCapabilitiesRedirectPage({
  searchParams,
}: RoleCapabilitiesRedirectPageProps = {}) {
  const resolved = searchParams ? await searchParams : undefined
  const role = resolved?.role
  redirect(role ? `/admin/roles?role=${encodeURIComponent(role)}` : '/admin/roles')
}
