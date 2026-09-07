---
title: Markdown basics
description: Write frontmatter and ordinary Markdown that Pageskill can validate and render.
pattern: docs
---

# Markdown basics

Pageskill treats a page as content data. Frontmatter supplies the fields required by the collection schema, and the body uses CommonMark with GFM features. Patterns and Blocks provide reusable structure; the author does not write per-page HTML.

## Make a document page

From the site root, create `content/pages/hello/en.md`:

```markdown
---
title: Hello from Markdown
description: A small page that uses headings, lists, a table, and one reusable Block.
pattern: document
---

# Hello from Markdown

Pageskill turns this source into a page at `/en/hello/`.

## A short checklist

- Write the page in Markdown.
- Keep frontmatter names aligned with the collection schema.
- Reuse a Block only when `pageskill catalog` shows it exists.

| Source | Result |
| --- | --- |
| `# heading` | A semantic heading |
| `[Guide](/en/guide/)` | A normal site link |

:::hero{tone="brand" align="left"}
The `hero` Block is reusable theme structure.
:::
```

The starter provides the `document` Pattern and `hero` Block. The full default theme also provides `docs`; confirm a capability with `pageskill catalog` before using it.

## Use the common building blocks

Use `#`, `##`, and `###` headings for document structure. Use paragraphs, lists, blockquotes, fenced code, tables, task lists, and ordinary Markdown links in the body. Put a scalar attribute on a directive, for example `:::hero{tone="brand"}`. Keep long prose in Markdown instead of encoding it as an HTML string.

Check the active names before copying an example:

```bash
pageskill catalog
pageskill inspect pattern:document
pageskill inspect block:hero
```

## Check the result

Run the check and build from the site root:

```bash
pageskill check
pageskill build
```

The expected result is a successful check and a generated `/en/hello/` page in `dist/`. If you run `pageskill s`, the preview server refreshes after the Markdown file changes.

## Common errors

- **The page has no title:** add the required `title` field to Frontmatter.
- **The Pattern is unknown:** use `document` in a starter, or copy a theme that `catalog` shows provides the requested Pattern.
- **A Block attribute is rejected:** inspect that Block and use only its declared scalar schema and allowed values.
- **A table or directive renders strangely:** check the closing `:::` line and keep a blank line before and after block content.
- **HTML was added to “fix” one page:** return to Markdown and a reusable Pattern or Block; raw HTML is escaped by default.

## Expected result and next step

You can now write a checked document page using frontmatter and reusable Markdown structure. Continue with [First content](/en/guide/first-content/) to create a page and a dated Product Note, or return to the [Guide](/en/guide/).

[Back to the Guide](/en/guide/) · [Next: First content](/en/guide/first-content/)
