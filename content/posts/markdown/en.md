---
title: "Markdown: write a complete Pageskill article"
description: A practical guide to the Markdown syntax that Pageskill renders and checks.
date: 2026-09-07
category: tutorial
---

# Markdown: write a complete Pageskill article

Pageskill keeps content in Markdown so the source stays readable before it becomes a web page. The YAML Frontmatter at the top describes the document; the Markdown body contains the content that readers see.

## 1. Start with Frontmatter

Create `content/posts/hello/en.md` and give every post a title, description, and publication date. Use the same directory id for the `zh-sg`, `zh-tw`, and `en` translations.

````markdown
---
title: My first post
description: One useful thing I learned today.
date: 2026-09-07
---

# My first post

Today I finished one small goal and recorded what made it work.

## Next step

- Record the result
- Keep [one useful link](https://example.com/notes)

```text
npm run g
```
````

The first `#` heading is the article title in this example. Pageskill also supplies the page header, so do not add another copy of the same title in a real post. Keep long content in Markdown instead of putting HTML strings in settings.

## 2. Write readable content

Use headings in order, starting with `##` for sections beneath the article title. Write normal paragraphs with a blank line between them. Markdown supports **bold**, *italic*, and ~~strikethrough~~ text, as well as an escaped literal such as \*this phrase is surrounded by asterisks\*.

Lists can be unordered or ordered, and they can be nested:

- Collect the important ideas first.
  - Put supporting details one level deeper.
  - Keep each item short enough to scan.
1. Explain the context.
2. Show the change.
3. Link to [the configuration guide](/en/posts/site-settings/).

Task lists are useful when a tutorial has a small checklist:

- [x] Write the Frontmatter
- [ ] Review the generated page
- [ ] Test the page with only a keyboard

## 3. Add links and images

Use link text that names the destination, such as [read the Pageskill configuration guide](/en/posts/site-settings/), rather than “click here”. Pageskill accepts internal routes, fragment links such as [the checklist below](#checklist), and safe external links such as https://github.com/jsw-teams/pageskill.

![Pageskill home page with site navigation and article cards](/assets/learning/markdown.png)

The alt text describes the information conveyed by the image; it does not need to repeat the word “image”. Decorative images may use an empty alt, but confirm that the image is genuinely decorative before doing so.

## 4. Use code, quotes, and tables

Inline `code` is good for a short command or field name. A fenced block is better for several lines, and the language name helps readers identify it:

```yaml
theme:
  name: default
  config: ./site/theme.yml
```

Every generated code block has a localized Copy button. You can copy the whole block or select only part of the text and use the browser’s normal copy command; the button does not cover the code.

> Markdown should keep the source and the rendered page readable for the people who maintain and use them.

| Element | Use it for | Accessibility note |
| --- | --- | --- |
| Heading | Structure | Keep levels in order |
| Link | Navigation | Describe the destination |
| Image | Visual information | Write meaningful alt text |

Use `---` for a thematic break. A table is kept scrollable on a narrow screen, while the rest of the page reflows to the viewport.

## 5. Reuse a Pageskill Block

Pageskill supports trusted Blocks for repeated presentation patterns. This feature grid is content in Markdown, while its structure and styles belong to the selected theme:

:::feature-grid{columns="2"}
### Content stays portable

Write pages and posts in Markdown, then let the compiler build the routes and metadata.

### Configuration stays clear

Change site data in `config.yml` and theme instance options in `site/theme.yml`.
:::

## Checklist

Before publishing, run:

```text
npm run g
npm run s
```

Open `/en/posts/hello/`, check the title and links, and try the page at a narrow width. The generated post is included in the post archive, search index, Feed, and sitemap when its Frontmatter and route are valid.

## Common mistakes and next steps

A post without `date` cannot be published. Use a stable `YYYY-MM-DD` date, keep translated files under one post id, and add `update: YYYY-MM-DD` only when the article was revised after publication.

For the first complete publishing path, read [Publish your first tutorial](/en/posts/first-post/). For site-wide settings, continue to [Configuration](/en/posts/site-settings/); for the theme instance boundary, read [Customize the theme](/en/posts/customize/).
