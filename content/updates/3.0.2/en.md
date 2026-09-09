---
title: "3.0.2 update: clearer archives and responsive reading"
description: Separate version updates from tutorials, align covers without distortion, and make the language chooser and article layout easier to scan.
date: 2026-09-10
author: Site Owner
cover: assets/og-default-product.webp
---

# 3.0.2 update: clearer archives and responsive reading

Pageskill 3.0.2 keeps tutorials and version history in separate collections. It also tightens the article header, gives covers a predictable responsive frame, and keeps the language chooser aligned when one card has a recommendation label.

## What changed

- Version notes now live in `content/updates/<version>/<locale>.md` and resolve at `/:locale/updates/<version>/`. Tutorials, notes, and product records remain in `content/posts/<id>/<locale>.md`.
- The updates archive has its own `/:locale/updates/` index, feed, search entries, language links, navigation item, and home-page section. The article archive remains at `/:locale/posts/`.
- Article titles, descriptions, publication dates, and authors form one compact header. The cover and reading column share the same width and a stable 1200:630 frame.
- Archive thumbnails now constrain both width and height instead of retaining the source image's `height` attribute as a rendered pixel height. Images keep `object-fit: cover` without stretching.
- Language cards reserve the recommendation line and use a fixed row height, so the suggested-language label does not move one card above its neighbors. On small screens, the article table of contents starts collapsed.

## Content locations

Use the collection that matches the document:

```text
content/posts/<id>/<locale>.md       tutorials, articles, and notes
content/updates/<version>/<locale>.md version history and release notes
```

The existing 3.0.0 and 3.0.1 notes were moved without changing their publication dates or author/cover metadata. Their new links are `/en/updates/3.0.0/` and `/en/updates/3.0.1/`. The old post routes have no duplicate copies or redirects.

## Verify before publishing

Run the normal source checks, then inspect both responsive views:

```powershell
npm run compile-runtime
npm run compile-theme
npm run compile-backend
npm run g
npm run g -- --profile
npm run s
npm run d -- --dry-run
```

The 3.0.2 checks passed: `npm run g -- --profile` compiled runtime, theme, and backend and reported 48 source documents; the 56-file internal `href`/`src` check found no missing references; posts and updates Feeds contain 10 and 3 isolated items, and the old post routes are absent. At 1280px and 390px, language cards are equal at 136px, archive covers are 144x81, article metadata is aligned, mobile TOC starts collapsed and expands on click, and there is no horizontal overflow. The root chooser matched Traditional Chinese browser preference and localized its brand/privacy links to `zh-tw`; `git diff --check` passed. `npm run d -- --dry-run` exited 1 because `deployment.targets` is unset, so this does not claim deployment or npm publication.

Continue with [Start your site in ten minutes](/en/posts/start/) for the tutorial path, or open [the update archive](/en/updates/) for version history.
