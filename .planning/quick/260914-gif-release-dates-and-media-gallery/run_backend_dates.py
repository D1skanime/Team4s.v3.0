#!/usr/bin/env python3
"""Resource-bounded focused backend gate. Run only after coordinated GO."""
from pathlib import Path
import json, subprocess, time

ROOT = Path("/home/d1sk/team4s")
OUT = ROOT / ".planning/quick/260914-gif-release-dates-and-media-gallery"
PG = "team4s-quick-gif-dates-db"
GO = "team4s-quick-gif-dates-go"
LABEL = "team4s.quick=260914-gif-dates"
OWNED = {}

def call(args, **kwargs):
    return subprocess.run(args, check=True, text=True, capture_output=True, **kwargs)

try:
    for name in (PG, GO):
        exists = subprocess.run(["docker", "inspect", name], capture_output=True)
        if exists.returncode == 0:
            raise RuntimeError(f"refusing to reuse existing container {name}")
    OWNED[PG] = call(["docker", "run", "--detach", "--name", PG,
        "--label", LABEL, "--network", "team4s_default", "--memory=384m",
        "--tmpfs", "/var/lib/postgresql/data:rw,size=256m", "-e", "POSTGRES_HOST_AUTH_METHOD=trust",
        "-e", "POSTGRES_DB=team4s_phase117_test_gif", "postgres:16",
        "-c", "shared_buffers=32MB", "-c", "max_connections=30"]).stdout.strip()
    for attempt in range(50):
        ready = subprocess.run(["docker", "exec", PG, "pg_isready", "-h", "127.0.0.1", "-U", "postgres"], capture_output=True)
        if ready.returncode == 0: break
        time.sleep(0.2)
    else: raise RuntimeError("isolated PostgreSQL not ready")
    OWNED[GO] = call(["docker", "run", "--detach", "--name", GO,
        "--label", LABEL, "--network", "team4s_default", "--memory=1400m",
        "-e", "GOMEMLIMIT=800MiB", "-e", "GOMAXPROCS=2", "-e", "CGO_ENABLED=0",
        "--entrypoint", "sleep", "--mount", f"type=bind,src={ROOT}/backend,dst=/app,readonly",
        "--mount", f"type=bind,src={ROOT}/database,dst=/database,readonly",
        "--mount", f"type=bind,src={ROOT}/shared,dst=/shared,readonly",
        "--mount", f"type=bind,src={ROOT}/frontend/src/types,dst=/frontend/src/types,readonly",
        "--mount", "type=volume,src=team4s_backend_go_build,dst=/root/.cache/go-build",
        "-w", "/app", "team4s-team4sv30-backend", "1800"]).stdout.strip()
    command = ["docker", "exec", "-e", f"TEAM4S_PHASE117_TEST_DSN=postgres://postgres@{PG}:5432/team4s_phase117_test_gif?sslmode=disable",
        GO, "go", "test", "-p", "1", "./internal/models", "./internal/handlers", "./internal/repository",
        "-run", "EpisodeVersionDate|ValidateEpisodeVersionDates|EpisodeVersionPublic|ReleaseStreamIdentity", "-count=1", "-json"]
    started = time.time()
    result = subprocess.run(command, text=True, capture_output=True, timeout=900)
    (OUT / "backend-focused-final.jsonl").write_text(result.stdout + result.stderr)
    events = []
    for line in result.stdout.splitlines():
        try: events.append(json.loads(line))
        except ValueError: pass
    counts = {action: sum(1 for event in events if event.get("Action") == action and event.get("Test")) for action in ("pass", "fail", "skip")}
    report = {"exit_code": result.returncode, "elapsed_seconds": round(time.time() - started, 2), "tests": counts,
        "command": command, "memory": "Go1400MiB/GOMEMLIMIT800MiB/GOMAXPROCS2/-p1; PostgreSQL384MiB/tmpfs256MiB"}
    (OUT / "backend-focused-final.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report), flush=True)
    if result.returncode:
        print(result.stderr)
        for event in events:
            if event.get("Action") == "fail" or "Error:" in event.get("Output", ""): print(event)
        raise RuntimeError("focused backend gate failed")
finally:
    for name in (GO, PG):
        expected = OWNED.get(name)
        if not expected: continue
        actual = call(["docker", "inspect", "--format", "{{.Id}}", name]).stdout.strip()
        if actual != expected: raise RuntimeError(f"container ID changed for {name}; refusing removal")
        call(["docker", "stop", "--time", "1", name])
        call(["docker", "rm", name])
        print(f"removed owned test container {name}", flush=True)
