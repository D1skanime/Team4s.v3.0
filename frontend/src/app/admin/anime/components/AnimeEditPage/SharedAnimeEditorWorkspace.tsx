import { ReactNode } from 'react'

import { AdminAnimeEditorMode } from '@/types/admin'

import { CreatePageStepper } from '../../create/CreatePageStepper'
import createStyles from '../../create/page.module.css'

interface SharedAnimeEditorWorkspaceProps {
  mode: AdminAnimeEditorMode
  headerTitle: string
  headerIntro: string
  sourceContent: ReactNode
  assetsContent: ReactNode
  detailsContent: ReactNode
  reviewContent: ReactNode
}

const SECTION_COPY: Record<
  AdminAnimeEditorMode,
  {
    sourceTitle: string
    sourceSub: string
    assetsSub: string
    stepSourceLabel: string
    stepSourceSub: string
    stepReviewLabel: string
    stepReviewSub: string
    reviewTitle: string
    reviewSub: string
  }
> = {
  create: {
    sourceTitle: 'Anime finden',
    sourceSub:
      'Suche den Anime in AniSearch und wähle anschliessend den passenden Ordner in Jellyfin aus.',
    assetsSub:
      'Prüfe und ergänze die Assets. Du kannst sie aus Jellyfin übernehmen, manuell hochladen oder online suchen.',
    stepSourceLabel: 'Anime finden',
    stepSourceSub: 'AniSearch & Jellyfin',
    stepReviewLabel: 'Prüfen & Anlegen',
    stepReviewSub: 'Abschliessende Kontrolle',
    reviewTitle: 'Prüfen & Anlegen',
    reviewSub: 'Abschliessende Kontrolle.',
  },
  edit: {
    sourceTitle: 'Quelle & Kontext',
    sourceSub:
      'Bestehende Identität und Quellenkontext bleiben sichtbar. AniSearch kann anreichern, Jellyfin bleibt der neu wählbare Medienkontext.',
    assetsSub:
      'Bestehende Assets und Medienhinweise bleiben in derselben zweiten Arbeitszone sichtbar wie im Create-Flow.',
    stepSourceLabel: 'Quelle & Kontext',
    stepSourceSub: 'AniSearch & Jellyfin',
    stepReviewLabel: 'Prüfen & Speichern',
    stepReviewSub: 'Änderungen sichern',
    reviewTitle: 'Prüfen & Speichern',
    reviewSub: 'Abschliessende Kontrolle vor dem Speichern.',
  },
}

export function SharedAnimeEditorWorkspace({
  mode,
  headerTitle,
  headerIntro,
  sourceContent,
  assetsContent,
  detailsContent,
  reviewContent,
}: SharedAnimeEditorWorkspaceProps) {
  const copy = SECTION_COPY[mode]

  return (
    <div className={createStyles.pageShell}>
      <header className={createStyles.pageHeader}>
        <div className={createStyles.pageTitleBlock}>
          <h1 className={createStyles.pageTitle}>{headerTitle}</h1>
          <p className={createStyles.pageIntro}>{headerIntro}</p>
        </div>
      </header>

      <CreatePageStepper
        activeStep={1}
        steps={[
          { id: 1, label: copy.stepSourceLabel, sub: copy.stepSourceSub },
          { id: 2, label: 'Assets', sub: 'Cover, Banner, Logo & Hintergründe' },
          { id: 3, label: 'Details', sub: 'Infos & Beschreibung' },
          { id: 4, label: copy.stepReviewLabel, sub: copy.stepReviewSub },
        ]}
      />

      <section id="section-1" className={createStyles.pageSection}>
        <div className={createStyles.sectionHeading}>
          <span className={createStyles.sectionNumber}>1</span>
          <div>
            <h2 className={createStyles.sectionTitle}>{copy.sourceTitle}</h2>
            <p className={createStyles.sectionSub}>{copy.sourceSub}</p>
          </div>
        </div>
        {sourceContent}
      </section>

      <section id="section-2" className={createStyles.pageSection}>
        <div className={createStyles.sectionHeading}>
          <span className={createStyles.sectionNumber}>2</span>
          <div>
            <h2 className={createStyles.sectionTitle}>Assets</h2>
            <p className={createStyles.sectionSub}>{copy.assetsSub}</p>
          </div>
        </div>
        {assetsContent}
      </section>

      <section id="section-3" className={createStyles.pageSection}>
        <div className={createStyles.sectionHeading}>
          <span className={createStyles.sectionNumber}>3</span>
          <div>
            <h2 className={createStyles.sectionTitle}>Details</h2>
            <p className={createStyles.sectionSub}>Ergänze die Metadaten und Beschreibung.</p>
          </div>
        </div>
        {detailsContent}
      </section>

      <section id="section-4" className={createStyles.pageSection}>
        <div className={createStyles.sectionHeading}>
          <span className={createStyles.sectionNumber}>4</span>
          <div>
            <h2 className={createStyles.sectionTitle}>{copy.reviewTitle}</h2>
            <p className={createStyles.sectionSub}>{copy.reviewSub}</p>
          </div>
        </div>
        {reviewContent}
      </section>
    </div>
  )
}
