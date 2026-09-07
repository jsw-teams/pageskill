---
title: "Markdown: write like a note"
description: Write one publishable article with headings, paragraphs, lists, and fenced code.
date: 2026-09-07
---

# Markdown: write like a note

Markdown is a plain-text way to mark headings and paragraphs. The Frontmatter at the top is metadata that tells Pageskill the title, date, and other article information.

## 1. Create an article file

Write this complete example in `content/posts/hello/en.md`:

````markdown
---
title: My first article
description: One thing I learned today.
date: 2026-09-07
---

# My first article

Today I finished one small goal.

## Next step

- Record the result
- Keep one useful link

```text
pageskill g
```
````

Use `#` for the title and `##` for a section; use `-` for a list and three backticks for code. Keep long content in Markdown instead of putting HTML strings in settings.

## 2. Generate and view it

```powershell
pageskill g
pageskill s
```

Open `/en/posts/hello/` and check that the title, paragraphs, and code block follow the article structure.

## Expected result

The article appears in the article list, Feed, search, and sitemap. The `hello` directory becomes its article route.

## Common trap

An article without `date` cannot be published as an article. Use `YYYY-MM-DD`, share one directory name across its language versions, and let the collection provide the default article pattern.

## Next step

Follow [Publish your first article](/en/posts/first-post/) to add all three languages, then open it from the home page list.
