---
title: Customize rendering with a theme
description: Discover reusable capabilities first, then copy a theme for shared Pattern and Block behavior.
pattern: docs
---

# Customize rendering with a theme

People can reuse the built-in Patterns, Blocks, and schemas without an Agent. Copy a theme only when `catalog` and `inspect` show that a reusable capability is missing. A theme extension is shared behavior; it is not a reason to hand-write HTML in each page.

## Discover before copying

From the site root, inspect the capabilities that already cover a page and a Product Note:

```bash
pageskill catalog
pageskill inspect pattern:document
pageskill inspect pattern:blog
pageskill inspect block:hero
```

If the result is sufficient, keep writing Markdown. If it is missing a shared behavior, copy the existing theme directory to `themes/nebula/` with your file manager or a recursive copy command, then set the site root `config.yml` to:

```yaml
theme:
  name: nebula
```

Keep every Pattern and Block that the copied theme already exports, especially `landing`, `docs`, and `blog`. A minimal example that shows only `document` and `notice` is an illustration; replacing the whole theme with it removes the renderers used by the home, docs, and blog pages.

## Keep the theme contract in the right files

Pattern and Block definitions, including their schemas, live in `theme.ts`. `theme.yml` registers the exported names and resources. The examples below are local additions to a copied theme, not complete replacement files. Keep every existing Pattern, Block, plugin, and resource mapping, then add or update the `notice` entries. Put shared CSS in `style.css` and Block-specific CSS in a `blockStyles` entry:

```yaml
# Merge into the existing themes/nebula/theme.yml mapping.
blockStyles:
  notice:
    - blocks/notice.css
# Keep the existing list and append this name only when it is absent.
blocks:
  - notice
```

The corresponding local `theme.ts` mapping can keep page and article rendering distinct while still accepting Markdown children. Merge these entries into the existing `defineTheme({...})` object; do not replace the rest of the theme:

```ts
// Inside the existing defineTheme({...}) object; preserve every other entry.
  patterns: {
    document: { name: 'document', contexts: ['page'], render: content => `<article class="document-body">${content}</article>` },
    blog: { name: 'blog', contexts: ['post', 'blog'], render: content => `<article class="post">${content}</article>` }
  },
  blocks: {
    notice: {
      name: 'notice',
      schema: { tone: 'string' },
      render: (node, context) => {
        const tone = context.escapeHtml(node.attrs.tone || 'info');
        return `<aside class="notice notice--${tone}">${context.renderNodes(node.children)}</aside>`;
      }
    }
  }
```

Put the matching `.notice` rule in `themes/nebula/blocks/notice.css`. Do not also copy the rule into `style.css`; one Block rule should have one owner. Review theme TypeScript and browser ESM as trusted application code because the theme is not a sandbox.

The default `learning-path` Block also reads six images from `content/assets/learning/`. When moving that Block to another site, copy those site assets too, or change the renderer to use assets that exist in the new site.

## Let authors keep writing Markdown

With the `document` and `blog` Patterns registered, authors use different collection paths and frontmatter while writing the same Markdown language:

```text
content/pages/overview/en.md       pattern: document  -> /en/overview/
content/posts/release/en.md        pattern: blog      -> /en/posts/release/
```

The page has current information and no required date. The Product Note has a required ISO `date` and belongs in the dated archive and feed. Neither file contains per-page HTML.

## Verify the extension

Run the discovery and build checks after copying or editing the theme. Run `npm run compile-theme` in the Pageskill source checkout; a copied starter site has no `package.json` scripts for that command:

```bash
npm run compile-theme
pageskill catalog
pageskill inspect pattern:document
pageskill inspect pattern:blog
pageskill inspect block:notice
pageskill check
pageskill build
```

The expected result is that the catalog lists the preserved Patterns and Blocks, the `notice` schema is visible, and the built page and Product Note use their respective renderers. The compiler uses the Block schema to reject unknown directive attributes; the renderer still must handle accepted values safely. Check the generated CSS to confirm the Block rule occurs once.

An Agent can perform the same work with a constrained task such as: “Run `pageskill catalog` and `inspect` first. If no reusable capability covers this requirement, copy the existing theme, preserve every exported Pattern and Block, add one reviewed Block with its scalar schema in `theme.ts`, register its name and `blockStyles` resource in `theme.yml`, and verify with `check` and `build`. Do not write per-page HTML or read secrets during the build.” A person can follow those steps directly.

## Common errors

- **The copied theme renders only one page type:** restore the other exported Patterns and Blocks, especially `landing`, `docs`, and `blog`.
- **An unknown `notice` attribute is rejected:** add its scalar name to the Block schema in `theme.ts`, then keep the registered name aligned with `theme.yml`.
- **The CSS does not load:** confirm the path is under `blockStyles` and the file is inside the copied theme.
- **The same CSS appears twice:** remove the duplicate rule from the old owner; do not rely on cascade order.
- **The starter cannot use `docs`:** use `document` there, or copy a theme that `catalog` confirms provides `docs`.

## Expected result and next step

You now have a reusable theme extension with distinct page and article rendering while content authors continue to write Markdown. For the deeper contract, CSS limits, and security boundaries, continue to [Secondary development](/en/development/) or return to the [Guide](/en/guide/).

[Back to the Guide](/en/guide/) · [Next: Secondary development](/en/development/)
