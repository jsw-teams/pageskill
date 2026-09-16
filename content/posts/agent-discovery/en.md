---
kind: post
title: Configure Agent discovery from real capabilities
description: Publish discovery only after a browser capability or external service is implemented and verified.
date: 2026-09-11
updated: 2026-09-16
category: tutorial
---

# Configure Agent discovery from real capabilities

Pageskill generates discovery documents from source configuration. It does not create an OAuth issuer, MCP server, database, model service, third-party provider, or DNS record. Discovery is evidence about an implementation, never the implementation itself.

## 1. Use one Client Runtime contract

A Component always declares a module and selector. It omits `client.api` for DOM work and generated assets such as the local Search index. It declares a named `client.api` whenever it needs a database, model, shared state, secret-backed operation, or write.

```ts
client: {
  module: 'components/agent-tools/script.js',
  selector: '[data-agent-tools]',
  api: 'agent-tools'
}
```

The site chooses the service without changing Component code:

```yaml
apis:
  agent-tools:
    url: https://api.example.com/v1/agent-tools/
    auth:
      type: bearer
      token: ${PUBLIC_RESTRICTED_AGENT_TOKEN}
```

The browser module calls only relative paths through `runtime.apiJson('health')`. The URL may be cross-origin, but the runtime prevents origin and configured-path escape. A configured Token is public browser data; private credentials stay in the independently deployed service.

Local Search is not an API. It uses `runtime.assetJson` to read generated same-site indexes and requires no external service or Cookie.

## 2. Keep unavailable capabilities disabled

```yaml
agentDiscovery:
  auth: { enabled: false }
  mcp: { enabled: false }
  webmcp: { enabled: false }
  dnsAid: { enabled: false }
```

An empty API Catalog is correct when no public service has been deployed. Do not publish a sample `/api/health` route from a static site.

After OAuth or MCP is live, configure its real absolute endpoint and metadata. The MCP card must match the service's actual `tools/list`; OAuth resource, issuer, audience, scopes, and endpoints must match token verification. WebMCP metadata is valid only when a loaded Component really registers the documented tools. DNS-AID remains a recommendation until the authoritative zone is verified.

## 3. Treat third-party browser providers separately

An analytics tag, CAPTCHA, social embed, or provider SDK uses a trusted Provider Adapter under root `integrations`; it is not an arbitrary URL in Component settings. Before enabling it, revise every `content/pages/privacy/<locale>.md`. The Frontmatter `integrations` array must equal the enabled Provider IDs, and the prose must describe the actual provider, purpose, data categories, retention source, withdrawal behavior, and contact. Generation rejects missing or stale declarations.

## 4. Generate and verify

```powershell
page g --profile
page c
page s
```

Inspect `.well-known/agent.json`, the API Catalog, Agent Skills, and external endpoints independently. Generated files are renderer-owned; fix source configuration or implementation instead of editing `dist/public`.

Read the [Agent Skill developer specification](/en/posts/skill-development/) before adding or changing a project Skill.
