"""The story format. The AI streams one line per piece, so the page can show each piece the moment it arrives:

    TITLE|text            PREMISE|text           REAL|what really happened
    EVENT|when|emoji|headline|text               (several, in order; the last one is "Today")
    CHAIN|a > b > c > d > e                      WIN|text / LOSE|text (a few each)
    SAME|text   SCORE|0-100|why   FACT|text   BRANCH|a follow-up what-if (a few)
    DEMO|note (hand-written example)   REFUSE|friendly reason (nothing was written)

static/story.js is the same parser for the browser. This copy checks the hand-written samples and the tests."""

import re

CAPS = {"title": 80, "premise": 500, "real": 400, "when": 40, "head": 90, "text": 420, "chain": 40, "line": 220, "fact": 300, "branch": 120, "why": 220}
MAX_EVENTS = 10
KEYS = "TITLE|PREMISE|REAL|EVENT|CHAIN|WIN|LOSE|SAME|SCORE|FACT|BRANCH|DEMO|REFUSE"
BOUNDARY = re.compile(r"\s*\|\s*(" + KEYS + r")\|")          # some answers use | instead of line breaks
STARTS_WITH_KEY = re.compile(r"^(?:" + KEYS + r")\|")


def _cut(s, n):
    return re.sub(r"(?:\s*\|)+\s*$", "", re.sub(r"\s+", " ", str(s or ""))).strip()[:n]


def parse(text):
    story = {"title": "", "premise": "", "real": "", "events": [], "chain": [], "win": [], "lose": [], "same": "", "score": None, "why": "", "fact": "",
             "branches": [], "demo": "", "refuse": ""}
    first = True
    for raw in BOUNDARY.sub(r"\n\1|", str(text or "")).splitlines():
        line = re.sub(r"^[\s`*\-•]+", "", raw).replace("**", "")
        if not line.strip():
            continue
        if first and not STARTS_WITH_KEY.match(line):          # the model left off "TITLE|": the first line is the title
            parts = line.split("|")
            story["title"] = _cut(parts[0], CAPS["title"])
            if len(parts) > 1 and re.match(r"what if\b", parts[1].strip(), re.I):
                story["premise"] = _cut(parts[1], CAPS["premise"])
            first = False
            continue
        first = False
        m = re.match(r"^([A-Z]+)\|(.*)$", line)
        if not m:
            continue
        key, rest = m.group(1), m.group(2)
        if key in ("TITLE", "PREMISE", "REAL", "SAME", "FACT", "DEMO", "REFUSE"):
            field = {"TITLE": "title", "PREMISE": "premise", "REAL": "real", "SAME": "same", "FACT": "fact", "DEMO": "demo", "REFUSE": "refuse"}[key]
            story[field] = _cut(rest, CAPS.get(field, CAPS["line"]))
        elif key == "EVENT":
            parts = rest.split("|")
            if len(parts) >= 4 and len(story["events"]) < MAX_EVENTS:
                story["events"].append({"when": _cut(parts[0], CAPS["when"]), "icon": _cut(parts[1], 8), "head": _cut(parts[2], CAPS["head"]),
                                        "text": _cut("|".join(parts[3:]), CAPS["text"])})
        elif key == "CHAIN":
            story["chain"] = [_cut(p, CAPS["chain"]) for p in re.split(r">|\|", rest) if _cut(p, 1)][:7]
        elif key in ("WIN", "LOSE"):
            for piece in rest.split("|"):
                if _cut(piece, 1) and len(story[key.lower()]) < 3:
                    story[key.lower()].append(_cut(piece, CAPS["line"]))
        elif key == "SCORE":
            parts = rest.split("|")
            digits = re.search(r"\d+", parts[0])
            if digits:
                story["score"] = max(0, min(100, int(digits.group())))
                story["why"] = _cut("|".join(parts[1:]), CAPS["why"])
        elif key == "BRANCH":
            for piece in rest.split("|"):
                if _cut(piece, 1) and len(story["branches"]) < 4:
                    story["branches"].append(_cut(piece, CAPS["branch"]))
    return story


def complete(story):
    """Enough to show as a finished story."""
    return bool(story["title"] and len(story["events"]) >= 2)
