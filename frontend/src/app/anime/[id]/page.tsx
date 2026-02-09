import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { AnimeDetail } from '@/components/anime/AnimeDetail';
import { EpisodeList } from '@/components/anime/EpisodeList';
import { RelatedAnime } from '@/components/anime/RelatedAnime';
import { CommentsSection } from '@/components/comments';
import styles from './page.module.css';

interface Props {
  params: { id: string };
}

export default async function AnimeDetailPage({ params }: Props) {
  const id = parseInt(params.id, 10);

  if (isNaN(id)) {
    notFound();
  }

  try {
    // Fetch anime, episodes, relations, rating, and comments in parallel
    const [animeResponse, episodesResponse, relations, rating, comments] = await Promise.all([
      api.getAnime(id),
      api.getEpisodes(id).catch(() => ({ data: [], meta: { total: 0 } })),
      api.getAnimeRelations(id).catch(() => []),
      api.getAnimeRating(id).catch(() => null),
      api.getComments(id, 1, 20).catch(() => null),
    ]);

    const anime = animeResponse.data;
    const episodes = episodesResponse.data;
    const episodesTotal = episodesResponse.meta.total;

    return (
      <main className={styles.main}>
        <div className="container">
          <AnimeDetail anime={anime} rating={rating}>
            <EpisodeList episodes={episodes} total={episodesTotal} />
          </AnimeDetail>
          <RelatedAnime relations={relations} />
          <CommentsSection animeId={id} initialComments={comments} />
        </div>
      </main>
    );
  } catch (error) {
    notFound();
  }
}

export async function generateMetadata({ params }: Props) {
  const id = parseInt(params.id, 10);

  if (isNaN(id)) {
    return { title: 'Anime nicht gefunden' };
  }

  try {
    const { data: anime } = await api.getAnime(id);
    return {
      title: `${anime.title} | Team4s`,
      description: anime.description?.slice(0, 160) || `${anime.title} auf Team4s`,
    };
  } catch {
    return { title: 'Anime nicht gefunden' };
  }
}
