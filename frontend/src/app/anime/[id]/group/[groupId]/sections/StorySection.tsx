import { CollapsibleStory } from "@/components/groups/CollapsibleStory";
import { SectionHeader, EmptyState } from "@/components/ui";

import styles from "../page.module.css";

interface StorySectionProps {
  story: string | null | undefined;
  projectNotesHtml: string | null | undefined;
}

export function StorySection({ story, projectNotesHtml }: StorySectionProps) {
  const displayContent = projectNotesHtml || story || null;

  return (
    <div id="story" className={styles.storySection}>
      <SectionHeader title="Projektgeschichte" />
      {displayContent ? (
        <CollapsibleStory content={displayContent} />
      ) : (
        <EmptyState
          variant="compact"
          title="Noch keine Projektgeschichte"
          description="Für dieses Projekt wurde bisher keine Geschichte hinterlegt."
        />
      )}
    </div>
  );
}
