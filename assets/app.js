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

  /* ═════════ Version 2: interaktiva delar, drivna av verkliga modellsvar (assets/data.js) ═════════ */
  var D = window.DATA || { cases: [], whatif: { base: [], vars: [] }, triage: [], pool: {}, speed: {} };
  var NS = "http://www.w3.org/2000/svg";
  function h(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function sv(tag, attrs, txt) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (txt != null) e.textContent = txt; return e; }
  function pc(x) { return Math.round(x * 100) + " %"; }
  function pc1(x) { return (x * 100).toFixed(1).replace(".", ",") + " %"; }
  function prog(inp) { var p = (inp.value - inp.min) / ((inp.max - inp.min) || 1) * 100; inp.style.setProperty("--p", p + "%"); }
  function raf2(fn) { requestAnimationFrame(function () { requestAnimationFrame(fn); }); }
  function segBind(sel, attr, cb) {
    var bs = $$(sel);
    bs.forEach(function (b) { b.addEventListener("click", function () {
      bs.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      cb(b.getAttribute(attr));
    }); });
  }

  var SHORT = { anmal_jav: "Anmäl jäv", fortsatt_handlaggning: "Fortsätt handläggningen", kommunicera: "Kommunicera först", fatta_beslut: "Fatta beslut direkt",
    avvisa: "Avvisa", overlamna: "Överlämna", andra_beslutet_och_overlamna: "Ändra och överlämna", bifall: "Bifall", delvis_bifall: "Delvis bifall",
    avslag: "Avslag", komplettering: "Komplettering" };
  var OUTCOMES = ["bifall", "delvis_bifall", "avslag", "komplettering"];
  var SKAL = { under_halvtid: "Studietakten är lägre än halvtid.", kortare_an_tre_veckor: "Studietiden är kortare än tre veckor.",
    alder_over_60: "Sökanden har passerat åldersgränsen för studiemedel.", inkomstminskning: "Inkomsten överstiger fribeloppet, så studiemedlet minskas.",
    inkomst_for_hog: "Inkomsten är så hög att inget studiemedel återstår.", retroaktiv_grans: "Ansökan kom för sent: studiemedel lämnas inte för hela tiden.",
    ofullstandig_ansokan: "Ansökan är ofullständig och måste kompletteras." };
  var KIND = { jav: "Jäv", kommunicering: "Kommunicering före beslut", rattidsprovning: "Överklagande: rätt tid" };
  function caseName(c) {
    if (c.kind === "fl") return KIND[c.sub] || c.sub;
    var s = String(c.sub || "").replace(/_/g, " ");
    return "Studiemedel: " + s;
  }
  function outcomeOf(p) { var best = null; for (var k in p) if (best === null || p[k] > p[best]) best = k; return best; }
  function optList(q, p) {      // [{k, t, p}] for a question and one model's answer
    if (q.type === "choice") return q.options.map(function (o) { return { k: o.k, name: SHORT[o.k] || o.k, t: o.t, p: p[o.k] }; });
    return [{ k: "true", name: "Ja", p: p }, { k: "false", name: "Nej", p: 1 - p }];
  }
  function labelKey(q) { return q.type === "choice" ? q.label : (q.label ? "true" : "false"); }

  /* ── Levande siffror i texten ───────── */
  (function () {
    var g = D.triage.filter(function (x) { return x.id === "forvaltning_nasta_steg/atgard"; })[0];
    if (g) { var ok = g.m.t4.ok, n = ok.length, s = 0; for (var i = 0; i < n; i++) s += ok[i] === "1" ? 1 : 0; $$('[data-live="fl-acc"]').forEach(function (e) { e.textContent = Math.round(s / n * 100) + " %"; }); }
    if (D.speed.t4) $$('[data-live="speed4"]').forEach(function (e) { e.textContent = (D.speed.t4.n / D.speed.t4.s).toFixed(1).replace(".", ","); });
  })();

  /* ── Hero: verkliga svar, bläddra automatiskt ── */
  (function () {
    var box = $("#hero-case"); if (!box || !D.cases.length) return;
    var pick = [];
    function first(f) { var c = D.cases.filter(f)[0]; if (c && pick.indexOf(c) < 0) pick.push(c); }
    first(function (c) { return c.sub === "jav" && c.qs[0].label === "anmal_jav"; });
    first(function (c) { return c.sub === "kommunicering"; });
    first(function (c) { return c.kind === "csn" && !c.miss && c.qs[0].label === "avslag"; });
    first(function (c) { return c.kind === "csn" && !c.miss && c.qs[0].label === "bifall"; });
    var KEYS = ["utbildning", "studietakt_procent", "studieveckor", "ansokan_inkom"];
    var i = 0, timer = null, dots = $("#hc-dots");
    pick.forEach(function (c, n) {
      var b = h("button"); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-label", "Exempel " + (n + 1));
      b.addEventListener("click", function () { show(n); restart(); }); dots.appendChild(b);
    });
    function show(n) {
      i = n; var c = pick[n], q = c.qs[0];
      $$("button", dots).forEach(function (b, k) { b.setAttribute("aria-selected", k === n ? "true" : "false"); });
      $("#hc-title").textContent = "uppgift · " + (c.kind === "fl" ? KIND[c.sub].toLowerCase() : "studiemedel");
      var rows = c.kind === "fl" ? c.akt : c.akt.filter(function (r) { return KEYS.indexOf(r[2]) >= 0; });
      $("#hc-akt").innerHTML = rows.map(function (r) { return '<div class="r"><b>' + esc(r[0]) + "</b><span>" + esc(r[1]) + "</span></div>"; }).join("");
      $("#hc-q").textContent = q.text;
      var opts = optList(q, q.p.t4), top = outcomeOf(Object.fromEntries(opts.map(function (o) { return [o.k, o.p]; })));
      $("#hc-opts").innerHTML = opts.map(function (o) {
        return '<div class="opt' + (o.k === top ? " win" : "") + '" title="' + esc(o.t || "") + '"><span>' + esc(o.name) + (o.k === labelKey(q) ? '<span class="ok" title="Facit">✓</span>' : "") +
          '</span><span class="track"><span class="fill' + (o.k === top ? "" : " dim") + '" data-w="' + (o.p * 100).toFixed(1) + '"></span></span><i>' + pc(o.p) + "</i></div>";
      }).join("");
      raf2(function () { $$("#hc-opts .fill").forEach(function (f) { f.style.width = f.getAttribute("data-w") + "%"; }); });
    }
    function restart() { clearInterval(timer); if (!reduce) timer = setInterval(function () { show((i + 1) % pick.length); }, 7000); }
    box.addEventListener("mouseenter", function () { clearInterval(timer); });
    box.addEventListener("mouseleave", restart);
    show(0); restart();
  })();

  /* ── Granskningsbudget ──────────────── */
  (function () {
    var sel = $("#sim-group"); if (!sel || !D.triage.length) return;
    D.triage.forEach(function (g, i) { var o = h("option", "", esc(g.label + " (" + g.n + ")")); o.value = i; sel.appendChild(o); });
    var st = { g: 0, m: "t4" }, K = $("#sim-k");
    function calc() {
      var d = D.triage[st.g].m[st.m], n = d.c.length, idx = d.c.map(function (_, i) { return i; });
      idx.sort(function (a, b) { return d.c[a] - d.c[b] || a - b; });
      var okPre = [0], tot = 0;
      idx.forEach(function (i, k) { var o = d.ok[i] === "1" ? 1 : 0; tot += o; okPre.push(okPre[k] + o); });
      return { n: n, okPre: okPre, tot: tot };
    }
    function draw() {
      var c = calc(), n = c.n, k = Math.round(+K.value / 100 * n), err = n - c.tot;
      prog(K); $("#sim-kv").textContent = K.value + " %";
      var rest = n - k, okRest = c.tot - c.okPre[k];
      $("#s-rev").textContent = k + " av " + n;
      $("#s-acc").textContent = rest ? pc1(okRest / rest) : "–";
      $("#s-base").textContent = "mot " + pc1(c.tot / n) + " om ingen sorterar";
      var caught = (k - c.okPre[k]);
      $("#s-caught").textContent = err ? caught + " av " + err : "–";
      var svg = $("#sim-svg"); svg.innerHTML = "";
      var W = 560, H = 300, L = 46, R = 14, T = 14, B = 44, pw = W - L - R, ph = H - T - B;
      var pts = [], lo = 1;
      for (var j = 0; j < n; j++) { var a = (c.tot - c.okPre[j]) / (n - j); pts.push([j / n, a]); if (a < lo) lo = a; }
      var base = c.tot / n; lo = Math.max(0, Math.min(lo, base) - 0.04); lo = Math.floor(lo * 20) / 20;
      function X(x) { return L + x * pw; } function Y(y) { return T + (1 - (y - lo) / (1 - lo)) * ph; }
      for (var t = 0; t <= 4; t++) { var yv = lo + (1 - lo) * t / 4; svg.appendChild(sv("line", { x1: L, x2: W - R, y1: Y(yv), y2: Y(yv), stroke: "var(--line)", "stroke-width": 1 })); svg.appendChild(sv("text", { x: L - 8, y: Y(yv) + 4, "text-anchor": "end", "font-size": 12, fill: "var(--ink-3)" }, Math.round(yv * 100) + " %")); }
      for (var u = 0; u <= 4; u++) svg.appendChild(sv("text", { x: X(u / 4), y: H - 20, "text-anchor": "middle", "font-size": 12, fill: "var(--ink-3)" }, u * 25 + " %"));
      svg.appendChild(sv("text", { x: L + pw / 2, y: H - 3, "text-anchor": "middle", "font-size": 12, fill: "var(--ink-3)" }, "Andel som människan granskar"));
      svg.appendChild(sv("line", { x1: L, x2: W - R, y1: Y(base), y2: Y(base), stroke: "var(--ink-3)", "stroke-dasharray": "4 5", "stroke-width": 1.4 }));
      svg.appendChild(sv("text", { x: L + 6, y: Y(base) + 15, "text-anchor": "start", "font-size": 11.5, fill: "var(--ink-3)" }, "utan sortering"));
      var path = pts.map(function (p, i) { return (i ? "L" : "M") + X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1); }).join("");
      svg.appendChild(sv("path", { d: path + "L" + X(1).toFixed(1) + " " + Y(1).toFixed(1), fill: "none", stroke: "var(--blue)", "stroke-width": 2.6, "stroke-linejoin": "round" }));
      var cx = X(k / n), cy = rest ? Y(okRest / rest) : Y(1);
      svg.appendChild(sv("line", { x1: cx, x2: cx, y1: T, y2: T + ph, stroke: "var(--yellow)", "stroke-width": 2 }));
      svg.appendChild(sv("circle", { cx: cx, cy: cy, r: 7, fill: "var(--yellow)", stroke: "var(--blue-deep)", "stroke-width": 3 }));
    }
    sel.addEventListener("change", function () { st.g = +sel.value; draw(); });
    segBind("[data-simmodel]", "data-simmodel", function (m) { st.m = m; draw(); });
    K.addEventListener("input", draw); draw();
  })();

  /* ── Prova själv ────────────────────── */
  (function () {
    var list = $("#case-list"); if (!list || !D.cases.length) return;
    var st = { i: 0, m: "4", t: "t", facit: false, ran: false }, cases = D.cases;
    cases.forEach(function (c, i) {
      var b = h("button", "ci", esc(caseName(c)) + "<small>" + (c.kind === "fl" ? "Förvaltningslagen" : "CSN, studiemedel") + "</small>");
      b.type = "button"; b.setAttribute("role", "option"); b.addEventListener("click", function () { st.i = i; st.ran = false; render(false); }); list.appendChild(b);
    });
    function mk() { return st.t + st.m; }
    function render(animate) {
      var c = cases[st.i];
      $$(".ci", list).forEach(function (b, i) { b.setAttribute("aria-selected", i === st.i ? "true" : "false"); });
      $("#b-title").textContent = "Akten · " + c.arende;
      $("#b-akt").innerHTML = c.akt.map(function (r) { return "<tr><td>" + esc(r[0]) + "</td><td>" + esc(r[1]) + "</td></tr>"; }).join("");
      var right = 0, total = 0;
      $("#b-qs").innerHTML = "";
      c.qs.forEach(function (q) {
        var box = h("div", "qc" + (st.ran ? " ran" : "")), key = labelKey(q), p = q.p[mk()], opts = optList(q, p), top = outcomeOf(Object.fromEntries(opts.map(function (o) { return [o.k, o.p]; })));
        var mark = "";
        if (st.ran && st.facit) { var ok = top === key; total++; right += ok ? 1 : 0; box.className += ok ? " right" : " wrong"; mark = '<span class="mark ' + (ok ? "right" : "wrong") + '">' + (ok ? "RÄTT" : "FEL") + "</span>"; }
        else if (st.ran) total++;
        box.innerHTML = "<h5><span>" + esc(q.text) + "</span>" + mark + "</h5>" +
          opts.map(function (o) {
            var pred = st.ran && o.k === top, fac = st.facit && o.k === key;
            return '<div class="po' + (pred ? " pred" : "") + (fac ? " fac" : "") + '" title="' + esc(o.t || "") + '"><span class="nm">' + esc(o.name) + '</span><span class="track"><span class="fill" data-w="' + (st.ran ? (o.p * 100).toFixed(1) : 0) + '"></span></span><span class="pc">' + (st.ran ? pc(o.p) : "") + "</span></div>";
          }).join("");
        $("#b-qs").appendChild(box);
      });
      raf2(function () { $$("#b-qs .fill").forEach(function (f) { f.style.width = f.getAttribute("data-w") + "%"; }); });
      var nm = (st.m === "4" ? "Kev 4B" : "Sven 0,6B") + (st.t === "t" ? " efter träning" : " före träning");
      $("#b-sum").textContent = !st.ran ? "" : (st.facit ? nm + " hade rätt på " + right + " av " + total + " frågor i det här ärendet." : nm + " har svarat. Slå på ”Visa facit” för att jämföra.");
      $("#run").textContent = st.ran ? "Fråga igen" : "Fråga modellen";
    }
    $("#run").addEventListener("click", function () {
      var qs = $("#b-qs"); st.ran = false; render(false); qs.classList.add("thinking");
      setTimeout(function () { qs.classList.remove("thinking"); st.ran = true; render(true); }, reduce ? 0 : 420);
    });
    segBind("[data-bm]", "data-bm", function (v) { st.m = v; render(true); });
    segBind("[data-bt]", "data-bt", function (v) { st.t = v; render(true); });
    $("#show-facit").addEventListener("change", function () { st.facit = this.checked; render(true); });
    render(false);
  })();

  /* ── Ändra i akten ──────────────────── */
  (function () {
    var W = D.whatif; if (!W || !W.vars.length) return;
    var st = { v: 0, i: 0, m: "4", t: "t" }, tabs_ = $("#wi-tabs"), R = $("#wi-r");
    var COL = { bifall: "var(--c-bifall)", delvis_bifall: "var(--c-delvis)", avslag: "var(--c-avslag)", komplettering: "var(--c-kompl)" };
    function fmtVal(vr, v) {
      switch (vr.id) {
        case "studietakt_procent": return v + " %"; case "studieveckor": return v + " veckor"; case "alder": return v + " år";
        case "inkomst_kalenderhalvaret": return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " kr";
        case "dagar_fore_start": return v >= 0 ? v + " dagar före start" : (-v) + " dagar efter start";
        default: return String(v);
      }
    }
    function baseRow(k) { var r = W.base.filter(function (x) { return x[2] === k; })[0]; return r ? r[1] : ""; }
    function aktRows(vr, v) {
      var year = +baseRow("kalenderar"), start = new Date(baseRow("studiestart") + "T00:00:00Z");
      return W.base.map(function (r) {
        var k = r[2], val = r[1], hl = false;
        if (vr.id === "studietakt_procent" && k === "studietakt_procent") { val = v + " %"; hl = true; }
        if (vr.id === "studieveckor" && k === "studieveckor") { val = v + " veckor"; hl = true; }
        if (vr.id === "alder" && k === "fodelsear") { val = (year - v) + " (" + v + " år)"; hl = true; }
        if (vr.id === "inkomst_kalenderhalvaret" && k === "inkomst_kalenderhalvaret") { val = fmtVal(vr, v); hl = true; }
        if (vr.id === "dagar_fore_start" && k === "ansokan_inkom") { var d = new Date(start.getTime() - v * 864e5); val = d.toISOString().slice(0, 10); hl = true; }
        if (vr.id === "saknas" && k === "saknas_i_ansokan") { val = v === "fullständig" ? "–" : "uppgift om studietakt"; hl = true; }
        return [r[0], val, hl];
      });
    }
    W.vars.forEach(function (vr, i) {
      var b = h("button", "tab", esc(vr.label)); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", i === 0 ? "true" : "false");
      b.addEventListener("click", function () { st.v = i; st.i = Math.min(st.i, vr.values.length - 1); st.i = 0; draw(true); }); tabs_.appendChild(b);
    });
    $("#wi-legend").innerHTML = OUTCOMES.map(function (o) { return '<span style="--c:' + COL[o] + '"><i></i>' + SHORT[o] + "</span>"; }).join("");
    function draw(resetSlider) {
      var vr = W.vars[st.v], val = vr.values[st.i], mk = st.t + st.m;
      $$("button", tabs_).forEach(function (b, i) { b.setAttribute("aria-selected", i === st.v ? "true" : "false"); });
      R.max = vr.values.length - 1; R.value = st.i; prog(R);
      $("#wi-lab").textContent = vr.label; $("#wi-out").textContent = fmtVal(vr, val.v);
      $("#wi-akt").innerHTML = aktRows(vr, val.v).map(function (r) { return '<tr class="' + (r[2] ? "hl" : "") + '"><td>' + esc(r[0]) + "</td><td>" + esc(r[1]) + "</td></tr>"; }).join("");
      var f = val.facit, ex = f.skal.map(function (s) { return SKAL[s] || s; }).join(" ");
      $("#wi-facit").innerHTML = '<div class="big oc-' + f.utfall + '"><i></i>' + SHORT[f.utfall] + "</div>" +
        (ex ? "<p>" + esc(ex) + "</p>" : "<p>Alla villkor är uppfyllda.</p>") +
        "<small>" + (f.veckor ? f.veckor + " veckor beviljade" : "Inga veckor beviljade") + (f.totalt ? " · totalt " + String(f.totalt).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " kr" : "") + (f.lagrum.length ? " · " + esc(f.lagrum.join("; ")) : "") + "</small>";
      var p = val.p[mk] || {}, top = outcomeOf(p);
      $("#wi-bars").innerHTML = OUTCOMES.map(function (o) {
        return '<div class="wbar oc-' + o + (o === top ? " top" : "") + '"><span class="nm">' + SHORT[o] + '</span><span class="track"><span class="fill" data-w="' + ((p[o] || 0) * 100).toFixed(1) + '"></span></span><span class="pc">' + pc(p[o] || 0) + "</span></div>";
      }).join("");
      raf2(function () { $$("#wi-bars .fill").forEach(function (x) { x.style.width = x.getAttribute("data-w") + "%"; }); });
      strip(vr, mk);
    }
    function strip(vr, mk) {
      var svg = $("#wi-strip"), n = vr.values.length, W_ = 900, cw = W_ / n, bw = Math.min(cw * 0.72, 90); svg.innerHTML = "";
      vr.values.forEach(function (v, i) {
        var g = sv("g", { "class": "col", tabindex: 0, role: "button", "aria-label": fmtVal(vr, v.v) });
        var x0 = i * cw + (cw - bw) / 2;
        g.appendChild(sv("rect", { "class": "hit", x: i * cw, y: 0, width: cw, height: 150, fill: "transparent", rx: 8 }));
        var y = 14, p = v.p[mk] || {};
        OUTCOMES.forEach(function (o) { var hh = (p[o] || 0) * 80; if (hh > 0.2) { g.appendChild(sv("rect", { x: x0, y: y, width: bw, height: hh, fill: COL[o] })); } y += hh; });
        g.appendChild(sv("rect", { x: x0, y: 14, width: bw, height: 80, fill: "none", stroke: "var(--line-2)", rx: 3 }));
        g.appendChild(sv("rect", { x: x0, y: 102, width: bw, height: 12, fill: COL[v.facit.utfall], rx: 3 }));
        g.appendChild(sv("text", { x: i * cw + cw / 2, y: 136, "text-anchor": "middle", "font-weight": i === st.i ? 700 : 400, fill: i === st.i ? "var(--ink)" : "var(--ink-3)" }, fmtVal(vr, v.v).replace(" före start", " före").replace(" efter start", " efter")));
        if (i === st.i) g.appendChild(sv("rect", { x: x0 - 5, y: 9, width: bw + 10, height: 110, fill: "none", stroke: "var(--yellow)", "stroke-width": 3, rx: 8 }));
        g.addEventListener("click", function () { st.i = i; draw(); });
        g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); st.i = i; draw(); } });
        svg.appendChild(g);
      });
    }
    R.addEventListener("input", function () { st.i = +R.value; draw(); });
    segBind("[data-wm]", "data-wm", function (v) { st.m = v; draw(); });
    segBind("[data-wt]", "data-wt", function (v) { st.t = v; draw(); });
    draw();
  })();

  /* ── Så fungerar det: stegvis animation ── */
  (function () {
    var pipe = $("#pipe"); if (!pipe) return;
    var caps = ["Ett publicerat beslut innehåller fakta, nämndens bedömning och ett beslut. Texten här är påhittad.",
      "Allt som avslöjar svaret klipps bort: bedömningen och beslutet. Kvar är det handläggaren hade framför sig.",
      "Fakta blir en strukturerad akt och en fråga ställs. Facit är det myndigheten faktiskt beslutade, hämtat ur det som klipptes bort.",
      "Modellen får akt och fråga och ger en sannolikhet per alternativ. Svaret jämförs automatiskt mot facit, utan någon språkmodell som domare."];
    $$(".pipe .fill").forEach(function (f) { f.style.setProperty("--w", f.getAttribute("data-w") + "%"); });
    var btns = $$(".ps", pipe), play = $("#pipe-play"), cur = 1, timer = null;
    function go(n) {
      cur = n; pipe.className = pipe.className.replace(/\bs\d\b/g, "").trim();
      for (var s = 1; s <= n; s++) pipe.classList.add("s" + s);
      btns.forEach(function (b) { b.setAttribute("aria-selected", +b.getAttribute("data-s") === n ? "true" : "false"); });
      $("#pipe-cap").textContent = caps[n - 1];
    }
    function stop() { clearInterval(timer); timer = null; play.classList.remove("on"); }
    function start() { if (timer) return; play.classList.add("on"); timer = setInterval(function () { go(cur % 4 + 1); }, 4200); }
    btns.forEach(function (b) { b.addEventListener("click", function () { stop(); go(+b.getAttribute("data-s")); }); });
    play.addEventListener("click", function () { timer ? stop() : start(); });
    go(1);
    if ("IntersectionObserver" in window && !reduce) {
      var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { start(); o.disconnect(); } }, { threshold: 0.5 }); o.observe(pipe);
    }
  })();

  /* ── Kalibrering ────────────────────── */
  (function () {
    var svg = $("#rel-svg"); if (!svg || !D.pool.t4) return;
    var EDGES = [0, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.99, 1.0001], m = "t4";
    function draw() {
      var d = D.pool[m], bins = EDGES.slice(1).map(function () { return { n: 0, ok: 0, c: 0 }; });
      d.c.forEach(function (c, i) { var p = c / 1000; for (var b = 0; b < bins.length; b++) if (p >= EDGES[b] && p < EDGES[b + 1]) { bins[b].n++; bins[b].c += p; bins[b].ok += d.ok[i] === "1" ? 1 : 0; break; } });
      svg.innerHTML = "";
      var Wd = 520, Hd = 340, L = 44, T = 16, B = 70, pw = Wd - L - 10, ph = Hd - T - B, bw = pw / bins.length;
      for (var t = 0; t <= 4; t++) { var y = T + (1 - t / 4) * ph; svg.appendChild(sv("line", { x1: L, x2: Wd - 10, y1: y, y2: y, stroke: "var(--line)" })); svg.appendChild(sv("text", { x: L - 8, y: y + 4, "text-anchor": "end" }, t * 25 + " %")); }
      bins.forEach(function (b, i) {
        if (!b.n) return;
        var acc = b.ok / b.n, mc = b.c / b.n, x = L + i * bw + bw * 0.16, w = bw * 0.68, hh = acc * ph;
        svg.appendChild(sv("rect", { x: x, y: T + ph - hh, width: w, height: hh, fill: "var(--blue)", rx: 4, opacity: .92 }));
        var my = T + (1 - mc) * ph;
        svg.appendChild(sv("line", { x1: x - 4, x2: x + w + 4, y1: my, y2: my, stroke: "var(--yellow)", "stroke-width": 3.5, "stroke-linecap": "round" }));
        var lo = Math.round(EDGES[i] * 100), hi = Math.round(Math.min(EDGES[i + 1], 1) * 100);
        svg.appendChild(sv("text", { x: x + w / 2, y: Hd - 46, "text-anchor": "middle", "font-size": 11 }, i === 0 ? "<50" : String(lo)));
        svg.appendChild(sv("text", { x: x + w / 2, y: Hd - 30, "text-anchor": "middle", "font-size": 10.5 }, "n=" + b.n));
      });
      svg.appendChild(sv("text", { x: L + pw / 2, y: Hd - 8, "text-anchor": "middle" }, "Modellens säkerhet (%) → blå stapel: hur ofta den hade rätt · gul linje: vad den påstod"));
    }
    segBind("[data-rm]", "data-rm", function (v) { m = v; draw(); }); draw();
  })();

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

  /* ═════════ Del utan modellsvar: beslutskarta, träning, tidslinje (assets/static.js) ═════════ */
  var S = window.STATIC || null;
  var COLS = { bifall: "var(--c-bifall)", delvis_bifall: "var(--c-delvis)", avslag: "var(--c-avslag)", komplettering: "var(--c-kompl)" };
  function fmtDom(id, v) {
    switch (id) {
      case "studietakt": return v + " %"; case "veckor": return v + " veckor"; case "alder": return v + " år";
      case "inkomst": return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " kr";
      case "dagar": return v >= 0 ? v + " dagar före" : (-v) + " dagar efter";
    }
    return String(v);
  }

  /* ── Beslutskarta ───────────────────── */
  (function () {
    if (!S || !S.karta) return;
    var K = S.karta, ids = Object.keys(K.vars), sx = $("#map-x"), sy = $("#map-y"), svg = $("#map-svg"), det = $("#map-detail");
    ids.forEach(function (k) { [sx, sy].forEach(function (s) { var o = h("option", "", esc(K.vars[k].label)); o.value = k; s.appendChild(o); }); });
    sx.value = "studietakt"; sy.value = "inkomst";
    $("#map-legend").innerHTML = ["bifall", "delvis_bifall", "avslag", "komplettering"].map(function (o) { return '<span style="--c:' + COLS[o] + '"><i></i>' + SHORT[o] + "</span>"; }).join("");
    var cur = null;
    function cellsFor(xv, yv) {          // returns {n,m,get(i,j)} for x=xv,y=yv regardless of stored order
      var key = xv + "|" + yv, flip = false, rows = K.cells[key];
      if (!rows) { rows = K.cells[yv + "|" + xv]; flip = true; }
      var map = {}; rows.forEach(function (r) { map[flip ? r[1] + "," + r[0] : r[0] + "," + r[1]] = r; });
      return function (i, j) { return map[i + "," + j]; };
    }
    function show(c, xv, yv, i, j) {
      if (!c) return;
      var f = c[2], ex = c[3].map(function (s) { return SKAL[s] || s; }).join(" ");
      det.innerHTML = '<div class="lbl">Utfall enligt regelmotorn</div><div class="big" style="--c:' + COLS[f] + '"><i></i>' + SHORT[f] + "</div>" +
        "<dl><div><dt>" + esc(K.vars[xv].label) + "</dt><dd>" + fmtDom(xv, K.vars[xv].values[i]) + "</dd></div><div><dt>" + esc(K.vars[yv].label) + "</dt><dd>" + fmtDom(yv, K.vars[yv].values[j]) + "</dd></div></dl>" +
        "<p>" + (ex ? esc(ex) : "Alla villkor är uppfyllda.") + "</p>" +
        "<small>" + (c[4] ? c[4] + " veckor beviljade" : "Inga veckor beviljade") + (c[5] ? " · totalt " + String(c[5]).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " kr" : "") + "</small>" +
        (c[6].length ? "<small>" + esc(c[6].join("; ")) + "</small>" : "");
    }
    function draw() {
      var xv = sx.value, yv = sy.value;
      if (xv === yv) { yv = ids.filter(function (k) { return k !== xv; })[0]; sy.value = yv; }
      var get = cellsFor(xv, yv), xs = K.vars[xv].values, ys = K.vars[yv].values, n = xs.length, m = ys.length;
      var Wd = 640, Hd = 440, L = 118, B = 58, T = 8, R = 8, cw = (Wd - L - R) / n, ch = (Hd - T - B) / m;
      svg.innerHTML = "";
      function cx(i) { return L + i * cw; } function cy(j) { return T + (m - 1 - j) * ch; }
      for (var j = 0; j < m; j++) for (var i = 0; i < n; i++) {
        (function (i, j) {
          var c = get(i, j), g = sv("g", { "class": "cell", tabindex: 0, role: "button", "aria-label": fmtDom(xv, xs[i]) + ", " + fmtDom(yv, ys[j]) + ": " + SHORT[c[2]] });
          g.appendChild(sv("rect", { "class": "c", x: cx(i), y: cy(j), width: cw, height: ch, fill: COLS[c[2]], rx: 6, opacity: c[2] === "komplettering" ? 1 : 0.92 }));
          g.appendChild(sv("text", { x: cx(i) + cw / 2, y: cy(j) + ch / 2 + 5, "text-anchor": "middle" }, c[4] ? String(c[4]) : "–"));
          function pick() { $$(".cell", svg).forEach(function (e) { e.classList.remove("sel"); }); g.classList.add("sel"); show(c, xv, yv, i, j); cur = [i, j]; }
          g.addEventListener("mouseenter", function () { show(c, xv, yv, i, j); });
          g.addEventListener("mouseleave", function () { if (cur) show(get(cur[0], cur[1]), xv, yv, cur[0], cur[1]); });
          g.addEventListener("click", pick); g.addEventListener("focus", function () { show(c, xv, yv, i, j); });
          g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
          svg.appendChild(g);
        })(i, j);
      }
      for (var j2 = 0; j2 < m; j2++) for (var i2 = 0; i2 < n; i2++) {         // gränslinjer där utfallet byter
        var c0 = get(i2, j2)[2];
        if (i2 + 1 < n && get(i2 + 1, j2)[2] !== c0) svg.appendChild(sv("line", { "class": "edge", x1: cx(i2 + 1), x2: cx(i2 + 1), y1: cy(j2), y2: cy(j2) + ch }));
        if (j2 + 1 < m && get(i2, j2 + 1)[2] !== c0) svg.appendChild(sv("line", { "class": "edge", x1: cx(i2), x2: cx(i2) + cw, y1: cy(j2 + 1) + ch, y2: cy(j2 + 1) + ch }));
      }
      xs.forEach(function (v, i) { svg.appendChild(sv("text", { x: cx(i) + cw / 2, y: Hd - B + 22, "text-anchor": "middle" }, fmtDom(xv, v).replace(" dagar", " d").replace(" veckor", " v"))); });
      ys.forEach(function (v, j) { svg.appendChild(sv("text", { x: L - 10, y: cy(j) + ch / 2 + 4, "text-anchor": "end" }, fmtDom(yv, v))); });
      svg.appendChild(sv("text", { x: L + (Wd - L - R) / 2, y: Hd - 8, "text-anchor": "middle", "font-weight": 650 }, K.vars[xv].label));
      var bi = xs.indexOf(K.base[xv]), bj = ys.indexOf(K.base[yv]); cur = null;
      if (bi >= 0 && bj >= 0) { cur = [bi, bj]; svg.appendChild(sv("circle", { cx: cx(bi) + cw / 2, cy: cy(bj) + 12, r: 5, fill: "var(--yellow)", stroke: "var(--blue-deep)", "stroke-width": 2, "pointer-events": "none" })); show(get(bi, bj), xv, yv, bi, bj); }
      else show(get(0, 0), xv, yv, 0, 0);
    }
    sx.addEventListener("change", draw); sy.addEventListener("change", draw);
    $("#map-swap").addEventListener("click", function () { var t = sx.value; sx.value = sy.value; sy.value = t; draw(); });
    draw();
  })();

  /* ── Träningen ──────────────────────── */
  (function () {
    if (!S || !S.training) return;
    var T = S.training, svg = $("#tr-svg"), R = $("#tr-r"), play = $("#tr-play"), timer = null;
    function smooth(arr) { var w = Math.max(3, Math.round(arr.length * 0.05)), out = []; for (var i = 0; i < arr.length; i++) { var a = Math.max(0, i - w + 1), s = 0; for (var j = a; j <= i; j++) s += arr[j][1]; out.push([arr[i][0], s / (i - a + 1)]); } return out; }
    var series = { sven: { raw: T.sven.loss, sm: smooth(T.sven.loss), total: T.sven.total, col: "var(--blue)" }, kev: { raw: T.kev.loss, sm: smooth(T.kev.loss), total: T.kev.total, col: "var(--yellow)" } };
    var Wd = 900, Hd = 340, L = 50, B = 40, Tp = 12, Rr = 14, pw = Wd - L - Rr, ph = Hd - Tp - B;
    function X(f) { return L + f * pw; } function Y(v) { return Tp + (1 - v / 1.0) * ph; }
    function fmtN(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
    function draw(p) {
      svg.innerHTML = "";
      for (var t = 0; t <= 4; t++) { var v = t / 4; svg.appendChild(sv("line", { x1: L, x2: Wd - Rr, y1: Y(v), y2: Y(v), stroke: "var(--line)" })); svg.appendChild(sv("text", { x: L - 8, y: Y(v) + 4, "text-anchor": "end" }, v.toFixed(2).replace(".", ","))); }
      for (var u = 0; u <= 4; u++) svg.appendChild(sv("text", { x: X(u / 4), y: Hd - 18, "text-anchor": "middle" }, u * 25 + " %"));
      svg.appendChild(sv("text", { x: L + pw / 2, y: Hd - 2, "text-anchor": "middle", "font-weight": 650 }, "Hur långt träningen har kommit"));
      svg.appendChild(sv("text", { x: 14, y: Tp + ph / 2, "text-anchor": "middle", transform: "rotate(-90 14 " + (Tp + ph / 2) + ")", "font-weight": 650 }, "Förlust"));
      ["sven", "kev"].forEach(function (k) {
        var s = series[k], raw = s.raw.filter(function (q) { return q[0] / s.total <= p + 1e-9; }), sm = s.sm.filter(function (q) { return q[0] / s.total <= p + 1e-9; });
        if (raw.length > 1) svg.appendChild(sv("path", { d: raw.map(function (q, i) { return (i ? "L" : "M") + X(q[0] / s.total).toFixed(1) + " " + Y(Math.min(q[1], 1)).toFixed(1); }).join(""), fill: "none", stroke: s.col, "stroke-width": 1.2, opacity: .28 }));
        if (sm.length > 1) svg.appendChild(sv("path", { d: sm.map(function (q, i) { return (i ? "L" : "M") + X(q[0] / s.total).toFixed(1) + " " + Y(Math.min(q[1], 1)).toFixed(1); }).join(""), fill: "none", stroke: s.col, "stroke-width": 3.4, "stroke-linecap": "round", "stroke-linejoin": "round" }));
        if (sm.length) { var l = sm[sm.length - 1]; svg.appendChild(sv("circle", { cx: X(l[0] / s.total), cy: Y(Math.min(l[1], 1)), r: 6, fill: s.col, stroke: "var(--surface)", "stroke-width": 2.5 })); }
        var last = sm.length ? sm[sm.length - 1] : null;
        $(k === "sven" ? "#tr-sl" : "#tr-kl").textContent = last ? last[1].toFixed(2).replace(".", ",") : "–";
        $(k === "sven" ? "#tr-s" : "#tr-k").textContent = "steg " + fmtN(last ? last[0] : 0) + " av " + fmtN(s.total);
      });
      R.value = Math.round(p * 1000); prog(R);
      $("#tr-ba").classList.toggle("on", p > 0.985);
    }
    function stop() { clearInterval(timer); timer = null; play.querySelector("span").textContent = "Spela upp"; }
    function run() {
      if (timer) { stop(); return; }
      var p = +R.value / 1000; if (p >= 0.999) p = 0; play.querySelector("span").textContent = "Pausa";
      var t0 = performance.now(), from = p, dur = reduce ? 10 : 9000 * (1 - from);
      timer = setInterval(function () { var q = Math.min(1, from + (performance.now() - t0) / dur * (1 - from)); draw(q); if (q >= 1) stop(); }, 40);
    }
    play.addEventListener("click", run);
    R.addEventListener("input", function () { stop(); draw(+R.value / 1000); });
    // före och efter, verkliga siffror ur utvärderingsfilerna
    var rows = [["csn_studiemedel/utfall", "CSN: utfall"], ["forvaltning_nasta_steg/atgard", "Förvaltningslagen: nästa steg"], ["skolinspektionen_tillsyn/brist", "Skolinspektionen: brist per område"],
      ["skolinspektionen_tillsyn/ingripande", "Skolinspektionen: ingripande"], ["oks_overklagande/andras_till_klagandens_fordel", "ÖKS: ändras till klagandens fördel"], ["jo_tillsyn/kritik", "JO: kritiseras myndigheten"]];
    var tm = "4";
    function ba() {
      var zk = tm === "4" ? "z4" : "z06", tk = tm === "4" ? "t4" : "t06", box = $("#tr-rows");
      box.innerHTML = rows.map(function (r) {
        var x = (window.RESULTS || []).filter(function (q) { return q.id === r[0]; })[0]; if (!x) return "";
        return '<div class="ba"><span>' + esc(r[1]) + '<br><small style="color:var(--ink-3)">n = ' + x.n + '</small></span><div class="bars" title="Vanligaste svaret ' + pc(x.maj) + '"><span class="b b0" style="width:' + x[zk] * 100 + '%"></span><span class="b b1" data-w="' + x[tk] * 100 + '" style="width:0"></span><span class="m" style="left:' + x.maj * 100 + '%"></span></div>' +
          '<div class="arrow"><small>' + pc(x[zk]) + " →</small>" + pc(x[tk]) + "</div></div>";
      }).join("") + '<p class="note">Svart streck: träffsäkerhet för den som alltid svarar det vanligaste svaret. Grå stapel: före träning. Blå: efter.</p>';
      raf2(function () { $$("#tr-rows .b1").forEach(function (b) { b.style.width = b.getAttribute("data-w") + "%"; }); });
    }
    segBind("[data-tm]", "data-tm", function (v) { tm = v; ba(); });
    ba(); draw(0);
    if ("IntersectionObserver" in window && !reduce) { var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { o.disconnect(); setTimeout(run, 500); } }, { threshold: 0.45 }); o.observe($(".train")); }
    else draw(1);
  })();

  /* ── Tidslinje ──────────────────────── */
  (function () {
    if (!S || !S.timeline) return;
    var TL = S.timeline, names = Object.keys(TL), sel = $("#tl-sel"), svg = $("#tl-svg");
    var o0 = h("option", "", "Alla organ"); o0.value = "alla"; sel.appendChild(o0);
    names.forEach(function (n) { var o = h("option", "", esc(n)); o.value = n; sel.appendChild(o); });
    $("#tl-legend").innerHTML = '<span class="c-tr" style="--c:var(--blue)"><i></i>Träning</span><span class="c-va" style="--c:var(--yellow)"><i></i>Validering</span><span class="c-te" style="--c:var(--c-avslag)"><i></i>Test (senast i tid)</span>';
    function draw() {
      var which = sel.value, years = {}, tot = [0, 0, 0];
      (which === "alla" ? names : [which]).forEach(function (n) { for (var y in TL[n]) { years[y] = years[y] || [0, 0, 0]; for (var k = 0; k < 3; k++) { years[y][k] += TL[n][y][k]; } } });
      var ys = []; for (var y = 2001; y <= 2026; y++) ys.push(String(y));
      var max = 0; ys.forEach(function (y) { var v = years[y]; if (v) max = Math.max(max, v[0] + v[1] + v[2]); });
      max = Math.ceil(max / 40) * 40 || 40;
      var Wd = 900, Hd = 260, L = 44, B = 34, T = 12, pw = Wd - L - 8, ph = Hd - T - B, bw = pw / ys.length;
      svg.innerHTML = "";
      for (var t = 0; t <= 4; t++) { var v = max * t / 4, yy = T + (1 - t / 4) * ph; svg.appendChild(sv("line", { x1: L, x2: Wd - 8, y1: yy, y2: yy, stroke: "var(--line)" })); svg.appendChild(sv("text", { x: L - 8, y: yy + 4, "text-anchor": "end" }, String(Math.round(v)))); }
      var COLS3 = ["var(--blue)", "var(--yellow)", "var(--c-avslag)"], info = $("#tl-note");
      ys.forEach(function (y, i) {
        var v = years[y] || [0, 0, 0], g = sv("g", { "class": "yr" }), x = L + i * bw + bw * .14, w = bw * .72, base = T + ph;
        g.appendChild(sv("rect", { "class": "hit", x: L + i * bw, y: T, width: bw, height: ph + B, fill: "transparent" }));
        for (var k = 0; k < 3; k++) { var hh = v[k] / max * ph; if (hh > 0) { base -= hh; g.appendChild(sv("rect", { x: x, y: base, width: w, height: hh, fill: COLS3[k], rx: 2 })); } }
        if (i % 2 === 0 || bw > 40) g.appendChild(sv("text", { x: x + w / 2, y: Hd - 14, "text-anchor": "middle" }, y.slice(2)));
        g.addEventListener("mouseenter", function () { info.textContent = y + ": " + (v[0] + v[1] + v[2]) + " beslut (träning " + v[0] + ", validering " + v[1] + ", test " + v[2] + ")."; });
        svg.appendChild(g);
      });
      var all = [0, 0, 0]; ys.forEach(function (y) { var v = years[y]; if (v) for (var k = 0; k < 3; k++) all[k] += v[k]; });
      info.textContent = "Totalt " + (all[0] + all[1] + all[2]) + " beslut: " + all[0] + " för träning, " + all[1] + " för validering och " + all[2] + " för test. Testmängden är alltid de senaste besluten. Håll muspekaren över ett år.";
    }
    sel.addEventListener("change", draw); draw();
  })();

  /* ── Reservlägen när modellsvar saknas ─ */
  (function () {
    var hasModel = !!(window.DATA && window.DATA.cases && window.DATA.cases.length);
    if (!hasModel) {
      $$('[data-needs="model"]').forEach(function (e) { e.hidden = true; e.style.display = "none"; });
      var cta = $(".cta .btn.primary"); if (cta) { cta.setAttribute("href", "#karta"); cta.firstChild.textContent = "Se beslutskartan "; }
      var hc = $("#hero-case");
      if (hc) {
        $("#hc-title").textContent = "uppgift · förvaltningslagen";
        $("#hc-akt").innerHTML = [["Myndighet", "Centrala studiestödsnämnden"], ["Ärende", "avslag på ansökan om studiemedel"], ["Omständighet", "Handläggaren var ombud för parten i just detta ärende innan hon anställdes vid myndigheten."]].map(function (r) { return '<div class="r"><b>' + r[0] + "</b><span>" + r[1] + "</span></div>"; }).join("");
        $("#hc-q").textContent = "Vad ska handläggaren göra?";
        $(".case-label", hc.querySelector(".q")).textContent = "Frågan · illustration av svaret";
        $("#hc-opts").innerHTML = '<div class="opt win"><span>Anmäla jäv</span><span class="track"><span class="fill" data-w="94"></span></span><i></i></div><div class="opt"><span>Fortsätta</span><span class="track"><span class="fill dim" data-w="6"></span></span><i></i></div>';
        raf2(function () { $$("#hc-opts .fill").forEach(function (f) { f.style.width = f.getAttribute("data-w") + "%"; }); });
        $(".case-foot", hc).innerHTML = "Så ser en uppgift ut. Akten är påhittad och staplarna är en illustration av formatet, inte en körning. <a href=\"#karta\">Se hur lagen ser ut.</a>";
      }
      if (S && S.speed) $$('[data-live="speed4"]').forEach(function (e) { e.textContent = (S.speed.t4.n / S.speed.t4.s).toFixed(1).replace(".", ","); });
      var q = (window.RESULTS || []).filter(function (x) { return x.id === "forvaltning_nasta_steg/atgard"; })[0];
      if (q) $$('[data-live="fl-acc"]').forEach(function (e) { e.textContent = Math.round(q.t4 * 100) + " %"; });
    }
  })();
})();
