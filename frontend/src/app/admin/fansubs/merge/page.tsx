"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getFansubList,
  getRuntimeAuthToken,
  mergeFansubs,
  mergeFansubsPreview,
} from "@/lib/api";
import { FansubGroup, MergeFansubsPreviewResult } from "@/types/fansub";
import sharedStyles from "../../admin.module.css";
import mergeStyles from "./MergeWizard.module.css";

const styles = { ...sharedStyles, ...mergeStyles };

type WizardStep = 1 | 2 | 3 | 4;
type SortMode = "name" | "related";
type StatusFilter = "all" | "active" | "inactive" | "dissolved";
type TypeFilter = "all" | "group" | "collaboration";

interface CountSummary {
  animeRelations: number;
  episodeVersions: number;
  members: number;
  aliases: number;
}

const WIZARD_STEPS: Array<{ id: WizardStep; title: string }> = [
  { id: 1, title: "Zielgruppe waehlen" },
  { id: 2, title: "Quellgruppen waehlen" },
  { id: 3, title: "Vorschau pruefen" },
  { id: 4, title: "Bestaetigen & zusammenfuehren" },
];

export default function MergeFansubsPage() {
  const router = useRouter();
  const [authToken] = useState(() => getRuntimeAuthToken());

  const [groups, setGroups] = useState<FansubGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [targetID, setTargetID] = useState<number | null>(null);
  const [sourceIDs, setSourceIDs] = useState<Set<number>>(new Set());

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("name");

  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [preview, setPreview] = useState<MergeFansubsPreviewResult | null>(
    null,
  );
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewKey, setPreviewKey] = useState("");
  const [merging, setMerging] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [slugConfirmation, setSlugConfirmation] = useState("");

  useEffect(() => {
    void loadGroups();
  }, []);

  async function loadGroups() {
    try {
      setLoading(true);
      setError(null);
      const response = await getFansubList({ per_page: 500 });
      setGroups(response.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Fehler beim Laden der Gruppen",
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    function relevanceScore(group: FansubGroup): number {
      if (!query) return 0;
      const name = group.name.toLowerCase();
      const slug = group.slug.toLowerCase();
      if (name === query || slug === query) return 120;
      if (name.startsWith(query)) return 90;
      if (slug.startsWith(query)) return 80;
      if (name.includes(query)) return 55;
      if (slug.includes(query)) return 45;
      return 0;
    }

    return groups
      .filter((group) => {
        if (query) {
          const inName = group.name.toLowerCase().includes(query);
          const inSlug = group.slug.toLowerCase().includes(query);
          if (!inName && !inSlug) return false;
        }
        if (statusFilter !== "all" && group.status !== statusFilter)
          return false;
        if (typeFilter !== "all" && group.group_type !== typeFilter)
          return false;
        return true;
      })
      .sort((a, b) => {
        if (sortMode === "related") {
          const scoreDiff = relevanceScore(b) - relevanceScore(a);
          if (scoreDiff !== 0) return scoreDiff;
        }
        return a.name.localeCompare(b.name, "de", { sensitivity: "base" });
      });
  }, [groups, searchQuery, sortMode, statusFilter, typeFilter]);

  const selectionReady = targetID !== null && sourceIDs.size > 0;
  const selectionKey = useMemo(() => {
    const sourcePart = Array.from(sourceIDs)
      .sort((a, b) => a - b)
      .join(",");
    return `${targetID ?? 0}:${sourcePart}`;
  }, [sourceIDs, targetID]);

  const targetGroup = targetID
    ? (groups.find((group) => group.id === targetID) ?? null)
    : null;
  const selectedSourceGroups = useMemo(
    () => groups.filter((group) => sourceIDs.has(group.id)),
    [groups, sourceIDs],
  );
  const sourceCandidates = useMemo(
    () => filteredGroups.filter((group) => group.id !== targetID),
    [filteredGroups, targetID],
  );

  const sourceSummary = useMemo(
    () => sumGroupCounts(selectedSourceGroups),
    [selectedSourceGroups],
  );
  const targetSummary = useMemo(
    () => (targetGroup ? sumGroupCounts([targetGroup]) : emptyCountSummary()),
    [targetGroup],
  );

  const hasPreviewConflicts = Boolean(
    preview &&
    (preview.conflicts.version_conflicts > 0 ||
      preview.conflicts.duplicate_aliases_count > 0 ||
      preview.conflicts.duplicate_members_count > 0 ||
      preview.conflicts.duplicate_relations_count > 0 ||
      preview.conflicts.duplicate_slugs_count > 0 ||
      preview.conflicts.duplicate_names_count > 0),
  );

  useEffect(() => {
    setPreview(null);
    setPreviewKey("");
    setConfirmDelete(false);
    setSlugConfirmation("");
  }, [selectionKey]);

  useEffect(() => {
    if (!selectionReady && currentStep > 2) {
      setCurrentStep(2);
    }
  }, [currentStep, selectionReady]);

  const loadPreview = useCallback(async () => {
    if (!targetID || sourceIDs.size === 0) return;

    try {
      setPreviewLoading(true);
      setError(null);
      const response = await mergeFansubsPreview(
        { target_id: targetID, source_ids: Array.from(sourceIDs) },
        authToken || undefined,
      );
      setPreview(response.data);
      setPreviewKey(selectionKey);
    } catch (err) {
      setPreview(null);
      setPreviewKey("");
      setError(
        err instanceof Error ? err.message : "Fehler bei der Merge-Vorschau",
      );
    } finally {
      setPreviewLoading(false);
    }
  }, [authToken, selectionKey, sourceIDs, targetID]);

  useEffect(() => {
    if (
      currentStep !== 3 ||
      !selectionReady ||
      previewKey === selectionKey ||
      previewLoading
    ) {
      return;
    }
    void loadPreview();
  }, [
    currentStep,
    loadPreview,
    previewKey,
    previewLoading,
    selectionKey,
    selectionReady,
  ]);

  async function handleMerge() {
    if (
      !targetID ||
      sourceIDs.size === 0 ||
      !targetGroup ||
      !preview?.can_merge
    ) {
      return;
    }
    if (!confirmDelete || slugConfirmation.trim() !== targetGroup.slug) {
      return;
    }

    try {
      setMerging(true);
      setError(null);
      setSuccess(null);

      const response = await mergeFansubs(
        { target_id: targetID, source_ids: Array.from(sourceIDs) },
        authToken || undefined,
      );

      setSuccess(
        `Merge abgeschlossen: ${response.data.merged_count} Gruppe(n), ${response.data.versions_migrated} Versionen, ` +
          `${response.data.members_migrated} Mitglieder, ${response.data.relations_migrated} Anime-Zuordnungen.`,
      );

      const nextTargetID = targetID;
      await loadGroups();
      setSourceIDs(new Set());
      setPreview(null);
      setPreviewKey("");
      setCurrentStep(1);
      setConfirmDelete(false);
      setSlugConfirmation("");
      router.push(`/admin/fansubs/${nextTargetID}/edit`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Fehler beim Zusammenfuehren",
      );
    } finally {
      setMerging(false);
    }
  }

  function chooseTarget(groupID: number) {
    setTargetID(groupID);
    setSourceIDs((prev) => {
      if (!prev.has(groupID)) return prev;
      const next = new Set(prev);
      next.delete(groupID);
      return next;
    });
  }

  function toggleSource(groupID: number) {
    if (groupID === targetID) return;
    setSourceIDs((prev) => {
      const next = new Set(prev);
      if (next.has(groupID)) {
        next.delete(groupID);
      } else {
        next.add(groupID);
      }
      return next;
    });
  }

  function selectAllFilteredSources() {
    setSourceIDs(new Set(sourceCandidates.map((group) => group.id)));
  }

  function clearSourceSelection() {
    setSourceIDs(new Set());
  }

  function isStepEnabled(step: WizardStep): boolean {
    if (step <= 2) return true;
    return selectionReady;
  }

  function goToStep(step: WizardStep) {
    if (!isStepEnabled(step)) return;
    setCurrentStep(step);
  }

  function goBack() {
    if (currentStep === 1) return;
    setCurrentStep((currentStep - 1) as WizardStep);
  }

  function goNext() {
    if (currentStep === 1) {
      setCurrentStep(2);
      return;
    }
    if (currentStep === 2) {
      if (!selectionReady) return;
      setCurrentStep(3);
      return;
    }
    if (currentStep === 3) {
      if (!selectionReady || previewLoading || !preview) return;
      setCurrentStep(4);
    }
  }

  const canGoNext =
    currentStep === 1 ||
    (currentStep === 2
      ? selectionReady
      : currentStep === 3
        ? Boolean(preview) && !previewLoading
        : false);

  const mergeButtonDisabled =
    merging ||
    !targetGroup ||
    !preview ||
    !preview.can_merge ||
    !confirmDelete ||
    slugConfirmation.trim() !== targetGroup?.slug;

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
        Gefuehrtes Zusammenfuehren mit Vorschau, Konflikt-Transparenz und
        Safety-Checks.
      </p>

      {error && <div className={styles.errorBox}>{error}</div>}
      {success && <div className={styles.successBox}>{success}</div>}

      <div className={styles.panel}>
        <div className={styles.mergeWizardProgressBar} aria-hidden="true">
          <div
            className={styles.mergeWizardProgressFill}
            style={{ width: `${(currentStep / WIZARD_STEPS.length) * 100}%` }}
          />
        </div>
        <ol className={styles.mergeWizardSteps} aria-label="Merge Schritte">
          {WIZARD_STEPS.map((step) => {
            const isActive = step.id === currentStep;
            const isDone = step.id < currentStep;
            const disabled = !isStepEnabled(step.id);
            return (
              <li
                key={step.id}
                className={`${styles.mergeWizardStepItem} ${isActive ? styles.mergeWizardStepActive : ""} ${isDone ? styles.mergeWizardStepDone : ""} ${disabled ? styles.mergeWizardStepDisabled : ""}`}
              >
                <button
                  type="button"
                  className={styles.mergeWizardStepButton}
                  onClick={() => goToStep(step.id)}
                  disabled={disabled || merging}
                >
                  <span className={styles.mergeWizardStepIndex}>{step.id}</span>
                  <span>{step.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className={styles.panel}>
        <div className={styles.mergeFilterRow}>
          <div className={styles.field}>
            <label htmlFor="merge-search">Suche</label>
            <input
              id="merge-search"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Name oder Slug..."
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
              <option value="dissolved">Aufgeloest</option>
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="merge-type-filter">Typ</label>
            <select
              id="merge-type-filter"
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as TypeFilter)
              }
              disabled={merging}
            >
              <option value="all">Alle Typen</option>
              <option value="group">Gruppe</option>
              <option value="collaboration">Kollaboration</option>
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
          <h2>Ausgewaehlte Zielgruppe</h2>
          <GroupRowCard group={targetGroup} selectedAs="target" />
        </div>
      )}

      {currentStep === 1 && (
        <div className={styles.panel}>
          <h2>1. Zielgruppe waehlen</h2>
          <p>
            Diese Gruppe bleibt bestehen und erhaelt Daten aus den Quellgruppen.
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
                Keine Gruppen fuer diese Filter gefunden.
              </p>
            )}
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className={styles.panel}>
          <h2>2. Quellgruppen waehlen</h2>
          <p>Quellen werden in die Zielgruppe migriert und danach geloescht.</p>

          <div className={styles.actions}>
            <button
              className={styles.buttonSecondary}
              type="button"
              onClick={selectAllFilteredSources}
              disabled={merging || sourceCandidates.length === 0}
            >
              Alle Treffer waehlen
            </button>
            <button
              className={styles.buttonSecondary}
              type="button"
              onClick={clearSourceSelection}
              disabled={merging || sourceIDs.size === 0}
            >
              Auswahl loeschen
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
                        Zielgruppe kann nicht als Quelle gewaehlt werden.
                      </p>
                    )}
                  </label>
                );
              })}
              {filteredGroups.length === 0 && (
                <p className={styles.hint}>
                  Keine Gruppen fuer diese Filter gefunden.
                </p>
              )}
            </div>

            <aside className={styles.mergeComparePanel}>
              <h3>Vergleich</h3>
              <p className={styles.hint}>Ziel vs ausgewaehlte Quellen</p>
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
        <div className={styles.panel}>
          <h2>3. Vorschau pruefen</h2>
          <p>Impact und potenzielle Konflikte vor dem finalen Merge pruefen.</p>
          <div className={styles.actions}>
            <button
              className={styles.button}
              type="button"
              onClick={() => void loadPreview()}
              disabled={!selectionReady || previewLoading || merging}
            >
              {previewLoading ? "Lade Vorschau..." : "Vorschau aktualisieren"}
            </button>
          </div>

          {previewLoading && (
            <p className={styles.hint}>Vorschau wird geladen...</p>
          )}

          {preview && (
            <>
              <div className={styles.mergeKpiGrid}>
                <KpiCard
                  label="Zielgruppe"
                  value={
                    targetGroup
                      ? `${targetGroup.name} (${targetGroup.slug})`
                      : "-"
                  }
                />
                <KpiCard
                  label="Quellgruppen"
                  value={String(selectedSourceGroups.length)}
                />
                <KpiCard
                  label="Anime-Zuordnungen"
                  value={String(preview.relations_migrated)}
                />
                <KpiCard
                  label="Episoden-Versionen"
                  value={String(preview.versions_migrated)}
                />
                <KpiCard
                  label="Mitglieder"
                  value={String(preview.members_migrated)}
                />
                <KpiCard
                  label="Aliases migriert"
                  value={String(preview.aliases_added.length)}
                />
              </div>

              <div className={styles.mergePreviewDetailGrid}>
                <div className={styles.mergePreviewDetailCard}>
                  <h3>Werden geloescht</h3>
                  {selectedSourceGroups.length > 0 ? (
                    <ul className={styles.mergeCompactList}>
                      {selectedSourceGroups.map((group) => (
                        <li key={group.id}>
                          {group.name} ({group.slug})
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.hint}>Keine Quellen ausgewaehlt.</p>
                  )}
                </div>

                <div className={styles.mergePreviewDetailCard}>
                  <h3>Alias-Vorschau</h3>
                  <p>
                    <strong>{preview.aliases_added.length}</strong> werden
                    hinzugefuegt,{" "}
                    <strong>{preview.aliases_skipped.length}</strong> werden
                    uebersprungen.
                  </p>
                  {preview.aliases_added.length > 0 && (
                    <>
                      <p className={styles.hint}>Hinzugefuegt</p>
                      <ul className={styles.mergeCompactList}>
                        {preview.aliases_added.slice(0, 10).map((alias) => (
                          <li key={`add-${alias}`}>{alias}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {preview.aliases_skipped.length > 0 && (
                    <>
                      <p className={styles.hint}>Uebersprungen</p>
                      <ul className={styles.mergeCompactList}>
                        {preview.aliases_skipped.slice(0, 10).map((alias) => (
                          <li key={`skip-${alias}`}>{alias}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>

              <div
                className={`${styles.mergeConflictPanel} ${hasPreviewConflicts ? styles.mergeConflictPanelWarning : styles.mergeConflictPanelSafe}`}
              >
                <h3>Konflikte / Duplikate</h3>
                {!hasPreviewConflicts && (
                  <p className={styles.mergeConflictSafeText}>
                    Keine Konflikte gefunden.
                  </p>
                )}

                {preview.conflicts.version_conflicts > 0 && (
                  <ConflictRow
                    title="Episode-Version Konflikte"
                    summary={`${preview.conflicts.version_conflicts} Konflikt(e) blockieren den Merge.`}
                  />
                )}
                {preview.conflicts.duplicate_aliases_count > 0 && (
                  <ConflictRow
                    title="Duplicate Aliases/Tags"
                    summary={`${preview.conflicts.duplicate_aliases_count} Alias-Kollision(en) erkannt.`}
                    details={preview.conflicts.duplicate_aliases}
                  />
                )}
                {preview.conflicts.duplicate_members_count > 0 && (
                  <ConflictRow
                    title="Duplicate Members"
                    summary={`${preview.conflicts.duplicate_members_count} moegliche Duplikate erkannt.`}
                    details={preview.conflicts.duplicate_members}
                  />
                )}
                {preview.conflicts.duplicate_relations_count > 0 && (
                  <ConflictRow
                    title="Doppelte Anime-Zuordnungen"
                    summary={`${preview.conflicts.duplicate_relations_count} Zuordnungen existieren bereits.`}
                    details={preview.conflicts.duplicate_relation_anime_ids.map(
                      (animeID) => `Anime #${animeID}`,
                    )}
                  />
                )}
                {preview.conflicts.duplicate_slugs_count > 0 && (
                  <ConflictRow
                    title="Slug-Kollisionen"
                    summary={`${preview.conflicts.duplicate_slugs_count} Slug-Kollision(en) erkannt.`}
                    details={preview.conflicts.duplicate_slugs}
                  />
                )}
                {preview.conflicts.duplicate_names_count > 0 && (
                  <ConflictRow
                    title="Name-Kollisionen"
                    summary={`${preview.conflicts.duplicate_names_count} Name-Kollision(en) erkannt.`}
                    details={preview.conflicts.duplicate_names}
                  />
                )}
              </div>
            </>
          )}
        </div>
      )}

      {currentStep === 4 && (
        <div className={styles.panel}>
          <h2>4. Bestaetigen & zusammenfuehren</h2>
          <p>
            Danger Zone: Quellgruppen werden nach dem Merge dauerhaft geloescht.
          </p>

          {selectedSourceGroups.length > 0 && (
            <div className={styles.mergeDangerBox}>
              <h3>Quellgruppen werden geloescht</h3>
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
              Keine Vorschau geladen. Gehe zurueck zu Schritt 3.
            </p>
          )}

          {preview && !preview.can_merge && (
            <p className={styles.hintWarning}>
              Der Merge ist aktuell blockiert. Bitte Konflikte in der Vorschau
              pruefen (insbesondere Episode-Version Konflikte).
            </p>
          )}

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={confirmDelete}
              onChange={(event) => setConfirmDelete(event.target.checked)}
              disabled={merging}
            />
            Ich bestaetige, dass die Quellgruppen geloescht werden.
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
            Zurueck
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
                  ? "Zur Bestaetigung"
                  : "Weiter"}
            </button>
          ) : (
            <button
              className={`${styles.button} ${styles.buttonDanger}`}
              type="button"
              onClick={() => void handleMerge()}
              disabled={mergeButtonDisabled}
            >
              {merging ? "Fuehre zusammen..." : "Zusammenfuehren"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function GroupRowCard({
  group,
  selectedAs,
}: {
  group: FansubGroup;
  selectedAs: "target" | "source" | null;
}) {
  const typeLabel =
    group.group_type === "collaboration" ? "Kollaboration" : "Gruppe";
  const statusLabel =
    group.status === "active"
      ? "aktiv"
      : group.status === "inactive"
        ? "inaktiv"
        : "aufgeloest";

  return (
    <div className={styles.mergeGroupCardContent}>
      {group.logo_url && (
        <Image
          src={group.logo_url}
          alt={`${group.name} Logo`}
          className={styles.mergeGroupLogo}
          width={44}
          height={44}
          unoptimized
        />
      )}
      <div className={styles.mergeGroupMain}>
        <p className={styles.mergeGroupName}>{group.name}</p>
        <p className={styles.mergeGroupSlug}>{group.slug}</p>
        <div className={styles.mergeGroupBadges}>
          <span className={styles.mergeMetaBadge}>{typeLabel}</span>
          <span className={styles.mergeMetaBadge}>{statusLabel}</span>
          {selectedAs && (
            <span className={styles.mergeMetaBadgeSelected}>
              {selectedAs === "target" ? "Ziel" : "Quelle"}
            </span>
          )}
        </div>
        <div className={styles.mergeStatGrid}>
          <span>Anime: {group.anime_relations_count}</span>
          <span>Versionen: {group.release_versions_count}</span>
          <span>Members: {group.members_count}</span>
          <span>Tags: {group.aliases_count}</span>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.mergeKpiCard}>
      <p className={styles.mergeKpiLabel}>{label}</p>
      <p className={styles.mergeKpiValue}>{value}</p>
    </div>
  );
}

function ConflictRow({
  title,
  summary,
  details = [],
}: {
  title: string;
  summary: string;
  details?: string[];
}) {
  return (
    <div className={styles.mergeConflictRow}>
      <p className={styles.mergeConflictTitle}>{title}</p>
      <p className={styles.mergeConflictSummary}>{summary}</p>
      {details.length > 0 && (
        <ul className={styles.mergeCompactList}>
          {details.slice(0, 10).map((item) => (
            <li key={`${title}-${item}`}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function sumGroupCounts(groups: FansubGroup[]): CountSummary {
  return groups.reduce(
    (acc, group) => ({
      animeRelations: acc.animeRelations + group.anime_relations_count,
      episodeVersions: acc.episodeVersions + group.release_versions_count,
      members: acc.members + group.members_count,
      aliases: acc.aliases + group.aliases_count,
    }),
    emptyCountSummary(),
  );
}

function emptyCountSummary(): CountSummary {
  return {
    animeRelations: 0,
    episodeVersions: 0,
    members: 0,
    aliases: 0,
  };
}
