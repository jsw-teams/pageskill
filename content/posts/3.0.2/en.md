---
title: '3.0.2: clearer archives and responsive reading'
description: 'A historical 3.0 release note about filtered updates, article layout, and responsive theme details.'
date: 2026-09-10
category: update
---

# 3.0.2: clearer archives and responsive reading

This is a historical release note for the 3.0 line. The current authoring model is documented in [3.1.0](/en/updates/3.1.0/) and [Configuration](/en/posts/site-settings/); those pages are the source of truth for new sites.

## What shipped in 3.0.2

- Version notes moved through the post pipeline with `category: update`. The filtered updates view separated release notes from ordinary posts while keeping localized archive, detail, feed, search, and language routes.
- Post categories came from Markdown Frontmatter: `tutorial`, `update`, or the default `uncategorized` value.
- Article headers, descriptions, publication dates, authors, and covers were tightened into a compact responsive layout. Archive images received bounded frames, and mobile tables of contents started collapsed.
- The theme gained structured Chrome insertion slots before and after standard navigation and footer tools. These slots accept safe structured links rather than HTML or scripts.
- Discovery files, API metadata, Markdown negotiation, content signals, and conditional Agent declarations were generated from the active source instead of being hand-maintained snapshots.

## Current note

3.1.0 keeps the useful content and rendering capabilities but removes historical configuration aliases. Site instance overrides now live only in the file selected by `theme.config`, ordinary integrations live under root `integrations`, and navigation/footer links use one site-level schema. Read the [3.1.0 release note](/en/updates/3.1.0/) before copying any configuration from an older checkout.

The `updates` view is a release-note view of posts. It is not the same thing as a post's optional `update` Frontmatter field, which records when that individual article was revised.

## Next step

Start with [Configuration](/en/posts/site-settings/) and [Configure integrations and privacy consent](/en/posts/cookies/) for the current workflow.
