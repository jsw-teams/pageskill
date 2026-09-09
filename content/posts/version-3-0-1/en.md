---
title: "3.0.1 update: article metadata and safer publishing"
description: Add optional article authors and covers, keep dated archives stable, and follow the current npm and Cloudflare Pages contract.
date: 2026-09-09
author: Site Owner
cover: assets/og-default-product.webp
---

# 3.0.1 update: article metadata and safer publishing

Pageskill 3.0.1 is a patch release on the 3.0 line. It keeps the source repository as the site you edit, keeps the public snapshot in `dist/public`, and does not rewrite older article dates.

## What changed

- `config.yml` remains the site-data entry point for metadata, navigation, collection schemas, privacy/controller data, images, and deployment. The selected theme is `theme.name`; the thin `themes/<name>/index.ts` entry assembles module-owned layouts, components, plugins, styles, scripts, and messages. Plugin instance options stay in `themes/<name>/theme.yml`.
- Incremental builds keep backend and nested theme code in private isolated runtimes. Public CSS and JavaScript resources keep independent content hashes, and persistent `npm run s` preview continues to reload through its SSE path.
- Articles are sorted by valid ISO publication date, newest first. Articles on the same date use a deterministic ID order, so the archive, post list, Feed, and previous/next links do not mix newer and older notes. Existing dates stay as they are; do not change old dates to today's date just to move an article.

## Add an author or cover

Ordinary authors only need to fill in Markdown Frontmatter; no HTML is required. A complete article example is:

```markdown
---
title: My site is live
description: A note about the first publish.
date: 2026-09-07
author: Site Owner
cover: assets/og-default-product.webp
---

# My site is live
```

`author` is optional plain text. If it is omitted, the article uses the matching locale in `config.yml` under `author`; replace the repository's clearly editable `Site Owner` value with the real site owner before publishing. `cover` is optional. Put a local source image under `content/assets/` and write `assets/<path>` (or `/assets/<path>`) in Frontmatter; the public file is generated under `dist/public/assets/<path>`. The existing `assets/og-default-product.webp` is the current bear-derived asset used by this repository. HTTPS image URLs are also accepted; unsafe schemes and traversal paths are rejected. Without a cover, the article page, list, and archive render no image or forced default.

The page separates title, Frontmatter description, published date, and author. A matching Markdown `#` title is not repeated in the article body, and list/archive summaries use the description instead of extracting code or headings from the body.

## Cloudflare Pages contract

For Cloudflare Pages Git integration, use `npm run g` as the build command and `dist/public` as the output directory. There is no `npm run build` compatibility alias. This path is static-only and must never publish the private `dist/` root, which can contain `_pagekiln/`, `server/`, `.pagekiln/`, and `_worker.js`.

When the same Pages deployment must include `backend/handler.ts`, configure the `cloudflare-pages` target in `config.yml`, keep `CLOUDFLARE_API_TOKEN` in the deployment environment, run `npm run d -- --dry-run`, and publish with `npm run d` only after the plan is correct. The CLI stages `dist/public`, the generated `_worker.js`, and the private `_pagekiln` runtime into the Pages upload package.

## Verify before publishing

Run the repository's supported checks:

```powershell
npm run compile-runtime
npm run compile-theme
npm run compile-backend
npm run g
npm run g -- --profile
npm run s
npm run d -- --dry-run
```

This 3.0.1 pass observed the runtime/theme compiles, `npm run g` generating 45 documents, the local preview serving the home page and this article with status 200, and targeted checks for date ordering, same-day stability, metadata mapping, localized author labels, cover loading, missing-cover fallback, duplicate-title removal, and unsafe-cover rejection. `npm run d -- --dry-run` was run and correctly refused with `Set deployment.targets in config.yml` because this checkout has no deployment target. No npm publication, Cloudflare deployment, or production browser result is claimed.

## Keep the migration small

Keep stable pages in `content/pages/<id>/<locale>.md` and dated articles in `content/posts/<id>/<locale>.md`. Use one ID and matching `en`, `zh-sg`, and `zh-tw` files, keep their publication `date` aligned, and add only the Frontmatter fields the article needs. Continue with [Start your site in ten minutes](/en/posts/start/) and [Put the site online](/en/posts/deploy/) for the beginner path.
