#!/usr/bin/env python3
"""
Parse legacy Team4s v2 SQL dump and generate a PostgreSQL import script for:
- anime.description backfill (only where v3 description is empty)
- fansub_groups upsert (name/description/history)
- anime_fansub_groups links (with primary assignment fallback)
"""

from __future__ import annotations

import argparse
import html
import json
import re
import unicodedata
from collections import OrderedDict, defaultdict
from pathlib import Path
from typing import Iterable, List


INSERT_PREFIX = "INSERT INTO `anmi1_anime` VALUES "


def decode_mysql_escape(ch: str) -> str:
    mapping = {
        "0": "\0",
        "b": "\b",
        "n": "\n",
        "r": "\r",
        "t": "\t",
        "Z": "\x1a",
        "\\": "\\",
        "'": "'",
        '"': '"',
    }
    return mapping.get(ch, ch)


def parse_tuples(payload: str) -> List[str]:
    tuples: List[str] = []
    i = 0
    n = len(payload)
    in_quote = False
    escape = False
    depth = 0
    tuple_start = -1

    while i < n:
        ch = payload[i]

        if in_quote:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == "'":
                in_quote = False
            i += 1
            continue

        if ch == "'":
            in_quote = True
            i += 1
            continue

        if ch == "(":
            if depth == 0:
                tuple_start = i + 1
            depth += 1
            i += 1
            continue

        if ch == ")":
            if depth > 0:
                depth -= 1
                if depth == 0 and tuple_start >= 0:
                    tuples.append(payload[tuple_start:i])
                    tuple_start = -1
            i += 1
            continue

        i += 1

    return tuples


def parse_fields(tuple_payload: str) -> List[str | None]:
    fields: List[str | None] = []
    buf: List[str] = []
    in_quote = False
    escape = False
    token_was_quoted = False
    i = 0
    n = len(tuple_payload)

    def flush() -> None:
        nonlocal token_was_quoted
        raw = "".join(buf)
        buf.clear()
        raw_trimmed = raw.strip()
        if token_was_quoted:
            fields.append(raw)
        else:
            if raw_trimmed.lower() == "null" or raw_trimmed == "":
                fields.append(None)
            else:
                fields.append(raw_trimmed)
        token_was_quoted = False

    while i < n:
        ch = tuple_payload[i]
        if in_quote:
            if escape:
                buf.append(decode_mysql_escape(ch))
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == "'":
                in_quote = False
            else:
                buf.append(ch)
            i += 1
            continue

        if ch == "'":
            in_quote = True
            token_was_quoted = True
            i += 1
            continue

        if ch == ",":
            flush()
            i += 1
            continue

        buf.append(ch)
        i += 1

    flush()
    return fields


def clean_text(value: str | None) -> str | None:
    if value is None:
        return None
    text = html.unescape(value).strip()
    if not text:
        return None
    if text.lower() == "null":
        return None
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("\xa0", " ")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = text.strip()
    return text or None


def strip_html_to_text(raw_html: str | None) -> str | None:
    if raw_html is None:
        return None
    text = raw_html.strip()
    if not text:
        return None
    if text.lower() == "null":
        return None

    text = html.unescape(text)
    text = re.sub(r"(?is)<script[^>]*>.*?</script>", " ", text)
    text = re.sub(r"(?is)<style[^>]*>.*?</style>", " ", text)
    text = re.sub(r"(?i)<br\s*/?>", "\n", text)
    text = re.sub(r"(?i)</(p|div|h1|h2|h3|h4|h5|h6|li|section|article)>", "\n", text)
    text = re.sub(r"(?is)<[^>]+>", " ", text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("\xa0", " ")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n[ \t]+", "\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = text.strip(" \n\r\t>")

    if not text:
        return None

    compact = re.sub(r"\s+", " ", text).strip().lower()
    generic_markers = [
        "#keine information",
        "keine information",
        "n/a",
    ]
    if any(marker == compact for marker in generic_markers):
        return None
    if "keine information" in compact and len(compact) < 140:
        return None

    return text


def extract_group_description(history_text: str | None) -> str | None:
    if not history_text:
        return None

    lines = [line.strip() for line in history_text.replace("\r", "\n").split("\n")]
    filtered: List[str] = []
    for line in lines:
        if not line:
            continue
        low = line.lower()
        if low in {
            "die geschichte der fansubgruppe",
            "ihre entstehungsgeschichte:",
            "ihr erster sub:",
            "ihre haltung:",
            "fazit des leaders:",
        }:
            continue
        filtered.append(line)

    if not filtered:
        return None

    candidate = filtered[0]
    if len(candidate) < 60 and len(filtered) > 1:
        candidate = f"{candidate} {filtered[1]}".strip()

    max_length = 280
    if len(candidate) > max_length:
        candidate = f"{candidate[:max_length].rstrip()}..."
    return candidate or None


def parse_group_tags(raw: str | None) -> List[str]:
    if raw is None:
        return []
    candidate = clean_text(raw)
    if not candidate:
        return []

    items: List[str] = []
    for part in candidate.split(","):
        token = part.strip()
        if not token:
            continue
        token = token.strip("[](){}")
        token = re.sub(r"\s+", " ", token).strip()
        if not token:
            continue
        low = token.lower()
        if low in {"null", "none", "-", "#"}:
            continue
        items.append(token)

    dedup: List[str] = []
    seen: set[str] = set()
    for token in items:
        key = token.lower()
        if key in seen:
            continue
        seen.add(key)
        dedup.append(token)
    return dedup


def guess_group_from_history(history_text: str | None) -> List[str]:
    if not history_text:
        return []
    # Example: "Die Geschichte der Fansubgruppe GAX"
    match = re.search(r"Fansubgruppe\s+([A-Za-z0-9:+\-\s]{2,60})", history_text, re.IGNORECASE)
    if not match:
        return []
    name = re.sub(r"\s+", " ", match.group(1)).strip()
    if not name:
        return []
    return [name]


def slugify(value: str) -> str:
    text = value.strip()
    text = text.replace("&", " and ")
    text = text.replace("+", " plus ")
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-{2,}", "-", text).strip("-")
    return text


def text_quality(value: str) -> tuple[int, int, int]:
    placeholder_penalty = value.count("??")
    non_ascii_count = sum(1 for ch in value if ord(ch) > 127)
    length = len(value.strip())
    return (-placeholder_penalty, non_ascii_count, length)


def best_text(current: str | None, candidate: str | None) -> str | None:
    if candidate is None:
        return current
    if current is None:
        return candidate
    return candidate if text_quality(candidate) > text_quality(current) else current


def sql_literal(value: str | None) -> str:
    if value is None:
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def batched(iterable: List[str], size: int) -> Iterable[List[str]]:
    start = 0
    while start < len(iterable):
        yield iterable[start : start + size]
        start += size


def iter_legacy_lines(path: Path) -> Iterable[str]:
    tried: list[str] = []
    for encoding in ("utf-8", "cp1252", "latin-1"):
        tried.append(encoding)
        try:
            with path.open("r", encoding=encoding, errors="strict") as handle:
                for line in handle:
                    yield line
            return
        except UnicodeDecodeError:
            continue
    raise UnicodeDecodeError("legacy_sql", b"", 0, 1, f"unable to decode legacy SQL with encodings: {tried}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--legacy-sql", required=True)
    parser.add_argument("--sql-out", required=True)
    parser.add_argument("--summary-out", required=True)
    args = parser.parse_args()

    legacy_path = Path(args.legacy_sql)
    if not legacy_path.exists():
        raise FileNotFoundError(f"Legacy SQL not found: {legacy_path}")

    group_map: dict[str, dict] = {}
    anime_to_slugs: dict[int, OrderedDict[str, None]] = defaultdict(OrderedDict)
    anime_description: dict[int, str] = {}
    parsed_rows = 0

    for line in iter_legacy_lines(legacy_path):
        if not line.startswith(INSERT_PREFIX):
            continue

        payload = line[len(INSERT_PREFIX) :].strip()
        if payload.endswith(";"):
            payload = payload[:-1]

        tuples = parse_tuples(payload)
        for tuple_payload in tuples:
            fields = parse_fields(tuple_payload)
            if len(fields) < 15:
                continue

            parsed_rows += 1

            try:
                anime_id = int((fields[0] or "").strip())
            except (TypeError, ValueError):
                continue

            description = clean_text(fields[12] if len(fields) > 12 else None)
            history = strip_html_to_text(fields[14] if len(fields) > 14 else None)
            tags = parse_group_tags(fields[23] if len(fields) > 23 else None)
            if not tags:
                tags = guess_group_from_history(history)

            if description:
                current_desc = anime_description.get(anime_id)
                anime_description[anime_id] = best_text(current_desc, description) or description

            if not tags:
                continue

            for idx, tag in enumerate(tags):
                slug = slugify(tag)
                if len(slug) < 2 or slug in {"null", "none"}:
                    continue

                group = group_map.get(slug)
                if group is None:
                    group = {
                        "slug": slug,
                        "name": tag,
                        "description": None,
                        "history": None,
                        "seen": 0,
                        "anime_ids": set(),
                    }
                    group_map[slug] = group

                if text_quality(tag) > text_quality(group["name"]):
                    group["name"] = tag

                history_desc = extract_group_description(history)
                group["description"] = best_text(group["description"], history_desc)
                group["history"] = best_text(group["history"], history)
                group["seen"] += 1
                group["anime_ids"].add(anime_id)
                anime_to_slugs[anime_id][slug] = None

    filtered_groups = []
    for slug, item in group_map.items():
        if not item["name"]:
            continue
        filtered_groups.append(item)

    filtered_groups.sort(key=lambda item: item["name"].lower())

    description_rows = sorted(anime_description.items(), key=lambda pair: pair[0])
    link_rows = []
    for anime_id, slug_map in sorted(anime_to_slugs.items(), key=lambda pair: pair[0]):
        slugs = list(slug_map.keys())
        for idx, slug in enumerate(slugs):
            link_rows.append(
                {
                    "anime_id": anime_id,
                    "slug": slug,
                    "is_primary": idx == 0,
                    "notes": "legacy import: tags/history",
                }
            )

    sql_lines: List[str] = []
    sql_lines.append("BEGIN;")
    sql_lines.append("")
    sql_lines.append(
        "CREATE TEMP TABLE tmp_legacy_fansub_groups ("
        "slug TEXT NOT NULL, name TEXT NOT NULL, description TEXT, history TEXT, status TEXT NOT NULL"
        ") ON COMMIT DROP;"
    )
    sql_lines.append(
        "CREATE TEMP TABLE tmp_legacy_anime_descriptions ("
        "anime_id BIGINT NOT NULL, description TEXT NOT NULL"
        ") ON COMMIT DROP;"
    )
    sql_lines.append(
        "CREATE TEMP TABLE tmp_legacy_anime_fansubs ("
        "anime_id BIGINT NOT NULL, slug TEXT NOT NULL, is_primary BOOLEAN NOT NULL, notes TEXT"
        ") ON COMMIT DROP;"
    )
    sql_lines.append("")

    for chunk in batched([item["slug"] for item in filtered_groups], 500):
        values = []
        for slug in chunk:
            item = group_map[slug]
            values.append(
                "("
                + ",".join(
                    [
                        sql_literal(item["slug"]),
                        sql_literal(item["name"]),
                        sql_literal(item["description"]),
                        sql_literal(item["history"]),
                        sql_literal("active"),
                    ]
                )
                + ")"
            )
        sql_lines.append(
            "INSERT INTO tmp_legacy_fansub_groups (slug, name, description, history, status) VALUES\n"
            + ",\n".join(values)
            + ";"
        )
        sql_lines.append("")

    for chunk in batched([str(row[0]) for row in description_rows], 1000):
        values = []
        desc_lookup = dict(description_rows)
        for anime_id_text in chunk:
            anime_id = int(anime_id_text)
            values.append(
                "("
                + ",".join([str(anime_id), sql_literal(desc_lookup[anime_id])])
                + ")"
            )
        sql_lines.append(
            "INSERT INTO tmp_legacy_anime_descriptions (anime_id, description) VALUES\n"
            + ",\n".join(values)
            + ";"
        )
        sql_lines.append("")

    for chunk in batched([str(i) for i in range(len(link_rows))], 1000):
        values = []
        for idx_text in chunk:
            row = link_rows[int(idx_text)]
            values.append(
                "("
                + ",".join(
                    [
                        str(row["anime_id"]),
                        sql_literal(row["slug"]),
                        "TRUE" if row["is_primary"] else "FALSE",
                        sql_literal(row["notes"]),
                    ]
                )
                + ")"
            )
        sql_lines.append(
            "INSERT INTO tmp_legacy_anime_fansubs (anime_id, slug, is_primary, notes) VALUES\n"
            + ",\n".join(values)
            + ";"
        )
        sql_lines.append("")

    sql_lines.extend(
        [
            "INSERT INTO fansub_groups (slug, name, description, history, status)",
            "SELECT t.slug, t.name, t.description, t.history, t.status",
            "FROM tmp_legacy_fansub_groups t",
            "ON CONFLICT (slug) DO UPDATE",
            "SET",
            "  name = CASE",
            "    WHEN fansub_groups.name IS NULL OR btrim(fansub_groups.name) = '' THEN EXCLUDED.name",
            "    WHEN length(btrim(EXCLUDED.name)) > length(btrim(fansub_groups.name)) THEN EXCLUDED.name",
            "    ELSE fansub_groups.name",
            "  END,",
            "  description = CASE",
            "    WHEN EXCLUDED.description IS NULL OR btrim(EXCLUDED.description) = '' THEN fansub_groups.description",
            "    WHEN EXISTS (",
            "      SELECT 1",
            "      FROM anime_fansub_groups afg",
            "      JOIN anime a ON a.id = afg.anime_id",
            "      WHERE afg.fansub_group_id = fansub_groups.id",
            "        AND a.description IS NOT NULL",
            "        AND fansub_groups.description = a.description",
            "    ) THEN EXCLUDED.description",
            "    WHEN fansub_groups.description LIKE '%??%' AND EXCLUDED.description NOT LIKE '%??%' THEN EXCLUDED.description",
            "    WHEN fansub_groups.description IS NULL OR btrim(fansub_groups.description) = '' THEN EXCLUDED.description",
            "    WHEN length(btrim(EXCLUDED.description)) > length(btrim(fansub_groups.description)) THEN EXCLUDED.description",
            "    ELSE fansub_groups.description",
            "  END,",
            "  history = CASE",
            "    WHEN EXCLUDED.history IS NULL OR btrim(EXCLUDED.history) = '' THEN fansub_groups.history",
            "    WHEN fansub_groups.history LIKE '%??%' AND EXCLUDED.history NOT LIKE '%??%' THEN EXCLUDED.history",
            "    WHEN fansub_groups.history IS NULL OR btrim(fansub_groups.history) = '' THEN EXCLUDED.history",
            "    WHEN length(btrim(EXCLUDED.history)) > length(btrim(fansub_groups.history)) THEN EXCLUDED.history",
            "    ELSE fansub_groups.history",
            "  END,",
            "  status = CASE",
            "    WHEN fansub_groups.status = 'dissolved' THEN fansub_groups.status",
            "    ELSE EXCLUDED.status",
            "  END,",
            "  updated_at = NOW();",
            "",
            "UPDATE anime a",
            "SET description = t.description, updated_at = NOW()",
            "FROM tmp_legacy_anime_descriptions t",
            "WHERE a.id = t.anime_id",
            "  AND t.description IS NOT NULL",
            "  AND btrim(t.description) <> ''",
            "  AND (a.description IS NULL OR btrim(a.description) = '' OR a.description LIKE '%??%');",
            "",
            "INSERT INTO anime_fansub_groups (anime_id, fansub_group_id, is_primary, notes)",
            "SELECT t.anime_id, fg.id, t.is_primary, t.notes",
            "FROM tmp_legacy_anime_fansubs t",
            "JOIN fansub_groups fg ON fg.slug = t.slug",
            "JOIN anime a ON a.id = t.anime_id",
            "ON CONFLICT (anime_id, fansub_group_id) DO UPDATE",
            "SET",
            "  is_primary = anime_fansub_groups.is_primary OR EXCLUDED.is_primary,",
            "  notes = COALESCE(anime_fansub_groups.notes, EXCLUDED.notes);",
            "",
            "WITH without_primary AS (",
            "  SELECT anime_id",
            "  FROM anime_fansub_groups",
            "  GROUP BY anime_id",
            "  HAVING bool_or(is_primary) = FALSE",
            "), chosen AS (",
            "  SELECT DISTINCT ON (afg.anime_id) afg.anime_id, afg.fansub_group_id",
            "  FROM anime_fansub_groups afg",
            "  JOIN without_primary wp ON wp.anime_id = afg.anime_id",
            "  ORDER BY afg.anime_id, afg.fansub_group_id",
            ")",
            "UPDATE anime_fansub_groups afg",
            "SET is_primary = TRUE",
            "FROM chosen c",
            "WHERE afg.anime_id = c.anime_id AND afg.fansub_group_id = c.fansub_group_id;",
            "",
            "COMMIT;",
            "",
        ]
    )

    sql_path = Path(args.sql_out)
    sql_path.write_text("\n".join(sql_lines), encoding="utf-8")

    top_groups = sorted(filtered_groups, key=lambda item: item["seen"], reverse=True)[:20]
    summary = {
        "legacy_rows_parsed": parsed_rows,
        "fansub_groups_prepared": len(filtered_groups),
        "anime_descriptions_prepared": len(description_rows),
        "anime_fansub_links_prepared": len(link_rows),
        "top_groups": [
            {
                "slug": item["slug"],
                "name": item["name"],
                "seen": item["seen"],
                "anime_count": len(item["anime_ids"]),
            }
            for item in top_groups
        ],
    }
    Path(args.summary_out).write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
