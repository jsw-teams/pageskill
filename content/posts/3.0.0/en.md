---
title: "3.0 update: a simpler entry"
description: Pageskill 3.0 narrows the daily workflow, establishes post categories, and documents the security boundary.
date: 2026-09-07
category: update
author: toewpq
cover: assets/og-default-product.webp
---

# 3.0 update: a simpler entry

Pageskill 3.0 still generates sites from Markdown, settings, and themes, but a first-time author only needs three entries: generate with `g`, preview with `s`, and publish with `d`. The release also makes the post taxonomy and runtime boundary explicit; the version remains 3.0.0.

## Features

- The daily workflow has three clear commands: `npm run g` validates and generates, `npm run s` keeps a local preview running, and `npm run d` publishes a ready target. A new site starts by cloning the repository, running `npm install` and `npm run g`, then editing that clone in place.
- Stable pages live under `content/pages/<id>/<locale>.md` without a date. Tutorials, blogs, product records, and version updates live under `content/posts/<id>/<locale>.md` with a required ISO `date`; `category: tutorial` marks a tutorial, an omitted category defaults to `uncategorized`, and `category: update` marks a release note that can be filtered separately.
- The localized beginner path is organized as short tutorials for starting, site settings, Markdown, the first tutorial, the Cookie selector plugin build, theme customization, search, the table of contents, plugin development, and deployment. Reusable theme capabilities can be documented once and reused instead of copying page HTML.
- The home learning path uses six reusable bear illustrations and links to the first six steps. Search, the post table of contents, and the filtered updates view provide dedicated entry points without mixing release notes into ordinary post lists.

## Security and runtime features

- Public static files live in `dist/public`, while dynamic business logic, writes, and secrets stay in `backend/handler.ts`. Backend paths use the existing `router.get(...)`, `router.post(...)`, and `router.all(...)` methods. A match returns a `Response`; no match returns `null`, so authors do not need to maintain a generated route list.
- Generated Worker, Pages, and VPS entrypoints run the Router before static fallback. Unknown paths can fall through to public assets, while an unmatched `/api` path remains 404. API errors and authorization responses stay API responses instead of becoming static pages. Nested server-side ESM stays inside the private runtime boundary.
- During persistent `npm run s` preview, changed nested theme TypeScript is compiled into a fresh private runtime before reload. Each public CSS/JS resource is fingerprinted independently, so an unchanged resource keeps its URL and cache identity.
- The Cookie selector retains optional categories disabled by default and gates trusted scripts behind affirmative consent. The language chooser prefers a visitor's manual choice before browser-language fallback, while locale URLs stay unchanged. Withdrawing consent does not undo work a script already performed.

## Compatibility and migration

1. Clone the repository, run `npm install`, then run `npm run g`; keep editing the cloned site in place. Use `npm run s` for preview and `npm run d -- --dry-run` to inspect a publishing plan before a real `npm run d`.
2. Keep stable pages in `content/pages/<id>/<locale>.md` without a date. Put tutorials, blog notes, product records, and release notes in `content/posts/<id>/<locale>.md` with the required ISO `date`, one ID across `en`, `zh-sg`, and `zh-tw`, and aligned dates. Add `category: update` to every release-note translation.
3. If an older release note still lives under `content/updates/<version>/`, move each locale file to `content/posts/<version>/` and add `category: update`. Keep the public update link when the updates view is available; ordinary posts continue to use `/:locale/posts/<id>/`.
4. Point the Cookie policy to `/:locale/privacy/` and replace example contacts and services with real reviewed content. Keep the existing consent storage key so returning visitors do not lose their choice unexpectedly.
5. If an older workflow uses `npm run build`, replace it with `npm run g`. The preview and publish commands are `npm run s` and `npm run d`; the short localized posts are the supported replacement for the retired long guide copies.

## Removed and replacements

- The `npm run build` alias is not supported. It was removed to leave one unambiguous generation command; use `npm run g`.
- Duplicate long guide/development pages and the old prompt note are not generated as redirect shadows. They were removed because duplicate sources could drift or appear as stale pages; use the short posts linked from the learning path, and use Git history when an old copy must be consulted.
- Maintaining a generated `dynamicRoutes` list is no longer an authoring requirement. Register real backend behavior with the existing router methods; no same-origin API capability was removed.
- No Cookie consent or language-choice feature was removed. The supported replacement for implicit language behavior is the chooser's manual selection followed by browser-language fallback, and the supported policy destination is the localized privacy page.

## Discovery for advanced authors

After generation, read `dist/.pagekiln/catalog.json` or `dist/.well-known/agent.json` to see reusable theme and content capabilities. Agent integrations can call the internal `getCatalog` and `inspect` functions; beginners can write posts and settings without adding discovery files to their daily steps.

## A new learning path

The home page uses six bear illustrations to guide readers through [Start](/en/posts/start/), [Site settings](/en/posts/site-settings/), [Markdown](/en/posts/markdown/), [First tutorial](/en/posts/first-post/), [How we build a plugin](/en/posts/cookies/), and [Change the style](/en/posts/customize/). Continue with [search](/en/posts/search/), [the table of contents](/en/posts/toc/), and [plugin development](/en/posts/plugins/) when you need them.

## Verify before publishing

Use these steps to check your site:

1. Run `npm run compile-runtime`, `npm run compile-theme`, and `npm run compile-backend`.
2. Run `npm run g -- --profile` and inspect the generated pages, language links, and public files.
3. Run `npm run s`, open the local home page, a post, and Cookie settings, change a nested theme TypeScript module to verify the reload, then press `Ctrl+C` to stop the preview.
4. Run `npm run d -- --dry-run`; run `npm run d` only when you are ready to publish.
