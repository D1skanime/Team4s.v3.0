#!/usr/bin/env python3
"""
MySQL to PostgreSQL Migration Script
Migriert anmi1_* Tabellen von MySQL Dump nach PostgreSQL
"""

import re
import sys
from pathlib import Path
from datetime import datetime

# Input/Output Paths
MYSQL_DUMP = Path(r"C:\Users\D1sk\Documents\Entwicklung\claude\Team4s.v2.0\team4sjdgfklfdjsgboidsejk\team4sjdgfklfdjsgboidsejk.sql")
OUTPUT_DIR = Path(r"C:\Users\D1sk\Documents\Entwicklung\claude\Team4s.v3.0\database\migration_data")

# Type conversions
TYPE_MAP = {
    'Serie': 'tv', 'TV': 'tv', 'tv': 'tv',
    'OVA': 'ova', 'ova': 'ova',
    'Film': 'film', 'film': 'film', 'Movie': 'film', 'movie': 'film',
    'Bonus': 'bonus', 'bonus': 'bonus',
    'Special': 'special', 'special': 'special',
    'ONA': 'ona', 'ona': 'ona',
    'Music': 'music', 'music': 'music',
}

STATUS_MAP = {
    'disabled': 'disabled', 'ongoing': 'ongoing', 'done': 'done',
    'aborted': 'aborted', 'licensed': 'licensed',
}

EPISODE_STATUS_MAP = {
    'disabled': 'disabled', 'private': 'private', 'public': 'public',
}

WATCHLIST_STATUS_MAP = {
    'watching': 'watching', 'done': 'done', 'break': 'break',
}


def escape_pg(val):
    """Escape string for PostgreSQL"""
    if val is None:
        return 'NULL'
    val = str(val).replace("'", "''")
    return f"'{val}'"


def parse_insert_values(line):
    """Parse VALUES from MySQL INSERT statement"""
    # Find VALUES section
    match = re.search(r"VALUES\s*\((.+)\);?\s*$", line, re.IGNORECASE)
    if not match:
        return None

    values_str = match.group(1)
    values = []
    current = ''
    in_string = False
    escape_next = False

    for char in values_str:
        if escape_next:
            current += char
            escape_next = False
            continue
        if char == '\\':
            current += char
            escape_next = True
            continue
        if char == "'" and not in_string:
            in_string = True
            continue
        if char == "'" and in_string:
            in_string = False
            continue
        if char == ',' and not in_string:
            val = current.strip()
            if val.upper() == 'NULL':
                values.append(None)
            else:
                values.append(val)
            current = ''
            continue
        current += char

    # Last value
    val = current.strip()
    if val.upper() == 'NULL':
        values.append(None)
    else:
        values.append(val)

    return values


def extract_year(date_val):
    """Extract year from date"""
    if not date_val:
        return None
    try:
        if '-' in str(date_val):
            year = int(str(date_val).split('-')[0])
            if 1900 <= year <= 2100:
                return year
        return None
    except:
        return None


def process_anime(dump_path, output_path):
    """Process anmi1_anime table"""
    print("Processing anmi1_anime -> anime...")
    records = []

    with open(dump_path, 'r', encoding='utf-8', errors='replace') as f:
        for line in f:
            if "INSERT INTO `anmi1_anime`" in line:
                values = parse_insert_values(line)
                if values and len(values) >= 17:
                    records.append(values)

    print(f"  Found {len(records)} anime records")

    with open(output_path / 'anime.sql', 'w', encoding='utf-8') as f:
        f.write("-- Anime Migration\n")
        f.write(f"-- Records: {len(records)}\n\n")
        f.write("DELETE FROM episodes;\n")
        f.write("DELETE FROM anime;\n\n")

        for r in records:
            anime_id = r[0]
            anisearch_id = escape_pg(r[1])
            cover_image = escape_pg(r[2])
            title = escape_pg(r[3])
            title_de = escape_pg(r[4]) if len(r) > 4 else 'NULL'
            title_en = escape_pg(r[5]) if len(r) > 5 else 'NULL'
            anime_type = TYPE_MAP.get(r[6], 'tv') if len(r) > 6 else 'tv'
            status = STATUS_MAP.get(r[7], 'disabled') if len(r) > 7 else 'disabled'
            year = extract_year(r[8]) if len(r) > 8 else None
            year_sql = str(year) if year else 'NULL'
            max_eps = r[9] if len(r) > 9 and r[9] else '0'
            genre = escape_pg(r[10]) if len(r) > 10 else 'NULL'
            source = escape_pg(r[11]) if len(r) > 11 else 'NULL'
            description = escape_pg(r[12]) if len(r) > 12 else 'NULL'
            sub_comment = escape_pg(r[13]) if len(r) > 13 else 'NULL'
            stream_comment = escape_pg(r[14]) if len(r) > 14 else 'NULL'
            is_self_subbed = 'true' if (len(r) > 15 and r[15] == '1') else 'false'
            folder_name = escape_pg(r[16]) if len(r) > 16 else 'NULL'
            created_at = f"'{r[18]}'" if len(r) > 18 and r[18] else 'NOW()'
            updated_at = f"'{r[17]}'" if len(r) > 17 and r[17] else 'NOW()'
            view_count = r[21] if len(r) > 21 and r[21] else '0'

            f.write(f"""INSERT INTO anime (id, anisearch_id, cover_image, title, title_de, title_en, type, status, year, max_episodes, genre, source, description, sub_comment, stream_comment, is_self_subbed, folder_name, created_at, updated_at, view_count, legacy_anime_id)
VALUES ({anime_id}, {anisearch_id}, {cover_image}, {title}, {title_de}, {title_en}, '{anime_type}', '{status}', {year_sql}, {max_eps}, {genre}, {source}, {description}, {sub_comment}, {stream_comment}, {is_self_subbed}, {folder_name}, {created_at}, {updated_at}, {view_count}, {anime_id})
ON CONFLICT (id) DO NOTHING;\n""")

        f.write(f"\nSELECT setval('anime_id_seq', (SELECT COALESCE(MAX(id), 1) FROM anime));\n")

    return len(records)


def process_episodes(dump_path, output_path):
    """Process anmi1_episode table"""
    print("Processing anmi1_episode -> episodes...")
    records = []

    with open(dump_path, 'r', encoding='utf-8', errors='replace') as f:
        for line in f:
            if "INSERT INTO `anmi1_episode`" in line:
                values = parse_insert_values(line)
                if values and len(values) >= 10:
                    records.append(values)

    print(f"  Found {len(records)} episode records")

    with open(output_path / 'episodes.sql', 'w', encoding='utf-8') as f:
        f.write("-- Episodes Migration\n")
        f.write(f"-- Records: {len(records)}\n\n")

        for r in records:
            ep_id = r[0]
            anime_id = r[1]
            ep_num = escape_pg(r[2])
            title = escape_pg(r[3])
            filename = escape_pg(r[4])
            stream_link = escape_pg(r[5])
            status = EPISODE_STATUS_MAP.get(r[6], 'disabled') if len(r) > 6 else 'disabled'
            views = r[7] if len(r) > 7 and r[7] else '0'

            # Process fields
            raw_proc = r[8] if len(r) > 8 and r[8] else '0'
            translate_proc = r[9] if len(r) > 9 and r[9] else '0'
            time_proc = r[10] if len(r) > 10 and r[10] else '0'
            typeset_proc = r[11] if len(r) > 11 and r[11] else '0'
            logo_proc = r[12] if len(r) > 12 and r[12] else '0'
            edit_proc = r[13] if len(r) > 13 and r[13] else '0'
            karatime_proc = r[14] if len(r) > 14 and r[14] else '0'
            karafx_proc = r[15] if len(r) > 15 and r[15] else '0'
            qc_proc = r[16] if len(r) > 16 and r[16] else '0'
            encode_proc = r[17] if len(r) > 17 and r[17] else '0'

            created_at = f"'{r[29]}'" if len(r) > 29 and r[29] else 'NOW()'
            updated_at = f"'{r[28]}'" if len(r) > 28 and r[28] else 'NOW()'
            download_count = r[30] if len(r) > 30 and r[30] else '0'

            f.write(f"""INSERT INTO episodes (id, anime_id, episode_number, title, filename, stream_links_legacy, status, view_count, download_count, raw_proc, translate_proc, time_proc, typeset_proc, logo_proc, edit_proc, karatime_proc, karafx_proc, qc_proc, encode_proc, created_at, updated_at, legacy_episode_id)
VALUES ({ep_id}, {anime_id}, {ep_num}, {title}, {filename}, {stream_link}, '{status}', {views}, {download_count}, {raw_proc}, {translate_proc}, {time_proc}, {typeset_proc}, {logo_proc}, {edit_proc}, {karatime_proc}, {karafx_proc}, {qc_proc}, {encode_proc}, {created_at}, {updated_at}, {ep_id})
ON CONFLICT (id) DO NOTHING;\n""")

        f.write(f"\nSELECT setval('episodes_id_seq', (SELECT COALESCE(MAX(id), 1) FROM episodes));\n")

    return len(records)


def process_comments(dump_path, output_path):
    """Process anmi1_comment table"""
    print("Processing anmi1_comment -> comments...")
    records = []

    with open(dump_path, 'r', encoding='utf-8', errors='replace') as f:
        for line in f:
            if "INSERT INTO `anmi1_comment`" in line:
                values = parse_insert_values(line)
                if values and len(values) >= 5:
                    records.append(values)

    print(f"  Found {len(records)} comment records")

    with open(output_path / 'comments.sql', 'w', encoding='utf-8') as f:
        f.write("-- Comments Migration\n")
        f.write(f"-- Records: {len(records)}\n\n")

        for r in records:
            comment_id = r[0]
            anime_id = r[1]
            user_id = r[2] if r[2] else '1'
            reply_id = r[3] if r[3] and r[3] != '0' else 'NULL'
            message = escape_pg(r[4])
            created_at = f"'{r[6]}'" if len(r) > 6 and r[6] else 'NOW()'
            updated_at = f"'{r[5]}'" if len(r) > 5 and r[5] else 'NOW()'

            f.write(f"""INSERT INTO comments (id, anime_id, user_id, reply_to_id, message, created_at, updated_at, legacy_comment_id)
VALUES ({comment_id}, {anime_id}, 1, {reply_id}, {message}, {created_at}, {updated_at}, {comment_id})
ON CONFLICT (id) DO NOTHING;\n""")

        f.write(f"\nSELECT setval('comments_id_seq', (SELECT COALESCE(MAX(id), 1) FROM comments));\n")

    return len(records)


def process_ratings(dump_path, output_path):
    """Process anmi1_rating table"""
    print("Processing anmi1_rating -> ratings...")
    records = []

    with open(dump_path, 'r', encoding='utf-8', errors='replace') as f:
        for line in f:
            if "INSERT INTO `anmi1_rating`" in line:
                values = parse_insert_values(line)
                if values and len(values) >= 3:
                    records.append(values)

    print(f"  Found {len(records)} rating records")

    with open(output_path / 'ratings.sql', 'w', encoding='utf-8') as f:
        f.write("-- Ratings Migration\n")
        f.write(f"-- Records: {len(records)}\n\n")

        idx = 1
        for r in records:
            anime_id = r[0]
            user_id = r[1] if r[1] else '1'
            rating = r[2] if r[2] else '0'

            f.write(f"""INSERT INTO ratings (id, anime_id, user_id, rating)
VALUES ({idx}, {anime_id}, 1, {rating})
ON CONFLICT DO NOTHING;\n""")
            idx += 1

        f.write(f"\nSELECT setval('ratings_id_seq', (SELECT COALESCE(MAX(id), 1) FROM ratings));\n")

    return len(records)


def process_watchlist(dump_path, output_path):
    """Process anmi1_watch table"""
    print("Processing anmi1_watch -> watchlist...")
    records = []

    with open(dump_path, 'r', encoding='utf-8', errors='replace') as f:
        for line in f:
            if "INSERT INTO `anmi1_watch`" in line:
                values = parse_insert_values(line)
                if values and len(values) >= 3:
                    records.append(values)

    print(f"  Found {len(records)} watchlist records")

    with open(output_path / 'watchlist.sql', 'w', encoding='utf-8') as f:
        f.write("-- Watchlist Migration\n")
        f.write(f"-- Records: {len(records)}\n\n")

        for r in records:
            wl_id = r[0]
            anime_id = r[1]
            user_id = r[2] if r[2] else '1'
            status = WATCHLIST_STATUS_MAP.get(r[3], 'watching') if len(r) > 3 else 'watching'

            f.write(f"""INSERT INTO watchlist (id, anime_id, user_id, status)
VALUES ({wl_id}, {anime_id}, 1, '{status}')
ON CONFLICT DO NOTHING;\n""")

        f.write(f"\nSELECT setval('watchlist_id_seq', (SELECT COALESCE(MAX(id), 1) FROM watchlist));\n")

    return len(records)


def process_relations(dump_path, output_path):
    """Process verwandt table"""
    print("Processing verwandt -> anime_relations...")
    records = []

    with open(dump_path, 'r', encoding='utf-8', errors='replace') as f:
        for line in f:
            if "INSERT INTO `verwandt`" in line:
                values = parse_insert_values(line)
                if values and len(values) >= 3:
                    records.append(values)

    print(f"  Found {len(records)} relation records")

    with open(output_path / 'anime_relations.sql', 'w', encoding='utf-8') as f:
        f.write("-- Anime Relations Migration\n")
        f.write(f"-- Records: {len(records)}\n\n")

        for r in records:
            rel_id = r[0]
            anime1 = r[1]
            anime2 = r[2]
            is_active = 'true' if (len(r) > 3 and r[3] == '1') else 'true'

            f.write(f"""INSERT INTO anime_relations (id, anime_id, related_anime_id, is_active)
VALUES ({rel_id}, {anime1}, {anime2}, {is_active})
ON CONFLICT DO NOTHING;\n""")

        f.write(f"\nSELECT setval('anime_relations_id_seq', (SELECT COALESCE(MAX(id), 1) FROM anime_relations));\n")

    return len(records)


def main():
    print("=" * 60)
    print("MySQL to PostgreSQL Migration")
    print("=" * 60)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    if not MYSQL_DUMP.exists():
        print(f"ERROR: MySQL dump not found: {MYSQL_DUMP}")
        sys.exit(1)

    print(f"Input:  {MYSQL_DUMP}")
    print(f"Output: {OUTPUT_DIR}\n")

    # Process tables
    counts = {}
    counts['anime'] = process_anime(MYSQL_DUMP, OUTPUT_DIR)
    counts['episodes'] = process_episodes(MYSQL_DUMP, OUTPUT_DIR)
    counts['comments'] = process_comments(MYSQL_DUMP, OUTPUT_DIR)
    counts['ratings'] = process_ratings(MYSQL_DUMP, OUTPUT_DIR)
    counts['watchlist'] = process_watchlist(MYSQL_DUMP, OUTPUT_DIR)
    counts['relations'] = process_relations(MYSQL_DUMP, OUTPUT_DIR)

    # Summary
    print("\n" + "=" * 60)
    print("Migration Summary:")
    for table, count in counts.items():
        print(f"  {table}: {count} records")
    print("=" * 60)
    print(f"\nSQL files generated in: {OUTPUT_DIR}")
    print("\nNext: Run import script")


if __name__ == '__main__':
    main()
