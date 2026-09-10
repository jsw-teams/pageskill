---
title: "Markdown: write like a note"
description: Write one publishable post with headings, paragraphs, lists, and fenced code.
date: 2026-09-07
category: tutorial
---

# Markdown: write like a note

Markdown is a plain-text way to mark headings and paragraphs. The Frontmatter at the top is metadata that tells Pageskill the title, date, and other post information.

## 1. Create a post file

Write this complete example in `content/posts/hello/en.md`:

````markdown
---
title: My first post
description: One thing I learned today.
date: 2026-09-07
---

# My first post

Today I finished one small goal.

## Next step

- Record the result
- Keep one useful link

```text
npm run g
```
````

Use `#` for the title and `##` for a section; use `-` for a list and three backticks for code. Keep long content in Markdown instead of putting HTML strings in settings.

## 2. Generate and view it

```powershell
npm run g
npm run s
```

Open `/en/posts/hello/` and check that the title, paragraphs, and code block follow the post structure.

## Expected result

The post appears in the post list, Feed, search, and sitemap. The `hello` directory becomes its post route.

## Common trap

A post without `date` cannot be published. Use `YYYY-MM-DD`, share one directory name across its language versions, and let the collection provide the default post pattern.

## Next step

Follow [Publish your first tutorial](/en/posts/first-post/) to add all three languages, then open it from the home page list.
