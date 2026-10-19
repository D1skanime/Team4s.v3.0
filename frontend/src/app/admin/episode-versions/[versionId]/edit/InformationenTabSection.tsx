import type { Dispatch, SetStateAction } from "react";

import type { EpisodeVersionEditorContext } from "@/types/episodeVersion";
import type { AnimeFansubProjectTimeline } from "@/types/fansubNotes";
import type { FansubGroup, FansubGroupSummary } from "@/types/fansub";

import { ReleaseVersionMetadataFields } from "./ReleaseVersionMetadataFields";
import { EpisodeClassificationSection } from "./EpisodeClassificationSection";
import { FansubGroupsSection } from "./FansubGroupsSection";
import type { FormState } from "./episodeVersionEditorUtils";
import styles from "./EpisodeVersionEditor.module.css";

interface InformationenTabSectionProps {
  context: EpisodeVersionEditorContext;
  formState: FormState;
  setFormState: Dispatch<SetStateAction<FormState>>;
  projectTimeline: AnimeFansubProjectTimeline | null;
  isPlatformAdmin: boolean;
  folderPath: string;
  groupQuery: string;
  setGroupQuery: (value: string) => void;
  isSearching: boolean;
  searchMessage: string | null;
  groupResults: FansubGroup[];
  selectedGroups: FansubGroupSummary[];
  addGroup: (group: FansubGroup) => void;
  removeGroup: (groupID: number) => void;
}

export function InformationenTabSection({
  context,
  formState,
  setFormState,
  projectTimeline,
  isPlatformAdmin,
  folderPath,
  groupQuery,
  setGroupQuery,
  isSearching,
  searchMessage,
  groupResults,
  selectedGroups,
  addGroup,
  removeGroup,
}: InformationenTabSectionProps) {
  return (
    <>
      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Basisdaten</h2>
            <p className={styles.helperText}>
              Release-Metadaten für diese Version.
            </p>
          </div>
        </div>
        <ReleaseVersionMetadataFields
          context={context}
          selectedGroupIds={selectedGroups.map((group) => group.id)}
          formState={formState}
          setFormState={setFormState}
          projectTimeline={projectTimeline}
        />
      </section>

      {isPlatformAdmin && context.episode ? (
        <EpisodeClassificationSection
          key={context.episode.episode_id}
          classification={context.episode}
        />
      ) : null}

      {isPlatformAdmin ? (
        <>
          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Speicherort</h2>
                <p className={styles.helperText}>
                  Der verknüpfte Anime-Ordner zur Plausibilitätsprüfung.
                </p>
              </div>
            </div>
            <label className={styles.field}>
              <span>Anime Folder Path</span>
              <input value={folderPath || "nicht verfügbar"} readOnly />
            </label>
          </section>

          <FansubGroupsSection
            groupQuery={groupQuery}
            setGroupQuery={setGroupQuery}
            isSearching={isSearching}
            searchMessage={searchMessage}
            groupResults={groupResults}
            selectedGroups={selectedGroups}
            addGroup={addGroup}
            removeGroup={removeGroup}
          />
        </>
      ) : null}
    </>
  );
}
