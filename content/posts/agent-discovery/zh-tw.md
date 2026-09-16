---
kind: post
title: 依真實能力設定 Agent 探索
description: 先實作並驗證瀏覽器能力或外部服務，再發布與事實一致的探索資訊。
date: 2026-09-11
updated: 2026-09-16
category: tutorial
---

# 依真實能力設定 Agent 探索

Pageskill 依原始碼設定產生探索文件，但不會建立 OAuth 簽發方、MCP 伺服器、資料庫、模型服務、第三方供應商或 DNS 記錄。探索資訊是實作證據，不是實作本身。

## 1. 使用統一 Client Runtime 契約

Component 一律宣告 module 與 selector。只操作 DOM 或產生資源（例如本地搜尋索引）時省略 `client.api`；需要資料庫、模型、共享狀態、由私密憑證支援的操作或寫入時，宣告一個命名 `client.api`。

```ts
client: {
  module: 'components/agent-tools/script.js',
  selector: '[data-agent-tools]',
  api: 'agent-tools'
}
```

網站透過設定選擇服務，不修改 Component 程式碼：

```yaml
apis:
  agent-tools:
    url: https://api.example.com/v1/agent-tools/
    auth:
      type: bearer
      token: ${PUBLIC_RESTRICTED_AGENT_TOKEN}
```

瀏覽器模組只透過 `runtime.apiJson('health')` 呼叫相對路徑。URL 可以跨來源，但 Runtime 會阻止逃離已設定來源與路徑。設定 Token 是公開瀏覽器資料；私密憑證留在獨立部署的服務中。

本地搜尋不是 API。它用 `runtime.assetJson` 讀取產生的同站索引，不需要外部服務或 Cookie。

## 2. 沒有服務就保持關閉

```yaml
agentDiscovery:
  auth: { enabled: false }
  mcp: { enabled: false }
  webmcp: { enabled: false }
  dnsAid: { enabled: false }
```

沒有已部署公共服務時，空 API Catalog 才是正確結果。靜態網站不能發布範例 `/api/health` 路由。

OAuth 或 MCP 真正上線後才填寫真實絕對位址與中繼資料。MCP 卡片必須與服務實際 `tools/list` 一致；OAuth 的資源、簽發方、受眾、Scope 與端點必須與 Token 驗證一致。只有已載入 Component 確實註冊工具時，WebMCP 中繼資料才成立。DNS-AID 在權威區域驗證前仍只是建議。

## 3. 單獨管理第三方瀏覽器供應商

分析標籤、CAPTCHA、社交嵌入或供應商 SDK 必須使用根層 `integrations` 下的可信任 Provider Adapter，不能把任意 URL 寫進 Component 設定。啟用前要修訂每個 `content/pages/privacy/<locale>.md`：Frontmatter 的 `integrations` 陣列必須等於全部已啟用 Provider ID，正文還要說明真實供應商、目的、資料類別、保留來源、撤回方式與聯絡資訊。宣告缺漏或過期時產生會失敗。

## 4. 產生並驗證

```powershell
page g --profile
page c
page s
```

分別檢查 `.well-known/agent.json`、API Catalog、Agent Skills 與外部端點。產生檔案由渲染器擁有，應修正原始碼設定或實作，不要手動修改 `dist/public`。

新增或修改專案 Skill 前，閱讀 [Agent Skill 開發者規範](/zh-tw/posts/skill-development/)。
