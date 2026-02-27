import { redirect } from 'next/navigation'

interface LegacyAdminAnimeVersionsPageProps {
  params: Promise<{ id: string }>
}

export default async function LegacyAdminAnimeVersionsPage(props: LegacyAdminAnimeVersionsPageProps) {
  const { id } = await props.params
  redirect(`/admin/anime/${id}/episodes`)
}
