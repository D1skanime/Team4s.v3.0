"use client";

import Link from "next/link";
import { Info } from "lucide-react";
import { PlatformAdminGate } from "@/components/auth/PlatformAdminGate";
import { EmptyState, Input } from "@/components/ui";
import { GroupRowCard } from "./MergeWizardCards";
import { MergeWizardPreviewStep } from "./MergeWizardPreviewStep";
import { MergeWizardProgress } from "./MergeWizardProgress";
import {
  useMergeFansubsWizard,
  type SortMode,
  type StatusFilter,
} from "./useMergeFansubsWizard";
import { mergeCssModules } from "@/lib/mergeCssModules";
import sharedStyles from "../../admin.module.css";
import mergeStyles from "./MergeWizard.module.css";

const styles = mergeCssModules(mergeStyles, sharedStyles);

function MergeFansubsContent() {
  const {
    loading,
    error,
    success,
    fetchLimitReached,
    targetID,
    sourceIDs,
    selectionReady,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortMode,
    setSortMode,
    currentStep,
    preview,
    previewLoading,
    merging,
    confirmDelete,
    setConfirmDelete,
    slugConfirmation,
    setSlugConfirmation,
    filteredGroups,
    targetGroup,
    selectedSourceGroups,
    sourceCandidates,
    sourceSummary,
    targetSummary,
    hasPreviewConflicts,
    loadPreview,
    handleMerge,
    chooseTarget,
    toggleSource,
    selectAllFilteredSources,
    clearSourceSelection,
    isStepEnabled,
    goToStep,
    goBack,
    goNext,
    canGoNext,
    mergeButtonDisabled,
  } = useMergeFansubsWizard();

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.panel}>Lade Merge-Wizard...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <p className={styles.breadcrumb}>
        <Link href="/admin">Admin</Link> |{" "}
        <Link href="/admin/fansubs">Fansub Verwaltung</Link>
      </p>

      <h1>Fansub Merge Wizard</h1>
      <p>
        Geführtes Zusammenführen mit Vorschau, Konflikt-Transparenz und
        Safety-Checks.
      </p>

      {error && <div className={styles.errorBox}>{error}</div>}
      {success && <div className={styles.successBox}>{success}</div>}

      <MergeWizardProgress
        currentStep={currentStep}
        merging={merging}
        isStepEnabled={isStepEnabled}
        onGoToStep={goToStep}
      />

      <div className={styles.panel}>
        {fetchLimitReached ? (
          <EmptyState
            variant="info"
            icon={<Info size={20} strokeWidth={2} />}
            title="Abrufgrenze erreicht"
            description="Es werden die ersten 500 Einträge angezeigt – bitte die Suche eingrenzen."
          />
        ) : null}
        <div className={styles.mergeFilterRow}>
          <div className={styles.field}>
            <label htmlFor="merge-search">Suche</label>
            <Input
              id="merge-search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Name, Slug oder Tag..."
              disabled={merging}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="merge-status-filter">Status</label>
            <select
              id="merge-status-filter"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              disabled={merging}
            >
              <option value="all">Alle Status</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
              <option value="dissolved">Aufgelöst</option>
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="merge-sort">Sortierung</label>
            <select
              id="merge-sort"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              disabled={merging}
            >
              <option value="name">Name</option>
              <option value="related">Most related</option>
            </select>
          </div>
        </div>
        <p className={styles.hint}>
          {filteredGroups.length} Treffer | Zielgruppe:{" "}
          {targetGroup
            ? `${targetGroup.name} (${targetGroup.slug})`
            : "nicht gesetzt"}{" "}
          | Quellen: {selectedSourceGroups.length}
        </p>
      </div>

      {targetGroup && (
        <div className={`${styles.panel} ${styles.mergeSelectedTargetCard}`}>
          <h2>Ausgewählte Zielgruppe</h2>
          <GroupRowCard group={targetGroup} selectedAs="target" />
        </div>
      )}

      {currentStep === 1 && (
        <div className={styles.panel}>
          <h2>1. Zielgruppe wählen</h2>
          <p>
            Diese Gruppe bleibt bestehen und erhält Daten aus den Quellgruppen.
          </p>
          <div className={styles.mergeGroupList}>
            {filteredGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                className={`${styles.mergeGroupCard} ${targetID === group.id ? styles.mergeGroupCardTarget : ""}`}
                onClick={() => chooseTarget(group.id)}
                disabled={merging}
              >
                <div className={styles.mergeGroupCardSelect}>
                  <input
                    type="radio"
                    name="merge-target"
                    checked={targetID === group.id}
                    onChange={() => chooseTarget(group.id)}
                    aria-label={`Zielgruppe ${group.name}`}
                  />
                </div>
                <GroupRowCard
                  group={group}
                  selectedAs={targetID === group.id ? "target" : null}
                />
              </button>
            ))}
            {filteredGroups.length === 0 && (
              <p className={styles.hint}>
                Keine Gruppen für diese Filter gefunden.
              </p>
            )}
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className={styles.panel}>
          <h2>2. Quellgruppen wählen</h2>
          <p>Quellen werden in die Zielgruppe migriert und danach gelöscht.</p>

          <div className={styles.actions}>
            <button
              className={styles.buttonSecondary}
              type="button"
              onClick={selectAllFilteredSources}
              disabled={merging || sourceCandidates.length === 0}
            >
              Alle Treffer wählen
            </button>
            <button
              className={styles.buttonSecondary}
              type="button"
              onClick={clearSourceSelection}
              disabled={merging || sourceIDs.size === 0}
            >
              Auswahl löschen
            </button>
          </div>

          <div className={styles.mergeSourceLayout}>
            <div className={styles.mergeGroupList}>
              {filteredGroups.map((group) => {
                const isTarget = group.id === targetID;
                const checked = sourceIDs.has(group.id);
                return (
                  <label
                    key={group.id}
                    className={`${styles.mergeGroupCard} ${checked ? styles.mergeGroupCardSource : ""} ${isTarget ? styles.mergeGroupCardDisabled : ""}`}
                  >
                    <div className={styles.mergeGroupCardSelect}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isTarget || merging}
                        onChange={() => toggleSource(group.id)}
                        aria-label={`Quellgruppe ${group.name}`}
                      />
                    </div>
                    <GroupRowCard
                      group={group}
                      selectedAs={checked ? "source" : null}
                    />
                    {isTarget && (
                      <p className={styles.mergeInlineHint}>
                        Zielgruppe kann nicht als Quelle gewählt werden.
                      </p>
                    )}
                  </label>
                );
              })}
              {filteredGroups.length === 0 && (
                <p className={styles.hint}>
                  Keine Gruppen für diese Filter gefunden.
                </p>
              )}
            </div>

            <aside className={styles.mergeComparePanel}>
              <h3>Vergleich</h3>
              <p className={styles.hint}>Ziel vs ausgewählte Quellen</p>
              <dl className={styles.mergeCompareList}>
                <dt>Zielgruppe</dt>
                <dd>
                  {targetGroup
                    ? `${targetGroup.name} (${targetGroup.slug})`
                    : "nicht gesetzt"}
                </dd>
                <dt>Quellgruppen</dt>
                <dd>{selectedSourceGroups.length}</dd>
                <dt>Anime-Zuordnungen</dt>
                <dd>
                  {targetSummary.animeRelations} -&gt; +
                  {sourceSummary.animeRelations}
                </dd>
                <dt>Episoden-Versionen</dt>
                <dd>
                  {targetSummary.episodeVersions} -&gt; +
                  {sourceSummary.episodeVersions}
                </dd>
                <dt>Mitglieder</dt>
                <dd>
                  {targetSummary.members} -&gt; +{sourceSummary.members}
                </dd>
                <dt>Aliases/Tags</dt>
                <dd>
                  {targetSummary.aliases} -&gt; +{sourceSummary.aliases}
                </dd>
              </dl>
            </aside>
          </div>
        </div>
      )}

      {currentStep === 3 && (
        <MergeWizardPreviewStep
          targetGroup={targetGroup}
          selectedSourceGroups={selectedSourceGroups}
          preview={preview}
          previewLoading={previewLoading}
          merging={merging}
          selectionReady={selectionReady}
          hasPreviewConflicts={hasPreviewConflicts}
          onReloadPreview={() => void loadPreview()}
        />
      )}

      {currentStep === 4 && (
        <div className={styles.panel}>
          <h2>4. Bestätigen & zusammenführen</h2>
          <p>
            Danger Zone: Quellgruppen werden nach dem Merge dauerhaft gelöscht.
          </p>

          {selectedSourceGroups.length > 0 && (
            <div className={styles.mergeDangerBox}>
              <h3>Quellgruppen werden gelöscht</h3>
              <ul className={styles.mergeCompactList}>
                {selectedSourceGroups.map((group) => (
                  <li key={group.id}>
                    {group.name} ({group.slug})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!preview && (
            <p className={styles.hintWarning}>
              Keine Vorschau geladen. Gehe zurück zu Schritt 3.
            </p>
          )}

          {preview && !preview.can_merge && (
            <p className={styles.hintWarning}>
              Der Merge ist aktuell blockiert. Bitte Konflikte in der Vorschau
              prüfen (insbesondere Episode-Version Konflikte).
            </p>
          )}

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={confirmDelete}
              onChange={(event) => setConfirmDelete(event.target.checked)}
              disabled={merging}
            />
            Ich bestätige, dass die Quellgruppen gelöscht werden.
          </label>

          <div className={styles.field}>
            <label htmlFor="merge-slug-confirm">
              Zur Sicherheit Ziel-Slug eingeben
            </label>
            <input
              id="merge-slug-confirm"
              type="text"
              value={slugConfirmation}
              placeholder={targetGroup?.slug ?? ""}
              onChange={(event) => setSlugConfirmation(event.target.value)}
              disabled={merging || !targetGroup}
            />
            {targetGroup && (
              <p className={styles.hint}>
                Erwartet: <strong>{targetGroup.slug}</strong>
              </p>
            )}
          </div>
        </div>
      )}

      <div className={styles.mergeWizardFooter}>
        <div className={styles.mergeWizardFooterLeft}>
          <Link href="/admin/fansubs" className={styles.buttonSecondary}>
            Abbrechen
          </Link>
        </div>
        <div className={styles.mergeWizardFooterActions}>
          <button
            className={styles.buttonSecondary}
            type="button"
            onClick={goBack}
            disabled={currentStep === 1 || merging}
          >
            Zurück
          </button>
          {currentStep < 4 ? (
            <button
              className={styles.button}
              type="button"
              onClick={goNext}
              disabled={!canGoNext || merging}
            >
              {currentStep === 2
                ? "Zur Vorschau"
                : currentStep === 3
                  ? "Zur Bestätigung"
                  : "Weiter"}
            </button>
          ) : (
            <button
              className={`${styles.button} ${styles.buttonDanger}`}
              type="button"
              onClick={() => void handleMerge()}
              disabled={mergeButtonDisabled}
            >
              {merging ? "Führe zusammen..." : "Zusammenführen"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MergeFansubsPage() {
  return (
    <PlatformAdminGate>
      <MergeFansubsContent />
    </PlatformAdminGate>
  );
}
