# Pageskill: write articles, build a site

[简体中文](README.md) · [中文 changelog](CHANGELOG.zh-CN.md) · [Changelog](CHANGELOG.md)

Pageskill 3.0.0 turns Markdown articles, site settings, and theme styles into a publishable website. Write the content first, then let the theme provide structure and visual behavior; ordinary sites do not need hand-written HTML for every article.

## Start in ten minutes

The source repository and the new site you publish are two directories. Install the CLI from the source repository first:

```powershell
git clone https://github.com/jsw-teams/pageskill.git
Set-Location pageskill
npm install
npm run g
npm link
```

`npm run g` compiles the source before generating the repository site. Copy `starter` next, then work in the new site directory:

```powershell
Copy-Item -Recurse starter ..\my-site
Set-Location ..\my-site
pageskill g
pageskill s
```

`pageskill g` validates and generates public files, while `pageskill s` keeps a preview running; press `Ctrl+C` to stop it, or edit in another terminal. When the site is ready, configure a target in `config.yml` and run:

```powershell
pageskill d
```

Read the complete [Start your site in ten minutes](content/posts/start/en.md) article.

## Learning path

Read these short articles in order:

- [Change the name and navigation](content/posts/site-settings/en.md)
- [Markdown: write like a note](content/posts/markdown/en.md)
- [Publish your first article](content/posts/first-post/en.md)
- [Cookie choices: ask before loading](content/posts/cookies/en.md)
- [Change the style, or ask an Agent](content/posts/customize/en.md)
- [Put the site online](content/posts/deploy/en.md)
- [About Pageskill](content/pages/about/en.md)
- [Privacy policy](content/pages/privacy/en.md)
- [3.0 update: a simpler entry](content/posts/version-3-0/en.md)

The Simplified Chinese and Traditional Chinese versions sit beside each English article.

## Where content and source code live

- `content/pages/<id>/<locale>.md` stores stable pages such as the home page, About, and the privacy policy. These pages do not need `date`; the pages collection supplies the default page pattern. Tutorials, blogs, product records, and release notes live in `content/posts/<id>/<locale>.md`; every article requires `date`, and its route is `/:locale/posts/<id>/`.
- `config.yml` stores site names, languages, navigation, routes, privacy, and deployment targets. It is not a browser-script or HTML injection surface.
- `themes/<name>/` owns styles, article structures, and reusable Blocks. You can copy a theme and edit it directly; implement a new structure once so later articles can reuse it.
- `backend/handler.ts` owns dynamic business logic, writes, webhooks, and runtime secrets. The public static snapshot is `dist/public`; the server handles same-origin APIs.
- Cookie choices reuse the provided plugin. Optional categories start disabled, and trusted `gatedScripts` are registered only in `theme.yml`. Withdrawal cannot undo an action a script already performed.

Advanced authors can read `dist/.pagekiln/catalog.json` or `dist/.well-known/agent.json` after generation to discover reusable capabilities. Beginners can start with articles and settings.

`src/runtime/`, `.pagekiln/`, and `dist/` are generated outputs; do not edit them by hand. The source of truth is `config.yml`, `content/`, and `themes/`. Pageskill is MIT licensed; see [LICENSE](LICENSE).
