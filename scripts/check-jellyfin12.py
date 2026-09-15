#!/usr/bin/env python3
"""Bounded, read-only Jellyfin/Team4s diagnostic; never imports or updates rows.

Run on the canonical Linux host. Credentials are read from the existing backend
container in memory. Output is an explicit whitelist; no response body, source
path, request URL or authentication header is serialized wholesale.
"""
import argparse
import hashlib
import json
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / 'docs/audits/2026-09-15-jellyfin12'
FIELDS = 'MediaSources,MediaStreams,Path,ParentId'
MAX_REQUESTS = 64
MAX_JSON_BYTES = 16 * 1024 * 1024


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, target):
        return None  # Never forward provider credentials, even during diagnostics.


def configuration():
    result = subprocess.run(['docker', 'inspect', 'team4sv30-backend'],
                            capture_output=True, text=True, check=True)
    values = dict(entry.split('=', 1) for entry in
                  json.loads(result.stdout)[0]['Config']['Env'] if '=' in entry)
    base = values.get('JELLYFIN_BASE_URL', '').strip()
    key = values.get('JELLYFIN_API_KEY', '').strip()
    parsed = urllib.parse.urlsplit(base)
    if (parsed.scheme not in ('http', 'https') or not parsed.hostname or
            parsed.username or parsed.password or parsed.query or parsed.fragment or
            not key or '\r' in key or '\n' in key):
        raise ValueError('Invalid configured provider boundary')
    return base.rstrip('/'), key


class Probe:
    def __init__(self, base, key):
        self.base, self.key = base, key
        self.opener = urllib.request.build_opener(NoRedirect())
        self.requests, self.failures = [], []

    def get(self, label, endpoint, query=None, *, backend=False, binary=False,
            prefix=None, expected=(200,), timeout=25, authenticate=True):
        if len(self.requests) >= MAX_REQUESTS:
            raise RuntimeError('Request budget exhausted')
        base = 'http://127.0.0.1:18092/api/v1' if backend else self.base
        headers = {'Accept': '*/*' if binary else 'application/json'}
        if authenticate and not backend:
            escaped = self.key.replace('\\', '\\\\').replace('"', '\\"')
            headers['Authorization'] = 'MediaBrowser Token="' + escaped + '"'
        if prefix is not None:
            headers['Range'] = 'bytes=0-' + str(prefix - 1)
        target = base + '/' + endpoint.lstrip('/')
        if query:
            target += '?' + urllib.parse.urlencode(query)
        started = time.monotonic()
        record = {'label': label, 'surface': 'team4s' if backend else 'provider'}
        self.requests.append(record)
        try:
            request = urllib.request.Request(target, headers=headers, method='GET')
            with self.opener.open(request, timeout=timeout) as response:
                record['status'] = response.status
                limit = prefix if prefix is not None else MAX_JSON_BYTES
                body = response.read(limit if prefix is not None else limit + 1)
                record['bytes_read'] = len(body)
                record['content_type'] = response.headers.get_content_type()
                record['body_sha256'] = hashlib.sha256(body).hexdigest()
                if prefix is not None:
                    record['prefix_only'] = True
                    record['content_range'] = response.headers.get('Content-Range')
                elif len(body) > limit:
                    raise ValueError('Response exceeded byte budget')
                if response.status not in expected:
                    self.failures.append(label + ': unexpected status')
                return None if binary else json.loads(body)
        except urllib.error.HTTPError as error:
            record['status'] = error.code
            error.close()
            if error.code not in expected:
                self.failures.append(label + ': HTTP ' + str(error.code))
        except Exception as error:
            record['error_type'] = type(error).__name__  # Never str(error)/body/URL.
            self.failures.append(label + ': ' + type(error).__name__)
        finally:
            record['elapsed_ms'] = round((time.monotonic() - started) * 1000)
        return None

    def require(self, label, condition):
        if not condition:
            self.failures.append(label)


def item_id(value):
    value = str(value or '')
    if not re.fullmatch(r'[a-fA-F0-9-]{32,36}', value):
        raise ValueError('Invalid provider item identity')
    return value


def path_identity(value):
    return str(value or '').strip().replace('\\', '/')


def inventory(payload):
    items = (payload or {}).get('Items', [])
    ids = {item.get('Id') for item in items}
    sources = {source.get('Id') for item in items for source in item.get('MediaSources', [])}
    bindings = []
    for item in items:
        matches = [source for source in item.get('MediaSources', [])
                   if path_identity(item.get('Path')) and
                   path_identity(source.get('Path')) == path_identity(item.get('Path'))]
        binding = {'item_id': item.get('Id'), 'episode': item.get('IndexNumber'),
                   'season': item.get('ParentIndexNumber'), 'own_path_matches': len(matches),
                   'source_count': len(item.get('MediaSources', []))}
        if len(matches) == 1:
            source = matches[0]
            binding.update({'source_id': source.get('Id'), 'container': source.get('Container'),
                            'streams_complete': isinstance(source.get('MediaStreams'), list),
                            'tracks': [{key: stream.get(upstream) for key, upstream in
                                        [('index', 'Index'), ('type', 'Type'), ('codec', 'Codec'),
                                         ('language', 'Language'), ('default', 'IsDefault'), ('forced', 'IsForced')]}
                                       for stream in source.get('MediaStreams', [])
                                       if stream.get('Type') in ('Audio', 'Subtitle')]})
        bindings.append(binding)
    return {'items': len(items), 'total': (payload or {}).get('TotalRecordCount'),
            'unique_items': len(ids), 'unique_sources': len(sources),
            'non_item_sources': len(sources - ids),
            'all_unique_own_path': all(b['own_path_matches'] == 1 for b in bindings),
            'bindings': bindings}


def probe_source_contrast(probe, items):
    """Read two bounded prefixes for the user's same-item multi-source case."""
    for item in items:
        if item.get('IndexNumber') != 1 or item.get('ParentIndexNumber') != 1:
            continue
        sources = item.get('MediaSources', [])
        own = [source for source in sources if path_identity(item.get('Path')) and
               path_identity(source.get('Path')) == path_identity(item.get('Path'))]
        if len(own) != 1:
            continue
        other = next((source for source in sources if source.get('Container') and
                      source.get('Container') != own[0].get('Container')), None)
        if other is None:
            continue
        iid = item_id(item['Id'])
        result = {'item_id': iid, 'sources': []}
        records = []
        for label, source in [('own', own[0]), ('alternative', other)]:
            sid = item_id(source['Id'])
            probe.get('11eyes-episode1-' + label + '-range', '/Videos/' + iid + '/stream',
                      {'static': 'true', 'MediaSourceId': sid}, binary=True, prefix=64, expected=(206,))
            record = probe.requests[-1]
            records.append(record)
            result['sources'].append({'source_id': sid, 'container': source.get('Container'),
                                      'request_label': record['label']})
        result['different_prefixes'] = all(record.get('status') == 206 and record.get('bytes_read') == 64
                                           for record in records) and records[0].get('body_sha256') != records[1].get('body_sha256')
        probe.require('11eyes source selector must deliver distinct MKV/MP4 file prefixes', result['different_prefixes'])
        return result
    probe.require('11eyes Episode1 contrasting-source sample is available', False)
    return None


def run(probe):
    baseline = json.loads((EVIDENCE / 'discovery-live.json').read_text())
    api_baseline = json.loads((EVIDENCE / 'openapi-used-endpoints.json').read_text())
    report = {'timestamp': datetime.now(timezone.utc).isoformat(),
              'mode': 'read-only', 'commit': subprocess.check_output(
                  ['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
              'limits': {'requests': MAX_REQUESTS, 'response_bytes': MAX_JSON_BYTES},
              'notes': ['This probe verifies live responses, not database writes or Human-UAT.',
                        'Production source selection is tested separately by the Go fixture suite.',
                        'Legacy query401/header200 evidence remains in discovery-live.json.',
                        'No library rescan, live import, relink or backfill is performed.']}
    info = probe.get('server-info', '/System/Info')
    report['server_version'] = (info or {}).get('Version')
    schema = probe.get('running-openapi', '/api-docs/openapi.json', authenticate=False)
    if schema:
        fields = schema.get('components', {}).get('schemas', {}).get('ItemFields', {}).get('enum', [])
        report['schema'] = {'version': schema.get('info', {}).get('version'),
                            'used_paths': {path: {'present': 'get' in schema.get('paths', {}).get(path, {}),
                                                 'deprecated': schema.get('paths', {}).get(path, {}).get('get', {}).get('deprecated', False)}
                                           for path in api_baseline['endpoints']},
                            'requested_fields_valid': all(field in fields for field in FIELDS.split(','))}
        probe.require('requested ItemFields must be documented', report['schema']['requested_fields_valid'])
        probe.require('used paths must remain documented/nondeprecated', all(
            x['present'] and not x['deprecated'] for x in report['schema']['used_paths'].values()))
    report['series'] = {}
    buddy_items, buddy_id = [], None
    for name in ['Buddy Complex', '11eyes']:
        found = probe.get('search-' + name, '/Items', {'IncludeItemTypes': 'Series', 'Recursive': 'true',
                          'SearchTerm': name, 'Limit': 25, 'Fields': 'Path,Overview', 'EnableUserData': 'false'})
        candidates = [item for item in (found or {}).get('Items', []) if item.get('Name', '').casefold() == name.casefold()]
        probe.require(name + ': exact series exists', bool(candidates))
        if not candidates:
            continue
        series_id = item_id(candidates[0].get('Id'))
        episodes = probe.get('episodes-' + name, '/Shows/' + series_id + '/Episodes',
                             {'Fields': FIELDS, 'EnableUserData': 'false', 'EnableTotalRecordCount': 'true'})
        observed = inventory(episodes)
        observed['series_matches'] = len(candidates)
        observed['series_id'] = series_id
        report['series'][name] = observed
        probe.require(name + ': unique complete items and own-path sources',
                      observed['items'] == observed['unique_items'] == observed['total'] and observed['all_unique_own_path'])
        if name == '11eyes':
            old = json.loads((EVIDENCE / 'discovery-11eyes-coverage.json').read_text())
            observed['matches_recorded_inventory'] = all([
                observed['items'] == old['items'], observed['unique_sources'] == old['unique_sources'],
                observed['non_item_sources'] == old['nested_sources_absent_as_items']])
            probe.require('11eyes: recorded inventory changed; investigate before comparing', observed['matches_recorded_inventory'])
            report['11eyes_source_streams'] = probe_source_contrast(probe, (episodes or {}).get('Items', []))
        else:
            buddy_items, buddy_id = (episodes or {}).get('Items', []), series_id
    if buddy_id and buddy_items:
        ids = [item['Id'] for item in buddy_items]
        page_ids, totals = [], []
        for offset in range(0, len(ids), 5):
            page = probe.get('buddy-page-' + str(offset), '/Items',
                             {'ParentId': buddy_id, 'IncludeItemTypes': 'Episode', 'Recursive': 'true',
                              'Fields': FIELDS, 'SortBy': 'IndexNumber', 'SortOrder': 'Ascending',
                              'EnableUserData': 'false', 'Limit': 5, 'StartIndex': offset})
            page_ids.extend(item['Id'] for item in (page or {}).get('Items', []))
            totals.append((page or {}).get('TotalRecordCount'))
        report['buddy_paging'] = {'ordered_equal': ids == page_ids, 'pages': len(totals),
                                  'totals': totals, 'unique_ids': len(set(page_ids))}
        probe.require('Buddy paging must reproduce ordered unique full collection',
                      ids == page_ids and len(ids) == len(set(page_ids)) and all(total == len(ids) for total in totals))
        exact = probe.get('exact-item-batch', '/Items', {'Ids': ','.join(ids), 'Limit': len(ids),
                         'Fields': FIELDS, 'EnableUserData': 'false', 'EnableTotalRecordCount': 'true'})
        probe.require('exact item set', {item['Id'] for item in (exact or {}).get('Items', [])} == set(ids))
        probe.get('provider-primary', '/Items/' + buddy_id + '/Images/Primary', {'maxWidth': 64, 'quality': 35}, binary=True)
        probe.get('provider-logo', '/Items/' + buddy_id + '/Images/Logo', {'maxWidth': 64, 'quality': 35}, binary=True)
        probe.get('provider-theme-videos', '/Items/' + buddy_id + '/ThemeVideos')
        item = next((item for item in buddy_items if any(stream.get('Type') == 'Subtitle'
                     for source in item.get('MediaSources', []) for stream in source.get('MediaStreams', []))), buddy_items[0])
        own = [source for source in item.get('MediaSources', []) if path_identity(source.get('Path')) == path_identity(item.get('Path'))]
        if len(own) == 1:
            source = own[0]
            iid, sid = item_id(item['Id']), item_id(source['Id'])
            probe.get('provider-video-range', '/Videos/' + iid + '/stream',
                      {'static': 'true', 'MediaSourceId': sid}, binary=True, prefix=64, expected=(206,))
            subtitle = next((stream for stream in source.get('MediaStreams', [])
                             if stream.get('Type') == 'Subtitle' and stream.get('Codec') in ('ass', 'ssa')), None)
            if subtitle is not None:
                index = int(subtitle['Index'])
                probe.get('provider-subtitle', '/Videos/' + iid + '/' + sid + '/Subtitles/' + str(index) + '/Stream.ass',
                          binary=True, timeout=35)
            probe.get('team4s-video-range', '/media/video', {'provider': 'jellyfin', 'item_id': iid},
                      backend=True, binary=True, prefix=64, expected=(206,))
    libraries = probe.get('library-folders', '/Library/MediaFolders')
    report['library_count'] = len((libraries or {}).get('Items', []))
    root_query = next((row['query'] for row in baseline['requests']
                       if row['label'] == 'group-root-explicit-nonrecursive'), None)
    if root_query:
        probe.require('recorded group library exists', any(x.get('Id') == root_query['ParentId'] for x in (libraries or {}).get('Items', [])))
        roots = probe.get('group-direct-roots', '/Items', {**root_query, 'Fields': 'Path,ParentId'})
        descendants = probe.get('group-recursive-children', '/Items', {**root_query, 'Fields': 'Path,ParentId', 'Recursive': 'true'})
        report['groups'] = {'direct': len((roots or {}).get('Items', [])), 'descendants': len((descendants or {}).get('Items', []))}
        report['groups']['reported_parent_ids'] = sorted({str(x.get('ParentId')) for x in (roots or {}).get('Items', [])})
        report['groups']['queried_library_id'] = root_query['ParentId']
        report['groups']['parent_note'] = 'CollectionFolder query identity can differ from physical Folder ParentId; see group-parent-followup.json.'
        probe.require('direct roots collection must be complete', (roots or {}).get('TotalRecordCount') == report['groups']['direct'])
        probe.require('direct root set contained in descendants',
                      {x['Id'] for x in (roots or {}).get('Items', [])} <= {x['Id'] for x in (descendants or {}).get('Items', [])})
    for index, before in enumerate(json.loads((EVIDENCE / 'team4s-api-baseline.json').read_text())):
        parsed = urllib.parse.urlsplit(before['path'])
        is_image = parsed.path == '/media/image'
        result = probe.get('team4s-baseline-' + str(index), parsed.path,
                           dict(urllib.parse.parse_qsl(parsed.query)), backend=True, binary=is_image)
        if parsed.path.endswith('/releases/40') and result:
            report['public_technical'] = {key: result.get(key) for key in
                ['container', 'video_codec', 'audio_codec', 'audio_language', 'subtitle_type', 'subtitle_tracks']}
        if parsed.path.endswith('/backdrops') and result:
            report['manifest_provider'] = result.get('data', {}).get('provider')
    original = json.loads((EVIDENCE / 'release48-pre-projection.json').read_text())
    original_result = probe.get('team4s-original-release48', original['route'], backend=True)
    if original_result:
        report['original_release48_technical'] = {key: original_result.get(key) for key in
            ['container', 'video_codec', 'audio_codec', 'audio_language', 'subtitle_type', 'subtitle_tracks']}
    report['requests'], report['failures'] = probe.requests, probe.failures
    report['request_count'] = len(probe.requests)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--read-only', action='store_true', required=True)
    parser.add_argument('--output', type=Path, default=EVIDENCE / 'live-after.json')
    args = parser.parse_args()
    try:
        args.output = args.output.resolve()
        if not args.output.is_relative_to(EVIDENCE.resolve()):
            raise ValueError('Report must remain inside the phase evidence directory')
        base, key = configuration()
        result = run(Probe(base, key))
        output = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
        # Fail closed before writing or echoing any whitelisted provider strings.
        variants = {key, urllib.parse.quote(key, safe=''), urllib.parse.quote_plus(key),
                    json.dumps(key)[1:-1], key.replace('\\', '\\\\').replace('"', '\\"')}
        if any(value and value in output for value in variants):
            raise ValueError('Output secret boundary failed')
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(output)
        print(json.dumps({'requests': result['request_count'], 'failures': result['failures'],
                          'report': str(args.output.relative_to(ROOT))}, ensure_ascii=False))
        return int(bool(result['failures']))
    except Exception as error:
        print(json.dumps({'error_type': type(error).__name__, 'message': 'Read-only verification could not finish; no raw diagnostic emitted.'}))
        return 2


if __name__ == '__main__':
    sys.exit(main())
