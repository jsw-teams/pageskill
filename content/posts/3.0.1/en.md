---
title: "3.0.1 update: article metadata and safer publishing"
description: Add optional article metadata, keep dated archives stable, and protect the public and private publishing boundary.
date: 2026-09-09
category: update
author: toewpq
cover: assets/og-default-product.webp
---

# 3.0.1 update: article metadata and safer publishing

Pageskill 3.0.1 is a patch release on the 3.0 line. It keeps existing publication dates, makes article metadata opt-in, and separates readable feature behavior from publishing safeguards.

## Features

- Articles use valid ISO publication dates for date-descending ordering. Articles published on the same date use a deterministic ID order, so archives, post lists, feeds, and previous/next links stay stable. The interface keeps the date and relation labels separate from the article title and renders relationship text as standalone metadata.
- Authors can add an optional `author` and covers can add an optional `cover` in Markdown Frontmatter. An omitted author inherits the matching locale's site author. A cover can be a local asset or an HTTPS URL, and an omitted cover remains omitted instead of forcing a default image.
- The article header separates title, Frontmatter description, publication date, and author. A matching Markdown `#` title is not repeated in the article body, and list/archive summaries use the description instead of extracting code or headings from the body.

## Security and publishing features

- Incremental builds keep backend and nested theme code in private isolated runtimes. Public CSS and JavaScript resources keep independent content hashes, and persistent `npm run s` preview continues to reload through its SSE path.
- Static publishing exposes only `dist/public`. A deployment that includes backend behavior keeps the generated worker and private runtime in the deployment package instead of exposing the whole build directory. Runtime routing runs before static fallback; an unmatched `/api` request stays 404, and API errors or authorization responses do not become HTML pages.
- Local covers are confined to the asset tree and HTTPS covers use an accepted protocol. Unsafe schemes and traversal paths are rejected before they become links or image sources.

## Compatible article usage

Ordinary authors only need Markdown Frontmatter; no HTML is required. A compatible article example is:

```markdown
---
title: My site is live
description: A note about the first publish.
date: 2026-09-07
author: toewpq
cover: assets/og-default-product.webp
---

# My site is live
```

`author` is optional plain text. If it is omitted, the article inherits the matching locale's site author, so existing articles continue to show an author without being edited. `cover` is optional. Put a local source image under `content/assets/` and write `assets/<path>` (or `/assets/<path>`) in Frontmatter; the public file is generated under `dist/public/assets/<path>`. HTTPS image URLs are also accepted. Without a cover, the article page, list, and archive render no image or forced default.

For a static Git integration, use `npm run g` and publish `dist/public`. When backend behavior is part of the same deployment, run `npm run d -- --dry-run` first and publish with `npm run d` only after the target and plan are ready. Never publish the private `dist/` root.

## Compatibility and migration

1. Existing dated posts remain valid. Keep their original ISO `date`; `author` and `cover` are optional, so no mass frontmatter edit is required.
2. If an old article used `author`, keep the field as plain text. If it did not, leave it absent and let the site author fallback apply. For a cover, use a local path under `content/assets/` or an HTTPS URL; replace unsafe or traversing paths with one of those forms, or remove `cover` when no image is needed.
3. Replace the retired `npm run build` alias with `npm run g`. Use `npm run s` for a persistent preview and `npm run d -- --dry-run` before a real publish. Static hosts should receive `dist/public`; backend-capable publishing should use the deployment command so private runtime files are staged correctly.
4. Keep the existing `/:locale/posts/<id>/` article links. The metadata fields are additive and do not change a post's ID or route.

## Removed and replacements

- The `npm run build` alias is no longer supported. This removes a second, ambiguous generation entry point; use `npm run g`, which validates and generates the public snapshot.
- Publishing the whole `dist/` directory is no longer supported because it can expose private runtime material. Use `dist/public` for static output or `npm run d` for a backend-aware package.
- No article metadata feature was removed. Older posts without `author` or `cover` continue to render through the fallback and no-cover behavior described above.

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

This 3.0.1 pass observed the runtime/theme compiles, `npm run g` generating 45 documents, the local preview serving the home page and this article with status 200, and targeted checks for date ordering, same-day stability, metadata mapping, localized author labels, cover loading, missing-cover fallback, duplicate-title removal, and unsafe-cover rejection. `npm run d -- --dry-run` was run and correctly refused because this checkout has no deployment target. No npm publication, Cloudflare deployment, or production browser result is claimed.

## Continue

Keep stable pages in `content/pages/<id>/<locale>.md`, and keep dated tutorials, articles, and version updates in `content/posts/<id>/<locale>.md`. Add `category: update` to version updates, use one ID and matching `en`, `zh-sg`, and `zh-tw` files, keep their publication `date` aligned, and add only the Frontmatter fields the document needs. Continue with [Start your site in ten minutes](/en/posts/start/) and [Put the site online](/en/posts/deploy/) for the beginner path.
