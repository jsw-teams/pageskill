---
title: Start your site in ten minutes
description: Install Pageskill from the source repository, copy starter, and generate a site ready for your articles.
date: 2026-09-07
---

# Start your site in ten minutes

The Pageskill source repository and the site you publish are two different things. Compile the CLI in the source repository, then copy `starter` as your new site.

## 1. Install Pageskill

In a terminal with Git and Node.js 22 or newer, run:

```powershell
git clone https://github.com/jsw-teams/pageskill.git
Set-Location pageskill
npm install
npm run g
npm link
```

`npm run g` compiles the source before generating the repository site. `npm link` makes the `pageskill` command available from other directories.

## 2. Copy starter

Leave the source repository and copy a clean starting point:

```powershell
Copy-Item -Recurse starter ..\my-site
Set-Location ..\my-site
pageskill g
```

You now have a site with one home page. Edit `my-site` from here; the source repository supplies the CLI and theme capabilities.

## 3. Open the preview

```powershell
pageskill s
```

Open the local address shown in the terminal. The preview keeps running; press `Ctrl+C` to stop it, or edit in another terminal and run `pageskill g` again.

## Expected result

The home page opens, static files are under `dist/public`, and `content/pages/home/en.md` is the home page source you can edit.

## Common trap

If `pageskill` is not found, you probably have not run `npm link` in the source repository, or the current terminal has an old PATH. Open a new terminal, then run `pageskill g` from the new site.

## Next step

Read [Change the name and navigation](/en/posts/site-settings/) to give the site its own identity.
