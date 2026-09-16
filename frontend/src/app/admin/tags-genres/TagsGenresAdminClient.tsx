"use client";

import { useCallback, useState } from "react";

import {
  Button,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import {
  ApiError,
  getAdminGenreNames,
  getAdminTagNames,
  updateAdminGenreName,
  updateAdminTagName,
} from "@/lib/api";
import { useCancellableSlugState } from "@/hooks/useCancellableSlugState";
import type { AdminGenreNameRow, AdminTagNameRow } from "@/types/admin";

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

interface NameRow {
  id: number;
  name: string;
  count: number;
  name_de: string | null;
}

interface TagsGenresData {
  tags: AdminTagNameRow[];
  genres: AdminGenreNameRow[];
}

interface NameTableProps<Row extends NameRow> {
  idPrefix: string;
  title: string;
  rows: Row[];
  emptyTitle: string;
  onSave: (id: number, name: string) => Promise<{ data: { id: number; name_de: string } }>;
}

// NameTable owns its own per-row "drafts" state (the value shown in each Input,
// initialized from row.name_de and updated with the server-returned name_de on
// a successful save). It intentionally does NOT bubble saved values back up to
// the parent's fetched list — the drafts map is the single source of truth for
// what the admin currently sees, so a row's edit and persistence stay fully
// isolated from any other row (per plan 160-03's <behavior> requirement).
function NameTable<Row extends NameRow>({
  idPrefix,
  title,
  rows,
  emptyTitle,
  onSave,
}: NameTableProps<Row>) {
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [saveErrors, setSaveErrors] = useState<Record<number, string | null>>({});

  const handleBlur = useCallback(
    async (row: Row, nextValue: string) => {
      setSaveErrors((current) => ({ ...current, [row.id]: null }));
      try {
        const response = await onSave(row.id, nextValue);
        setDrafts((current) => ({ ...current, [row.id]: response.data.name_de }));
      } catch (error) {
        setSaveErrors((current) => ({
          ...current,
          [row.id]: readErrorMessage(error, "Speichern fehlgeschlagen."),
        }));
      }
    },
    [onSave],
  );

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description="" />;
  }

  return (
    <section>
      <h2>{title}</h2>
      <Table variant="default">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Grundname</TableHeaderCell>
            <TableHeaderCell>Nutzungsanzahl</TableHeaderCell>
            <TableHeaderCell>Deutscher Name</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const draftValue = drafts[row.id] ?? row.name_de ?? "";
            const inputId = `${idPrefix}-name-de-${row.id}`;
            return (
              <TableRow key={row.id}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.count}</TableCell>
                <TableCell>
                  <FormField
                    label={`Deutscher Name (${row.name})`}
                    htmlFor={inputId}
                    error={saveErrors[row.id] ?? undefined}
                  >
                    <Input
                      id={inputId}
                      value={draftValue}
                      onChange={(event) =>
                        setDrafts((current) => ({ ...current, [row.id]: event.target.value }))
                      }
                      onBlur={(event) => {
                        void handleBlur(row, event.target.value);
                      }}
                    />
                  </FormField>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </section>
  );
}

export function TagsGenresAdminClient() {
  // reloadToken forces a fresh requestKey on retry, matching the
  // useCancellableSlugState convention used throughout /admin/groups
  // (fetch-on-mount + explicit retry, never a raw setState-in-effect).
  const [reloadToken, setReloadToken] = useState(0);

  const fetcher = useCallback(async (): Promise<TagsGenresData> => {
    const [tagsResponse, genresResponse] = await Promise.all([
      getAdminTagNames(),
      getAdminGenreNames(),
    ]);
    return { tags: tagsResponse.data, genres: genresResponse.data };
  }, []);

  const { state } = useCancellableSlugState<TagsGenresData>({
    requestKey: `tags-genres:${reloadToken}`,
    enabled: true,
    fetcher,
  });

  const isLoading = state.status === "idle" || state.status === "loading";
  const errorMessage =
    state.status === "error"
      ? readErrorMessage(state.error, "Tags und Genres konnten nicht geladen werden.")
      : null;
  const tags = state.status === "success" ? state.data!.tags : [];
  const genres = state.status === "success" ? state.data!.genres : [];

  if (isLoading) {
    return <LoadingState title="Tags und Genres werden geladen ..." description="" />;
  }

  if (errorMessage) {
    return (
      <ErrorState
        title="Tags und Genres konnten nicht geladen werden"
        description={errorMessage}
        action={
          <Button
            variant="secondary"
            onClick={() => setReloadToken((current) => current + 1)}
          >
            Erneut versuchen
          </Button>
        }
      />
    );
  }

  return (
    <div style={{ padding: "var(--space-4)", display: "grid", gap: "var(--space-4)" }}>
      <NameTable
        idPrefix="tag"
        title="Tags"
        rows={tags}
        emptyTitle="Keine Tags vorhanden"
        onSave={(id, name) => updateAdminTagName(id, name)}
      />
      <NameTable
        idPrefix="genre"
        title="Genres"
        rows={genres}
        emptyTitle="Keine Genres vorhanden"
        onSave={(id, name) => updateAdminGenreName(id, name)}
      />
    </div>
  );
}
