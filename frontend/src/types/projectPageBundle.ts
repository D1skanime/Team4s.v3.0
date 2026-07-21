// Spiegelt das Backend-Bundle-DTO handlers.ProjectPageBundle (snake_case JSON-Tags).
// Die beiden Gate-Sektionen (group, anime) sind im Erfolgsfall gesetzt; die fünf
// optionalen Sektionen serialisieren bei partiellem Fehlschlag als null.
//
// Bewusst NICHT im Bundle: assets (Jellyfin + bis zu 500 Releases) und public_profile
// (auf dem kanonischen Pfad bereits vorab geladen). Beide bleiben separate Fetches.

import type { AnimeDetail } from "@/types/anime";
import type { AnimeFansubRelation } from "@/types/fansub";
import type { GroupDetail } from "@/types/group";
import type {
  GroupContributorsResponse,
  GroupReleaseMediaResponse,
  GroupThemesResponse,
  PublicAnimeFansubProjectNote,
} from "@/types/groupContributors";

export interface ProjectPageBundle {
  group: GroupDetail;
  anime: AnimeDetail;
  contributors: GroupContributorsResponse | null;
  themes: GroupThemesResponse | null;
  release_media: GroupReleaseMediaResponse | null;
  project_note: PublicAnimeFansubProjectNote | null;
  anime_fansubs: AnimeFansubRelation[] | null;
}

export interface ProjectPageBundleResponse {
  data: ProjectPageBundle;
}
