/* Whatif page. The story arrives one line at a time (see story.js) and the page repaints after every line, so the first card shows up in a
   couple of seconds. Everything that comes from the AI, from localStorage or from a share link is put on the page with textContent only. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const boot = JSON.parse($("boot").textContent);
  const KEY = "whatif.v1", MAX_STORIES = 40;
  const DEFAULTS = { tone: "documentary", depth: "normal", realism: "mixed" };
  const WAITING = ["Rewinding history…", "Pulling one thread…", "Watching the ripples spread…", "Lining up the dominoes…"];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.__wi = {};                                                    // timings, for checking speed from the console

  /* ---------------------------------------------------------------- saved data (this browser only) */
  const fresh = () => ({ stories: [], streak: { last: "", n: 0 }, prefs: { ...DEFAULTS }, dailyDone: "" });
  function loadDb() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!d || typeof d !== "object") return fresh();
      const stories = (Array.isArray(d.stories) ? d.stories : []).map(o => {
        const story = Story.sanitize(o && o.story);
        return story ? { id: String(o.id || "").slice(0, 24), parent: o.parent ? String(o.parent).slice(0, 24) : null, ts: +o.ts || 0, story } : null;
      }).filter(Boolean).slice(0, MAX_STORIES);
      return { stories, streak: { last: String((d.streak || {}).last || ""), n: +((d.streak || {}).n) || 0 }, prefs: { ...DEFAULTS, ...(d.prefs || {}) }, dailyDone: String(d.dailyDone || "") };
    } catch (e) { return fresh(); }
  }
  let db = loadDb();
  const saveDb = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* private mode: the page still works */ } };

  /* ---------------------------------------------------------------- small helpers */
  let toastTimer = 0;
  function toast(msg) {
    const t = $("toast"); t.textContent = msg; t.classList.add("on");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("on"), 2400);
  }
  const setText = (el, text) => { if (el.textContent !== text) el.textContent = text; };
  const ymd = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const scrollTo = node => node.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* fall back below */ }
    const ta = el("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;opacity:0;top:0"; document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand("copy"); } catch (e) { /* ignore */ } ta.remove(); return ok;
  }

  function normalize(raw) {
    let t = String(raw || "").replace(/\s+/g, " ").trim();
    if (!t) return "";
    if (!/^(what if|what would happen if|what happens if|if)\b/i.test(t)) t = "What if " + t;
    if (!/[?.!]$/.test(t)) t += "?";
    return t.slice(0, 500);
  }

  /* ---------------------------------------------------------------- the story view */
  let cur = { id: null, story: null, shared: false, parent: null };
  let run = null;                                                       // the story being written right now
  const view = { events: [], chain: "", win: "", lose: "", branches: "", score: -1 };

  function resetView() {
    view.events = []; view.chain = view.win = view.lose = view.branches = ""; view.score = -1;
    $("timeline").textContent = ""; $("chain").textContent = ""; $("win").textContent = ""; $("lose").textContent = ""; $("branches").textContent = "";
    for (const id of ["s-real", "chainwrap", "verdict", "scorewrap", "factwrap", "branchwrap", "actions", "s-demo", "note", "story", "s-title"]) $(id).hidden = true;
    $("ring").style.strokeDashoffset = "213.63";
    $("same").hidden = true;
  }

  function makeEvent() {
    const li = el("li", "ev in"), dot = el("span", "dot"), body = el("div", "evbody");
    const when = el("span", "when"), h = el("h3"), p = el("p"), tw = el("button", "twist", "⑂ Change this"), form = el("form", "twistform");
    tw.type = "button"; form.hidden = true;
    const input = el("input"); input.type = "text"; input.maxLength = 160; input.placeholder = "…but instead, what happens?"; input.setAttribute("aria-label", "What happens instead");
    const go = el("button", "btn", "Ripple it"); go.type = "submit"; form.append(input, go);
    body.append(when, h, p, tw, form); li.append(dot, body);
    const node = { li, dot, when, h, p, tw, form, input };
    tw.onclick = () => { form.hidden = !form.hidden; if (!form.hidden) input.focus(); };
    form.onsubmit = e => { e.preventDefault(); twist(view.events.indexOf(node), input.value); };
    return node;
  }

  function paint(s) {
    $("story").hidden = false;
    if (s.title) { $("s-title").hidden = false; setText($("s-title"), s.title); }
    setText($("s-premise"), s.premise);
    setText($("s-kicker"), cur.shared ? "Shared what if" : "What if");
    if (s.demo) { $("s-demo").hidden = false; setText($("s-demo"), s.demo); }
    if (s.real) { $("s-real").hidden = false; setText($("s-real-t"), s.real); }

    while (view.events.length < s.events.length) { const n = makeEvent(); view.events.push(n); $("timeline").appendChild(n.li); }
    s.events.forEach((e, i) => {
      const n = view.events[i];
      setText(n.dot, e.icon); setText(n.when, e.when); setText(n.h, e.head); setText(n.p, e.text);
      n.tw.hidden = cur.shared || !!run; if (n.tw.hidden) n.form.hidden = true;
    });

    const chainKey = s.chain.join("\u0001");
    if (s.chain.length && chainKey !== view.chain) {
      view.chain = chainKey; $("chainwrap").hidden = false; const ol = $("chain"); ol.textContent = "";
      s.chain.forEach(c => ol.appendChild(el("li", "", c)));
    }
    for (const side of ["win", "lose"]) {
      const key = s[side].join("\u0001");
      if (s[side].length && key !== view[side]) { view[side] = key; $("verdict").hidden = false; const ul = $(side); ul.textContent = ""; s[side].forEach(t => ul.appendChild(el("li", "", t))); }
    }
    if (s.same) { $("verdict").hidden = false; $("same").hidden = false; setText($("same"), s.same); }
    if (s.score != null && s.score !== view.score) {
      view.score = s.score; $("scorewrap").hidden = false; setText($("score-n"), String(s.score)); setText($("score-why"), s.why);
      requestAnimationFrame(() => requestAnimationFrame(() => { $("ring").style.strokeDashoffset = String(213.63 * (1 - s.score / 100)); }));
    }
    if (s.fact) { $("factwrap").hidden = false; setText($("fact"), s.fact); }
    const brKey = s.branches.join("\u0001");
    if (s.branches.length && brKey !== view.branches && !cur.shared) {
      view.branches = brKey; $("branchwrap").hidden = false; const box = $("branches"); box.textContent = "";
      s.branches.forEach(b => { const btn = el("button", "", b); btn.type = "button"; btn.onclick = () => ask(b, { parent: cur.id }); box.appendChild(btn); });
    }
  }

  function showNote(text, retry) {
    $("note").hidden = false; setText($("note-t"), text); $("note-retry").hidden = !retry;
    $("note-retry").onclick = retry || null;
    scrollTo($("note"));
  }

  /* ---------------------------------------------------------------- asking */
  async function ask(raw, opts = {}) {
    const premise = normalize(raw);
    if (premise.length < 6) { toast("Type a what-if first"); $("q").focus(); return; }
    if (run) run.ctrl.abort();
    closeDrawer();
    $("ask").hidden = false;
    const story = Story.empty(); story.premise = premise;
    const me = run = { ctrl: new AbortController(), story, t0: performance.now(), first: 0 };
    cur = { id: null, story, shared: false, parent: opts.parent || null };
    resetView();
    $("result").hidden = false; $("status").hidden = false; $("go").disabled = true;
    paint(story);
    scrollTo($("result"));
    let i = 0; setText($("status-t"), WAITING[0]);
    const spin = setInterval(() => { if (run === me && !me.first) setText($("status-t"), WAITING[++i % WAITING.length]); }, 2300);

    const parser = new Story.Parser(story, () => {
      if (run !== me) return;
      if (!me.first) { me.first = Math.round(performance.now() - me.t0); setText($("status-t"), "Writing the timeline…"); }
      paint(story);
    });
    let failed = "";
    try {
      const p = db.prefs;
      const res = await fetch("/api/whatif", { method: "POST", headers: { "Content-Type": "application/json" }, signal: me.ctrl.signal,
        body: JSON.stringify({ premise, tone: p.tone, depth: p.depth, realism: p.realism }) });
      if (!res.ok) {
        let msg = "The storyteller stumbled. Try again."; try { msg = (await res.json()).error || msg; } catch (e) { /* not JSON */ }
        throw new Error(msg);
      }
      const reader = res.body.getReader(), dec = new TextDecoder();
      for (;;) { const { value, done } = await reader.read(); if (done) break; parser.feed(dec.decode(value, { stream: true })); }
      parser.feed(dec.decode()); parser.end();
    } catch (e) {
      if (run !== me || (e && e.name === "AbortError")) { clearInterval(spin); return; }
      parser.end(); failed = e && e.message && !/fetch|network|load failed/i.test(e.message) ? e.message : "The connection dropped. Try again.";
    }
    clearInterval(spin);
    if (run !== me) return;
    run = null; $("status").hidden = true; $("go").disabled = false;
    window.__wi = { firstMs: me.first, totalMs: Math.round(performance.now() - me.t0), events: story.events.length };

    if (story.refuse) { $("story").hidden = true; showNote(story.refuse, null); return; }
    if (!Story.complete(story)) { $("story").hidden = story.events.length < 1; showNote(failed || "That story came out scrambled. Try again.", () => ask(raw, opts)); return; }
    if (failed) toast("The ending got cut off, but here is what arrived.");
    cur.id = newId();
    db.stories.unshift({ id: cur.id, parent: cur.parent, ts: Date.now(), story });
    db.stories = db.stories.slice(0, MAX_STORIES);
    bumpStreak(); if (opts.daily) db.dailyDone = boot.daily.date;
    saveDb(); refreshChrome(); paint(story); $("actions").hidden = false;
  }

  function twist(index, text) {
    const s = cur.story, e = s && s.events[index], t = String(text || "").replace(/\s+/g, " ").trim();
    if (!e || t.length < 3) { toast("Say what happens instead"); return; }
    const base = s.premise.replace(/[?.!\s]+$/, "");
    ask(base + ", but at \"" + e.when + "\" (" + e.head + ") instead: " + t, { parent: cur.id });
  }

  function bumpStreak() {
    const today = ymd(new Date());
    if (db.streak.last === today) return;
    const y = new Date(); y.setDate(y.getDate() - 1);
    db.streak.n = db.streak.last === ymd(y) ? db.streak.n + 1 : 1; db.streak.last = today;
  }

  /* ---------------------------------------------------------------- header chips, ideas, daily */
  function refreshChrome() {
    const n = db.stories.length;
    $("multi-n").hidden = !n; setText($("multi-n"), String(n));
    const alive = db.streak.n > 0 && (db.streak.last === ymd(new Date()) || db.streak.last === ymd(new Date(Date.now() - 864e5)));
    $("streak").hidden = !alive; if (alive) setText($("streak"), "🔥 " + db.streak.n + (db.streak.n === 1 ? " day" : " days"));
    $("daily-done").hidden = db.dailyDone !== boot.daily.date;
  }

  let cat = "all";
  function renderCats() {
    const box = $("cats"); box.textContent = "";
    [["all", "All"]].concat(boot.cats).forEach(([id, label]) => {
      const b = el("button", "", label); b.type = "button"; b.setAttribute("aria-pressed", String(cat === id));
      b.onclick = () => { cat = id; renderCats(); renderPills(); }; box.appendChild(b);
    });
  }
  function renderPills() {
    const box = $("pills"); box.textContent = "";
    shuffle(boot.premises.filter(p => cat === "all" || p.c === cat)).slice(0, 4).forEach(p => {
      const b = el("button", "", p.t); b.type = "button"; b.onclick = () => { $("q").value = p.t; ask(p.t); }; box.appendChild(b);
    });
  }

  function bindPrefs() {
    document.querySelectorAll(".seg").forEach(seg => {
      const key = seg.dataset.key;
      const sync = () => seg.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(db.prefs[key] === b.dataset.v)));
      seg.querySelectorAll("button").forEach(b => { b.onclick = () => { db.prefs[key] = b.dataset.v; saveDb(); sync(); }; });
      sync();
    });
  }

  /* ---------------------------------------------------------------- multiverse drawer */
  let lastFocus = null;
  function openDrawer() { lastFocus = document.activeElement; renderTree(); $("scrim").hidden = false; $("drawer").hidden = false; $("close-multi").focus(); }
  function closeDrawer() { if ($("drawer").hidden) return; $("scrim").hidden = true; $("drawer").hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }

  function renderTree() {
    const box = $("tree"); box.textContent = "";
    $("clear-multi").hidden = !db.stories.length;
    if (!db.stories.length) { box.appendChild(el("p", "empty", "Nothing here yet. Ask a what-if and it will be saved.")); return; }
    const ids = new Set(db.stories.map(s => s.id)), kids = new Map(), roots = [];
    db.stories.forEach(s => { if (s.parent && ids.has(s.parent)) { if (!kids.has(s.parent)) kids.set(s.parent, []); kids.get(s.parent).push(s); } else roots.push(s); });
    const walk = (s, d) => {
      const row = el("div", "node" + (d ? " child" : "") + (s.id === cur.id ? " now" : "")); row.style.setProperty("--d", String(d));
      const open = el("button", "open"); open.type = "button"; open.append(el("b", "", s.story.title), el("small", "", s.story.premise));
      open.onclick = () => openStored(s);
      const del = el("button", "del", "×"); del.type = "button"; del.setAttribute("aria-label", "Delete " + s.story.title);
      del.onclick = () => { db.stories = db.stories.filter(x => x.id !== s.id); saveDb(); refreshChrome(); renderTree(); };
      row.append(open, del); box.appendChild(row);
      (kids.get(s.id) || []).forEach(k => walk(k, d + 1));
    };
    roots.forEach(r => walk(r, 0));
  }

  function openStored(s) {
    if (run) { run.ctrl.abort(); run = null; $("status").hidden = true; $("go").disabled = false; }
    cur = { id: s.id, story: s.story, shared: false, parent: s.parent };
    closeDrawer(); resetView(); $("result").hidden = false; paint(s.story); $("actions").hidden = false; scrollTo($("result"));
  }

  /* ---------------------------------------------------------------- sharing, image, copy */
  async function shareLink() {
    if (!cur.story) return;
    try {
      const url = location.origin + "/s#" + await Story.pack(cur.story);
      if (navigator.share && matchMedia("(pointer: coarse)").matches) {
        try { await navigator.share({ title: cur.story.title + " (Whatif)", text: cur.story.premise, url }); return; } catch (e) { if (e && e.name === "AbortError") return; }
      }
      toast(await copyText(url) ? "Link copied. The whole story is inside it." : "Couldn't copy the link");
    } catch (e) { toast("Couldn't make a link"); }
  }

  function wrap(x, text, left, y, maxW, lh, maxLines) {
    const words = String(text).split(" "); let line = "", n = 0;
    for (let i = 0; i < words.length; i++) {
      const test = line ? line + " " + words[i] : words[i];
      if (x.measureText(test).width > maxW && line) {
        n++; if (n >= maxLines) { let last = line; while (x.measureText(last + "…").width > maxW && last.length) last = last.slice(0, -1); x.fillText(last + "…", left, y); return y + lh; }
        x.fillText(line, left, y); y += lh; line = words[i];
      } else line = test;
    }
    if (line) { x.fillText(line, left, y); y += lh; }
    return y;
  }

  function saveImage() {
    const s = cur.story; if (!s) return;
    const W = 1080, H = 1350, SERIF = 'Georgia, "Times New Roman", serif', SANS = 'system-ui, "Segoe UI", Roboto, Arial, sans-serif', pad = 84;
    const c = el("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
    x.fillStyle = "#0a0a0a"; x.fillRect(0, 0, W, H);
    x.strokeStyle = "#171717"; x.lineWidth = 2; for (let r = 90; r < 1700; r += 72) { x.beginPath(); x.arc(W - 120, -90, r, 0, Math.PI * 2); x.stroke(); }
    x.textBaseline = "alphabetic";
    x.fillStyle = "#e08a5b"; x.font = "600 26px " + SANS; if ("letterSpacing" in x) x.letterSpacing = "7px"; x.fillText("WHAT IF", pad, 130); if ("letterSpacing" in x) x.letterSpacing = "0px";
    x.fillStyle = "#ececec"; x.font = "700 84px " + SERIF; let y = wrap(x, s.title, pad, 230, W - pad * 2, 96, 3);
    x.fillStyle = "#9b9b9b"; x.font = "400 31px " + SANS; y = wrap(x, s.premise, pad, y + 14, W - pad * 2, 44, 3);
    const steps = (s.chain.length ? s.chain : s.events.map(e => e.head)).slice(0, 6); y += 56;
    const step = Math.min(110, Math.floor((H - 330 - y) / Math.max(steps.length, 1)));
    x.strokeStyle = "#2d2d2d"; x.lineWidth = 3; x.beginPath(); x.moveTo(pad + 16, y); x.lineTo(pad + 16, y + step * (steps.length - 1)); x.stroke();
    steps.forEach((t, i) => {
      const cy = y + i * step;
      x.fillStyle = i === 0 ? "#e08a5b" : "#1c1c1c"; x.strokeStyle = i === 0 ? "#e08a5b" : "#444"; x.lineWidth = 3; x.beginPath(); x.arc(pad + 16, cy, 15, 0, Math.PI * 2); x.fill(); x.stroke();
      x.fillStyle = "#ececec"; x.font = "500 38px " + SANS; wrap(x, t, pad + 62, cy + 13, W - pad * 2 - 62, 46, 1);
    });
    if (s.score != null) {
      const cx = pad + 70, cy = H - 190;
      x.lineWidth = 14; x.strokeStyle = "#232323"; x.beginPath(); x.arc(cx, cy, 58, 0, Math.PI * 2); x.stroke();
      x.strokeStyle = "#e08a5b"; x.lineCap = "round"; x.beginPath(); x.arc(cx, cy, 58, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * s.score / 100); x.stroke(); x.lineCap = "butt";
      x.fillStyle = "#ececec"; x.font = "700 44px " + SERIF; x.textAlign = "center"; x.fillText(String(s.score), cx, cy + 15); x.textAlign = "left";
      x.fillStyle = "#9b9b9b"; x.font = "400 28px " + SANS; x.fillText("out of 100 believable", cx + 90, cy + 10);
    }
    x.fillStyle = "#ececec"; x.font = "700 34px " + SERIF; x.fillText("Whatif", pad, H - 62);
    x.fillStyle = "#6c6c6c"; x.font = "400 24px " + SANS; x.textAlign = "right"; x.fillText("Made by me · " + location.host, W - pad, H - 62); x.textAlign = "left";
    c.toBlob(b => {
      if (!b) { toast("Couldn't make the image"); return; }
      const a = el("a"); a.href = URL.createObjectURL(b); a.download = "whatif-" + (s.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "story") + ".png";
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast("Image saved");
    }, "image/png");
  }

  /* ---------------------------------------------------------------- shared link page */
  async function loadShared() {
    $("ask").hidden = true; $("shared").hidden = false;
    const s = await Story.unpack(location.hash.replace(/^#/, ""));
    resetView(); $("result").hidden = false;
    if (!s) { $("shared-msg").textContent = "This link is broken or incomplete."; showNote("That Whatif link didn't open. Ask whoever sent it to share it again, or make your own.", null); return; }
    $("shared-msg").textContent = "Someone shared this Whatif with you.";
    cur = { id: null, story: s, shared: true, parent: null };
    paint(s); $("actions").hidden = false; $("a-new").textContent = "Make your own";
  }

  /* ---------------------------------------------------------------- wiring */
  $("form").onsubmit = e => { e.preventDefault(); ask($("q").value); };
  $("q").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); $("form").requestSubmit(); } });
  $("stop").onclick = () => {
    if (!run) return;
    const me = run; me.ctrl.abort(); run = null; $("status").hidden = true; $("go").disabled = false;
    if (Story.complete(me.story)) { cur.id = newId(); db.stories.unshift({ id: cur.id, parent: cur.parent, ts: Date.now(), story: me.story }); saveDb(); refreshChrome(); paint(me.story); $("actions").hidden = false; }
    else { $("story").hidden = true; $("result").hidden = true; }
  };
  $("surprise").onclick = () => { const p = shuffle(boot.premises)[0]; $("q").value = p.t; ask(p.t); };
  $("shuffle").onclick = renderPills;
  $("daily").onclick = () => { $("q").value = boot.daily.t; ask(boot.daily.t, { daily: true }); };
  $("open-multi").onclick = openDrawer;
  $("close-multi").onclick = closeDrawer;
  $("scrim").onclick = closeDrawer;
  $("clear-multi").onclick = () => { if (confirm("Delete every saved what-if from this browser?")) { db.stories = []; saveDb(); refreshChrome(); renderTree(); } };
  $("a-share").onclick = shareLink;
  $("a-image").onclick = saveImage;
  $("a-copy").onclick = async () => { if (cur.story) toast(await copyText(Story.toText(cur.story)) ? "Copied. Paste it anywhere." : "Couldn't copy"); };
  $("a-new").onclick = () => { if (cur.shared) { location.href = "/"; return; } $("result").hidden = true; $("q").value = ""; window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); $("q").focus(); };
  $("note-new").onclick = () => { if (cur.shared) { location.href = "/"; return; } $("result").hidden = true; $("q").focus(); window.scrollTo({ top: 0 }); };
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeDrawer();
    if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && !$("ask").hidden) { e.preventDefault(); $("q").focus(); }
  });
  window.addEventListener("hashchange", () => { if (location.pathname === "/s") loadShared(); });

  $("daily-t").textContent = boot.daily.t;
  bindPrefs(); renderCats(); renderPills(); refreshChrome();
  if (location.pathname === "/s") loadShared();
  else if (matchMedia("(pointer: fine)").matches) $("q").focus();
})();
