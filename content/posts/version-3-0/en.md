---
title: "3.0 update: a simpler entry"
description: Pageskill 3.0 narrows the daily workflow to g, s, and d, and turns the beginner guide into practical articles.
date: 2026-09-07
author: Site Owner
cover: assets/og-default-product.webp
---

# 3.0 update: a simpler entry

Pageskill 3.0 still generates sites from Markdown, settings, and themes, but a first-time author only needs three entries: generate with `g`, preview with `s`, and publish with `d`. This is a content and workflow cleanup; the version remains 3.0.0.

## What changed

- `npm run g` validates and generates the public snapshot.
- `npm run s` starts a persistent preview; press `Ctrl+C` to end it, while editing can continue in another terminal.
- `npm run d` runs the deployment targets in `config.yml`.
- A new site starts by cloning the repository, running `npm install` and `npm run g`, then editing that clone in place.
- Stable pages live under `content/pages/` without a date. Tutorials, blogs, product records, and release notes live under `content/posts/` with a required `date`.
- Search, the article table of contents, and reusable plugin development now have short localized guides.

## Migrate existing content

1. Keep a backup, clone the current repository, run `npm install` and `npm run g`, then make [Start your site in ten minutes](/en/posts/start/) the tutorial entry.
2. Keep stable pages in `content/pages/<id>/<locale>.md` without a date. Move tutorials and blog notes to `content/posts/<id>/`, with equivalent locale files and the required `date`.
3. Point the Cookie policy to `/:locale/privacy/`, then use [Privacy policy](/en/privacy/) to add real contacts and services.
4. Run the compile commands, `npm run g -- --profile`, and `npm run s` for source checks. Use `npm run d -- --dry-run` for the publishing plan; run `npm run d` only when you are ready to publish.

## Discovery for advanced authors

After generation, read `dist/.pagekiln/catalog.json` or `dist/.well-known/agent.json` to see reusable theme and content capabilities. Agent integrations can call the internal `getCatalog` and `inspect` functions; beginners can write articles and settings without adding discovery files to their daily steps.

Pages and same-origin APIs remain separate: public static files live in `dist/public`, while dynamic business logic, writes, and secrets stay in `backend/handler.ts`. `config.yml` holds site and policy/controller data; `theme.name` selects the theme, while `themes/<name>/theme.yml` holds schema-validated plugin instance options and switches. Theme entries assemble reusable capabilities, and each plugin keeps its own implementation resources.

Register any backend path with the existing `router.get(...)`, `router.post(...)`, or `router.all(...)` methods. At runtime, a match returns a `Response`; no match returns `null`, so the generated entry does not need a per-route `dynamicRoutes` list in `config.yml`. Generated Worker/Pages/VPS entrypoints run the Router first for every pathname and set `run_worker_first = true`; unknown paths fall through to public assets, while an unmatched `/api` path remains 404. API errors and authorization responses stay API responses instead of falling back to static pages. Build and generation keep nested server-side ESM inside the private boundary. During persistent `npm run s` preview, changed nested theme TypeScript is compiled into a fresh private runtime before reload; each public CSS/JS resource is fingerprinted independently, so an unchanged resource keeps its URL and cache identity.

This release also fixes the Cookie prompt and footer layout. The language chooser prefers a visitor's manual choice before falling back to browser language, while locale URLs stay unchanged.

## A new learning path

The home page uses six bear illustrations to guide readers through [Start](/en/posts/start/), [Site settings](/en/posts/site-settings/), [Markdown](/en/posts/markdown/), [First article](/en/posts/first-post/), [Cookie choices](/en/posts/cookies/), and [Change the style](/en/posts/customize/). Continue with [search](/en/posts/search/), [the table of contents](/en/posts/toc/), and [plugin development](/en/posts/plugins/) when you need them.

## Verify before publishing

Use these steps to check your site:

1. Run `npm run compile-runtime`, `npm run compile-theme`, and `npm run compile-backend`.
2. Run `npm run g -- --profile` and inspect the generated pages, language links, and public files.
3. Run `npm run s`, open the local home page, an article, and Cookie settings, change a nested theme TypeScript module to verify the reload, then press `Ctrl+C` to stop the preview.
4. Run `npm run d -- --dry-run`; run `npm run d` only when you are ready to publish.
