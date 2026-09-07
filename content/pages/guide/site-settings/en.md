---
title: Configure site settings
description: Set the site identity, locales, navigation, collections, schemas, and theme in config.yml.
pattern: docs
---

# Configure site settings

The site root `config.yml` describes the site that the compiler should build. It holds metadata, locales, navigation, collection routes and schemas, privacy settings, search, images, and deployment destinations. Theme markup, CSS, browser ESM, and localized theme UI belong under `themes/`.

## Open the site root

Move to the site created in [Start with Pageskill](/en/guide/start/) and open `config.yml` in your editor:

```bash
cd my-site
```

Use a real domain when you have one. Until then, a neutral `siteUrl` is fine for local checks. Do not put visitor query, form, or URL values into this file; it is administrator-controlled data, not a code or HTML injection surface.

## A complete small configuration

This example is suitable for a small three-language site. Every active locale needs matching page files, so start with only `en` if you have not translated the content yet.

```yaml
siteUrl: https://example.com
defaultLocale: en
activeLocales: [en, zh-sg, zh-tw]
siteName:
  en: Example site
  zh-sg: 示例站点
  zh-tw: 範例網站
description:
  en: A small Pageskill site.
  zh-sg: 一个小型 Pageskill 站点。
  zh-tw: 一個小型 Pageskill 網站。
theme:
  name: default
  nav:
    links:
      - key: home
        href: /:locale/
      - key: posts
        href: /:locale/posts/
content:
  collections:
    pages:
      contentType: page
      pattern: document
      route: /:locale/:id/
      schema:
        title:
          type: string
          required: true
        description: string
        pattern: string
    posts:
      contentType: post
      pattern: blog
      route: /:locale/posts/:id/
      feed: true
      archive: true
      orderBy: date:desc
      schema:
        title:
          type: string
          required: true
        description: string
        date:
          type: string
          required: true
        pattern: string
deployment:
  targets: []
```

This starter example keeps only `home` and `posts` links because the neutral starter has no Guide page. Add the `guide` link after you create or copy a Guide page into the site.

The `:locale` and `:id` route tokens are replaced from the locale and content id. The collection `schema` describes frontmatter data; it is separate from a Pattern or Block schema in the theme's `theme.ts`.

## Check the settings

Run these commands from the site root:

```bash
pageskill inspect collection:pages
pageskill inspect collection:posts
pageskill check
```

The expected result is a successful check that reports the configured routes and required fields. If you have three active locales, add the matching `zh-sg` and `zh-tw` files before building:

```bash
pageskill build
```

## Common errors

- **The default locale is not active:** include `defaultLocale` in `activeLocales`, or change the default to an active locale.
- **A localized value is missing:** add the same site name and description keys for every active locale, and add matching Markdown files.
- **A page route collides:** keep the page route and post route distinct; posts need the `/posts/` segment shown above.
- **The starter cannot find `docs`:** use `pattern: document` in a starter site, or copy a theme that `catalog` shows provides `docs`.
- **Markup or scripts were added to config:** move visual behavior to the theme and dynamic business logic to `backend/handler.ts`.

## Expected result and next step

`config.yml` now gives Pageskill a site identity, localized routes, collection validation, and a selected theme. Keep UI copy in the theme `i18n.yml`, then continue with [Markdown basics](/en/guide/markdown/) or return to the [Guide](/en/guide/).

[Back to the Guide](/en/guide/) · [Next: Markdown basics](/en/guide/markdown/)
