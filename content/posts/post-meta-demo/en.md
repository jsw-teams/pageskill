---
title: A post with honest metadata
description: A real mixed-language article that demonstrates publication date, update date, word count, and reading time.
date: 2026-09-01
update: 2026-09-12
category: tutorial
---

# A post with honest metadata

This article is deliberately long enough to make the post header useful. Pageskill reads the Markdown body, counts visible CJK characters and Latin word tokens, and estimates reading time without asking the author to maintain a second set of numbers.

The publication date is `2026-09-01`. The `update` field records a later revision on `2026-09-12`; it does not change the article's original date and it does not turn this tutorial into a release note. Release notes use `category: update` and appear in the separate [project updates view](/en/updates/).

## What the reader can see

The default `postMeta` plugin renders a compact header with the published date, the modified date, an approximate reading-unit count, reading time, and author. Because this article has an `update`, it also shows an update notice before the article body. The notice is translated by the theme messages rather than assembled with a locale-specific branch in a renderer.

For a normal article, omit `update`. The published date, word count, and reading time remain, while the modified date and update notice disappear completely. Compare this page with [the first-post example](/en/posts/first-post/), which intentionally has no update field.

## A small Markdown experiment

Here is a sentence with 中文、繁體中文, and English words. It demonstrates that a mixed article can remain natural instead of splitting every language into a separate page. A link such as [the configuration guide](/en/posts/site-settings/) contributes its visible label to the reading units, but its URL does not.

Inline code such as `npm run g` is useful to the reader but is excluded from the count. A fenced code sample is also excluded, because implementation snippets should not make a short explanation look like a very long article:

```yaml
theme:
  name: default
  config: ./site/theme.yml

post:
  date: 2026-09-01
  update: 2026-09-12
```

The same rule applies to a longer sample:

```ts
const visibleText = markdownBody;
const metrics = calculateMetrics(visibleText);
console.log(metrics.readingMinutes);
```

## Why the values are calculated

Authors are good at writing and editing, but manually updating a word-count field is easy to forget. A deterministic metric makes the page honest after every edit. Latin words are counted as tokens, while Han, Hiragana, Katakana, and Hangul characters are counted individually. The combined reading units are enough for a compact label such as “1,240 words” or “约 1,240 字” in a localized theme.

The estimate uses separate default rates for Latin words and CJK characters. A short article still shows at least one minute, and a longer article scales with its actual body. Frontmatter, Markdown syntax, code, and link destinations are not treated as prose.

## Edit this example safely

To create a similar post, make one directory under `content/posts/` and place one file per active locale inside it. Keep the same ID and publication date across translations. Put site-level plugin overrides in `site/theme.yml`; put site identity and links in `config.yml` or its project-local `extends` files.

Run `npm run g` after editing, then open the generated page in the preview. If the update date is earlier than `date`, or is not a strict ISO date or datetime, the build fails with a source location so the mistake is fixed before publication.

This page is a demo, but the model is intended for real writing: a journal entry, a tutorial, or a product explanation can all use the same metadata without hand-written HTML.
