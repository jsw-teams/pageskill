---
kind: post
title: Develop a truthful Agent Skill
description: Keep Agent instructions aligned with Pageskill source boundaries, local assets, external APIs, Provider consent, and generated discovery.
date: 2026-09-16
category: tutorial
---

# Develop a truthful Agent Skill

Pageskill generates its public Agent Skill from the same capability map used by discovery output. The source contract is [the repository Skill developer specification](https://github.com/jsw-teams/pageskill/blob/main/docs/skill-development.md); generated files under `.well-known/agent-skills/` are evidence, not an editing surface.

## Describe real source surfaces

A Skill should direct content changes to `content/`, site structure to merged configuration, site-owned Component options to `site/theme.yml`, and reusable behavior to `ComponentDefinition`. It must never tell an Agent to edit `dist/`, `.pageskill/`, `src/runtime/`, or generated discovery files.

## Use one Client Runtime contract

Every browser Component uses the same lifecycle contract. Local Search reads generated static indexes through `runtime.assetJson` and needs no API declaration. Database, shared state, model, secret-backed, and write work adds one named `client.api` bound to `config.apis`. Third-party browser resources use a trusted Provider Adapter selected under `integrations`; that consent/privacy mechanism is not another Client mode and never receives an arbitrary script URL from site configuration.

## Make privacy changes part of the task

Enabling a Provider is incomplete until every active locale's privacy policy has been reviewed. Add the Provider ID to the policy Frontmatter `integrations` array and document the real purpose, data handling, withdrawal behavior, retention source, and contact. Generation fails when an enabled Provider is absent from a localized policy declaration.

## Verify generated instructions

Run `page g --profile`, inspect `/.well-known/agent.json`, the Agent Skill index, and generated `SKILL.md`, then run `page c`. Metadata must describe current Components and services without invented endpoints or credentials.
