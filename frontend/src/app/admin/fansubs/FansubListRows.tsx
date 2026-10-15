"use client";

import Link from "next/link";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { TableCell, TableRow } from "@/components/ui";
import { mergeCssModules } from "@/lib/mergeCssModules";
import { FansubGroup } from "@/types/fansub";
import { formatPeriod, statusLabel } from "./useAdminFansubsList";

import sharedStyles from "../admin.module.css";
import fansubStyles from "./fansubs.module.css";

const styles = mergeCssModules(fansubStyles, sharedStyles);

function badgeClassFor(status: FansubGroup["status"]): string {
  return status === "active"
    ? styles.fansubStatusActive
    : status === "inactive"
      ? styles.fansubStatusInactive
      : styles.fansubStatusArchived;
}

type RowCommonProps = {
  item: FansubGroup;
  count: number | null | undefined;
  selected: boolean;
  isMutating: boolean;
  onToggleSelect: (id: number) => void;
  onDelete: (item: FansubGroup) => void;
};

export function FansubDesktopRow({
  item,
  count,
  selected,
  isMutating,
  onToggleSelect,
  onDelete,
}: RowCommonProps) {
  const aliases = item.aliases ?? [];
  const primaryAlias = aliases.length > 0 ? aliases[0] : null;
  const badgeClass = badgeClassFor(item.status);

  return (
    <TableRow key={item.id}>
      <TableCell>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(item.id)}
          aria-label={`Gruppe ${item.name} auswählen`}
        />
      </TableCell>
      <TableCell className={styles.fansubNameCell}>{item.name}</TableCell>
      <TableCell className={styles.fansubSlugCell}>
        <div className={styles.fansubSlugBlock}>
          <span className={styles.fansubSlugText}>{item.slug}</span>
          {primaryAlias ? (
            <span
              className={styles.fansubAliasTag}
              title={`Tag: ${primaryAlias}`}
            >
              Tag: {primaryAlias}
            </span>
          ) : null}
        </div>
      </TableCell>
      <TableCell>{item.kuerzel ?? "–"}</TableCell>
      <TableCell>
        <span className={`${styles.fansubStatusBadge} ${badgeClass}`}>
          {statusLabel(item.status)}
        </span>
      </TableCell>
      <TableCell className={styles.fansubPeriodCell}>
        {formatPeriod(item)}
      </TableCell>
      <TableCell className={styles.fansubMemberCell}>
        {count === undefined ? "..." : count === null ? "n/a" : count}
      </TableCell>
      <TableCell>
        <div className={styles.fansubActionGroup}>
          <Link
            href={`/admin/fansubs/${item.id}/edit`}
            className={styles.fansubIconButton}
            aria-label={`Edit ${item.name}`}
            title="Edit"
          >
            <Pencil size={14} />
          </Link>
          <button
            type="button"
            className={`${styles.fansubIconButton} ${styles.fansubIconButtonDanger}`}
            onClick={() => void onDelete(item)}
            disabled={isMutating}
            aria-label={`Delete ${item.name}`}
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
}

type MobileCardProps = RowCommonProps & {
  menuOpen: boolean;
  onToggleMenu: (id: number) => void;
};

export function FansubMobileCard({
  item,
  count,
  selected,
  isMutating,
  onToggleSelect,
  onDelete,
  menuOpen,
  onToggleMenu,
}: MobileCardProps) {
  const aliases = item.aliases ?? [];
  const primaryAlias = aliases.length > 0 ? aliases[0] : null;
  const badgeClass = badgeClassFor(item.status);

  return (
    <article key={item.id} className={styles.fansubCard}>
      <div className={styles.fansubCardTop}>
        <label className={styles.fansubCardCheckLabel}>
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(item.id)}
            aria-label={`Gruppe ${item.name} auswählen`}
          />
        </label>
        <div className={styles.fansubCardMeta}>
          <h3 className={styles.fansubCardName}>{item.name}</h3>
          <p className={styles.fansubCardSlug}>{item.slug}</p>
          {primaryAlias ? (
            <p className={styles.fansubCardAlias}>Tag: {primaryAlias}</p>
          ) : null}
        </div>
        <div className={styles.fansubCardMenu}>
          <button
            type="button"
            className={styles.fansubMenuButton}
            onClick={() => onToggleMenu(item.id)}
            aria-label="Aktionen"
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen ? (
            <div className={styles.fansubMenuPopup}>
              <Link
                href={`/admin/fansubs/${item.id}/edit`}
                className={styles.fansubMenuItem}
              >
                <Pencil size={14} />
                Edit
              </Link>
              <button
                type="button"
                className={`${styles.fansubMenuItem} ${styles.fansubMenuItemDanger}`}
                onClick={() => void onDelete(item)}
                disabled={isMutating}
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <div className={styles.fansubCardData}>
        <span className={`${styles.fansubStatusBadge} ${badgeClass}`}>
          {statusLabel(item.status)}
        </span>
        <span className={styles.fansubCardDetail}>
          Zeitraum: {formatPeriod(item)}
        </span>
        <span className={styles.fansubCardDetail}>
          Mitglieder: {count === undefined ? "..." : count === null ? "n/a" : count}
        </span>
      </div>
    </article>
  );
}
