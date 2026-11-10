/* Sven & Kev: webbplatsens skript. Inga beroenden, inga externa anrop. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ── Tema ───────────────────────────── */
  var root = document.documentElement;
  var saved = store("theme");
  if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);
  $("#theme").addEventListener("click", function () {
    var dark = root.getAttribute("data-theme") === "dark" ||
      (!root.getAttribute("data-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    var next = dark ? "light" : "dark";
    root.setAttribute("data-theme", next); store("theme", next);
  });

  /* ── Meny ───────────────────────────── */
  var menu = $("#menu"), mb = $("#menu-btn");
  mb.addEventListener("click", function () {
    var open = menu.classList.toggle("open"); mb.setAttribute("aria-expanded", open);
  });
  $$("#menu a").forEach(function (a) { a.addEventListener("click", function () { menu.classList.remove("open"); mb.setAttribute("aria-expanded", "false"); }); });

  /* aktiv länk */
  var links = $$("#menu a"), secs = links.map(function (a) { return $(a.getAttribute("href")); });
  function spy() {
    var y = window.scrollY + 140, cur = -1;
    secs.forEach(function (s, i) { if (s && s.offsetTop <= y) cur = i; });
    links.forEach(function (a, i) { a.classList.toggle("on", i === cur); });
  }
  window.addEventListener("scroll", spy, { passive: true }); spy();

  /* ── Avslöja vid scroll ─────────────── */
  var rv = $$(".rv");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    rv.forEach(function (el, i) { el.style.transitionDelay = (i % 4) * 70 + "ms"; io.observe(el); });
  } else { rv.forEach(function (el) { el.classList.add("in"); }); }

  /* ── Hero-staplar ───────────────────── */
  setTimeout(function () { $$(".fill").forEach(function (f) { f.style.width = f.getAttribute("data-w") + "%"; }); }, reduce ? 0 : 450);

  /* ── Räkna upp nyckeltal ────────────── */
  function fmt(n) { return Math.round(n).toLocaleString("sv-SE"); }
  $$("[data-count]").forEach(function (el) {
    var end = parseFloat(el.getAttribute("data-count")), suf = el.getAttribute("data-suffix") || "";
    if (reduce || !("IntersectionObserver" in window)) { el.textContent = fmt(end) + suf; return; }
    var o = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return; o.disconnect();
      var t0 = performance.now(), dur = 1300;
      (function tick(t) {
        var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(end * e) + suf;
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    }, { threshold: 0.6 });
    o.observe(el);
  });

  /* ── Tabbar: generisk ───────────────── */
  function tabs(btns, onSel) {
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        btns.forEach(function (x) { x.setAttribute("aria-selected", x === b ? "true" : "false"); });
        onSel(b);
      });
      b.addEventListener("keydown", function (e) {
        var i = btns.indexOf(b), n = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : -1;
        if (n >= 0 && n < btns.length) { btns[n].focus(); btns[n].click(); }
      });
    });
  }

  /* ── Exempeluppgifter ───────────────── */
  var DEMOS = {
    jav: {
      akt: { _: "förvaltningslagen", myndighet: "Centrala studiestödsnämnden", arende: "ärende om avslag på ansökan om studiemedel", omstandighet: "Handläggaren var ombud för parten i just detta ärende innan hon anställdes vid myndigheten." },
      qs: [
        { t: "Vad ska handläggaren göra?", k: "val", a: "Anmäla omständigheten som jäv och inte delta i handläggningen", opts: "Anmäla jäv · Fortsätta handläggningen" },
        { t: "Är handläggaren jävig?", k: "ja/nej", a: "Ja" }
      ]
    },
    csn: {
      akt: { _: "ansökan om studiemedel", utbildning: "Civilingenjörsprogrammet i datateknik", niva: "eftergymnasial", studietakt_procent: 25, studieveckor: 10, studiestart: "2026-01-19", ansokan_inkom: "2025-11-22", soker_lan: true, "…": "ytterligare 14 fält, samt ett utdrag ur studiestödslagen" },
      qs: [
        { t: "Hur ska ansökan om studiemedel avgöras?", k: "val", a: "Ansökan avslås", opts: "Bifall · Delvis bifall · Avslag · Komplettering" },
        { t: "Är studietakten för låg för studiemedel?", k: "ja/nej", a: "Ja" },
        { t: "Är studietiden för kort för studiemedel?", k: "ja/nej", a: "Nej" },
        { t: "Går beslutet sökanden emot, så att det ska innehålla en överklagandehänvisning?", k: "ja/nej", a: "Ja" }
      ]
    }
  };
  function akt(o) {
    return Object.keys(o).map(function (k) {
      var v = o[k]; if (k === "_") return "";
      return '<span class="k">' + esc(k) + "</span>: " + esc(typeof v === "string" ? v : JSON.stringify(v));
    }).filter(Boolean).join("\n");
  }
  function demo(id) {
    var d = DEMOS[id];
    $("#demo").innerHTML =
      '<div><div class="case-label">Akten · ' + esc(d.akt._) + "</div><pre>" + akt(d.akt) + "</pre></div>" +
      '<div><div class="case-label">Frågor och facit</div><div class="qlist">' +
      d.qs.map(function (q) {
        return '<div class="qitem"><div class="t"><b>' + esc(q.t) + '</b><span class="chip' + (q.k === "val" ? "" : " y") + '">' + (q.k === "val" ? "flerval" : "ja/nej") + "</span></div>" +
          (q.opts ? '<div class="ans">Alternativ: ' + esc(q.opts) + "</div>" : "") +
          '<div class="ans">Facit: <b>' + esc(q.a) + "</b></div></div>";
      }).join("") + "</div></div>";
  }
  tabs($$("[data-demo]"), function (b) { demo(b.getAttribute("data-demo")); });
  demo("jav");

  /* ── Resultat ───────────────────────── */
  var R = window.RESULTS || [];
  var ENV = {
    csn_studiemedel: "CSN · studiemedel", forvaltning_nasta_steg: "Förvaltningslagen · nästa steg",
    oks_overklagande: "ÖKS · överklagande", onh_overklagande: "ÖNH · överklagande",
    jo_tillsyn: "JO · tillsyn", skolinspektionen_tillsyn: "Skolinspektionen · tillsyn"
  };
  var KEY = ["csn_studiemedel/utfall", "forvaltning_nasta_steg/atgard", "skolinspektionen_tillsyn/brist", "skolinspektionen_tillsyn/nagon_brist",
    "skolinspektionen_tillsyn/ingripande", "oks_overklagande/andras_till_klagandens_fordel", "oks_overklagande/utfall",
    "jo_tillsyn/kritik", "jo_tillsyn/utfall", "onh_overklagande/andras_till_klagandens_fordel", "onh_overklagande/utfall"];
  var st = { model: "4", set: "key", env: "alla" };
  function pct(x) { return (x * 100).toFixed(0).replace(".", ",") + " %"; }
  function render() {
    var zk = st.model === "4" ? "z4" : "z06", tk = st.model === "4" ? "t4" : "t06";
    var rows = R.filter(function (r) { return (st.set === "all" || KEY.indexOf(r.id) >= 0) && (st.env === "alla" || r.env === st.env); });
    rows.sort(function (a, b) { return KEY.indexOf(a.id) < 0 && KEY.indexOf(b.id) >= 0 ? 1 : KEY.indexOf(b.id) < 0 && KEY.indexOf(a.id) >= 0 ? -1 :
      (st.set === "key" ? KEY.indexOf(a.id) - KEY.indexOf(b.id) : a.id < b.id ? -1 : 1); });
    $("#rows").innerHTML = rows.length ? rows.map(function (r) {
      var acc = r[tk], z = r[zk], m = r.maj, tag = "";
      if (acc > m + 0.02) tag = '<span class="tag win">slår majoriteten</span>';
      else if (acc < m - 0.02) tag = '<span class="tag lose">under majoriteten</span>';
      else tag = '<span class="tag small">på majoritetsnivå</span>';
      if (r.n < 100) tag += '<span class="tag small">litet urval</span>';
      var auc = r[tk + "_auc"];
      return '<div class="row"><div class="name"><b>' + esc(r.q) + "</b><small>" + esc(ENV[r.env]) + " · n = " + r.n + "</small>" + "</div>" +
        '<div class="bars" title="Efter träning ' + pct(acc) + ", utan " + pct(z) + ", vanligaste svaret " + pct(m) + (auc != null ? ", AUROC " + auc.toFixed(2).replace(".", ",") : "") + '">' +
        '<span class="b b0" style="width:' + z * 100 + '%"></span><span class="b b1" style="width:' + acc * 100 + '%"></span><span class="m" style="left:' + m * 100 + '%"></span></div>' +
        '<div class="vals"><b>' + pct(acc) + "</b><small>före " + pct(z) + "</small></div>" +
        '<div style="grid-column:1/-1;margin-top:-8px">' + tag + "</div></div>";
    }).join("") : '<div class="row"><div class="name">Inga frågor i urvalet.</div></div>';
  }
  var envBox = $("#env-chips");
  envBox.innerHTML = [["alla", "Alla verksamheter"]].concat(Object.keys(ENV).map(function (k) { return [k, ENV[k]]; })).map(function (e) {
    return '<button type="button" class="tab" data-env="' + e[0] + '" aria-pressed="' + (e[0] === "alla") + '">' + esc(e[1]) + "</button>";
  }).join("");
  $$("[data-env]", envBox).forEach(function (b) {
    b.addEventListener("click", function () {
      st.env = b.getAttribute("data-env");
      $$("[data-env]", envBox).forEach(function (x) { var on = x === b; x.setAttribute("aria-pressed", on); x.setAttribute("aria-selected", on); });
      render();
    });
    b.setAttribute("aria-selected", b.getAttribute("aria-pressed"));
  });
  function seg(attr, key) {
    var bs = $$("[" + attr + "]");
    bs.forEach(function (b) { b.addEventListener("click", function () {
      st[key] = b.getAttribute(attr); bs.forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); render();
    }); });
  }
  seg("data-model", "model"); seg("data-set", "set"); render();

  /* ── Kodexempel ─────────────────────── */
  var CODE = [
    { name: "terminal", txt:
"# 1. Hämta ramverket och installera\n" +
"git clone https://github.com/jaredpalmer/kev.git\n" +
"cd kev && uv sync\n\n" +
"# 2. Hämta testmängden (vanlig JSONL)\n" +
"uv run python -c \"from huggingface_hub import hf_hub_download as h; \\\n" +
"  print(h('birgermoell/myndighetsbeslut', 'sven/heldout.jsonl', repo_type='dataset'))\"" },
    { name: "python", txt:
"import random\n" +
"from kev.checkpoint import Checkpoint, LoadOptions\n" +
"from kev.data import augment, load_records, materialize\n" +
"from kev.device import select\n" +
"from kev.model import training_context\n\n" +
"ctx = training_context(7552)   # Kevs standard, 384, avvisar nästan alla akter\n" +
"opts = LoadOptions.from_env()\n" +
"dev = select(\"auto\") if opts.dtype is None else select(\"auto\", dtype=opts.dtype)\n" +
"tok, model = Checkpoint(\"birgermoell/kev-myndighet-4b\").load(dev, opts)\n\n" +
"rng = random.Random(1)\n" +
"for r in load_records(\"heldout.jsonl\", source=\"myndighetsbeslut\"):\n" +
"    req = augment(r, rng, p_none=0, p_none_distract=0, p_distract=0)\n" +
"    rec = materialize(req)\n" +
"    enc = model.encode(tok, rec, strict=True, max_state=ctx[\"max_state\"], max_branch=ctx[\"max_branch\"])\n" +
"    for q, p in zip(rec[\"questions\"], model.probs(enc)):\n" +
"        print(q[\"qtype\"], p.numpy())   # en sannolikhet per alternativ" },
    { name: "terminal", txt:
"# Mät träffsäkerhet, kalibrering och AUROC per fråga (skriptet finns i GitHub-repot)\n" +
"uv run python sven_eval.py \\\n" +
"  --run birgermoell/kev-myndighet-4b \\\n" +
"  --data heldout.jsonl \\\n" +
"  --max_state 7552 \\\n" +
"  --out eval.json" }
  ];
  var ci = 0;
  function code() {
    $("#code-name").textContent = CODE[ci].name;
    $("#code").textContent = CODE[ci].txt;
  }
  tabs($$("[data-code]"), function (b) { ci = +b.getAttribute("data-code"); code(); });
  code();
  $("#copy").addEventListener("click", function () {
    var b = this, done = function () { b.textContent = "Kopierat"; setTimeout(function () { b.textContent = "Kopiera"; }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(CODE[ci].txt).then(done, function () {});
    else { var ta = document.createElement("textarea"); ta.value = CODE[ci].txt; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); done(); } catch (e) {} document.body.removeChild(ta); }
  });
})();
