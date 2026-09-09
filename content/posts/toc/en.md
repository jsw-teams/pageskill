---
title: Add a table of contents to long articles
description: Use real Markdown headings so the theme can build a useful article outline.
date: 2026-09-08
---

# Add a table of contents to long articles

A table of contents is built from real Markdown headings. It gives readers links to sections without copying anchors into the article.

## 1. Write a heading structure

Use one title, then level-two sections and level-three details:

```markdown
# Cookie choices

## Choose a category

### Keep optional items off

## Check withdrawal
```

Keep each heading short and make the same heading level mean the same kind of section throughout the article.

## 2. Generate the article

```powershell
npm run g
npm run s
```

The active article pattern can show the outline beside the body. If the active theme exposes the `toc` Block and you need an explicit position, add this small directive where the outline should appear:

```markdown
:::toc
:::
```

The default `toc` plugin lives in `themes/default/plugins/toc/`; its Block, style, and messages are one reusable module. Set its switch and depth in `themes/default/theme.yml` under `plugins.toc`.

## Expected result

The outline links to the generated section IDs. Selecting a link moves to that section, and the page still works when the outline is closed or the viewport is narrow.

## Common trap

Bold text is not a heading, so it cannot become a useful entry. Do not hand-write duplicate anchors or edit generated HTML; use Markdown headings and the active theme capability.

## Next step

Read [Develop a reusable plugin](/en/posts/plugins/) when a repeated structure needs one shared implementation.
