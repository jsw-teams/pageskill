---
kind: post
title: 'Configuration: one clear source for site settings'
description: Understand config.yml, optional config layers, site/theme.yml, content, and the boundary between site data and theme code.
date: 2026-09-07
category: tutorial
---

# Configuration: one clear source for site settings

Pageskill separates the files a site author changes from the code that implements a theme. The useful mental model is:

```text
config.yml
├─ site identity, locales, navigation, footer
├─ content collections and collection-owned archives/feeds
├─ integrations, privacy policy, discovery, deployment
└─ optional extends: ./config/*.yml

site/theme.yml
└─ small, schema-validated theme/component presentation overrides

content/
└─ Markdown pages, posts, assets, and Frontmatter

themes/default/
└─ reusable implementation, resources, components, and reference examples
```

Ordinary site work stays in the first three layers. `themes/default/` is not a second site configuration directory.

## 1. Keep the root configuration readable

Start with the site identity and the theme instance:

```yaml
siteUrl: https://example.com
defaultLocale: en
activeLocales:
  - en
siteName: Example
description: A site built from Markdown.

theme:
  name: default
  config: ./site/theme.yml
```

Add navigation and footer links in the same root config or in a related config layer:

```yaml
navigation:
  links:
    - key: home
      href: /:locale/
    - key: posts
      href: /:locale/posts/
    - label: GitHub
      href: https://github.com/example/example
      target: _blank

footer:
  links:
    - key: privacy
      href: /:locale/privacy/
    - label: Project source
      href: https://github.com/example/example
      target: _blank
```

Internal links may use `:locale`; external links may use HTTP(S). A blank-target link receives `rel="noopener noreferrer"`. Labels can use `labels.<locale>` and fall back through the active locale, configured fallback, English, a translation key, and finally the link key.

## 2. Split only genuinely related settings

When a site grows, reference project-local YAML files from the root:

```yaml
extends:
  - ./config/content.yml
  - ./config/discovery.yml
```

The loader applies built-in defaults, then those files in order, then `config.yml`. Objects merge recursively; arrays replace the previous array; scalars, including explicit `null`, replace the previous value. It does not execute YAML, include arbitrary paths, or append arrays automatically. Every referenced file must remain inside the project root, and cycles or missing files fail with the source path.

Do not create many tiny files just to demonstrate `extends`. The demo keeps content policy and discovery policy separate because they are meaningful groups; a small site can keep everything in one `config.yml`.

## 3. Put provider intent in `config.yml`

Third-party services are site capabilities, not theme presentation. Configure only the services actually used:

```yaml
integrations:
  google-analytics:
    measurementId: G-XXXXXXXXXX
```

The trusted adapter registry supplies the provider schema, privacy purpose, consent requirement, and safe resource loader. The provider node is enabled by default; `enabled: false` is optional. Do not add `purpose`, script URLs, inline code, category lists, or provider entries set to false. Public identifiers are validated; secrets belong in the deployment environment and backend.

If a configured adapter needs consent, the consent UI is generated with only its actual purposes. If there are no such adapters, there is no banner. A narrow browser-choice policy may be set only when needed:

```yaml
privacy:
  consent:
    decisionRetentionDays: 180
```

This is the lifetime of the browser's decision, not a provider data-retention setting. See [Configure integrations and privacy consent](/en/posts/cookies/) for the full model.

## 4. Use `site/theme.yml` only for presentation overrides

The site instance file can be empty:

```yaml
# site/theme.yml
components: {}
```

In fact, an omitted `theme.config` means the same empty override object. Component defaults and schemas live in code, so do not copy every `enabled: true` value into this file. Add a value only when this site differs from the theme default, for example:

```yaml
components:
  search:
    maxResults: 12
```

The advanced `components.shell.navigation.before/after` and `components.shell.footer.before/after` slots remain useful for a theme author or a site that needs a reusable insertion. They use the same safe link model, but ordinary navigation and footer links belong at the site level.

## 5. Put content in Markdown

Stable pages live at `content/pages/<id>/<locale>.md`. Tutorials, blogs, product notes, and ordinary posts live at `content/posts/<id>/<locale>.md` and release notes live at `content/updates/<id>/<locale>.md`. Every post needs `date`; an optional `updated` records a later modification without changing publication date. The `updates` collection is a real release-note collection, not a filtered view. The [post metadata example](/en/posts/post-meta-demo/) shows both behaviors.

## Expected result

The first file a site author opens explains the site, its languages, its links, its content model, and its deployment without exposing a wall of theme defaults. Theme code stays reusable, and generated files remain outputs rather than authoring surfaces.

## Next step

Read [Markdown: write like a note](/en/posts/markdown/) to create your first page or post.
