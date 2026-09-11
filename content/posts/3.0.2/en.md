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
- The Cookie plugin now registers provider capabilities in code while `themes/default/theme.yml` owns provider instances. Built-in consent-aware adapters use a canonical provider array and real web fields: GA4 `measurementId` (`G-...`), Google Ads `tagId` (`AW-...`/`GT-...`), Cloudflare Web Analytics `token`, Baidu `siteSignature`, CAPTCHA `siteKey`, and the account-ID-free X for Websites widget. Extra provider fields remain available for future modules but do not execute by themselves.
- Agent discovery is now renderer-generated from the active configuration and written outputs. The public set can include `/.well-known/agent.json`, `/.well-known/ai-catalog.json`, the configured RFC 9727 API catalog, an Agent Skills index, `robots.txt`, and `llms.txt`; the shared Fetch Router adds RFC 8288 `Link`, negotiates `Accept: text/markdown` mirrors with `Vary: Accept`, and carries configured `Content-Signal` values. The published Skill walks the code-owned capability registry and configured sections, so adding a registered field does not require a second hand-maintained output list.
- Foundation plugin copy and options are instance data: `search`, `toc`, `privacyConsent`, and `chrome` can be adjusted in `theme.yml` within their code-owned schema. Styles now have an explicit add/edit/remove workflow through the owning module's resources, so an author does not need to patch generated CSS or renderer code for routine changes.

## Security and localization

- Theme UI messages merge missing keys and keyed purpose entries from the configured fallback locale. If an entire locale document is missing, the fallback document can be rendered at the requested route; `hreflang` still lists only translations that actually exist.
- The Cookie chooser shows each purpose's provider and retention explicitly. Optional purposes remain off by default, gated scripts require affirmative consent, and the chooser does not replace the reviewed legal policy page. Not every provider creates a cookie: the policy should describe the actual token, challenge, request, or storage behavior documented by the provider.
- `config.yml` remains site policy/controller data: it is not emitted to `dist/public`, and the generated backend has no route that writes it. Provider secrets and CAPTCHA token verification remain server-side.
- The concrete implementation steps for authentication metadata, MCP cards, WebMCP registration, and DNS-AID are in [Configure conditional Agent capabilities](/en/posts/agent-discovery/). Implement the protected resource and issuer in the backend or an external service, align the MCP transport with its card tools, register `document.modelContext` tools in a theme plugin, or publish and verify DNSSEC records through the authoritative provider before enabling the matching `config.yml` switch. The static renderer publishes declarations; it does not fabricate endpoints or publish DNS.

## Compatibility and migration

Existing 3.0 sites can migrate the source layout without changing public update URLs:

1. Move `content/updates/<version>/<locale>.md` to `content/posts/<version>/<locale>.md`.
2. Keep the same ID, locale files, `date`, `author`, and `cover`; add `category: update` to every release-note translation.
3. Keep existing `/en/updates/<version>/`, `/zh-sg/updates/<version>/`, or `/zh-tw/updates/<version>/` links. The updates view supplies those routes, so no redirect shadow or duplicate article is needed. Normal posts continue to use `/:locale/posts/<id>/`.
4. When adding a locale, activate it in the site's locale list and add its UI/content files as they become available. Missing theme UI keys use the fallback locale; a missing whole document uses the content fallback. A Markdown file that exists but is only partly translated stays as authored; Pageskill does not silently machine-translate it.
5. If an older theme file contains a separate `plugins.language.enabled` switch, remove that redundant switch; the language chooser is still available and follows the site's active locales and fallback behavior.
6. For a tutorial, add `category: tutorial`; leave `category` out for the default `uncategorized` post. Existing primary navigation remains compatible, while optional shell links can be added through the theme's structured `plugins.chrome` slots.
7. Configure provider instances as the canonical array in `themes/<name>/theme.yml`, keep optional purposes disabled by default, and use the code-registered `purpose` mapping documented in the Cookie tutorial. The built-in purposes are `measurement`, `advertising`, `fraud-prevention`, and `social-embedding`, each backed by real provider behavior. During migration the compiler maps old `id`/`category` inputs to purpose keys, as well as mapping `conversionId` to Google Ads `tagId` and `siteId` to Baidu `siteSignature`; new files should use the real provider fields. Extra schema fields are accepted for extension, but a provider only runs after its code module is registered and consent is granted.
8. Run `npm run g -- --profile`, inspect both archives and feeds, then use `npm run d -- --dry-run` before a real publish.
9. Do not copy or hand-edit generated discovery files. For API entries, optional ARD queries, or conditional Agent capabilities, follow [Configure conditional Agent capabilities](/en/posts/agent-discovery/) to implement the real service, theme browser module, or external DNS first; then configure `config.yml` and regenerate so the renderer and runtime headers stay in sync.
10. For a partially translated locale, put only completed plugin labels under `theme.yml` `copy.<locale>`. Missing UI keys inherit the fallback; an existing Markdown document stays as authored, while a missing document may use content fallback.

## Removed and replacements

- The separate `content/updates` source collection was removed; the compatible replacement is `content/posts` plus `category: update`. The public updates routes and the visitor-facing update feature were not removed.
- No Cookie consent feature was removed. The policy-generator-inspired provider and retention details are display metadata; legal text still belongs to the reviewed privacy page. The canonical array replaces ambiguous object keys, with a compatibility normalizer for existing themes.
- Manual discovery snapshots are not an authoring surface. Follow [Configure conditional Agent capabilities](/en/posts/agent-discovery/) to implement the real service or external records, then use renderer-generated metadata and runtime headers so a second list cannot drift from the actual routes.

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

The 3.0.2 checks passed: `npm run g -- --profile` compiled runtime, theme, and backend and reported 48 source documents; a temporary canonical-array configuration with provider-shaped test values produced all eight built-in provider records in the chooser and machine-readable privacy metadata, then the active theme was restored with all providers disabled. The generated browser script contains the official provider endpoints and no legacy object keys. The 56-file internal `href`/`src` check found no missing references; posts and updates Feeds contain 10 and 3 isolated items, and the old post routes are absent. The generated script passed `node --check`; `/config.yml` and its public/static aliases classify as private, and no generated public config file exists. At 1280px and 390px, language cards are equal at 136px, archive covers are 144x81, article metadata is aligned, mobile TOC starts collapsed and expands on click, and there is no horizontal overflow. The root chooser matched Traditional Chinese browser preference and localized its brand/privacy links to `zh-tw`; `git diff --check` passed. `npm run d -- --dry-run` exited 1 because `deployment.targets` is unset, so this does not claim deployment or npm publication.

Continue with [Start your site in ten minutes](/en/posts/start/) for the tutorial path, or open [the update archive](/en/updates/) for version history.
