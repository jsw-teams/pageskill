---
kind: post
title: 把網站放到網路上
description: 產生安全的公開快照，再交給負責發佈的代管商或 Git 工作流程。
date: 2026-09-07
category: tutorial
---

# 把網站放到網路上

Pageskill 負責產生網站，實際發佈由代管商或 Git 整合完成。公開快照位於 `dist/public`；backend 程式碼、私有執行時檔案和 secret 都留在這個靜態目錄之外。

## 1. 在本機產生和預覽

執行 Pageskill 對外提供的三個指令：

```powershell
page g
page c
page s
```

產生步驟會驗證內容並產生公開快照；在具備瀏覽器的環境中執行 `page c` 進行完整無障礙審查。預覽步驟可以在交給代管商前檢查同一份輸出。

## 2. 為代管商設定靜態輸出

對於 Cloudflare Pages、GitHub Pages 等以 Git 為基礎的靜態代管，在代管商控制台設定從儲存庫建置：

```text
建置命令：page g
建置輸出目錄：dist/public
```

代管商會在建置時執行 Pageskill，而且只上傳 `dist/public`。Pageskill 不產生 Worker 或 Server bundle。

## 3. 安全連接外部 API

Pageskill 永遠是靜態建置。先為每項外部服務設定根層命名 `apis` 項目，再把這個 id 寫入 Component 的可選 `client.api`：

```yaml
apis:
  comments:
    url: https://api.example.com/v1/comments
    token: public-client-token
    auth: bearer
```

```ts
client: { module: 'components/comments/script.js', selector: '[data-comments]', api: 'comments' }
```

API id 用來區分 comments、search、billing 等不同服務。Client Runtime 只允許相對請求留在設定的 origin 和基礎路徑內，並加入 Bearer 或 `x-api-key` Header。第三方 URL 必須透過 CORS 允許本站來源。靜態 JS 會取得 `token`，所以它是公開資料，只能使用受限、可撤銷的客戶端 Token。若憑證必須保密，就把 `url` 指向獨立代理、刪除 `token`，把上游 URL 與 secret 留在代理環境。資料庫和模型憑證始終只留在 API 環境。

## 4. 檢查產生結果

執行 `page g` 後，確認 `dist/public` 裡有首頁、多語言路由、資源、Feed、sitemap、`robots.txt` 和探索檔案。設定的公開 API URL 與客戶端 Token 可能出現在其中；私密憑證、資料庫設定、Worker 程式和無障礙報告絕不能出現。

Agent Discovery、Agent Skills、API Catalog、Markdown mirror 和 `llms.txt` 都由渲染器產生。如果要設定 OAuth、MCP、WebMCP 或 DNS-AID，請先閱讀[設定條件式 Agent 能力](/zh-tw/posts/agent-discovery/)，實作真實服務、瀏覽器模組或 DNS 記錄；產生的中繼資料不會建立這些服務。

## 5. 發佈後驗證

使用代管商自己的建置日誌和預覽環境確認建置成功，然後從公開網域開啟本地化首頁、普通文章、版本更新和隱私頁面。逐一檢查設定的 API id，驗證對應 URL 的 CORS、授權、路徑邊界與 JSON 錯誤回應。

## 常見問題

公開目錄是 `dist/public`，不是專案根目錄，也不是私有的 `dist` 根目錄。不要把設定中的客戶端 Token 誤當 secret，任何人都能讀取它。私密 access token、SSH key 或 backend secret 絕不能寫入 YAML、Markdown 或公開產生檔案。

## 下一步

閱讀[隱私說明](/zh-tw/privacy/)，把 Cookie、資料收集和聯絡方法寫給訪客。
