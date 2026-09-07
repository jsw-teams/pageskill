---
title: Start with Pageskill
description: Install Pageskill, create a neutral site, and run the first checked build.
pattern: docs
---

# Start with Pageskill

Pageskill turns Markdown, Frontmatter, reusable Patterns and Blocks, collection schemas, and site configuration into a checked website. A person can use the built-in capabilities directly; an Agent is optional. You write page content instead of hand-writing HTML for every page.

## What you need

Install Node.js `>=22.12.0`, npm, and Git. Use a new target directory for the site that `pageskill init` will create.

## Install from the source repository

Run these commands in the Pageskill checkout:

```bash
git clone https://github.com/jsw-teams/pageskill.git
cd pageskill
npm install
npm run compile-runtime
npm run compile-theme
npm run compile-backend
npm link
```

The three compile commands create the runtime, theme, and backend artifacts used by the linked `pageskill` command. The link uses this checkout, so repeat the compile command that matches a source change.

## Create a site

From the directory where you keep projects, create an empty site directory and initialize it:

```bash
mkdir my-site
cd my-site
pageskill init
```

`pageskill init` copies the neutral `starter/` contract. It creates `config.yml`, a starter page, and the starter theme with `landing`, `document`, and `blog` Patterns. It does not create a hidden second template inside the CLI.

## Check and build

Run discovery before adding content, then check and build:

```bash
pageskill catalog
pageskill inspect pattern:landing
pageskill inspect block:hero
pageskill check
pageskill build
```

The expected result is a successful check followed by `dist/` containing generated HTML and the site assets. Start the local preview when you want to read the result in a browser:

```bash
pageskill s
```

Open [http://127.0.0.1:4173/](http://127.0.0.1:4173/). The preview watches `config.yml`, `content/`, and `themes/`, then rebuilds after an affected edit.

## Common errors

- **`pageskill` is not found:** run `npm link` in the repository after the compile commands, then open a new terminal if your shell has not refreshed its command path.
- **The Node version is rejected:** install a supported Node.js version and run `npm install` again.
- **Initialization copies into the wrong place:** stop, choose an empty target directory, and run `pageskill init` there; keep the repository checkout separate from the site.
- **A starter page uses `docs`:** the starter provides `document`; copy a theme that provides `docs` only after `catalog` confirms it.

## Expected result and next step

You now have a neutral Pageskill site that can be checked, built, and previewed. Keep `dist/` generated and edit the source files instead.

[Back to the Guide](/en/guide/) · [Next: Site settings](/en/guide/site-settings/)
