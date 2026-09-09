---
title: Start your site in ten minutes
description: Clone Pageskill, generate the site in place, and start editing your own pages and articles.
date: 2026-09-07
---

# Start your site in ten minutes

The cloned Pageskill repository is the site you can edit and publish. Keep your content, settings, theme, and generated files in this one working directory.

## 1. Clone and install

In a terminal with Git and Node.js 22 or newer, run:

```powershell
git clone https://github.com/jsw-teams/pageskill.git
Set-Location pageskill
npm install
```

## 2. Generate the cloned site

```powershell
npm run g
```

`npm run g` compiles the runtime, theme, and backend, then validates and generates this repository. The source tree is now the site you edit.

## 3. Edit the site in place

Change `content/pages/home/<locale>.md` for the home page, `content/posts/<id>/<locale>.md` for dated articles, and `content/updates/<version>/<locale>.md` for version updates. Use `config.yml` for site data and switches. Reuse the theme capabilities before adding a new extension.

## 4. Open the preview

```powershell
npm run s
```

Open the local address shown in the terminal. The preview keeps running; press `Ctrl+C` to stop it, or edit in another terminal and run `npm run g` again.

## Expected result

The home page opens, static files are under `dist/public`, and `content/pages/home/en.md` is the home page source you can edit.

## Common trap

If generation fails before the content is read, run `npm install` again from the cloned repository and check that Node.js is version 22 or newer. Do not edit generated files under `dist/` or `.pagekiln/`.

## Next step

Read [Change the name and navigation](/en/posts/site-settings/) to give the cloned site its own identity.
