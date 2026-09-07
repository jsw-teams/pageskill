---
title: Change the name and navigation
description: Set the site name, languages, and navigation in config.yml so the home page reaches your articles.
date: 2026-09-07
---

# Change the name and navigation

`config.yml` is a settings file: it stores site data and switches, and it does not run code. Change the name and navigation first; add other settings later.

## 1. Open the settings file

Edit `config.yml` in the new site root and keep this smallest useful setup:

```yaml
siteUrl: https://example.com
defaultLocale: en
activeLocales:
  - zh-sg
  - zh-tw
  - en
siteName:
  zh-sg: 我的文章站
  zh-tw: 我的文章站
  en: My article site
description:
  zh-sg: 写下我的文章。
  zh-tw: 寫下我的文章。
  en: Notes from my work.
```

## 2. Change the navigation

Add public entries under `theme.nav.links` in the same file:

```yaml
theme:
  name: default
  nav:
    links:
      - key: home
        href: /:locale/
      - key: posts
        href: /:locale/posts/
```

`:locale` is replaced with `zh-sg`, `zh-tw`, or `en` during generation. Do not splice visitor input into the settings file.

## 3. Generate and preview

```powershell
pageskill g
pageskill s
```

Open the home page and article entry in all three languages. Check the name, language links, and navigation.

## Expected result

Each enabled language has a home page, the header shows the new site name, and navigation reaches that language's article list.

## Common trap

YAML indentation uses spaces. Give every enabled language a `siteName` and `description`; labels or mixed tabs make generation fail near the setting.

## Next step

Read [Markdown: write like a note](/en/posts/markdown/) and make one small article.
