# Whatif

Type any "what if" and watch the world change: a timeline that fills in while it is being written, the domino chain of cause and effect,
who wins and loses, a believability score, a true fact, and follow-up what-ifs. Click **Change this** on any event to branch the story;
every story is saved in your own **Multiverse** (this browser only). Share a story as a link (the whole story is inside the link, so the
server stores nothing), save it as a poster image, or copy it as text.

Made by me, with Claude as my helper and the OpenAI API writing the stories.

## Run it

```
pip install -r requirements.txt
python app.py            # http://127.0.0.1:5175
```

Put `OPENAI_API_KEY=...` in a `.env` file (see `.env.example`). Without a key the site still works: it streams three hand-written example
stories (`samples.py`) and says so on the page. Production (Render) needs the key as an environment variable too.

| setting | default | what it does |
| --- | --- | --- |
| `OPENAI_MODEL` | `gpt-5-mini` | the storyteller |
| `OPENAI_REASONING_EFFORT` | `minimal` | keeps a story at about 6 seconds, first card in about 1-2 |
| `AI_PER_HOUR` | `24` | stories per visitor per hour |
| `AI_DAILY_LIMIT` | `600` | stories per day for the whole site |

## How it works

- `/api/whatif` streams plain text in a **line format** (`story.py` describes it): one line per piece, so the page shows the first event
  in a second or two instead of waiting for a whole JSON answer. `static/story.js` parses it in the browser (and in the Node tests), and
  copes with the ways the model slips: no line breaks, a missing `TITLE|`, two winners on one line, a stray `|` at the end of a line.
- Everything from the AI, from localStorage and from share links goes onto the page with `textContent` only, and share links are rebuilt
  field by field with length caps. The CSP has no inline scripts.
- Safety: self-harm wording gets a support message instead of a story, explicit requests are refused, the prompt keeps real tragedies
  respectful and refuses private people, and the premise is passed as a topic, never as instructions.
- `hubguard.py` + `static/hub.js` are the owner's universal switches (kept in Cramly), copied from `../showcase`.

## Tests

```
python -m unittest discover -s tests     # server: safety routing, limits, mocked OpenAI stream, sample integrity
node tests/story.test.js                  # the browser parser and share links, run exactly as the page runs them
```

Deploy: Flask + gunicorn (`Procfile`), Render free tier, auto-deploys from `main`.
