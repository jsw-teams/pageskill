---
kind: release
title: '3.1.0: the last 3.x configuration release'
description: 'A historical 3.x release note retained for version history; new sites should follow the 4.0 Component contract.'
date: 2026-09-13
---

# 3.1.0: the last 3.x configuration release

This is a historical release note for the 3.x line. It is kept so the release archive remains honest, but it is not a current authoring guide. New sites should follow [4.0.0](/en/updates/4.0.0/) and [Configuration](/en/posts/site-settings/).

The 3.x line consolidated layered configuration, site-owned instance settings, localized content, provider declarations, generated discovery, and accessibility checks. Those surfaces were deliberately reviewed again in 4.0.0 rather than carried forward as compatibility APIs.

Do not copy configuration or extension code from this historical note into a 4.0 site. The current boundary is simple: Markdown and Frontmatter own content, Config owns site structure, Components own reusable behavior and presentation, and Runtime Adapters are optional.
