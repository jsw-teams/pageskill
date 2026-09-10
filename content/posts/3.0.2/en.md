---
title: "3.0.2 update: clearer archives and responsive reading"
description: Separate version updates from tutorials, align covers without distortion, and make the language chooser and article layout easier to scan.
date: 2026-09-10
category: update
author: toewpq
cover: assets/og-default-product.webp
---

# 3.0.2 update: clearer archives and responsive reading

Pageskill 3.0.2 keeps tutorials and version history in one post collection while using Frontmatter categories and filtered views to separate them. It also tightens the article header, gives covers a predictable responsive frame, and keeps the language chooser aligned when one card has a recommendation label.

## Features

- Version notes use the normal post pipeline with `category: update`. The filtered updates view keeps them out of ordinary post lists while preserving the public `/:locale/updates/<version>/` routes, feed, search entries, language links, navigation item, and home-page section.
- Post categories now come from Markdown Frontmatter: `category: tutorial` marks a tutorial, `category: update` marks a release note, and an omitted category is rendered and indexed as `uncategorized` instead of being guessed from the page collection.
- Article titles, descriptions, publication dates, and authors form one compact header. The cover and reading column share a stable 1200:630 frame; archive thumbnails have their own bounded 16:9 frame and no longer inherit a source image's pixel height.
- Post navigation labels now sit on their own line, so a relation label cannot be mistaken for part of the linked article title. Language cards reserve the recommendation line, and small-screen tables of contents start collapsed.
- Themes can add links before or after the standard navigation and footer tools through the structured `plugins.chrome` option. The compiler resolves locale routes, bounds link size, rejects unsafe/traversal URLs, and the shell escapes labels; raw HTML, scripts, CSS, and arbitrary attributes are not supported.

## Security and localization

- Theme UI messages merge missing keys and keyed category entries from the configured fallback locale. If an entire locale document is missing, the fallback document can be rendered at the requested route; `hreflang` still lists only translations that actually exist.
- The Cookie chooser shows each category's provider and retention explicitly. Optional categories remain off by default, gated scripts require affirmative consent, and the chooser does not replace the reviewed legal policy page.

## Compatibility and migration

Existing 3.0 sites can migrate the source layout without changing public update URLs:

1. Move `content/updates/<version>/<locale>.md` to `content/posts/<version>/<locale>.md`.
2. Keep the same ID, locale files, `date`, `author`, and `cover`; add `category: update` to every release-note translation.
3. Keep existing `/en/updates/<version>/`, `/zh-sg/updates/<version>/`, or `/zh-tw/updates/<version>/` links. The updates view supplies those routes, so no redirect shadow or duplicate article is needed. Normal posts continue to use `/:locale/posts/<id>/`.
4. When adding a locale, activate it in the site's locale list and add its UI/content files as they become available. Missing theme UI keys use the fallback locale; a missing whole document uses the content fallback. A Markdown file that exists but is only partly translated stays as authored; Pageskill does not silently machine-translate it.
5. If an older theme file contains a separate `plugins.language.enabled` switch, remove that redundant switch; the language chooser is still available and follows the site's active locales and fallback behavior.
6. For a tutorial, add `category: tutorial`; leave `category` out for the default `uncategorized` post. Existing primary navigation remains compatible, while optional shell links can be added through the theme's structured `plugins.chrome` slots.
7. Run `npm run g -- --profile`, inspect both archives and feeds, then use `npm run d -- --dry-run` before a real publish.

## Removed and replacements

- The separate `content/updates` source collection was removed; the compatible replacement is `content/posts` plus `category: update`. The public updates routes and the visitor-facing update feature were not removed.
- No Cookie consent feature was removed. The policy-generator-inspired provider and retention details are display metadata; legal text still belongs to the reviewed privacy page.

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
