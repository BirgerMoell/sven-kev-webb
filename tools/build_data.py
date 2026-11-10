#!/usr/bin/env python3
"""Build assets/data.js for the website from real model output.

Inputs (not in the repo): per-question probabilities from sven_predict.py for four checkpoints
(Sven 0.6B and Kev 4B, before and after our training), the heldout Sven records and the what-if metadata.

    python3 tools/build_data.py --preds .preds --heldout path/heldout.jsonl --whatif-meta path/whatif_meta.json \
        --evals path/results_sven

Only synthetic cases (CSN, förvaltningslagen) are shown in full. The real published decisions enter only as
confidence and correctness numbers, never as text.
"""
import argparse
import collections
import json
import os

MODELS = {"z06": "sven06b_zeroshot", "t06": "sven06b_trained", "z4": "kev4b_zeroshot", "t4": "kev4b_trained"}

AKT_LABEL = {
    "fodelsear": "Född", "kalenderar": "Ansökan avser år", "medborgarskap": "Medborgarskap", "utbildning": "Utbildning",
    "niva": "Nivå", "utbildning_ger_ratt_till_studiemedel": "Utbildningen berättigar till studiemedel",
    "har_trearig_gymnasieutbildning": "Treårig gymnasieutbildning", "studietakt_procent": "Studietakt",
    "studiestart": "Studiestart", "studieveckor": "Studietid", "ansokan_inkom": "Ansökan inkom",
    "soker_lan": "Söker lån", "inkomst_kalenderhalvaret": "Inkomst under halvåret",
    "barn_med_vardnad_under_18": "Barn under 18 i vårdnad", "veckor_anvanda_heltidsekvivalenter": "Tidigare använda veckor",
    "veckor_med_lan_tidigare": "Veckor med lån tidigare", "tidigare_studieresultat": "Tidigare studieresultat",
    "annan_forman_under_perioden": "Annan förmån under perioden",
    "obetalt_arsbelopp_fran_tidigare_ar": "Obetalt årsbelopp från tidigare år",
    "aterkrav_kvar_antal_kalenderhalvar": "Återkrav kvar (halvår)", "saknas_i_ansokan": "Saknas i ansökan",
}
HIDE = {"sokande", "arendenummer"}
FL_LABEL = {"myndighet": "Myndighet", "arende": "Ärende", "omstandighet": "Omständighet", "beslutet_meddelades": "Beslutet meddelades",
            "overklagandet_inkom_till_myndigheten": "Överklagandet inkom", "klaganden_fick_del_av_beslutet": "Klaganden fick del av beslutet"}


def pretty(k):
    return AKT_LABEL.get(k) or FL_LABEL.get(k) or (k.replace("_", " ").capitalize())


def val(k, v):
    if v is None or v == [] or v == "":
        return "–"
    if isinstance(v, bool):
        return "Ja" if v else "Nej"
    if k == "studietakt_procent":
        return "%d %%" % v
    if k == "studieveckor":
        return "%d veckor" % v
    if k == "inkomst_kalenderhalvaret":
        return "{:,} kr".format(v).replace(",", " ")
    if isinstance(v, list):
        return ", ".join(str(x) for x in v)
    if isinstance(v, str):
        return v.replace("_", " ")
    return str(v)


def akt_rows(akt):
    return [[pretty(k), val(k, v), k] for k, v in akt.items() if k not in HIDE]


def load_preds(d):
    P = {}
    for key, name in MODELS.items():
        rows = collections.defaultdict(dict)
        with open(os.path.join(d, "preds_%s.jsonl" % name), encoding="utf-8") as fh:
            for line in fh:
                r = json.loads(line)
                rows[(r["file"], r["id"])][r["q"]] = r
        P[key] = rows
    return P


def probs(r):
    if r["type"] == "choice":
        return {o: round(p, 4) for o, p in zip(r["options"], r["probs"])}
    return round(r["probs"][1], 4)


def correct(r):
    if r["type"] == "choice":
        return r["options"][max(range(len(r["probs"])), key=r["probs"].__getitem__)] == r["label"]
    return (r["probs"][1] >= r["probs"][0]) == bool(r["label"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--preds", required=True)
    ap.add_argument("--heldout", required=True)
    ap.add_argument("--whatif-meta", required=True)
    ap.add_argument("--evals", required=True)
    ap.add_argument("--out", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "data.js"))
    a = ap.parse_args()
    P = load_preds(a.preds)
    held = {}
    with open(a.heldout, encoding="utf-8") as fh:
        for line in fh:
            r = json.loads(line)
            held[r["_meta"]["id"]] = r

    # ── workbench cases ──
    def wrong_t4(rid):
        q = P["t4"][("heldout.jsonl", rid)]
        return any(not correct(x) for x in q.values())

    fl, csn = collections.defaultdict(list), collections.defaultdict(list)
    for rid, r in held.items():
        m = r["_meta"]
        if m["env"] == "forvaltning_nasta_steg":
            fl[m["case_type"]].append(rid)
        elif m["env"] == "csn_studiemedel":
            csn[m["scenario"]].append(rid)
    picked = []
    for typ, ids in sorted(fl.items()):
        by_label = collections.defaultdict(list)
        for i in ids:
            by_label[held[i]["questions"]["atgard"]["label"]].append(i)
        for lab, lst in sorted(by_label.items()):
            picked += lst[:1]
    wrongs = [i for ids in csn.values() for i in ids if wrong_t4(i)]
    for sc, ids in sorted(csn.items()):
        picked += ids[:1]
    picked += [w for w in wrongs[:4] if w not in picked]
    cases = []
    for rid in picked:
        r = held[rid]
        m = r["_meta"]
        st = r["state"]
        qs = []
        for qid, q in r["questions"].items():
            item = {"id": qid, "text": q["instructions"], "type": q["type"], "label": q["label"]}
            if q["type"] == "choice":
                item["options"] = [{"k": k, "t": t} for k, t in q["criteria"].items()]
            item["p"] = {mk: probs(P[mk][("heldout.jsonl", rid)][qid]) for mk in MODELS}
            qs.append(item)
        kind = "fl" if m["env"] == "forvaltning_nasta_steg" else "csn"
        cases.append({"id": rid, "kind": kind, "sub": m.get("case_type") or m.get("scenario"), "arende": st["arende"],
                      "akt": akt_rows(st["akt"]), "qs": qs, "miss": bool(wrong_t4(rid))})

    # ── what-if ──
    meta = json.load(open(a.whatif_meta, encoding="utf-8"))
    base = akt_rows(meta["base"])
    vars_ = collections.OrderedDict()
    for v in meta["variants"]:
        g = vars_.setdefault(v["var"], {"id": v["var"], "label": v["label"], "unit": v["unit"], "values": []})
        pr = {mk: {q: probs(x) for q, x in P[mk][("whatif.jsonl", v["id"])].items()} for mk in MODELS}
        g["values"].append({"v": v["value"], "facit": {"utfall": v["utfall"], "skal": v["skal"], "veckor": v["veckor"],
                                                       "totalt": v["totalt_kr"], "lagrum": v["lagrum"]},
                            "p": {mk: pr[mk].get("utfall") for mk in MODELS}})

    # ── review budget / calibration ──
    GROUPS = [("csn_studiemedel/utfall", "CSN: utfall i studiemedelsärende"), ("forvaltning_nasta_steg/atgard", "Förvaltningslagen: nästa steg"),
              ("skolinspektionen_tillsyn/brist", "Skolinspektionen: brist per område"), ("skolinspektionen_tillsyn/ingripande", "Skolinspektionen: ingripande"),
              ("oks_overklagande/utfall", "ÖKS: utfall i överklagande"), ("jo_tillsyn/utfall", "JO: bedömning")]
    tri = []
    for gid, label in GROUPS:
        env, q = gid.split("/")
        g = {"id": gid, "label": label, "m": {}}
        for mk in MODELS:
            rows = [x[q] for (f, i), x in P[mk].items() if f == "heldout.jsonl" and x.get(q) and x[q]["env"] == env]
            g["m"][mk] = {"c": [int(round(max(x["probs"]) * 1000)) for x in rows], "ok": "".join("1" if correct(x) else "0" for x in rows)}
        g["n"] = len(g["m"]["t4"]["c"])
        tri.append(g)
    # all yes/no + choice questions in one pool for the reliability chart
    pool = {}
    for mk in MODELS:
        rows = [x for (f, i), qq in P[mk].items() if f == "heldout.jsonl" for x in qq.values()]
        pool[mk] = {"c": [int(round(max(x["probs"]) * 1000)) for x in rows], "ok": "".join("1" if correct(x) else "0" for x in rows)}

    # ── speed ──
    speed = {}
    for key, fn in (("t06", "eval_sven-06b-v2_trained.json"), ("t4", "eval_kev-4b-v2_trained.json")):
        e = json.load(open(os.path.join(a.evals, fn), encoding="utf-8"))
        speed[key] = {"s": e["seconds"], "n": e["n_records"]}

    data = {"cases": cases, "whatif": {"base": base, "vars": list(vars_.values())}, "triage": tri, "pool": pool, "speed": speed}
    with open(a.out, "w", encoding="utf-8") as fh:
        fh.write("window.DATA=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print({"cases": len(cases), "miss": sum(c["miss"] for c in cases), "whatif": [(v["id"], len(v["values"])) for v in vars_.values()],
           "bytes": os.path.getsize(a.out)})


if __name__ == "__main__":
    main()
