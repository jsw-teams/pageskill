---
title: "3.0 update: a simpler entry"
description: Pageskill 3.0 narrows the daily workflow to g, s, and d, and turns the beginner guide into practical articles.
date: 2026-09-07
---

# 3.0 update: a simpler entry

Pageskill 3.0 still generates sites from Markdown, settings, and themes, but a first-time author only needs three entries: generate with `g`, preview with `s`, and publish with `d`. This is a content and workflow cleanup; the version remains 3.0.0.

## What changed

- `pageskill g` validates and generates the public snapshot.
- `pageskill s` starts a persistent preview; press `Ctrl+C` to end it, while editing can continue in another terminal.
- `pageskill d` runs the deployment targets in `config.yml`.
- A new site starts by copying `starter` from the source repository instead of using an initialization wizard.
- Tutorials, blogs, and product records share `content/posts/`; every article keeps its required `date`.
- The current `content/pages/` tree keeps the three-language home page, About, and privacy policy; long guide and development directories leave the current tree while their history stays in Git and the changelog.

## Migrate existing content

1. Keep a backup of the source repository and site, then make [Start your site in ten minutes](/en/posts/start/) the tutorial entry.
2. Put your tutorials or blog notes in `content/posts/<id>/`, with equivalent `zh-sg`, `zh-tw`, and `en` files and a `date`.
3. Point the Cookie policy to `/:locale/privacy/`, then use [Privacy policy](/en/privacy/) to add real contacts and services.
4. In the site directory, run `pageskill g`, `pageskill s`, and `pageskill d --dry-run` to check generation, preview, and the publishing plan for your target; run `pageskill d` only when you are ready to publish.

## Discovery for advanced authors

After generation, read `dist/.pagekiln/catalog.json` or `dist/.well-known/agent.json` to see reusable theme and content capabilities. Agent integrations can call the internal `getCatalog` and `inspect` functions; beginners can write articles and settings without adding discovery files to their daily steps.

Pages and same-origin APIs remain separate: public static files live in `dist/public`, while dynamic business logic, writes, and secrets stay in `backend/handler.ts`. `config.yml` holds data and switches; optional Cookie scripts start disabled, and trusted `gatedScripts` are managed only in `theme.yml`.

This release also fixes the Cookie prompt and footer layout. The language chooser prefers a visitor's manual choice before falling back to browser language, while locale URLs stay unchanged.

## A new learning path

The home page uses six bear illustrations to guide readers through [Start](/en/posts/start/), [Site settings](/en/posts/site-settings/), [Markdown](/en/posts/markdown/), [First article](/en/posts/first-post/), [Cookie choices](/en/posts/cookies/), and [Change the style](/en/posts/customize/). Individuals can edit a theme directly; shared capabilities only need to be implemented once.

## Verify before publishing

Use these steps to check your site:

1. Run `pageskill g` and confirm that the articles, language links, and public files generate successfully.
2. Run `pageskill s`, open the local home page, an article, and Cookie settings, then press `Ctrl+C` to stop the preview.
3. Run `pageskill d --dry-run` to check the target, public directory, and credential source; this does not upload anything.
4. Run `pageskill d` only when you are ready to publish, then check the pages and same-origin API at the target URL.
