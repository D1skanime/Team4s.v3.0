"use client";

import { useCallback, useEffect, useState } from "react";

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

interface NameTableProps<Row extends NameRow> {
  idPrefix: string;
  title: string;
  rows: Row[];
  emptyTitle: string;
  onSave: (id: number, name: string) => Promise<{ data: { id: number; name_de: string } }>;
  onSaved: (id: number, nameDe: string) => void;
}

function NameTable<Row extends NameRow>({
  idPrefix,
  title,
  rows,
  emptyTitle,
  onSave,
  onSaved,
}: NameTableProps<Row>) {
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [saveErrors, setSaveErrors] = useState<Record<number, string | null>>({});

  const handleBlur = useCallback(
    async (row: Row, nextValue: string) => {
      setSaveErrors((current) => ({ ...current, [row.id]: null }));
      try {
        const response = await onSave(row.id, nextValue);
        setDrafts((current) => ({ ...current, [row.id]: response.data.name_de }));
        onSaved(row.id, response.data.name_de);
      } catch (error) {
        setSaveErrors((current) => ({
          ...current,
          [row.id]: readErrorMessage(error, "Speichern fehlgeschlagen."),
        }));
      }
    },
    [onSave, onSaved],
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

type LoadStatus = "idle" | "loading" | "success" | "error";

export function TagsGenresAdminClient() {
  const [tags, setTags] = useState<AdminTagNameRow[]>([]);
  const [genres, setGenres] = useState<AdminGenreNameRow[]>([]);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const [tagsResponse, genresResponse] = await Promise.all([
        getAdminTagNames(),
        getAdminGenreNames(),
      ]);
      setTags(tagsResponse.data);
      setGenres(genresResponse.data);
      setStatus("success");
    } catch (error) {
      setErrorMessage(
        readErrorMessage(error, "Tags und Genres konnten nicht geladen werden."),
      );
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (status === "idle" || status === "loading") {
    return <LoadingState title="Tags und Genres werden geladen ..." description="" />;
  }

  if (status === "error") {
    return (
      <ErrorState
        title="Tags und Genres konnten nicht geladen werden"
        description={errorMessage ?? ""}
        action={
          <Button variant="secondary" onClick={() => void load()}>
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
        onSaved={(id, nameDe) =>
          setTags((current) =>
            current.map((row) => (row.id === id ? { ...row, name_de: nameDe || null } : row)),
          )
        }
      />
      <NameTable
        idPrefix="genre"
        title="Genres"
        rows={genres}
        emptyTitle="Keine Genres vorhanden"
        onSave={(id, name) => updateAdminGenreName(id, name)}
        onSaved={(id, nameDe) =>
          setGenres((current) =>
            current.map((row) => (row.id === id ? { ...row, name_de: nameDe || null } : row)),
          )
        }
      />
    </div>
  );
}
