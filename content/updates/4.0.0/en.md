---
kind: release
title: '4.0.0: Components own behavior, Content owns content'
description: 'A breaking architecture release that unifies Theme extensions around Components and separates site content from reusable implementation.'
date: 2026-09-14
---

# 4.0.0: Components own behavior, Content owns content

Pageskill 4.0.0 is a breaking architecture release. The product now has one public Theme extension concept and one clear ownership rule:

> Component owns behavior and presentation; Content owns content.

## What changed

- Built-in and External Components are the only Component source concepts. Capabilities such as `render`, `client`, `server`, `storage`, `cache`, `ai`, and `integration` describe one Component without creating parallel Plugin, Pattern, Layout, or Module APIs.
- Markdown, Frontmatter, Config, and Runtime Data own reader-facing copy, links, documents, categories, and brand data. Component defaults contain behavior and structure defaults, not demo records or site prose.
- Components accept children, named slots, structured props, and runtime data. Stable composition and Core content queries replace page-specific variants and hard-coded document IDs.
- Posts use `kind: post`; release notes are the real `content/updates/` collection and use `kind: release`. `updated` only means last substantive modification, `category` remains ordinary post taxonomy, and archive types are explicit.
- Comments are an optional External Component. Comment Translation is a separate optional capability with a platform-neutral Server Function contract, L1 and persistent caches, source hashes, and single-flight inference.
- Core works without a server environment. Cloudflare Pages, D1, Workers AI, and Cache API are documented as one reference Runtime Adapter rather than Core dependencies.
- `page g`, `page c`, and `page s` are the only public commands. `page g` does not start a browser; `page c` writes an annotated private PDF accessibility report with multi-resolution screenshots and never publishes a report or disclaimer into `dist/public`.

## Migration boundary

This is not a compatibility release. Move reader-facing data out of Theme TypeScript and Component messages into `content/` or site configuration. Replace old extension registrations with `ComponentDefinition`, set document `kind`, and use `runtime.adapter` only when a real runtime is implemented. Read [Develop a reusable Component](/en/posts/components/) and [Configuration](/en/posts/site-settings/) for the current authoring model.

The decisive portability test is simple: change the site name, home content, navigation, articles, categories, and runtime data without changing Theme TypeScript. A correct Component continues to render the new site.
