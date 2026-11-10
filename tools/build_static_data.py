#!/usr/bin/env python3
"""Build the parts of the site that need no model output: decision map (rule engine), training curves (logs), timeline (dataset).

    python3 tools/build_static_data.py --repo ../myndighetsbeslut --logs .logs
"""
import argparse
import collections
import copy
import datetime as dt
import itertools
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets")

DOMAINS = {
    "studietakt": ("Studietakt", "%", [25, 50, 75, 100]),
    "veckor": ("Studietid", "veckor", [1, 2, 3, 5, 10, 15, 22]),
    "alder": ("Ålder", "år", [25, 35, 45, 55, 60, 61, 64]),
    "inkomst": ("Inkomst under halvåret", "kr", [0, 30000, 60000, 90000, 120000, 150000, 200000, 300000]),
    "dagar": ("Ansökan före studiestart", "dagar", [30, 0, -20, -30, -40, -60, -90]),
}


def build_karta(repo):
    sys.path.insert(0, repo)
    from myndighetsbeslut import csn
    import build_whatif as W
    start = W.START

    def apply(a, var, v):
        if var == "studietakt":
            a["studietakt_procent"] = v
        elif var == "veckor":
            a["studieveckor"] = v
        elif var == "alder":
            a["fodelsear"] = a["kalenderar"] - v
        elif var == "inkomst":
            a["inkomst_kalenderhalvaret"] = v
        elif var == "dagar":
            a["ansokan_inkom"] = (start - dt.timedelta(days=v)).isoformat()

    cells = {}
    for va, vb in itertools.combinations(DOMAINS, 2):
        rows = []
        for i, x in enumerate(DOMAINS[va][2]):
            for j, y in enumerate(DOMAINS[vb][2]):
                a = copy.deepcopy(W.BASE)
                apply(a, va, x)
                apply(a, vb, y)
                o = csn.decide(a)
                rows.append([i, j, o["utfall"], o["skal"], o.get("veckor_beviljade"), o.get("totalt_kr"), o.get("lagrum", [])])
        cells["%s|%s" % (va, vb)] = rows
    base = {"studietakt": 100, "veckor": 22, "alder": W.BASE["kalenderar"] - W.BASE["fodelsear"], "inkomst": 0, "dagar": 30}
    return {"vars": {k: {"label": l, "unit": u, "values": v} for k, (l, u, v) in DOMAINS.items()}, "base": base, "cells": cells}


def build_training(logs):
    out = {}
    for key, fn in (("sven", "train-178990.out"), ("kev", "train-178993.out")):
        txt = open(os.path.join(logs, fn), encoding="utf-8").read()
        pts = [(int(m.group(1)), int(m.group(2)), int(m.group(3)), float(m.group(4)))
               for m in re.finditer(r"ep(\d+) step (\d+)/(\d+) loss ([\d.]+)", txt)]
        total = pts[-1][2]
        out[key] = {"total": total, "loss": [[p[1], p[3]] for p in pts]}
    return out


def build_timeline(repo):
    envs = {"oks_overklagande": "ÖKS", "onh_overklagande": "ÖNH", "jo_tillsyn": "JO", "skolinspektionen_tillsyn": "Skolinspektionen"}
    out = {}
    for env, name in envs.items():
        c = collections.defaultdict(lambda: [0, 0, 0])
        with open(os.path.join(repo, "data", "tasks", env + ".jsonl"), encoding="utf-8") as fh:
            for line in fh:
                r = json.loads(line)
                d = r["verifier_metadata"].get("date") or ""
                if len(d) < 4:
                    continue
                c[d[:4]][{"train": 0, "val": 1, "test": 2}[r["split"]]] += 1
        out[name] = {y: v for y, v in sorted(c.items())}
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--logs", required=True)
    a = ap.parse_args()
    sp = {}
    for key, fn in (("t06", "eval_sven-06b-v2_trained.json"), ("t4", "eval_kev-4b-v2_trained.json")):
        e = json.load(open(os.path.join(os.path.abspath(a.repo), "results_sven", fn), encoding="utf-8"))
        sp[key] = {"s": e["seconds"], "n": e["n_records"]}
    data = {"speed": sp, "karta": build_karta(os.path.abspath(a.repo)), "training": build_training(a.logs), "timeline": build_timeline(os.path.abspath(a.repo))}
    with open(os.path.join(OUT, "static.js"), "w", encoding="utf-8") as fh:
        fh.write("window.STATIC=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print({k: len(json.dumps(v)) for k, v in data.items()})
    print(data["timeline"])


if __name__ == "__main__":
    main()
