"use client";

import Link from "next/link";
import { Info } from "lucide-react";

import { PlatformAdminGate } from "@/components/auth/PlatformAdminGate";
import {
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  Table,
  TableBody,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import { FansubStatus } from "@/types/fansub";
import { FansubDesktopRow, FansubMobileCard } from "./FansubListRows";
import { FansubSortHeaderCell } from "./FansubSortHeaderCell";
import {
  useAdminFansubsList,
  type SortDirection,
  type SortKey,
  type StatusFilter,
} from "./useAdminFansubsList";

import { mergeCssModules } from "@/lib/mergeCssModules";
import sharedStyles from "../admin.module.css";
import fansubStyles from "./fansubs.module.css";

const styles = mergeCssModules(fansubStyles, sharedStyles);

const statusFilterOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Alle Stati" },
  { value: "active", label: "active" },
  { value: "inactive", label: "inactive" },
  { value: "archived", label: "archived" },
];

const bulkStatusOptions: Array<{ value: FansubStatus; label: string }> = [
  { value: "active", label: "active" },
  { value: "inactive", label: "inactive" },
  { value: "dissolved", label: "archived" },
];

function AdminFansubsContent() {
  const {
    confirmDialog,
    isLoading,
    fetchLimitReached,
    isMutating,
    memberCounts,
    queryInput,
    setQueryInput,
    statusFilter,
    setStatusFilter,
    sortKey,
    setSortKey,
    sortDirection,
    setSortDirection,
    page,
    setPage,
    selectedIDs,
    bulkStatus,
    setBulkStatus,
    mobileMenuGroupID,
    setMobileMenuGroupID,
    errorMessage,
    successMessage,
    selectAllRef,
    filteredItems,
    pagedItems,
    totalFiltered,
    totalPages,
    visibleCount,
    allOnPageSelected,
    toggleSort,
    toggleSelection,
    toggleSelectAllOnPage,
    onDelete,
    onBulkDelete,
    onBulkStatusChange,
  } = useAdminFansubsList();

  return (
    <main className={`${styles.page} ${styles.fansubAdminPage}`}>
      <p className={styles.backLinks}>
        <Link href="/admin">Admin</Link>
        <span> | </span>
        <Link href="/anime">Anime</Link>
      </p>

      <header className={styles.header}>
        <h1 className={styles.title}>Fansub Verwaltung</h1>
        <p className={styles.subtitle}>
          Gruppen suchen, filtern, bearbeiten und löschen.
        </p>
      </header>

      <section className={styles.panel}>
        <div className={styles.fansubTopActions}>
          <Link
            href="/admin/fansubs/create"
            className={`${styles.button} ${styles.fansubTopActionButton}`}
          >
            + Neue Fansubgruppe
          </Link>
        </div>

        <div className={styles.fansubFilterBar}>
          <div className={`${styles.field} ${styles.fansubFilterSearch}`}>
            <label htmlFor="fansub-query">Suche</label>
            <Input
              id="fansub-query"
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              placeholder="Name, Slug oder Tag..."
            />
          </div>
          <div className={`${styles.field} ${styles.fansubFilterSelect}`}>
            <label htmlFor="fansub-status">Status</label>
            <select
              id="fansub-status"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
            >
              {statusFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className={`${styles.field} ${styles.fansubFilterSelect}`}>
            <label htmlFor="fansub-sort">Sortierung</label>
            <select
              id="fansub-sort"
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
            >
              <option value="name">Name</option>
              <option value="status">Status</option>
              <option value="period">Zeitraum</option>
              <option value="kuerzel">Kürzel</option>
            </select>
          </div>
          <div className={`${styles.field} ${styles.fansubFilterSelect}`}>
            <label htmlFor="fansub-direction">Richtung</label>
            <select
              id="fansub-direction"
              value={sortDirection}
              onChange={(event) =>
                setSortDirection(event.target.value as SortDirection)
              }
            >
              <option value="asc">Aufsteigend</option>
              <option value="desc">Absteigend</option>
            </select>
          </div>
        </div>

        {selectedIDs.size > 0 ? (
          <div className={styles.fansubBulkBar}>
            <span className={styles.fansubBulkInfo}>
              {selectedIDs.size} ausgewählt
            </span>
            <div className={styles.fansubBulkControls}>
              <select
                value={bulkStatus}
                onChange={(event) =>
                  setBulkStatus(event.target.value as FansubStatus)
                }
                className={styles.fansubBulkSelect}
              >
                {bulkStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={() => void onBulkStatusChange()}
                disabled={isMutating}
              >
                Status aendern
              </button>
              <button
                type="button"
                className={`${styles.buttonSecondary} ${styles.buttonDanger}`}
                onClick={() => void onBulkDelete()}
                disabled={isMutating}
              >
                Löschen
              </button>
            </div>
          </div>
        ) : null}

        {errorMessage ? <ErrorState title={errorMessage} description="" /> : null}
        {successMessage ? (
          <div className={styles.successBox}>{successMessage}</div>
        ) : null}
        {isLoading ? <LoadingState title="Lade..." description="" /> : null}

        {fetchLimitReached ? (
          <EmptyState
            variant="info"
            icon={<Info size={20} strokeWidth={2} />}
            title="Abrufgrenze erreicht"
            description="Es werden die ersten 500 Einträge angezeigt – bitte die Suche eingrenzen."
          />
        ) : null}

        {!isLoading && filteredItems.length === 0 ? (
          <EmptyState
            title="Keine Fansubgruppen gefunden."
            description=""
            variant="compact"
          />
        ) : null}

        {!isLoading && filteredItems.length > 0 ? (
          <div className={styles.fansubTableShell}>
            <Table
              className={styles.fansubTable}
              containerClassName={styles.fansubDesktopTableWrap}
              variant="withActions"
            >
              <TableHead>
                <TableRow>
                  <TableHeaderCell>
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleSelectAllOnPage}
                      aria-label="Alle sichtbaren Gruppen auswählen"
                    />
                  </TableHeaderCell>
                  <FansubSortHeaderCell
                    label="Gruppenname"
                    sortKeyValue="name"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                    styles={styles}
                  />
                  <TableHeaderCell>Slug</TableHeaderCell>
                  <FansubSortHeaderCell
                    label="Kürzel"
                    sortKeyValue="kuerzel"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                    styles={styles}
                  />
                  <FansubSortHeaderCell
                    label="Status"
                    sortKeyValue="status"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                    styles={styles}
                  />
                  <FansubSortHeaderCell
                    label="Zeitraum"
                    sortKeyValue="period"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                    styles={styles}
                  />
                  <TableHeaderCell>Mitglieder</TableHeaderCell>
                  <TableHeaderCell className={styles.fansubActionsHeader}>
                    Aktionen
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagedItems.map((item) => (
                  <FansubDesktopRow
                    key={item.id}
                    item={item}
                    count={memberCounts[item.id]}
                    selected={selectedIDs.has(item.id)}
                    isMutating={isMutating}
                    onToggleSelect={toggleSelection}
                    onDelete={onDelete}
                  />
                ))}
              </TableBody>
            </Table>

            <div className={styles.fansubMobileList}>
              {pagedItems.map((item) => (
                <FansubMobileCard
                  key={item.id}
                  item={item}
                  count={memberCounts[item.id]}
                  selected={selectedIDs.has(item.id)}
                  isMutating={isMutating}
                  onToggleSelect={toggleSelection}
                  onDelete={onDelete}
                  menuOpen={mobileMenuGroupID === item.id}
                  onToggleMenu={(id) =>
                    setMobileMenuGroupID((prev) => (prev === id ? null : id))
                  }
                />
              ))}
            </div>

            <div className={styles.fansubTableFooter}>
              <span className={styles.fansubPaginationSummary}>
                Zeige {visibleCount} von {totalFiltered} Gruppen
              </span>
              <div className={styles.fansubPagination}>
                <button
                  type="button"
                  className={styles.buttonSecondary}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1}
                >
                  Zurück
                </button>
                <span className={styles.fansubPaginationLabel}>
                  Seite {page} / {totalPages}
                </span>
                <button
                  type="button"
                  className={styles.buttonSecondary}
                  onClick={() =>
                    setPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={page >= totalPages}
                >
                  Weiter
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
      {confirmDialog}
    </main>
  );
}

export default function AdminFansubsPage() {
  return (
    <PlatformAdminGate>
      <AdminFansubsContent />
    </PlatformAdminGate>
  );
}
