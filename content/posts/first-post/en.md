---
title: Publish your first article
description: Create one article with three language versions and open it from the home page.
date: 2026-09-07
---

# Publish your first article

Tutorials, notes, and product records can all live under `content/posts/`, and these articles need a date. A fixed About or contact page belongs under `content/pages/` and does not need `date`; the three languages share one directory name so readers can switch between article versions.

## 1. Create the article directory

This example uses `hello-site` as its article ID:

```powershell
New-Item -ItemType Directory content\posts\hello-site
```

Create `zh-sg.md`, `zh-tw.md`, and `en.md` in that directory. Start with the English version:

```markdown
---
title: My site is live
description: A note about the first publish.
date: 2026-09-07
---

# My site is live

This is my first article. I am starting to record what I learn here.

## Next step

I will keep writing about the next experiment.
```

Translate the title, description, and body in the other languages while keeping the same `date` and directory name; the article collection supplies its default pattern.

## 2. Generate and open it

```powershell
pageskill g
pageskill s
```

Open `/en/posts/hello-site/`, then use the language links in the article to view the other versions.

## Expected result

The home page list contains the new article. All three languages resolve at `/locale/posts/hello-site/`, and the Feed and search include it.

## Common trap

Do not use a different directory name for each language or put the article in a route reserved for the current page. One ID plus three locale files makes one switchable article.

## Next step

Read [Cookie choices: ask before loading](/en/posts/cookies/) to set optional services to start disabled.
