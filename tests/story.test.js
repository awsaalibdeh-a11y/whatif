// node tests/story.test.js : the browser's story parser and share-link code, run exactly as the page runs them.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const Story = require("../static/story.js");

let n = 0;
const t = async (name, fn) => { try { await fn(); n++; console.log("PASS " + name); } catch (e) { console.log("FAIL " + name + "\n  " + (e.stack || e)); process.exitCode = 1; } };

const SAMPLE = fs.readFileSync(path.join(__dirname, "sample.txt"), "utf8");   // written by tests/test_app.py from samples.py

(async () => {
  await t("parses a whole story", () => {
    const s = Story.parse(SAMPLE);
    assert.ok(s.title && s.premise && s.real);
    assert.ok(s.events.length >= 4, "events");
    assert.strictEqual(s.chain.length, 5);
    assert.ok(s.win.length === 2 && s.lose.length === 2 && s.branches.length === 3);
    assert.ok(typeof s.score === "number" && s.score >= 0 && s.score <= 100);
    assert.ok(s.demo, "DEMO line kept");
    assert.ok(Story.complete(s));
    assert.strictEqual(s.events[s.events.length - 1].when, "Today");
  });

  await t("gives the same result when the text is cut at every possible place", () => {
    const whole = JSON.stringify(Story.parse(SAMPLE));
    for (const size of [1, 2, 3, 7, 50, 333]) {
      const p = new Story.Parser();
      for (let i = 0; i < SAMPLE.length; i += size) p.feed(SAMPLE.slice(i, i + size));
      assert.strictEqual(JSON.stringify(p.end()), whole, "chunk size " + size);
    }
  });

  await t("reports each piece as soon as its line is finished, not before", () => {
    const seen = [];
    const p = new Story.Parser(null, w => seen.push(w));
    p.feed("TITLE|Half a ti");
    assert.deepStrictEqual(seen, []);
    p.feed("tle\nEVENT|1912|🚢|Head|Some text");
    assert.deepStrictEqual(seen, ["title"]);
    p.feed("\n");
    assert.deepStrictEqual(seen, ["title", "event"]);
    p.feed("FACT|no newline at the end");
    p.end();
    assert.strictEqual(seen[seen.length - 1], "fact");
  });

  await t("survives messy model output", () => {
    const s = Story.parse("```\n**TITLE**|Bold one\n- EVENT|Year 1|not an emoji|Head|Text with | a pipe | inside\n* CHAIN|a > b >  > c\nSCORE|about 64 percent|ok\nWIN|1\nWIN|2\nWIN|3\nWIN|4\nrandom words\nEVENT|too|few\n```");
    assert.strictEqual(s.title, "Bold one");
    assert.strictEqual(s.events.length, 1);
    assert.strictEqual(s.events[0].icon, "•");
    assert.strictEqual(s.events[0].text, "Text with | a pipe | inside");
    assert.deepStrictEqual(s.chain, ["a", "b", "c"]);
    assert.strictEqual(s.score, 64);
    assert.strictEqual(s.win.length, 3);
  });

  await t("strips a stray pipe the model puts at the end of a line", () => {
    const s = Story.parse("TITLE|Ends with pipe|\nWIN|Somebody gains. |\nEVENT|1900|🚀|Head|Text here. |\nCHAIN|a > b|");
    assert.strictEqual(s.title, "Ends with pipe");
    assert.deepStrictEqual(s.win, ["Somebody gains."]);
    assert.strictEqual(s.events[0].text, "Text here.");
    assert.deepStrictEqual(s.chain, ["a", "b"]);
  });

  // the three ways gpt-5-mini has been seen to slip, rebuilt from the real sample so every field is checked
  const lines = SAMPLE.split("\n").filter(l => l && !l.startsWith("DEMO|"));
  const normal = Story.parse(lines.join("\n"));

  await t("accepts a story packed into ONE line with | instead of line breaks (and no TITLE/PREMISE keys)", () => {
    const joined = lines.join("|").replace(/^TITLE\|/, "").replace("|PREMISE|", "|");
    assert.ok(!joined.includes("\n"));
    const one = Story.parse(joined);
    assert.strictEqual(one.title, normal.title);
    assert.strictEqual(one.premise, normal.premise);
    assert.deepStrictEqual(one.events, normal.events);
    assert.deepStrictEqual(one.chain, normal.chain);
    assert.deepStrictEqual([one.win, one.lose, one.branches, one.score, one.fact, one.same], [normal.win, normal.lose, normal.branches, normal.score, normal.fact, normal.same]);
    for (const size of [1, 5, 64]) {                                  // and still correct when it arrives in small pieces
      const p = new Story.Parser();
      for (let i = 0; i < joined.length; i += size) p.feed(joined.slice(i, i + size));
      assert.deepStrictEqual(p.end(), one, "chunk size " + size);
    }
  });

  await t("a first line without TITLE| becomes the title, and instruction text after it is ignored", () => {
    const s = Story.parse("TITANIC RESCUED MIRACLE|a punchy title of 3 to 6 words\nPREMISE|What if the ship made it?\nEVENT|1912|🚢|Head|Text\nEVENT|Today|🌍|Head2|Text2");
    assert.strictEqual(s.title, "TITANIC RESCUED MIRACLE");
    assert.strictEqual(s.premise, "What if the ship made it?");
    assert.ok(Story.complete(s));
    assert.strictEqual(Story.parse("A Bare Title\nEVENT|1|x|h|t").title, "A Bare Title");
  });

  await t("two winners, losers or follow-ups on one line count as separate items", () => {
    const s = Story.parse("WIN|First gain.|Second gain.\nLOSE|One loss.|Another loss.|A third.|A fourth.\nBRANCH|What if a?|What if b?\nCHAIN|a|b|c");
    assert.deepStrictEqual(s.win, ["First gain.", "Second gain."]);
    assert.strictEqual(s.lose.length, 3);
    assert.deepStrictEqual(s.branches, ["What if a?", "What if b?"]);
    assert.deepStrictEqual(s.chain, ["a", "b", "c"]);
  });

  await t("clamps scores and caps field lengths", () => {
    assert.strictEqual(Story.parse("SCORE|900|x").score, 100);
    assert.strictEqual(Story.parse("TITLE|" + "x".repeat(500)).title.length, Story.CAP.title);
    const many = Array.from({ length: 30 }, (_, i) => "EVENT|" + i + "|🙂|h|t").join("\n");
    assert.strictEqual(Story.parse(many).events.length, Story.MAX_EVENTS);
  });

  await t("a refusal is kept and is not a finished story", () => {
    const s = Story.parse("REFUSE|Not that one, try another.\n");
    assert.strictEqual(s.refuse, "Not that one, try another.");
    assert.ok(!Story.complete(s));
  });

  await t("share code round-trips a story", async () => {
    const s = Story.parse(SAMPLE);
    const code = await Story.pack(s);
    assert.ok(/^WI1:[A-Za-z0-9_-]+$/.test(code), "url-safe");
    assert.ok(code.length < 2400, "short enough for a link: " + code.length);
    const back = await Story.unpack(code);
    assert.strictEqual(back.title, s.title);
    assert.deepStrictEqual(back.events, s.events);
    assert.deepStrictEqual(back.chain, s.chain);
    assert.strictEqual(back.score, s.score);
  });

  await t("share code also works without compression (WI0)", async () => {
    const s = Story.parse(SAMPLE);
    const json = JSON.stringify(s);
    const bytes = Buffer.from(json, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const back = await Story.unpack("WI0:" + bytes);
    assert.strictEqual(back.title, s.title);
  });

  await t("rejects broken, oversized and hostile share codes", async () => {
    for (const bad of ["", "nope", "WI1:", "WI1:!!!", "WI1:AAAA", "WI9:abc", "WI0:" + "A".repeat(70000), null, undefined]) assert.strictEqual(await Story.unpack(bad), null, String(bad).slice(0, 20));
    const evil = Buffer.from(JSON.stringify({ title: "<img src=x onerror=alert(1)>", premise: "p", events: [{ head: "<script>x</script>", text: { a: 1 }, when: 5, icon: "<b>" }, { head: "second", text: "t" }], chain: "nope", score: "99", win: [1, {}, "ok"] })).toString("base64");
    const s = await Story.unpack("WI0:" + evil.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""));
    assert.ok(s, "still readable");
    assert.strictEqual(s.events[0].icon, "•");                  // not "<b>"
    assert.strictEqual(typeof s.events[0].text, "string");
    assert.strictEqual(s.score, null);                          // strings are not scores
    assert.deepStrictEqual(s.chain, []);
    assert.deepStrictEqual(s.win, ["1", "[object Object]", "ok"].slice(0, 3).map(x => Story.cut(x, 220)));
  });

  await t("sanitize needs a title and two events", () => {
    assert.strictEqual(Story.sanitize({ title: "x", events: [{ head: "a" }] }), null);
    assert.ok(Story.sanitize({ title: "x", events: [{ head: "a" }, { head: "b" }] }));
    assert.strictEqual(Story.sanitize(null), null);
    assert.strictEqual(Story.sanitize("string"), null);
  });

  await t("copy-as-text mentions the title, events and score", () => {
    const text = Story.toText(Story.parse(SAMPLE));
    assert.ok(/THE SHIP THAT MADE IT|A PLANET|EARTH WITHOUT/.test(text));
    assert.ok(text.includes("Believability:") && text.includes("Made with Whatif"));
  });

  console.log(n + " passed" + (process.exitCode ? ", some FAILED" : ""));
})();
