import { redirect } from 'next/navigation'

interface AdminAnimeThemesRedirectPageProps {
  params: Promise<{ id: string }>
}

export default async function AdminAnimeThemesRedirectPage({
  params,
}: AdminAnimeThemesRedirectPageProps) {
  const { id } = await params
  redirect(`/admin/anime/${id}/edit`)
}
