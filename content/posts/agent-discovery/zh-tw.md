---
title: 設定條件式 Agent 能力
description: 先實作真實的服務、瀏覽器工具或 DNS 記錄，再讓 Pageskill 產生與實際能力一致的探索資訊。
date: 2026-09-11
category: tutorial
---

# 設定條件式 Agent 能力

Pageskill 會產生基本的網站探索檔案，但不會替你實作驗證伺服器、MCP 服務、瀏覽器工具或 DNS。`config.yml` 裡的 `agentDiscovery` 是公開宣告入口：只有對應能力已經實際部署並驗證，才把相應開關改成 `true`。

這篇教學處理四種條件能力：驗證中繼資料、MCP server card、WebMCP 瀏覽器工具登記和 DNS-AID。設定值必須來自實際服務或 DNS 提供者，不要為了讓產生通過而填寫虛構的 endpoint、帳戶 ID 或記錄。

## 先看原始碼邊界

| 能力 | 真正實作位置 | Pageskill 設定 | 產生或發佈的結果 |
| --- | --- | --- | --- |
| 驗證中繼資料 | `backend/handler.ts` 的受保護路由和真實 OAuth/OIDC issuer，或外部資源伺服器 | `config.yml` 的 `agentDiscovery.auth` | 條件產生 `/.well-known/oauth-protected-resource`、`auth.md`；同時提供兩個真實端點時才產生 authorization-server metadata |
| MCP card | `backend/` 中的 MCP transport，或已上線的外部 MCP 服務 | `config.yml` 的 `agentDiscovery.mcp` | 條件產生 `/.well-known/mcp/server-card.json`；card 不執行工具 |
| WebMCP | `themes/<name>/plugins/<id>/` 的瀏覽器腳本，並在主題入口登記 | `themes/<name>/theme.yml` 的外掛實例，加上 `config.yml` 的 `agentDiscovery.webmcp` | 瀏覽器腳本在頁面中登記工具；靜態產生器不會建立瀏覽器 endpoint |
| DNS-AID | 真實 agent endpoint、權威 DNS 區域和 DNSSEC | `config.yml` 的 `agentDiscovery.dnsAid` | 只在 Agent 中繼資料記錄已設定狀態；Pageskill 不寫入 SVCB、TXT、TLSA 或 DNSSEC |

先實作左側，再設定中間一欄，最後執行產生和線上驗證。只修改 `agentDiscovery` 不會憑空產生服務。

## 1. 沒有服務時保持預設關閉

目前網站沒有這些服務，所以保留以下關閉狀態：

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

普通 API 仍可登記在 `agentDiscovery.apiCatalog.entries`，但每個 `endpoint` 必須對應真實的 `router` 路由或外部服務。現在範例中的 `/api/health` 就由 `backend/handler.ts` 實際提供。

## 2. 接入驗證中繼資料

### 2.1 先保護資源路由

在 `backend/handler.ts` 註冊受保護路徑。Pageskill 的 `Router` 只負責路由，不內建 OAuth token 驗證；在 `backend/auth/` 接入你選擇的 OAuth/OIDC 函式庫，或把資源放在外部資源伺服器。

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

上面的 `verifyAccessToken` 是你要接入的 provider/library，不是 Pageskill 自動提供的函式。驗證失敗要保持 401/403 API 回應，不要讓靜態頁面接管；secret、JWKS 設定和伺服器驗證放在執行時環境，不放進 `config.yml` 或 `dist/public`。`WWW-Authenticate` 的 `resource_metadata` 用來指向真實的保護資源中繼資料，格式參見 [RFC 9728](https://www.rfc-editor.org/rfc/rfc9728)。

### 2.2 宣告實際的 resource 和 issuer

資源伺服器和 OAuth/OIDC issuer 都上線後，才在 `config.yml` 開啟：

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

`resource` 必須和真實資源伺服器使用的資源識別一致，`authorizationServer` 必須是實際 issuer。啟用時缺少這兩個值會讓產生失敗；只填一半的 authorization endpoint/token endpoint 不會產生半份授權伺服器中繼資料。

### 2.3 驗證整條鏈路

先在本機產生，再分別檢查中繼資料和受保護路由：

```powershell
npm run g -- --profile
Invoke-WebRequest https://api.example.com/.well-known/oauth-protected-resource
Invoke-WebRequest https://api.example.com/api/private -SkipHttpErrorCheck
```

沒有 token 時應得到 401 和 `WWW-Authenticate`；拿真實測試 token 時應得到資源回應。還要檢查中繼資料中的 `resource`、issuer、scope 與 verifier 的 audience、issuer、scope 完全相符。靜態網站只有在同時部署 backend 或使用外部資源伺服器時，才可以開啟這個開關。

## 3. 接入 MCP server card

### 3.1 先實作真實 MCP transport

MCP card 只是公開的入口和工具摘要。先在 `backend/mcp/` 接入所選 MCP SDK/transport，再由 `backend/handler.ts` 把同一路徑交給它：

```ts
// backend/handler.ts
import { handleMcpRequest } from './mcp/transport.ts';

// handleMcpRequest must be backed by a real MCP implementation. It is not a
// placeholder route: validate Origin, authentication, JSON-RPC, and tool input.
router.all('/api/mcp', ({ request, env, executionContext }) =>
  handleMcpRequest({ request, env, executionContext })
);
```

讓實際 MCP 服務按照所選版本支援它宣告的 HTTP transport、驗證和 `tools/list` / `tools/call` 行為；工具列表、名稱、描述和輸入 schema 不能只存在於 card。HTTP MCP 服務還要另外處理 Origin、認證、限流、輸入驗證和高風險操作的使用者確認。可從 [MCP server discovery](https://modelcontextprotocol.io/specification/draft/server/discover) 和 [MCP tools](https://modelcontextprotocol.io/specification/draft/server/tools) 核對目前協定要求。

如果 MCP 服務在別的網域，`backend/handler.ts` 不需要代理；`endpoint` 直接寫外部服務的 HTTPS URL，並讓外部服務自己承擔 transport 和驗證。

### 3.2 讓 card 與真實工具列表一致

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

產生器會保留工具的 `name`、`description` 和物件形 `inputSchema`，並寫入 `/.well-known/mcp/server-card.json`；它不會從 backend 猜測工具，也不會實作 MCP 呼叫。每次修改服務端工具時同步修改設定，然後執行：

```powershell
npm run g -- --profile
Get-Content dist\public\.well-known\mcp\server-card.json
Invoke-WebRequest https://api.example.com/mcp -Method Get -SkipHttpErrorCheck
npm run d -- --dry-run
```

用實際 MCP client/Inspector 再執行一次 `tools/list` 和一個無副作用的 `tools/call`，確認 card 的 endpoint、版本和 schema 與服務返回值一致。只有這些檢查通過後才保留 `enabled: true`。

## 4. 登記 WebMCP 瀏覽器工具

WebMCP 不是一個靜態 URL。它是在安全上下文中由頁面 JavaScript 呼叫 `document.modelContext.registerTool()`，把工具登記給瀏覽器 Agent。Pageskill 目前沒有內建 WebMCP 外掛；應按普通可重用主題外掛建立模組。

### 4.1 建立並登記主題外掛

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

在 `themes/default/plugins/index.ts` 匯出這個外掛，在 `themes/default/theme.yml` 設定實例：

```yaml
plugins:
  webTools:
    enabled: true
```

### 4.2 在瀏覽器模組中登記真實工具

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

使用 [WebMCP draft](https://webmachinelearning.github.io/webmcp/) 目前的 `document.modelContext` API，不要照搬舊的 `navigator.webmcp` 或未驗證的第三方全域物件。工具名、描述和 schema 要與執行邏輯一致；瀏覽器端驗證不能取代 backend 驗證，寫入、付款、刪除等 consequential action 必須在頁面提供明確確認，並在服務端再次驗證和校驗。

### 4.3 再開啟探索宣告

主題外掛實際載入並在目標瀏覽器中驗證後，才加：

```yaml
# config.yml: this advertises a real browser module; it does not load one.
agentDiscovery:
  webmcp:
    enabled: true
```

這只會讓產生的 Agent 中繼資料顯示 WebMCP 已設定；真正的工具來自主題腳本。執行 `npm run s` 後，在支援 WebMCP 的安全上下文檢查 `await document.modelContext.getTools()`，至少確認工具名稱、schema 和無副作用執行結果。瀏覽器不支援時應沒有登記錯誤，也不能影響普通頁面。

## 5. 發佈 DNS-AID

DNS-AID 的實作發生在權威 DNS 區域，不在 `config.yml` 或靜態產生器中。先部署實際 agent endpoint，再根據目前 DNS-AID/IETF draft 和 DNS 服務商能力發佈適用的 SVCB/TXT 記錄；需要 TLSA 時同時準備 DNSSEC。記錄內容必須由真實 endpoint、協定和憑證資料產生，不要複製一條示例記錄冒充上線。

發佈後先在站外驗證：

```powershell
# Replace the record name with the name actually published in your zone.
$agentRecord = '_support._mcp._agents.example.com'
Resolve-DnsName $agentRecord -Type SVCB
Resolve-DnsName $agentRecord -Type TXT
Resolve-DnsName '_443._tcp.support.example.com' -Type TLSA
Resolve-DnsName 'example.com' -Type DNSKEY
```

也可以使用帶 DNSSEC 驗證的 `dig +dnssec`，確認回應來自正確的權威區域、SVCB/TXT 指向可存取的真實服務、TLSA 與部署憑證相符，並確認 DNSSEC 鏈驗證成功。DNS-AID 目前是 IETF Internet-Draft；記錄類型、命名和安全要求以[最新 draft](https://www.ietf.org/archive/id/draft-mozleywilliams-dnsop-dnsaid-02.html)及你使用的發佈工具為準。

所有站外檢查通過後，才在 `config.yml` 寫：

```yaml
agentDiscovery:
  dnsAid:
    enabled: true
```

然後重新產生並檢查 `/.well-known/agent.json` 的 configured 狀態。Pageskill 不會呼叫 DNS provider、不建立記錄、不簽署 DNSSEC，也不會因為 `enabled: true` 就把不存在的 DNS 記錄寫進網站。

## 6. 統一驗證產生結果

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

預設關閉時，兩個條件 endpoint 檔案應不存在；開啟某項後，只能看到該項實際產生的檔案或 configured 狀態。最後檢查部署類型：靜態 Git/Pages 只發佈 `dist/public`，無法單獨承載 `backend/handler.ts`；驗證和 MCP 必須同時部署同源 backend，或改用已上線的外部服務。不要手動修改 `dist/`、`.pagekiln/` 或產生的 `.well-known` 檔案。

## 常見失敗

- 把 `enabled: true` 當作實作：先部署服務／外掛／DNS，再開宣告。
- 只產生 MCP card 沒有 MCP transport：card 是索引，不是 server。
- 只登記 WebMCP flag 沒有主題腳本：Agent metadata 會顯示設定，但瀏覽器不會出現工具；應關閉 flag 或完成外掛登記。
- 用示例網域、空 ID 或猜出來的 DNS record：產生前換成 provider／權威 DNS 返回的真實值。
- 靜態發佈後仍期待 `/api/private` 或 `/api/mcp` 工作：把 backend 和靜態快照放進同一個執行時，或設定外部 endpoint。

## 下一步

需要主題資源和瀏覽器程式碼時，繼續閱讀[開發一個可重用外掛](/zh-tw/posts/plugins/)；需要檢查同源 backend 和發佈邊界時，閱讀[把網站放到網路上](/zh-tw/posts/deploy/)。
