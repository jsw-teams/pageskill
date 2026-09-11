---
title: 配置条件 Agent 能力
description: 先实现真实的服务、浏览器工具或 DNS 记录，再让 Pageskill 生成与实际能力一致的发现信息。
date: 2026-09-11
category: tutorial
---

# 配置条件 Agent 能力

Pageskill 会生成基础的站点发现文件，但不会替你实现鉴权服务器、MCP 服务、浏览器工具或 DNS。`config.yml` 中的 `agentDiscovery` 是公开声明入口：只有对应能力已经真实部署并验证，才把相应开关改为 `true`。

这篇教程处理四种条件能力：鉴权元数据、MCP server card、WebMCP 浏览器工具登记和 DNS-AID。配置值必须来自实际服务或 DNS 提供商，不要为了让生成通过而填写虚构的 endpoint、账户 ID 或记录。

## 先看源码边界

| 能力 | 真正实现的位置 | Pageskill 配置 | 生成或发布的结果 |
| --- | --- | --- | --- |
| 鉴权元数据 | `backend/handler.ts` 的受保护路由和真实 OAuth/OIDC issuer，或外部资源服务器 | `config.yml` 的 `agentDiscovery.auth` | 条件生成 `/.well-known/oauth-protected-resource`、`auth.md`；同时提供两个真实端点时再生成 authorization-server metadata |
| MCP card | `backend/` 中的 MCP transport，或已经上线的外部 MCP 服务 | `config.yml` 的 `agentDiscovery.mcp` | 条件生成 `/.well-known/mcp/server-card.json`；card 不执行工具 |
| WebMCP | `themes/<name>/plugins/<id>/` 的浏览器脚本，并在主题入口登记 | `themes/<name>/theme.yml` 的插件实例，加上 `config.yml` 的 `agentDiscovery.webmcp` | 浏览器脚本在页面中登记工具；静态生成器不会创建浏览器 endpoint |
| DNS-AID | 真实 agent endpoint、权威 DNS 区域和 DNSSEC | `config.yml` 的 `agentDiscovery.dnsAid` | 只在 Agent 元数据中记录已配置状态；Pageskill 不写入 SVCB、TXT、TLSA 或 DNSSEC |

先实现左侧，再配置中间一列，最后运行生成和线上验证。仅修改 `agentDiscovery` 不会凭空产生服务。

## 1. 保持没有服务时的默认配置

当前站点没有这些服务，所以保留以下关闭状态：

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

普通 API 仍可登记在 `agentDiscovery.apiCatalog.entries`，但每个 `endpoint` 必须对应真实的 `router` 路由或外部服务。当前示例中的 `/api/health` 就由 `backend/handler.ts` 实际提供。

## 2. 接入鉴权元数据

### 2.1 先保护资源路由

在 `backend/handler.ts` 注册受保护路径。Pageskill 的 `Router` 只负责路由，不内置 OAuth token 校验；在 `backend/auth/` 中接入你选择的 OAuth/OIDC 库，或把资源放到外部资源服务器。

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

上面的 `verifyAccessToken` 是你要接入的 provider/library，不是 Pageskill 自动提供的函数。校验失败要保持 401/403 API 响应，不要让静态页面接管；secret、JWKS 配置和服务端验证放在运行时环境，不放进 `config.yml` 或 `dist/public`。`WWW-Authenticate` 的 `resource_metadata` 用来指向真实的保护资源元数据，格式参见 [RFC 9728](https://www.rfc-editor.org/rfc/rfc9728)。

### 2.2 声明实际的资源和 issuer

资源服务器和 OAuth/OIDC issuer 都上线后，才在 `config.yml` 打开：

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

`resource` 必须和真实资源服务器使用的资源标识一致，`authorizationServer` 必须是实际 issuer。启用时缺少这两个值会让生成失败；只填写一半的 authorization endpoint/token endpoint 不会生成半份授权服务器元数据。

### 2.3 验证整条链路

先在本地生成，再分别检查元数据和受保护路由：

```powershell
npm run g -- --profile
Invoke-WebRequest https://api.example.com/.well-known/oauth-protected-resource
Invoke-WebRequest https://api.example.com/api/private -SkipHttpErrorCheck
```

没有 token 时应得到 401 和 `WWW-Authenticate`；拿真实测试 token 时应得到资源响应。还要检查元数据中的 `resource`、issuer、scope 与 verifier 的 audience、issuer、scope 完全相符。静态站点只有在同时部署 backend 或使用外部资源服务器时，才可以打开这个开关。

## 3. 接入 MCP server card

### 3.1 先实现真实 MCP transport

MCP card 只是公开的入口和工具摘要。先在 `backend/mcp/` 接入所选 MCP SDK/transport，再由 `backend/handler.ts` 把同一个路径交给它：

```ts
// backend/handler.ts
import { handleMcpRequest } from './mcp/transport.ts';

// handleMcpRequest must be backed by a real MCP implementation. It is not a
// placeholder route: validate Origin, authentication, JSON-RPC, and tool input.
router.all('/api/mcp', ({ request, env, executionContext }) =>
  handleMcpRequest({ request, env, executionContext })
);
```

让实际 MCP 服务按照所选版本支持它声明的 HTTP transport、鉴权和 `tools/list` / `tools/call` 行为；工具列表、名称、描述和输入 schema 不能只存在于 card。HTTP MCP 服务还要单独处理 Origin、认证、限流、输入校验和高风险操作的用户确认。可从 [MCP server discovery](https://modelcontextprotocol.io/specification/draft/server/discover) 和 [MCP tools](https://modelcontextprotocol.io/specification/draft/server/tools) 核对当前协议要求。

如果 MCP 服务在别的域名，`backend/handler.ts` 不需要代理；`endpoint` 直接写外部服务的 HTTPS URL，并让外部服务自己承担 transport 和鉴权。

### 3.2 让 card 与真实工具列表一致

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

生成器会保留工具的 `name`、`description` 和对象形 `inputSchema`，并写入 `/.well-known/mcp/server-card.json`；它不会从 backend 猜测工具，也不会实现 MCP 调用。每次修改服务端工具时同步修改配置，然后运行：

```powershell
npm run g -- --profile
Get-Content dist\public\.well-known\mcp\server-card.json
Invoke-WebRequest https://api.example.com/mcp -Method Get -SkipHttpErrorCheck
npm run d -- --dry-run
```

用实际 MCP client/Inspector 再执行一次 `tools/list` 和一个无副作用的 `tools/call`，确认 card 的 endpoint、版本和 schema 与服务返回值一致。只有这些检查通过后才保留 `enabled: true`。

## 4. 登记 WebMCP 浏览器工具

WebMCP 不是一个静态 URL。它是在安全上下文中由页面 JavaScript 调用 `document.modelContext.registerTool()`，把工具登记给浏览器 Agent。Pageskill 当前没有内置 WebMCP 插件；应按普通可复用主题插件创建模块。

### 4.1 创建并登记主题插件

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

在 `themes/default/plugins/index.ts` 导出这个插件，在 `themes/default/theme.yml` 配置实例：

```yaml
plugins:
  webTools:
    enabled: true
```

### 4.2 在浏览器模块中登记真实工具

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

使用 [WebMCP draft](https://webmachinelearning.github.io/webmcp/) 当前的 `document.modelContext` API，不要照搬旧的 `navigator.webmcp` 或未经验证的第三方全局对象。工具名、描述和 schema 要与执行逻辑一致；浏览器端校验不能替代 backend 校验，写入、付款、删除等 consequential action 必须在页面提供明确确认，并在服务端再次鉴权和校验。

### 4.3 再打开发现声明

主题插件实际加载并在目标浏览器中验证后，才加：

```yaml
# config.yml: this advertises a real browser module; it does not load one.
agentDiscovery:
  webmcp:
    enabled: true
```

这只会让生成的 Agent 元数据显示 WebMCP 已配置；真正的工具来自主题脚本。运行 `npm run s` 后，在支持 WebMCP 的安全上下文检查 `await document.modelContext.getTools()`，至少确认工具名称、schema 和无副作用执行结果。浏览器不支持时应没有注册错误，也不能影响普通页面。

## 5. 发布 DNS-AID

DNS-AID 的实现发生在权威 DNS 区域，不在 `config.yml` 或静态渲染器中。先部署实际 agent endpoint，再根据当前 DNS-AID/IETF draft 和 DNS 服务商能力发布适用的 SVCB/TXT 记录；需要 TLSA 时同时准备 DNSSEC。记录内容必须由真实 endpoint、协议和证书材料生成，不要复制一条示例记录冒充上线。

发布后先在站外验证：

```powershell
# Replace the record name with the name actually published in your zone.
$agentRecord = '_support._mcp._agents.example.com'
Resolve-DnsName $agentRecord -Type SVCB
Resolve-DnsName $agentRecord -Type TXT
Resolve-DnsName '_443._tcp.support.example.com' -Type TLSA
Resolve-DnsName 'example.com' -Type DNSKEY
```

也可以使用带 DNSSEC 验证的 `dig +dnssec`，确认响应来自正确的权威区域、SVCB/TXT 指向可访问的真实服务、TLSA 与部署证书匹配，并确认 DNSSEC 链验证成功。DNS-AID 当前是 IETF Internet-Draft；记录类型、命名和安全要求以[最新 draft](https://www.ietf.org/archive/id/draft-mozleywilliams-dnsop-dnsaid-02.html)及你使用的发布工具为准。

所有站外检查通过后，才在 `config.yml` 写：

```yaml
agentDiscovery:
  dnsAid:
    enabled: true
```

然后重新生成并检查 `/.well-known/agent.json` 的 configured 状态。Pageskill 不会调用 DNS provider、不创建记录、不签署 DNSSEC，也不会因为 `enabled: true` 就把不存在的 DNS 记录写进网站。

## 6. 统一验证生成结果

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

默认关闭时，两个条件 endpoint 文件应不存在；打开某项后，只能看到该项实际生成的文件或 configured 状态。最后检查部署类型：静态 Git/Pages 只发布 `dist/public`，无法单独承载 `backend/handler.ts`；鉴权和 MCP 必须同时部署同源 backend，或改用已经上线的外部服务。不要手动修改 `dist/`、`.pagekiln/` 或生成的 `.well-known` 文件。

## 常见失败

- 把 `enabled: true` 当作实现：先部署服务/插件/DNS，再开声明。
- 只生成 MCP card 没有 MCP transport：card 是索引，不是 server。
- 只登记 WebMCP flag 没有主题脚本：Agent metadata 会显示配置，但浏览器不会出现工具；应关闭 flag 或完成插件登记。
- 用示例域名、空 ID 或猜出来的 DNS record：生成前换成 provider/权威 DNS 返回的真实值。
- 静态发布后仍期待 `/api/private` 或 `/api/mcp` 工作：把 backend 和静态快照放进同一个运行时，或配置外部 endpoint。

## 下一步

需要主题资源和浏览器代码时，继续阅读[开发一个可复用插件](/zh-sg/posts/plugins/)；需要检查同源 backend 和发布边界时，阅读[把网站放到网上](/zh-sg/posts/deploy/)。
