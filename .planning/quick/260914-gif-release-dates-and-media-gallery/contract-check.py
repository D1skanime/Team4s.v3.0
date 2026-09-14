import json, re, subprocess
from pathlib import Path
import yaml
root = Path(__file__).resolve().parents[3]
contract = yaml.safe_load((root / 'shared/contracts/openapi.yaml').read_text())
schemas = contract['components']['schemas']
fields = ['fansub_group_id', 'field', 'direction', 'release_version_id', 'episode_number', 'date']
anchor = schemas['EpisodeVersionDateNeighbor']
assert sorted(anchor['required']) == sorted(fields)
assert sorted(anchor['properties']) == sorted(fields)
assert anchor['properties']['field']['enum'] == ['production_started_on', 'release_date']
assert anchor['properties']['direction']['enum'] == ['previous', 'next']
assert anchor['properties']['date']['format'] == 'date'
context = schemas['EpisodeVersionEditorContext']
assert 'date_neighbors' in context['required']
assert context['properties']['date_neighbors']['items']['$ref'] == '#/components/schemas/EpisodeVersionDateNeighbor'
for field in ['production_started_on', 'release_date']:
    assert schemas['EpisodeVersionPatchRequest']['properties'][field]['nullable']
go = (root / 'backend/internal/models/episode_version.go').read_text().split('type EpisodeVersionDateNeighbor struct {', 1)[1].split('}', 1)[0]
assert sorted(re.findall(r'json:"([^",]+)', go)) == sorted(fields)
ts = (root / 'frontend/src/types/episodeVersion.ts').read_text().split('export interface EpisodeVersionDateNeighbor {', 1)[1].split('}', 1)[0]
for field in fields:
    assert re.search(r'\b' + field + r':', ts)
focused = (root / 'shared/contracts/admin-content.yaml').read_text()
yaml.safe_load('release_metadata_date_rules:' + focused.split('release_metadata_date_rules:', 1)[1])
baseline = subprocess.check_output(['git', 'show', 'cbfec666:shared/contracts/admin-content.yaml'], cwd=root, text=True)
def parse_error(text):
    try:
        yaml.safe_load(text)
        return None
    except yaml.YAMLError as err:
        return {'line': err.problem_mark.line + 1, 'problem': err.problem}
assert parse_error(focused) == parse_error(baseline)
result = {'canonical_yaml': 'pass', 'date_anchor_fields': fields, 'go_ts_openapi': 'pass', 'focused_new_block': 'pass', 'focused_baseline_error_unchanged': parse_error(focused)}
Path(__file__).with_suffix('.json').write_text(json.dumps(result, indent=2))
print(json.dumps(result, indent=2))
