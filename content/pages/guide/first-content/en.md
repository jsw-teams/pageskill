---
title: Publish your first page and Product Note
description: Create current page content and a dated article, then check, preview, and build them.
pattern: docs
---

# Publish your first page and Product Note

Pages are the current state of a site. Product Notes are dated history. Keep those roles separate so a current instruction can change without rewriting an old record. The examples below are files to create in your site; this tutorial does not add an article to the Pageskill repository.

## Create a current page

Create `content/pages/welcome/en.md`:

```markdown
---
title: Welcome
description: The first page in this Pageskill site.
pattern: document
---

# Welcome

This page explains what the site offers today.

## Start here

Return to the [site home](/en/) and reuse the Patterns and Blocks that `pageskill catalog` reports. Link to a Guide only if your own site already includes one.
```

With the collection route in the starter, this page becomes `/en/welcome/`. Use `document` in a starter because its theme does not include the full default theme's `docs` Pattern.

## Create a dated Product Note

Create `content/posts/release-note/en.md` only when you are recording a dated decision, implementation, release, incident, deployment, or measurement:

```markdown
---
title: First release note
description: Record what changed and why.
date: 2026-09-06
pattern: blog
---

# First release note

This note records one dated change. Future current instructions belong in a page or the Guide.
```

The post route becomes `/en/posts/release-note/`, and `date` is required by the `posts` collection schema. Do not add a date to a current page just to make it pass validation.

## Add translations deliberately

For an active `zh-sg` or `zh-tw` locale, create the same id and locale file, translate the title, description, and body, and keep the meaning synchronized:

```text
content/pages/welcome/en.md
content/pages/welcome/zh-sg.md
content/pages/welcome/zh-tw.md
content/posts/release-note/en.md
content/posts/release-note/zh-sg.md
content/posts/release-note/zh-tw.md
```

## Check, preview, and build

From the site root run:

```bash
pageskill inspect page:welcome
pageskill inspect collection:posts
pageskill check
pageskill build
pageskill s
```

The expected result is a clean check, a local preview with the new page and note, and generated routes under `dist/`. The Product Note also appears in the configured dated archive and feed when those outputs are enabled. `pageskill s` stays running; if you need to run another `pageskill build`, use a second terminal or stop the preview with Ctrl+C first.

## Common errors

- **A Product Note has no `date`:** add an ISO date such as `2026-09-06`.
- **An article is in `content/pages/`:** move dated history to `content/posts/<id>/<locale>.md`.
- **A starter page uses `pattern: docs`:** change it to `document`, or use a theme that `catalog` confirms provides `docs`.
- **Only one locale was added while three are active:** add matching locale files or reduce `activeLocales` until translations are ready.
- **The page was written as HTML:** keep the content in Markdown and reuse a Pattern or Block.

## Expected result and next step

You now know how to publish current information and dated history without mixing their contracts. Continue with [Cookie consent](/en/guide/cookies/) to configure optional scripts safely, or return to the [Guide](/en/guide/).

[Back to the Guide](/en/guide/) · [Next: Cookie consent](/en/guide/cookies/)
