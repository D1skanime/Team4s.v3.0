'use client'

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'

import { AchievementArtwork } from '@/components/profile/AchievementArtwork'
import {
  resolveProgressArtworkDescriptor,
} from '@/components/profile/AchievementStages'
import { MemberBadgeChain } from '@/components/profile/MemberBadgeChain'
import { RoleAchievementCard } from '@/components/profile/RoleAchievementCard'
import { getMemberBadgePresentation } from '@/components/profile/memberBadgeLabels'
import {
  Card,
  FocalCarousel,
  PageHeader,
  SectionHeader,
  type FocalCarouselItemState,
} from '@/components/ui'
import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
import {
  RoleCatalogProvider,
} from '@/providers/RoleCatalogProvider'

import styles from './AchievementBadgeShowcase.module.css'
import {
  GalleryFamilyStage,
  NonRoleCompositionCases,
} from './AchievementBadgeNonRoleCases'
import {
  GALLERY_CHAIN_BADGES,
  GALLERY_CHAIN_PROGRESS,
  GALLERY_NON_ROLE_CASES,
  GALLERY_PARTIAL_FAMILIES,
  GALLERY_ROLE_CATALOG_LOADS,
  GALLERY_ROLE_ROWS,
  GALLERY_ROLE_STAGES,
  roleCatalogFixture,
  roleProgressFixture,
} from './achievementBadgeGalleryFixtures'
import playgroundStyles from '../page.module.css'

type AchievementBadgeShowcaseProps = {
  sourceFiles: readonly string[]
}

const NOOP = () => undefined
const STRESS_COUNTS = [100, 200] as const

function roleBadgeCode(roleCode: string, tier: string) {
  return tier === 'entry'
    ? `role_entry_${roleCode}`
    : `role_volume_${roleCode}_${tier}`
}

function roleCardProps(roleCode: string, tier: string) {
  const role = GALLERY_ROLE_ROWS.find((item) => item.code === roleCode)!
  const stage = GALLERY_ROLE_STAGES.find((item) => item.code === tier)!
  return {
    roleCode,
    roleLabel: role.label_de,
    colorKey: role.color_key,
    count: stage.threshold,
    catalogItems: roleCatalogFixture(roleCode),
    progress: roleProgressFixture(roleCode, stage.threshold),
  }
}

function roleState(
  active: boolean,
  expanded: boolean,
): FocalCarouselItemState {
  return { active, expanded, position: 1, total: 1, showAll: NOOP }
}

function RoleCompositionCases() {
  return (
    <div className={styles.caseGrid}>
      {GALLERY_ROLE_ROWS.flatMap((role) =>
        GALLERY_ROLE_STAGES.map((stage) => {
          const badgeCode = roleBadgeCode(role.code, stage.code)
          return (
            <article
              key={badgeCode}
              className={styles.case}
              data-composition-case={badgeCode}
              data-case-kind="role"
            >
              <h3 className={styles.caseTitle}>
                {role.label_de} · {getMemberBadgePresentation(badgeCode).label}
              </h3>
              <RoleAchievementCard
                {...roleCardProps(role.code, stage.code)}
                state={roleState(true, false)}
              />
            </article>
          )
        }),
      )}
    </div>
  )
}

function FamilyStageCases() {
  return (
    <div className={styles.familyGrid}>
      {GALLERY_PARTIAL_FAMILIES.filter((family) => family.group !== 'special').map(
        (family) => (
          <div key={family.key} data-family-stage-case={family.key}>
            <GalleryFamilyStage family={family} />
          </div>
        ),
      )}
    </div>
  )
}

const comparisonProps = roleCardProps('translator', 'gold')

function StateAndContainerCases() {
  return (
    <div className={styles.sectionStack}>
      <div className={styles.stateGrid}>
        {[
          ['active', roleState(true, false)],
          ['inactive', roleState(false, false)],
          ['expanded', roleState(true, true)],
        ].map(([name, state]) => (
          <div
            key={name as string}
            className={styles.comparisonCase}
            data-state-case={name as string}
          >
            <p className={styles.frameLabel}>{name as string}</p>
            <RoleAchievementCard
              {...comparisonProps}
              state={state as FocalCarouselItemState}
            />
          </div>
        ))}
      </div>
      <div className={styles.probeFrame}>
        <p className={styles.frameLabel}>Containerprobe · 390 px Ausgangsbreite</p>
        <div className={styles.containerProbe} data-container-probe="role-stage">
          <RoleAchievementCard
            {...comparisonProps}
            state={roleState(true, false)}
          />
        </div>
      </div>
    </div>
  )
}

type StressItemProps = {
  count: number
  index: number
  onCommit: () => void
}

function StressItem({ count, index, onCommit }: StressItemProps) {
  useLayoutEffect(onCommit)
  const descriptor = resolveProgressArtworkDescriptor('productive_gold')!
  return (
    <Card variant="compact" className={styles.stressItem}>
      <strong>Auszeichnung {index + 1}</strong>
      <AchievementArtwork
        descriptor={descriptor}
        badgeCode="productive_gold"
        alt="Projekt-Veteranenstatus · Gold"
        size="stage"
      />
      <span
        data-stress-item={index}
        data-testid={`stress-item-${count}`}
      >
        Index {index}
      </span>
    </Card>
  )
}

function StressCarousel({ count }: { count: number }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const renderCount = useRef(0)
  const items = useMemo(
    () => Array.from({ length: count }, (_, index) => index),
    [count],
  )
  const onItemCommit = useCallback(() => {
    renderCount.current += 1
    if (rootRef.current) {
      rootRef.current.dataset.renderCount = String(renderCount.current)
    }
  }, [])
  const renderItem = useCallback(
    (index: number) => (
      <StressItem count={count} index={index} onCommit={onItemCommit} />
    ),
    [count, onItemCommit],
  )
  const getItemKey = useCallback((index: number) => index, [])

  useLayoutEffect(() => {
    if (rootRef.current) {
      rootRef.current.dataset.renderCount = String(renderCount.current)
    }
  })

  return (
    <div
      ref={rootRef}
      className={styles.stressRoot}
      data-stress-count={count}
      data-render-count="0"
    >
      <FocalCarousel
        items={items}
        getItemKey={getItemKey}
        renderItem={renderItem}
        regionLabel={`${count}-Elemente-Badge-Stresstest`}
        itemSingularLabel="Auszeichnung"
        itemPluralLabel="Auszeichnungen"
        listLabel={`${count} Auszeichnungen`}
        previousLabel="Vorherige Auszeichnung"
        nextLabel="Nächste Auszeichnung"
        showAllLabel={`Alle ${count} Auszeichnungen anzeigen`}
        showLessLabel="Weniger anzeigen"
        showCounter
      />
    </div>
  )
}

function RawSourceInventory({ sourceFiles }: AchievementBadgeShowcaseProps) {
  return (
    <div className={styles.sourceGrid}>
      {sourceFiles.map((fileName) => (
        <figure
          key={fileName}
          className={styles.sourceCase}
          data-source-case={fileName}
        >
          <ResponsiveImage
            className={styles.sourceArtwork}
            src={`/member-achievement-badges/${encodeURIComponent(fileName)}`}
            alt={`Quellgrafik ${fileName}`}
            width={1254}
            height={1254}
            sizes="1254px"
          />
          <figcaption>{fileName}</figcaption>
        </figure>
      ))}
    </div>
  )
}

function GallerySection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Card
      variant="section"
      className={`${styles.sectionStack} ${styles.gallerySection}`}
    >
      <SectionHeader title={title} description={description} />
      {children}
    </Card>
  )
}

export function AchievementBadgeShowcase({
  sourceFiles,
}: AchievementBadgeShowcaseProps) {
  const galleryRef = useRef<HTMLElement>(null)
  const deterministicSourceFiles = [...sourceFiles].sort((left, right) =>
    left.localeCompare(right),
  )

  useLayoutEffect(() => {
    if (galleryRef.current) galleryRef.current.dataset.galleryReady = 'true'
  }, [])

  return (
    <RoleCatalogProvider loads={GALLERY_ROLE_CATALOG_LOADS}>
      <main
        ref={galleryRef}
        className={playgroundStyles.page}
        data-achievement-gallery
        data-gallery-ready="false"
        data-source-count={deterministicSourceFiles.length}
        data-composition-count={GALLERY_ROLE_ROWS.length * 5 + GALLERY_NON_ROLE_CASES.length}
      >
        <div className={`${playgroundStyles.shell} ${styles.gallery}`}>
          <PageHeader
            eyebrow="Interne Dev-Route"
            title="Erfolgsbadge-Galerie"
            description="Produktive Badge-, Stufen- und Karussell-Kompositionen mit statischen, serverförmigen Testdaten. Diese Galerie definiert weder Rollen noch Schwellenwerte."
          />

          <GallerySection
            title="Rollenkompositionen"
            description="Zwölf Rollen in den fünf produktiven Stufen Einstieg, Bronze, Silber, Gold und Platin."
          >
            <RoleCompositionCases />
          </GallerySection>

          <GallerySection
            title="Weitere produktive Auszeichnungen"
            description="Alle aktuell vom Produktionsresolver aufgelösten Nicht-Rollen-Auszeichnungen als Hero und Stufenmarker."
          >
            <NonRoleCompositionCases />
          </GallerySection>

          <GallerySection
            title="Produktive Familienstufen"
            description="Serverförmige Zwischenstände halten erreichte, aktuelle, gesperrte und auswählbare Vorschau-Stufen gleichzeitig sichtbar."
          >
            <FamilyStageCases />
          </GallerySection>

          <GallerySection
            title="Live MemberBadgeChain"
            description="Zwei echte Ketteninstanzen für gesperrte Stufen und die interaktive Vorschau bereits erreichter Stufen."
          >
            <div data-chain-case="locked">
              <MemberBadgeChain
                earnedBadges={GALLERY_CHAIN_BADGES}
                badgeProgress={GALLERY_CHAIN_PROGRESS}
              />
            </div>
            <div data-chain-case="preview">
              <MemberBadgeChain
                earnedBadges={GALLERY_CHAIN_BADGES}
                badgeProgress={GALLERY_CHAIN_PROGRESS}
              />
            </div>
          </GallerySection>

          <GallerySection
            title="Zustands- und Containervergleich"
            description="Gleiche Rollenprops und gleiche Rahmenbreite für aktiv, inaktiv und aufgeklappt; darunter die unbepolsterte Breitenprobe."
          >
            <StateAndContainerCases />
          </GallerySection>

          <GallerySection
            title="Karussell-Stresstests"
            description="Alle Elemente bleiben im produktiven FocalCarousel gemountet; der Commit-Zähler wird ohne React-State-Schleife am DOM-Marker aktualisiert."
          >
            <div className={styles.stressGrid}>
              {STRESS_COUNTS.map((count) => (
                <StressCarousel key={count} count={count} />
              ))}
            </div>
          </GallerySection>

          <GallerySection
            title="PNG-Quellinventar"
            description="Feste serverseitige Verzeichnisaufnahme aller PNG-Dateien. Veraltete Revisionen bleiben ausschließlich in dieser Quellenprüfung."
          >
            <RawSourceInventory sourceFiles={deterministicSourceFiles} />
          </GallerySection>
        </div>
      </main>
    </RoleCatalogProvider>
  )
}
