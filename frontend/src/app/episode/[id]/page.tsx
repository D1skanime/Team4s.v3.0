import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { EpisodeDetail } from '@/components/episode';
import styles from './page.module.css';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;

  try {
    const response = await api.getEpisode(parseInt(id, 10));
    const episode = response.data;

    return {
      title: `Episode ${episode.episode_number}${episode.title ? `: ${episode.title}` : ''} - ${episode.anime.title} | Team4s`,
      description: `Schau Episode ${episode.episode_number} von ${episode.anime.title} auf Team4s`,
    };
  } catch {
    return {
      title: 'Episode nicht gefunden | Team4s',
    };
  }
}

export default async function EpisodePage({ params }: Props) {
  const { id } = await params;
  const episodeId = parseInt(id, 10);

  if (isNaN(episodeId)) {
    notFound();
  }

  try {
    const response = await api.getEpisode(episodeId);
    return (
      <main className={styles.main}>
        <EpisodeDetail episode={response.data} />
      </main>
    );
  } catch {
    notFound();
  }
}
