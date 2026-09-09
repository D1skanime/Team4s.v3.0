"""Build audit tables from captured evidence; no application or database mutation."""
import json
import statistics
from pathlib import Path

ROOT = Path(__file__).resolve().parent
browser = json.loads((ROOT / "browser-summary.json").read_text())
backend = json.loads((ROOT / "backend.json").read_text())
images = json.loads((ROOT / "images.json").read_text())

def fmt(value, digits=1):
    return "—" if value is None else f"{value:,.{digits}f}".replace(",", " ")

def table(headers, rows):
    return "\n".join(["| " + " | ".join(headers) + " |",
                      "| " + " | ".join(["---"] * len(headers)) + " |"] +
                     ["| " + " | ".join(str(v) for v in row) + " |" for row in rows]) + "\n"

def lookup(label, route, cache="cold", iteration=1):
    return next(x for x in browser if x["label"] == label and x["route"] == route
                and x["cache"] == cache and x["iteration"] == iteration)

routes = ["fansubs/new-subs", "members/timer", "members/kara"]
out = ["# Messwerttabellen\n\nAlle MB sind dezimal. Zeitangaben in ms. Vollständige Einzelwerte und weitere Läufe: browser-summary.json.\n"]
for label in ["baseline-final", "production-diagnostic"]:
    out.append(f"## {label}: stabile Wiederholung 1\n")
    rows = []
    for route in routes:
        for cache in ["cold", "warm"]:
            x = lookup(label, route, cache)
            rows.append([route, cache, fmt(x["ttfb"]), fmt(x["dcl"]), fmt(x["load"]),
                         x["requests"], fmt(x["transferred"]/1e6,3), fmt(x["decoded"]/1e6,3),
                         fmt(x["kinds"]["js"]["transferred"]/1e6,3),
                         fmt(x["kinds"]["js"]["decoded"]/1e6,3),
                         fmt(x["kinds"]["css"]["transferred"]/1e3),
                         fmt(x["kinds"]["images"]["transferred"]/1e3),
                         x["kinds"].get("api",{}).get("requests",0),
                         x["kinds"].get("rsc",{}).get("requests",0),
                         sum(v["cached"] for v in x["kinds"].values())])
    out.append(table(["Route","Cache","TTFB","DCL","Load","Requests","Transfer MB","Resource MB","JS MB","JS roh MB","CSS kB","Bilder kB","Browser-API","RSC","Cache-Treffer"],rows))
out.append("Resource bytes = dekomprimierte HTTP-Bodies, nicht Bild-Pixelspeicher. Requests zählen den gesamten Lauf einschließlich Scrollen, Interaktion und Prefetch. Warm lädt in DEV JS erneut; in Produktion greifen Browser-Caches. RSC-Prefetch ist separat von Browser-API erfasst.\n")

out.append("## Main Thread und DOM: baseline-final / cold / Wiederholung 1\n")
keys = [("TTFB ms","ttfb"),("Load ms","load"),("Script bis sichtbar ms","scriptInitialMs"),("Layout bis sichtbar ms","layoutInitialMs"),("Style bis sichtbar ms","styleInitialMs"),("Long Task maximal ms","longest"),("Long Task nach sichtbar ms","longestAfterVisible"),("Heap sichtbar MB","heapVisible"),("Heap nach Scroll + GC MB","heapEnd"),("Dokument-Elemente sichtbar","domElements"),("DOMCounters nach Scroll","nodesEnd"),("Listener nach Scroll","listenersEnd"),("Root-Commits initial","commitsInitial"),("Zusätzliche Root-Commits beim Scrollen","commitsScroll"),("Scroll Script ms","scrollScriptMs"),("Scroll Layout ms","scrollLayoutMs"),("Scroll Style ms","scrollStyleMs")]
rows=[]
for title,key in keys:
    vals=[]
    for route in routes:
        val=lookup("baseline-final",route)[key]
        vals.append(fmt(val/1e6 if "MB" in title else val,3 if "MB" in title else 2))
    rows.append([title,*vals])
out.append(table(["Faktor","Group new-subs","Member timer","Member kara"],rows))
out.append("Heap sichtbar wurde nicht erzwungen gesammelt; der niedrigere Wert nach Scrollen ist kein Beleg für Speicherfreigabe durch Scrollen. Vergleichbare Vorher-/Nachher-GC-Werte stehen im Bericht. Script/Layout/Style-Zähler laufen über Reloads weiter; deshalb werden nur Cold-Zähler als initiale Dauer ausgewiesen. Warm-Auswertung nutzt die je Lauf getrennten Traces. Root-Commits sind keine gemessenen React-Profiler-Renderdauern.\n")

out.append("## A/B-Isolation: Wiederholung 1, DEV\n")
labels=["baseline-repeat","A-story-removed","A2-renderer-direct","B-badges-removed","C-carousel-static","D-projects-removed","E-contributions-removed","F-images-disabled","G-header-only","H-neutral-not-found"]
rows=[]
for label in labels:
    a=lookup(label,"members/timer");b=lookup(label,"members/kara")
    aw=lookup(label,"members/timer","warm");bw=lookup(label,"members/kara","warm")
    rows.append([label,fmt(b["kinds"]["js"]["transferred"]/1e6,3),fmt(b["kinds"]["js"]["decoded"]/1e6,3),
                 fmt(a["load"]),fmt(aw["load"]),fmt(b["load"]),fmt(bw["load"]),
                 fmt(a["scriptInitialMs"]),fmt(b["scriptInitialMs"]),
                 fmt(aw["heapEnd"]/1e6,3),fmt(bw["heapEnd"]/1e6,3),b["domElements"]])
out.append(table(["Variante","JS MB","JS roh MB","timer cold","timer warm","kara cold","kara warm","timer Script cold","kara Script cold","timer Heap GC MB","kara Heap GC MB","kara Elemente"],rows))
out.append("Iteration 0 kann Fast Refresh/Neukompilierung enthalten und dient nicht als Kausalvergleich. Kleine Unterschiede der Ladezeit liegen im beobachteten Streubereich; Payload-/Modulunterschiede sind stärker belegt. Variantenwirkungen überlappen und dürfen nicht addiert werden. G lässt den echten vollständigen Backend-Aggregator bestehen.\n")

out.append("## SQL und Serialisierung\n")
rows=[]
for case in sorted({x["case"] for x in backend["runs"]}):
    runs=[x for x in backend["runs"] if x["case"]==case]
    rows.append([case,len(runs[0]["queries"]),fmt(statistics.median(r["total_ms"] for r in runs),3),
                 fmt(runs[0]["total_ms"],3),fmt(runs[-1]["total_ms"],3),
                 fmt(statistics.median(r["marshal_ms"] for r in runs),3),runs[0]["bytes"]])
out.append(table(["Loader","SQL","Median 7 Läufe ms","Erster Lauf ms","Letzter Lauf ms","json.Marshal Median ms","DTO Bytes"],rows))
out.append("Neue Tracer-Verbindung, vorbereitete Pläne wärmen während der Serie auf. HTTP wurde separat am bereits laufenden Backend gemessen. json.Marshal misst DTO-Serialisierung, nicht vollständig Handler-Mapping + Response-Envelope.\n")
runs=[x for x in backend["runs"] if x["case"]=="member-timer"]
rows=[]
for i,q in enumerate(runs[-1]["queries"]):
    caller=next((c.split('.')[-1] for c in q["caller"] if 'load' in c or 'count' in c or 'Resolve' in c),"GetPublicMemberProfileByID")
    p=next(p for p in backend["plans"] if p["case"]=="member-timer" and p["index"]==i)["plan"][0]
    rows.append([i,caller,fmt(statistics.median(r["queries"][i]["duration_ms"] for r in runs),3),fmt(q["duration_ms"],3),
                 q["rows"],fmt(p["Planning Time"],3),fmt(p["Execution Time"],3)])
out.append(table(["SQL #","Codepfad","Median ms","Letzter Lauf ms","Zeilen","EXPLAIN Planning ms","EXPLAIN Execution ms"],rows))

out.append("## Navigation: gleiches Gruppendokument nach jedem Zyklus\n")
rows=[]
for name in ["dev-member","dev-group","production-diagnostic-member","production-diagnostic-group","production-eager-member","production-no-auto-sizes-member"]:
    d=json.loads((ROOT/("retention-"+name+".json")).read_text())
    a=d["samples"][0];b=next(x for x in d["samples"] if x["phase"]=="cycle-11")
    rows.append([name,a["dom"]["nodes"],b["dom"]["nodes"],a["elements"],b["elements"],
                 a["dom"]["jsEventListeners"],b["dom"]["jsEventListeners"],
                 fmt(a["metrics"]["JSHeapUsedSize"]/1e6,3),fmt(b["metrics"]["JSHeapUsedSize"]/1e6,3)])
out.append(table(["Versuch","Nodes vorher","Nodes nach 12","Elemente vorher","Elemente nach 12","Listener vorher","Listener nach 12","Heap vorher MB","Heap nach 12 MB"],rows))
out.append("In allen Samples GC erzwungen. Member-Interventionen ändern ausschließlich Bildattribute im Browser; Seiten und Daten bleiben identisch. Vollständige Haltepfade: retainers.json.\n")
(ROOT/"TABLES.md").write_text("\n".join(out),encoding="utf-8")

out=["# Tatsächliche Bildauslieferung\n\nInventar aus den drei Cold-Baselines nach Scrollen/Interaktion. Vollständige URLs, gerenderte Maße, fetchPriority, loading/decoding, Status und Quelldateimetadaten: images.json. Größen in Bytes.\n"]
for case in sorted({x["case"] for x in images}):
    out.append("## "+case+"\n")
    rows=[]
    for a in [x for x in images if x["case"]==case]:
        meta=a.get("sourceMetadata") or {}
        rendered=a.get("rendered") or {}
        request=a["request"].replace("http://127.0.0.1:3000","")
        rows.append([a["source"],meta.get("format","extern"),a.get("sourceBytes") or "nicht separat erfasst",
                     str(meta.get("width","?"))+"×"+str(meta.get("height","?")),
                     a["transferred"],a.get("deliveredFormat"),fmt(rendered.get("width"),0)+"×"+fmt(rendered.get("height"),0),
                     "Next" if a.get("nextImage") else "direkt",a.get("loading"),a.get("decoding"),a.get("fetchPriority"),
                     "`"+request.replace("|","%7C")+"`"])
    out.append(table(["Quelle","Format","Quelle Bytes","Quelle Pixel","Transfer Bytes","Ausgeliefert","Gerendert","Transport","Loading","Decoding","Priorität","Browser-Request"],rows))
out.append("Ein Asset kann als Hero und Stage in unterschiedlichen Größen angefordert werden. Source Bytes nicht mehrfach als Netzwerktransfer addieren. Baseline-Preloads stehen zusätzlich in den Rohdateien unter preloads; Artwork hier lazy/async und ohne High-Priority-Preload. Externe Logos/Poster wurden normal angefordert, ihre Originaldatei nicht gesondert heruntergeladen.\n")
(ROOT/"ASSETS.md").write_text("\n".join(out),encoding="utf-8")
