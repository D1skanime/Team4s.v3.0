"""Run existing guarded badge tests using schema-only disposable scratch databases.
Run on team4s-linux from the canonical repository. Never copies application rows.
"""
import argparse
import datetime
import json
from pathlib import Path
import re
import subprocess
import urllib.parse
import uuid

parser = argparse.ArgumentParser()
parser.add_argument("--out-dir", type=Path, default=Path(__file__).resolve().parents[1] / "evidence" / "after")
args = parser.parse_args()
args.out_dir.mkdir(parents=True, exist_ok=True)

def run(command, **kwargs):
    return subprocess.run(command, check=True, **kwargs)

def configured(name):
    return subprocess.check_output(["docker", "exec", "team4sv30-db", "printenv", name], text=True).strip()

user, password, source = (configured(name) for name in ("POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB"))
suffix = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d%H%M%S") + uuid.uuid4().hex[:8]
results = []
for family, env, test in [
    ("131", "TEAM4S_PHASE131_TEST_DSN", "TestPhase131PublicProfileQueryBudgetIsConstant"),
    ("150", "TEAM4S_PHASE150_04_TEST_DSN", "TestPhase150RoleEntryBadgeEmittedExactlyOnceWithProgress"),
]:
    database = f"team4s_phase{family}_test_p151{suffix}"
    assert re.fullmatch(r"team4s_phase(?:131|150)_test_p151[a-z0-9]+", database) and database != source
    run(["docker", "exec", "team4sv30-db", "createdb", "-U", user, database])
    try:
        schema = subprocess.check_output(["docker", "exec", "team4sv30-db", "pg_dump", "-U", user,
                                          "--schema-only", "--no-owner", "--no-privileges", source])
        run(["docker", "exec", "-i", "team4sv30-db", "psql", "-q", "-v", "ON_ERROR_STOP=1", "-U", user,
             "-d", database], input=schema, stdout=subprocess.DEVNULL)
        dsn = f"postgres://{urllib.parse.quote(user, safe='')}:{urllib.parse.quote(password, safe='')}@team4sv30-db:5432/{database}?sslmode=disable"
        log = args.out_dir / f"postgres-{family}.log"
        with log.open("w") as output:
            result = subprocess.run(["docker", "exec", "-e", f"{env}={dsn}", "team4sv30-backend", "go", "test",
                                     "./internal/repository", "-run", f"^{test}$", "-count=1", "-v"],
                                    stdout=output, stderr=subprocess.STDOUT)
        print(log.read_text())
        results.append({"test": test, "exit_code": result.returncode, "database": database, "log": log.name})
    finally:
        # Only the exact scratch database successfully created above is removed.
        run(["docker", "exec", "team4sv30-db", "dropdb", "-U", user, database])
(args.out_dir / "postgres-tests.json").write_text(json.dumps(results, indent=2) + "\n")
raise SystemExit(0 if all(result["exit_code"] == 0 for result in results) else 1)
