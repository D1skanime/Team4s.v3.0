"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  useConfirmDialog,
} from "@/components/ui";
import {
  ApiError,
  createFansubAlias,
  deleteFansubAlias,
  getFansubAliases,
  getFansubList,
  reassignFansubAlias,
} from "@/lib/api";
import type { FansubAlias, FansubGroup } from "@/types/fansub";

/**
 * D-09: vollständige Alias-CRUD-UI (anlegen, umhängen, löschen) für eine Fansubgruppe,
 * gerendert als Geschwisterelement von FansubBasicInfoTab (167-UI-SPEC.md Design-Entscheidung 8).
 * Reine Präsentationsschicht — jede Mutation delegiert an bereits berechtigungsgeprüfte
 * Backend-Endpunkte (siehe Threat Model in 167-08-PLAN.md).
 */

type FansubAliasSectionProps = {
  fansubID: number;
  isPlatformAdmin: boolean;
  hasAuthSession: boolean;
  onToast: (message: string) => void;
};

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "–" : date.toLocaleDateString("de-DE");
}

function groupNameFor(groups: FansubGroup[], groupId: number): string {
  return groups.find((group) => group.id === groupId)?.name ?? `Gruppe #${groupId}`;
}

export function FansubAliasSection({
  fansubID,
  isPlatformAdmin,
  hasAuthSession,
  onToast,
}: FansubAliasSectionProps) {
  // isPlatformAdmin wird bewusst nicht zusätzlich zum Gaten verwendet — die
  // Alias-Mutationsendpunkte sind bereits serverseitig capability-geprüft (siehe Threat Model);
  // diese Sektion spiegelt nur hasAuthSession fürs UX-Deaktivieren, analog zu den
  // Nachbar-Komponenten in diesem Verzeichnis (z. B. FansubCommunityLinksList).
  void isPlatformAdmin;

  const [aliases, setAliases] = useState<FansubAlias[] | null>(null);
  const [groups, setGroups] = useState<FansubGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newAliasText, setNewAliasText] = useState("");
  const [newAliasError, setNewAliasError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [reassignTargetByAliasID, setReassignTargetByAliasID] = useState<Record<number, number>>({});
  const [reassigningAliasID, setReassigningAliasID] = useState<number | null>(null);
  const { confirm, confirmDialog } = useConfirmDialog();

  const loadAliases = useCallback(async () => {
    try {
      const response = await getFansubAliases(fansubID);
      setAliases(response.data);
      setLoadError(null);
    } catch (error) {
      setLoadError(
        error instanceof ApiError && error.message ? error.message : "Bitte später erneut versuchen.",
      );
    }
  }, [fansubID]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      await loadAliases();
      try {
        const groupsResponse = await getFansubList({ per_page: 100 });
        if (!cancelled) setGroups(groupsResponse.data);
      } catch {
        // Reassign-Zieldropdown bleibt leer — kein zusätzlicher Fehlerzustand für diesen
        // sekundären Ladepfad, die Alias-Tabelle selbst bleibt bedienbar.
      }
      if (!cancelled) setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [loadAliases]);

  const canManage = hasAuthSession;
  const availableTargetGroups = groups.filter((group) => group.id !== fansubID);

  async function handleCreate() {
    const alias = newAliasText.trim();
    if (!alias) return;
    setCreating(true);
    setNewAliasError(null);
    try {
      await createFansubAlias(fansubID, { alias });
      setNewAliasText("");
      await loadAliases();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setNewAliasError("Dieses Kürzel gehört bereits zu einer anderen Gruppe.");
      } else {
        setNewAliasError(
          error instanceof ApiError && error.message ? error.message : "Alias konnte nicht angelegt werden.",
        );
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(row: FansubAlias) {
    const confirmed = await confirm({
      title: "Alias löschen?",
      description: `„${row.alias}" wird entfernt und beim nächsten Import nicht mehr automatisch erkannt. Bereits importierte Releases bleiben unverändert.`,
      confirmLabel: "Alias löschen",
      tone: "danger",
    });
    if (!confirmed) return;
    try {
      await deleteFansubAlias(fansubID, row.id);
      onToast(`Alias „${row.alias}" gelöscht.`);
      await loadAliases();
    } catch (error) {
      onToast(error instanceof ApiError && error.message ? error.message : "Alias konnte nicht gelöscht werden.");
    }
  }

  async function handleReassign(row: FansubAlias) {
    const targetId = reassignTargetByAliasID[row.id];
    if (!targetId || targetId === row.fansub_group_id) return;
    const currentGroupName = groupNameFor(groups, row.fansub_group_id);
    const targetGroupName = groupNameFor(groups, targetId);
    const confirmed = await confirm({
      title: "Alias umhängen?",
      description: `„${row.alias}" gehört aktuell zu ${currentGroupName}. Nach dem Umhängen ist der Alias nur noch bei ${targetGroupName} hinterlegt. Bereits importierte Releases bleiben unverändert.`,
      confirmLabel: "Trotzdem umhängen",
      tone: "danger",
    });
    if (!confirmed) return;
    try {
      await reassignFansubAlias(fansubID, row.id, { target_fansub_group_id: targetId });
      onToast(`Alias „${row.alias}" zu ${targetGroupName} umgehängt.`);
      await loadAliases();
      setReassigningAliasID(null);
    } catch (error) {
      onToast(
        error instanceof ApiError && error.message ? error.message : "Alias konnte nicht umgehängt werden.",
      );
    }
  }

  function handleCancelReassign(aliasID: number) {
    setReassigningAliasID(null);
    setReassignTargetByAliasID((current) => {
      const next = { ...current };
      delete next[aliasID];
      return next;
    });
  }

  const newAliasForm = (
    <div>
      <FormField label="Neuer Alias" htmlFor="fansub-alias-new" error={newAliasError ?? undefined}>
        <Input
          id="fansub-alias-new"
          value={newAliasText}
          maxLength={120}
          disabled={!canManage}
          placeholder="z. B. BDnP"
          onChange={(event) => setNewAliasText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            event.stopPropagation();
            if (!creating && newAliasText.trim()) {
              void handleCreate();
            }
          }}
        />
      </FormField>
      <Button
        type="button"
        variant="primary"
        size="sm"
        leftIcon={<Plus size={14} />}
        disabled={!canManage || creating || !newAliasText.trim()}
        loading={creating}
        onClick={() => void handleCreate()}
      >
        Alias hinzufügen
      </Button>
    </div>
  );

  return (
    <Card variant="section" title="Aliase">
      {loading ? (
        <LoadingState
          title="Aliase werden geladen"
          description="Team4s lädt die hinterlegten Kürzel dieser Fansubgruppe."
        />
      ) : loadError ? (
        <ErrorState title="Aliase konnten nicht geladen werden" description={loadError} />
      ) : (
        <>
          {(aliases ?? []).length === 0 ? (
            <EmptyState
              title="Noch keine Aliase hinterlegt"
              description="Aliase werden automatisch ergänzt, sobald beim Import ein unbekanntes Kürzel dieser Gruppe zugeordnet wird. Ein Alias kann hier auch manuell angelegt werden."
            />
          ) : (
            <Table variant="withActions" caption="Aliase dieser Gruppe">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Alias</TableHeaderCell>
                  <TableHeaderCell>Erstellt am</TableHeaderCell>
                  <TableHeaderCell>Aktionen</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(aliases ?? []).map((row) => {
                  const selectedTarget = reassignTargetByAliasID[row.id] ?? '';
                  return (
                    <TableRow key={row.id}>
                      <TableCell>{row.alias}</TableCell>
                      <TableCell>{formatDate(row.created_at)}</TableCell>
                      <TableCell>
                        {row.id === reassigningAliasID ? (
                          <>
                            <Select
                              aria-label={`Neue Gruppe für Alias ${row.alias}`}
                              disabled={!canManage}
                              value={String(selectedTarget)}
                              onChange={(event) =>
                                setReassignTargetByAliasID((current) => ({
                                  ...current,
                                  [row.id]: Number(event.target.value),
                                }))
                              }
                            >
                              <option value="" disabled>
                                Zielgruppe wählen…
                              </option>
                              {availableTargetGroups.map((group) => (
                                <option key={group.id} value={String(group.id)}>
                                  {group.name}
                                </option>
                              ))}
                            </Select>
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={!canManage || !selectedTarget || selectedTarget === row.fansub_group_id}
                              onClick={() => void handleReassign(row)}
                            >
                              Übernehmen
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleCancelReassign(row.id)}
                            >
                              Abbrechen
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={!canManage}
                            onClick={() => setReassigningAliasID(row.id)}
                          >
                            Umhängen…
                          </Button>
                        )}
                        <Button
                          variant="danger"
                          size="sm"
                          iconOnly
                          disabled={!canManage}
                          leftIcon={<Trash2 size={14} />}
                          aria-label={`Alias ${row.alias} löschen`}
                          onClick={() => void handleDelete(row)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {newAliasForm}
        </>
      )}
      {confirmDialog}
    </Card>
  );
}
