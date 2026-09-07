---
title: "Pageskill 3.0.0: closing the 2.0 chapter"
description: "Pageskill 3.0.0 starts a reuse-first product line after the archived 2.0 stage, with a CLI migration, a public runtime boundary, safer browser behavior, and six illustrated guides."
date: 2026-09-07
pattern: blog
---

# Pageskill 3.0.0: closing the 2.0 chapter

Pageskill 3.0.0 marks the end of the 2.0 chapter and the start of a new product line. This note records the repository's source and content state on 2026-09-07. Publication to npm and deployment are separate operations from this record.

## 2.0 is now an archived chapter

The 2.0 foundation remains the reason this transition is possible: Markdown and configuration compose with reusable theme capabilities, while the compiler produces inspectable pages and delivery artifacts. 3.0 carries that foundation forward and makes reuse, runtime boundaries, and the Pageskill name the visible center of the product.

## Rename and migration

The public name moves from Pagekiln to Pageskill across the package metadata, CLI, site identity, theme copy, documentation, and repository links. The old `pagekiln` CLI entry and `src/bin/pagekiln.mjs` are removed. Change commands such as `pagekiln build` to `pageskill build`, and change `PAGEKILN_SITE_ROOT` to `PAGESKILL_SITE_ROOT`; the old environment variable is no longer a fallback.

The migration is deliberately narrow. Generated `.pagekiln/` discovery and build-profile paths, `_pagekiln/` runtime paths, and the existing `pagekiln-consent` Cookie storage key remain compatible. Existing content, localized routes, and the default theme's `landing`, `document`, `docs`, and `blog` Patterns remain part of the contract.

Deployment configuration has one related migration: if `deployment.openaiSites.staticDirectory` is `dist`, change it to `deployment.staticDirectory: public`. The new `deployment.staticDirectory` setting is optional, and a safe custom directory from the old OpenAI Sites setting remains a fallback.

## Reuse before extension

The normal authoring path starts with `pageskill catalog` and `pageskill inspect`. These commands expose the source-backed Patterns, Blocks, schemas, plugins, contexts, and resource dependencies that a site can reuse. Authors keep composing pages with Markdown, Frontmatter, and `config.yml`; a theme extension is shared behavior for a missing capability, rather than HTML written separately for each page.

The new guide follows that model. Six localized steps cover [starting a site](/en/guide/start/), [site settings](/en/guide/site-settings/), [Markdown](/en/guide/markdown/), [first content](/en/guide/first-content/), [Cookie consent](/en/guide/cookies/), and [theme customization](/en/guide/customize/). The `learning-path` Block renders the sequence as reusable content, and six independent bear PNGs in `content/assets/learning/` give each step its own illustration.

## Static pages and same-origin APIs share a boundary

Pages are still generated ahead of requests. The unified build places public pages and assets in `dist/public`. One same-origin Worker/Fetch runtime can sit in front of that output, route `/api/*` first, and add explicitly configured dynamic routes. `backend/handler.ts` remains the source for dynamic business logic and runtime secrets.

The public side is `dist/public` by default. `server/`, `_pagekiln/`, `.pagekiln/`, Worker files, and deployment manifests stay outside that public boundary; the whole `dist/` bundle should not be exposed as a CDN root. The boundary limits static file exposure, but it does not automatically authenticate users, authorize protected actions, or provide CSRF controls; those remain application business logic.

## CSS budgets and browser boundaries

Pattern and Block stylesheets can be inlined only when each original UTF-8 file is at most 2,048 bytes, the page's combined inline CSS stays within 4,096 bytes, and the source has no unsafe relative-resource or style-element hazard. The main theme bundle remains an external fingerprinted asset, and unsafe or oversized styles stay external.

Local search continues to build labels, highlights, snippets, and links with DOM APIs. 3.0 validates a result URL as HTTP(S) before constructing its same-origin anchor. Cookie consent keeps optional categories disabled until an affirmative choice, checks configured optional script sources for HTTP(S), and retains the compatible `pagekiln-consent` key. These checks narrow input handling; provider configuration, privacy obligations, and backend authorization still belong to the site and its application.

## Verification

Local verification for this source state passed: `npm run compile-runtime`, `npm run compile-theme`, `npm run compile-backend`, `npm run build -- --profile`, and `npm run check` completed for 39 documents; `npm test` passed 66/66, with 1,080 internal link and asset references checked. The 100-entry fixture's incremental build and preview synchronization passed, and the learning entry had no horizontal overflow at desktop or 390px mobile widths with all six images loading normally. VPS verification used the generated handler against a mocked Deno interface, while Pages verification used dry-run staging with ASSETS. No cloud or Deno deployment was performed, and npm was not published.

## Compatibility and the next chapter

This version changes the public product and CLI names while preserving the content model, localized pages, theme contracts, internal paths, and consent storage needed by existing sites. From this point, major, minor, and patch version labels are intended to stay aligned across package metadata, the changelog, and dated content records. The 3.0.0 note records the source state; it does not assert that a package was published or a site was deployed.
