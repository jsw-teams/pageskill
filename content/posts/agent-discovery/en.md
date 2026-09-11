---
title: Configure conditional Agent capabilities
description: Implement the real service, browser tool, or DNS record first, then let Pageskill publish discovery data that matches it.
date: 2026-09-11
category: tutorial
---

# Configure conditional Agent capabilities

Pageskill generates the baseline site discovery files, but it does not implement an authorization server, MCP service, browser tool, or DNS provider integration for you. `agentDiscovery` in `config.yml` is the public declaration layer: set a switch to `true` only after the corresponding capability is deployed and verified.

This tutorial covers four conditional capabilities: authentication metadata, an MCP server card, WebMCP browser-tool registration, and DNS-AID. Values must come from a real service or DNS provider. Do not add a fictional endpoint, account ID, or DNS record just to make generation succeed.

## Start with the source boundary

| Capability | Real implementation | Pageskill configuration | Generated or published result |
| --- | --- | --- | --- |
| Authentication metadata | A protected route in `backend/handler.ts` plus a real OAuth/OIDC issuer, or an external resource server | `config.yml` `agentDiscovery.auth` | Conditional `/.well-known/oauth-protected-resource` and `auth.md`; authorization-server metadata is generated only when both real endpoints are supplied |
| MCP card | An MCP transport under `backend/`, or an already deployed external MCP service | `config.yml` `agentDiscovery.mcp` | Conditional `/.well-known/mcp/server-card.json`; the card does not execute tools |
| WebMCP | A browser script under `themes/<name>/plugins/<id>/` registered through the theme entry | The plugin instance in `themes/<name>/theme.yml`, plus `config.yml` `agentDiscovery.webmcp` | The browser script registers tools; the static renderer does not create a browser endpoint |
| DNS-AID | A real agent endpoint, authoritative DNS zone, and DNSSEC | `config.yml` `agentDiscovery.dnsAid` | Only a configured state in Agent metadata; Pageskill never writes SVCB, TXT, TLSA, or DNSSEC records |

Implement the first column, configure the middle column, and then run generation and live checks. Changing `agentDiscovery` alone cannot create a service.

## 1. Keep the defaults off when no service exists

This site does not provide these services, so it keeps the switches off:

```yaml
# config.yml
agentDiscovery:
  auth:
    enabled: false
  mcp:
    enabled: false
  webmcp:
    enabled: false
  dnsAid:
    enabled: false
```

An ordinary API can still be listed in `agentDiscovery.apiCatalog.entries`, but every `endpoint` must point to a real `router` route or external service. The current `/api/health` example is actually served by `backend/handler.ts`.

## 2. Add authentication metadata

### 2.1 Protect the resource route first

Register the protected path in `backend/handler.ts`. Pageskill's `Router` provides routing, not OAuth token verification; connect an OAuth/OIDC library under `backend/auth/`, or host the resource on an external resource server.

```ts
// backend/handler.ts
import { Router } from '../src/fetch-router.ts';
import { verifyAccessToken } from './auth/verify-access-token.ts';

export const router = new Router();

router.get('/api/private', async ({ request, env }) => {
  // This verifier must check the issuer JWKS signature, issuer, audience,
  // expiry, and the scope required by this operation. Decoding a JWT is not verification.
  const identity = await verifyAccessToken(request, env, {
    requiredScopes: ['pageskill.read']
  });
  if (!identity) {
    const metadata = 'https://api.example.com/.well-known/oauth-protected-resource';
    return new Response('Unauthorized', {
      status: 401,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'www-authenticate': `Bearer resource_metadata="${metadata}"`
      }
    });
  }
  return Response.json({ ok: true, subject: identity.subject });
});
```

`verifyAccessToken` above is the provider/library integration you must supply; Pageskill does not provide that function. Keep failed verification as a 401/403 API response instead of allowing a static page to handle it. Keep secrets, JWKS configuration, and server-side verification in the runtime environment, not in `config.yml` or `dist/public`. The `resource_metadata` parameter points to the real protected-resource metadata URL; see [RFC 9728](https://www.rfc-editor.org/rfc/rfc9728).

### 2.2 Declare the real resource and issuer

After the resource server and OAuth/OIDC issuer are live, enable the declaration:

```yaml
agentDiscovery:
  auth:
    enabled: true
    # This must be the resource identifier used by the real token audience.
    resource: https://api.example.com
    authorizationServer: https://login.example.com
    # These two fields are optional. When both are real, Pageskill also writes
    # /.well-known/oauth-authorization-server.
    authorizationEndpoint: https://login.example.com/oauth2/authorize
    tokenEndpoint: https://login.example.com/oauth2/token
    scopes:
      - pageskill.read
    title: Pageskill protected API
    description: OAuth metadata for the Pageskill protected API.
```

`resource` must match the resource identifier used by the real resource server, and `authorizationServer` must be the actual issuer. Enabling the section without those two values fails generation; providing only one of the optional authorization or token endpoints does not generate partial authorization-server metadata.

### 2.3 Verify the complete flow

Generate locally, then inspect the metadata and protected route separately:

```powershell
npm run g -- --profile
Invoke-WebRequest https://api.example.com/.well-known/oauth-protected-resource
Invoke-WebRequest https://api.example.com/api/private -SkipHttpErrorCheck
```

Without a token, the resource should return 401 and `WWW-Authenticate`; with a real test token, it should return the resource response. Check that the metadata resource, issuer, and scopes exactly match the verifier's audience, issuer, and required scopes. A static-only site can enable this only when the backend is deployed with it or the resource server is external.

## 3. Add an MCP server card

### 3.1 Implement a real MCP transport first

The MCP card is a public endpoint and tool summary. First connect the selected MCP SDK/transport under `backend/mcp/`, then pass the same path to it from `backend/handler.ts`:

```ts
// backend/handler.ts
import { handleMcpRequest } from './mcp/transport.ts';

// handleMcpRequest must be backed by a real MCP implementation. It is not a
// placeholder route: validate Origin, authentication, JSON-RPC, and tool input.
router.all('/api/mcp', ({ request, env, executionContext }) =>
  handleMcpRequest({ request, env, executionContext })
);
```

Have the actual MCP service implement the HTTP transport, authorization, and `tools/list` / `tools/call` behavior required by the protocol version you selected. The tool list, names, descriptions, and input schemas cannot exist only in the card. An HTTP MCP service must also handle Origin validation, authentication, rate limits, input validation, and user confirmation for consequential actions. Check the current [MCP server discovery](https://modelcontextprotocol.io/specification/draft/server/discover) and [MCP tools](https://modelcontextprotocol.io/specification/draft/server/tools) requirements.

If the MCP service lives on another domain, `backend/handler.ts` does not need to proxy it. Put the external HTTPS service URL in `endpoint` and let that service own transport and authorization.

### 3.2 Keep the card aligned with the real tool list

```yaml
agentDiscovery:
  mcp:
    enabled: true
    endpoint: https://api.example.com/mcp
    name: Pageskill tools
    description: Read-only tools for the Pageskill service.
    version: 1.0.0
    tools:
      - name: health.read
        description: Read the current service health.
        inputSchema:
          type: object
          additionalProperties: false
          properties: {}
```

The renderer keeps each tool's `name`, `description`, and object-shaped `inputSchema` and writes `/.well-known/mcp/server-card.json`. It does not infer tools from backend code or implement MCP calls. Update the configuration with every service-side tool change, then run:

```powershell
npm run g -- --profile
Get-Content dist\public\.well-known\mcp\server-card.json
Invoke-WebRequest https://api.example.com/mcp -Method Get -SkipHttpErrorCheck
npm run d -- --dry-run
```

Use a real MCP client or Inspector to run `tools/list` and one side-effect-free `tools/call`, and compare the endpoint, version, and schema with the card. Keep `enabled: true` only after those checks pass.

## 4. Register WebMCP browser tools

WebMCP is not a static URL. In a secure context, page JavaScript calls `document.modelContext.registerTool()` to make a tool available to a browser Agent. Pageskill has no built-in WebMCP plugin; create it as a reusable theme plugin.

### 4.1 Create and register the theme plugin

```text
themes/default/plugins/web-tools/
  index.ts
  script.js
```

```ts
// themes/default/plugins/web-tools/index.ts
import type { ThemePluginDefinition } from '../../../../src/theme-api.ts';

export const plugin: ThemePluginDefinition = {
  implementation: 'plugins/web-tools/index.ts',
  resources: {
    // The browser module is loaded only when this theme plugin is enabled.
    scripts: ['plugins/web-tools/script.js']
  },
  defaults: { enabled: false },
  schema: { enabled: { type: 'boolean' } }
};
```

Export this plugin from `themes/default/plugins/index.ts`, then enable its instance in `themes/default/theme.yml`:

```yaml
plugins:
  webTools:
    enabled: true
```

### 4.2 Register a real tool in the browser module

```js
// themes/default/plugins/web-tools/script.js
const modelContext = document.modelContext;

if (modelContext) {
  // Register only an operation that the page really implements. Keep the
  // description factual because agents use it to decide whether to call it.
  modelContext.registerTool({
    name: 'health-read',
    title: 'Read service health',
    description: 'Read the current service health without changing data.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {}
    },
    annotations: { readOnlyHint: true },
    async execute() {
      const response = await fetch('/api/health', { credentials: 'same-origin' });
      if (!response.ok) throw new Error('Health request failed');
      return JSON.stringify(await response.json());
    }
  }).catch(error => {
    // A browser without WebMCP support must fail closed and keep the page usable.
    console.warn('WebMCP tool registration failed', error);
  });
}
```

Use the current `document.modelContext` API from the [WebMCP draft](https://webmachinelearning.github.io/webmcp/); do not copy the old `navigator.webmcp` API or an unverified third-party global. Tool names, descriptions, and schemas must match the execution logic. Browser validation does not replace backend validation: writes, payments, deletes, and other consequential actions need clear page confirmation and a second server-side authorization and validation check.

### 4.3 Enable the discovery declaration last

After the theme plugin loads and has been tested in the target browser, add:

```yaml
# config.yml: this advertises a real browser module; it does not load one.
agentDiscovery:
  webmcp:
    enabled: true
```

This only makes generated Agent metadata show WebMCP as configured; the tools come from the theme script. Run `npm run s`, then in a WebMCP-capable secure context check `await document.modelContext.getTools()` and confirm the tool name, schema, and side-effect-free result. Unsupported browsers should fail without a registration error and must keep the ordinary page usable.

## 5. Publish DNS-AID

DNS-AID is implemented in the authoritative DNS zone, not in `config.yml` or the static renderer. Deploy the real agent endpoint first, then use the current DNS-AID/IETF draft and your DNS provider's tooling to publish the appropriate SVCB/TXT records; prepare DNSSEC when TLSA is used. Generate the record data from the real endpoint, protocol, and certificate material instead of copying an example record.

Verify from outside the build machine after publishing:

```powershell
# Replace the record name with the name actually published in your zone.
$agentRecord = '_support._mcp._agents.example.com'
Resolve-DnsName $agentRecord -Type SVCB
Resolve-DnsName $agentRecord -Type TXT
Resolve-DnsName '_443._tcp.support.example.com' -Type TLSA
Resolve-DnsName 'example.com' -Type DNSKEY
```

You can also use `dig +dnssec` to confirm the response comes from the correct authoritative zone, SVCB/TXT points to the reachable real service, TLSA matches the deployed certificate, and the DNSSEC chain validates. DNS-AID is currently an IETF Internet-Draft; follow the [latest draft](https://www.ietf.org/archive/id/draft-mozleywilliams-dnsop-dnsaid-02.html) and the publishing tool you actually use for record names and security requirements.

After all external checks pass, set:

```yaml
agentDiscovery:
  dnsAid:
    enabled: true
```

Regenerate and inspect the configured state in `/.well-known/agent.json`. Pageskill does not call a DNS provider, create records, sign DNSSEC, or write nonexistent DNS records into the site because the flag is true.

## 6. Verify the generated result

```powershell
npm run compile-runtime
npm run compile-theme
npm run compile-backend
npm run g -- --profile

$root = 'dist\public'
Get-Content "$root\.well-known\agent.json" | ConvertFrom-Json
Test-Path "$root\.well-known\oauth-protected-resource"
Test-Path "$root\.well-known\mcp\server-card.json"
git diff --check
npm run d -- --dry-run
```

With the defaults off, the conditional endpoint files should not exist. After enabling one capability, only that capability's actual files or configured state should appear. Check the deployment type last: static Git/Pages publishes only `dist/public` and cannot host `backend/handler.ts` by itself. Authentication and MCP need the backend deployed in the same runtime or an already live external service. Never edit `dist/`, `.pagekiln/`, or generated `.well-known` files by hand.

## Common failures

- Treating `enabled: true` as an implementation: deploy the service, plugin, or DNS first, then enable the declaration.
- Generating an MCP card without an MCP transport: the card is an index, not a server.
- Enabling the WebMCP flag without a theme script: Agent metadata says configured, but the browser has no tool; disable the flag or finish the plugin registration.
- Using an example domain, empty ID, or guessed DNS record: replace it with the real value returned by the provider or authoritative DNS before generating.
- Expecting `/api/private` or `/api/mcp` to work after a static-only publish: package the backend with the snapshot or use an external endpoint.

## Next step

For theme resources and browser code, read [Develop a reusable plugin](/en/posts/plugins/). For same-origin backend and publishing boundaries, read [Put the site online](/en/posts/deploy/).
