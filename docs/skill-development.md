# Pageskill Agent Skill developer specification

This document defines the source contract for an Agent Skill that operates on a Pageskill project. The generated public Skill remains renderer-owned under `.well-known/agent-skills/`; never edit generated output.

## 1. Describe only implemented capabilities

A Skill may reference only Components registered by the active Theme, collections and routes present in merged configuration, generated discovery resources, and external services that are actually configured. A declaration such as `enabled: true` is metadata, not an implementation.

## 2. Keep authoring boundaries explicit

- Content work edits `content/pages/`, `content/posts/`, or `content/updates/`.
- Site structure, named APIs, integrations, privacy policy data, collections, and discovery policy belong to `config.yml` or its ordered `extends` files.
- Site-owned Component overrides belong only to the file selected by `theme.config`.
- Reusable presentation and behavior belong to one `ComponentDefinition` under `themes/<name>/components/`.
- Generated `dist/`, `.pageskill/`, `src/runtime/`, and `.well-known` files are never authoring surfaces.

## 3. Use the unified Client Runtime

- Every browser Component declares one module and selector.
- DOM behavior and generated static assets use the normal Runtime; `runtime.assetJson` reads same-site assets, so local Search never needs an API declaration.
- Database, shared state, model calls, secret-backed work, or writes add `client.api`, configure `apis.<id>.url`, and call only relative paths through `runtime.apiJson`.
- Third-party browser resources use a trusted Provider Adapter selected by root `integrations`. The adapter owns schema, purpose, consent, loading, and official resource URLs; this is not another Client mode.

Any token in `config.apis` is public client data. Private credentials stay in an independently deployed proxy or API service.

## 4. Treat privacy policy revision as implementation work

Before enabling a third-party integration, update every `content/pages/privacy/<locale>.md` file. Its Frontmatter `integrations` array must exactly acknowledge the enabled Provider IDs, and its prose must state the real provider, purpose, data categories, retention source, withdrawal behavior, and site contact. Pageskill fails generation when the declarations are missing or stale.

## 5. Write safe Skill instructions

Use concrete source paths and public commands. Do not place credentials, executable HTML, arbitrary scripts, private URLs, or provider secrets in a Skill. Require confirmation before consequential external operations and keep service-side authorization and validation mandatory.

## 6. Verify the result

Run `page g --profile`, `page c`, and `page s`. Inspect generated Agent Discovery, the Agent Skill index and `SKILL.md`, internal links, API origins without token values, privacy declarations, and the private accessibility report. Generated discovery must match the current build, not an example or planned service.
