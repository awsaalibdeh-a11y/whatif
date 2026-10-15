/* The Whatif story format, in pure functions (no DOM) so the browser and the Node tests run exactly the same code.
   The AI streams one line per piece (see story.py for the format). Parser.feed() accepts text cut ANYWHERE, even in the middle of a word,
   and tells the page which piece just became complete. Share links carry the whole story inside them (deflate + base64url). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Story = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const CAP = { title: 80, premise: 500, real: 400, when: 40, head: 90, text: 420, chain: 40, line: 220, fact: 300, branch: 120, why: 220, note: 300 };
  const MAX_EVENTS = 10;
  const KEYS = "TITLE|PREMISE|REAL|EVENT|CHAIN|WIN|LOSE|SAME|SCORE|FACT|BRANCH|DEMO|REFUSE";
  const BOUNDARY = new RegExp("\\s*\\|\\s*(" + KEYS + ")\\|", "g");   // "...text|EVENT|..." means a new line started: some answers use | instead of line breaks
  const STARTS_WITH_KEY = new RegExp("^(?:" + KEYS + ")\\|");
  const EMOJI = /\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*/u;

  const cut = (s, n) => String(s == null ? "" : s).replace(/\s+/g, " ").replace(/(?:\s*\|)+\s*$/, "").trim().slice(0, n);   // the model sometimes ends a line with a stray |
  const icon = s => { const m = String(s || "").match(EMOJI); return m ? m[0] : "•"; };

  function empty() {
    return { title: "", premise: "", real: "", events: [], chain: [], win: [], lose: [], same: "", score: null, why: "", fact: "", branches: [], demo: "", refuse: "" };
  }

  /* applies ONE complete line to the story; returns the name of the piece that changed, or "" */
  function applyLine(story, raw) {
    const line = String(raw).replace(/^[\s`*\-•]+/, "").replace(/\*\*/g, "");
    const m = line.match(/^([A-Z]+)\|(.*)$/);
    if (!m) return "";
    const key = m[1], rest = m[2];
    switch (key) {
      case "TITLE": story.title = cut(rest, CAP.title); return "title";
      case "PREMISE": story.premise = cut(rest, CAP.premise); return "premise";
      case "REAL": story.real = cut(rest, CAP.real); return "real";
      case "SAME": story.same = cut(rest, CAP.line); return "same";
      case "FACT": story.fact = cut(rest, CAP.fact); return "fact";
      case "DEMO": story.demo = cut(rest, CAP.note); return "demo";
      case "REFUSE": story.refuse = cut(rest, CAP.note); return "refuse";
      case "EVENT": {
        const p = rest.split("|");
        if (p.length < 4 || story.events.length >= MAX_EVENTS) return "";
        story.events.push({ when: cut(p[0], CAP.when), icon: icon(p[1]), head: cut(p[2], CAP.head), text: cut(p.slice(3).join("|"), CAP.text) });
        return "event";
      }
      case "CHAIN": {
        const steps = rest.split(/>|\|/).map(s => cut(s, CAP.chain)).filter(Boolean).slice(0, 7);
        if (!steps.length) return "";
        story.chain = steps; return "chain";
      }
      case "WIN": case "LOSE": {                                        // two items on one line (WIN|a|b) count as two
        const list = story[key.toLowerCase()]; let added = false;
        for (const piece of rest.split("|")) { const t = cut(piece, CAP.line); if (t && list.length < 3) { list.push(t); added = true; } }
        return added ? key.toLowerCase() : "";
      }
      case "SCORE": {
        const p = rest.split("|"), n = String(p[0]).match(/\d+/);
        if (!n) return "";
        story.score = Math.max(0, Math.min(100, parseInt(n[0], 10)));
        story.why = cut(p.slice(1).join("|"), CAP.why); return "score";
      }
      case "BRANCH": {
        let added = false;
        for (const piece of rest.split("|")) { const t = cut(piece, CAP.branch); if (t && story.branches.length < 4) { story.branches.push(t); added = true; } }
        return added ? "branch" : "";
      }
      default: return "";
    }
  }

  class Parser {
    constructor(story, onChange) { this.story = story || empty(); this.buf = ""; this.first = true; this.onChange = onChange || (() => {}); }
    line(text) {
      const clean = String(text).replace(/^[\s`*\-•]+/, "").replace(/\*\*/g, "");
      if (!clean.trim()) return;
      let what = "";
      if (this.first && !STARTS_WITH_KEY.test(clean)) {                  // the model left off "TITLE|": the first line is the title, maybe followed by the premise
        const parts = clean.split("|"), s = this.story;
        if (parts[0].trim().length <= CAP.title * 2) { s.title = cut(parts[0], CAP.title); what = "title"; }
        if (parts[1] && /^what if\b/i.test(parts[1].trim())) s.premise = cut(parts[1], CAP.premise);
      } else what = applyLine(this.story, clean);
      this.first = false;
      if (what) this.onChange(what, this.story);
    }
    feed(chunk) {
      this.buf = (this.buf + chunk).replace(BOUNDARY, "\n$1|");
      let i;
      while ((i = this.buf.indexOf("\n")) >= 0) { const line = this.buf.slice(0, i); this.buf = this.buf.slice(i + 1); this.line(line); }
    }
    end() {                                   // the last line may not end with a newline
      if (this.buf.trim()) this.line(this.buf);
      this.buf = "";
      return this.story;
    }
  }

  const parse = text => { const p = new Parser(); p.feed(text); return p.end(); };
  const complete = s => !!(s && s.title && s.events.length >= 2);

  /* anything that comes from outside (a share link, localStorage) is rebuilt from scratch with every field capped, never trusted */
  function sanitize(o) {
    if (!o || typeof o !== "object") return null;
    const s = empty();
    const list = (a, n, f) => (Array.isArray(a) ? a.slice(0, n).map(f).filter(x => x) : []);
    s.title = cut(o.title, CAP.title); s.premise = cut(o.premise, CAP.premise); s.real = cut(o.real, CAP.real);
    s.same = cut(o.same, CAP.line); s.fact = cut(o.fact, CAP.fact); s.why = cut(o.why, CAP.why);
    s.score = typeof o.score === "number" && isFinite(o.score) ? Math.max(0, Math.min(100, Math.round(o.score))) : null;
    s.events = list(o.events, MAX_EVENTS, e => (e && typeof e === "object" && cut(e.head, 1) ? { when: cut(e.when, CAP.when), icon: icon(e.icon), head: cut(e.head, CAP.head), text: cut(e.text, CAP.text) } : null));
    s.chain = list(o.chain, 7, c => cut(c, CAP.chain));
    s.win = list(o.win, 3, c => cut(c, CAP.line)); s.lose = list(o.lose, 3, c => cut(c, CAP.line));
    s.branches = list(o.branches, 4, c => cut(c, CAP.branch));
    return complete(s) ? s : null;
  }

  /* ---- share code: WI1:<base64url of deflate-raw JSON>, or WI0:<base64url of plain JSON> when the browser cannot compress ---- */
  const toB64 = bytes => { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
  const fromB64 = t => { const s = atob(t.replace(/-/g, "+").replace(/_/g, "/")); const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; };
  const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());

  async function pack(story) {
    const slim = { title: story.title, premise: story.premise, real: story.real, events: story.events, chain: story.chain, win: story.win, lose: story.lose,
      same: story.same, score: story.score, why: story.why, fact: story.fact, branches: story.branches };
    const bytes = new TextEncoder().encode(JSON.stringify(slim));
    if (typeof CompressionStream !== "undefined") return "WI1:" + toB64(await pipe(bytes, new CompressionStream("deflate-raw")));
    return "WI0:" + toB64(bytes);
  }

  async function unpack(code) {
    try {
      const m = String(code || "").trim().match(/^(WI[01]):([A-Za-z0-9_-]+)$/);
      if (!m || m[2].length > 60000) return null;
      let bytes = fromB64(m[2]);
      if (m[1] === "WI1") bytes = await pipe(bytes, new DecompressionStream("deflate-raw"));
      if (bytes.length > 200000) return null;
      return sanitize(JSON.parse(new TextDecoder().decode(bytes)));
    } catch (e) { return null; }
  }

  function toText(s) {
    const out = [s.title.toUpperCase(), s.premise, ""];
    if (s.real) out.push("What really happened: " + s.real, "");
    s.events.forEach(e => out.push(e.when + " - " + e.head + ": " + e.text));
    if (s.chain.length) out.push("", s.chain.join(" > "));
    if (s.score != null) out.push("", "Believability: " + s.score + "/100" + (s.why ? " (" + s.why + ")" : ""));
    out.push("", "Made with Whatif");
    return out.join("\n");
  }

  return { CAP, MAX_EVENTS, empty, applyLine, Parser, parse, complete, sanitize, pack, unpack, toText, cut, icon };
});
