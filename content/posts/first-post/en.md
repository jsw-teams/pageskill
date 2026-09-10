---
title: Publish your first tutorial
description: Create one post with three language versions and open it from the home page.
date: 2026-09-07
category: tutorial
---

# Publish your first tutorial

Tutorials, notes, product posts, and version updates live under `content/posts/`, and every post needs a date. Add `category: tutorial` when a post is a tutorial; omit `category` when it should remain `uncategorized`. Add `category: update` to a version note so the [update archive](/en/updates/) stays separate from ordinary posts. A fixed About or contact page belongs under `content/pages/` and does not need `date`; the three languages share one directory name so readers can switch between post versions.

## 1. Create the post directory

This example uses `hello-site` as its post ID:

```powershell
New-Item -ItemType Directory content\posts\hello-site
```

Create `zh-sg.md`, `zh-tw.md`, and `en.md` in that directory. Start with the English version:

```markdown
---
title: My site is live
description: A note about the first publish.
date: 2026-09-07
author: toewpq
cover: assets/og-default-product.webp
---

# My site is live

This is my first post. I am starting to record what I learn here.

## Next step

I will keep writing about the next experiment.
```

Translate the title, description, and body in the other languages while keeping the same `date` and directory name; the post collection supplies its default pattern.

`author` is plain text. Omit it when the localized `author` in `config.yml` should be used. `cover` is optional: put the source image under `content/assets/` and write its public path as `assets/<path>` (or `/assets/<path>`). The existing `assets/og-default-product.webp` is a current bear-derived image in this repository. The generator publishes it under `dist/public/assets/`; an article without `cover` simply has no cover image. Unsafe URL schemes are rejected.

## 2. Generate and open it

```powershell
npm run g
npm run s
```

Open `/en/posts/hello-site/`, then use the language links in the article to view the other versions.

## Expected result

The home page list contains the new post. All three languages resolve at `/locale/posts/hello-site/`, and the Feed and search include it.

## Common trap

Do not use a different directory name for each language or put the post in a route reserved for the current page. One ID plus three locale files makes one switchable post.

## Next step

Read [How we build a plugin](/en/posts/cookies/) to study the Cookie selector reference implementation.
