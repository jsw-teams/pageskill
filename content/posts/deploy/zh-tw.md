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

執行 Pageskill 對外提供的兩個指令：

```powershell
page g
page s
```

產生步驟會驗證內容並執行無障礙審查；預覽步驟可以在交給代管商前檢查同一份輸出。

## 2. 為代管商設定靜態輸出

對於 Cloudflare Pages、GitHub Pages 等以 Git 為基礎的靜態代管，在代管商控制台設定從儲存庫建置：

```text
建置命令：page g
建置輸出目錄：dist/public
```

代管商會在建置時執行 Pageskill，而且只上傳 `dist/public`。不要使用私有的 `dist` 根目錄，因為其中還可能有 `_pageskill/`、`server/`、`.pageskill/`、Worker 檔案和其他產生的部署資料。

## 3. 選擇可選的 Runtime Adapter

靜態網站完全省略 `runtime`。如果網站需要官方 Cloudflare 參考執行時，才明確選擇它：

```yaml
runtime:
  adapter: cloudflare-pages
  backend: true
```

`runtime.adapter` 只選擇真實的適配器，不會讓網站設定取得保存 Provider token 的權限。憑證和 binding 放在代管商的 secret store 或環境變數中。Cloudflare Pages + Functions + D1 + Workers AI 只是參考實作，不是 Pageskill Core 依賴；其他平台要使用自己的 Runtime Adapter，實作相同的 Web 標準 Server Function、Storage、Cache 和 AI 契約。

## 4. 檢查產生結果

執行 `page g` 後，確認 `dist/public` 裡有首頁、多語言路由、資源、Feed、sitemap、`robots.txt` 和產生的探索檔案。選擇參考執行時後，公開快照旁邊可能有私有執行時資料；不要把它複製到公開目錄。

Agent Discovery、Agent Skills、API Catalog、Markdown mirror 和 `llms.txt` 都由渲染器產生。如果要設定 OAuth、MCP、WebMCP 或 DNS-AID，請先閱讀[設定條件式 Agent 能力](/zh-tw/posts/agent-discovery/)，實作真實服務、瀏覽器模組或 DNS 記錄；產生的中繼資料不會建立這些服務。

## 5. 發佈後驗證

使用代管商自己的建置日誌和預覽環境確認建置成功，然後從公開網域開啟本地化首頁、普通文章、帶更新資訊的文章和隱私頁面。如果啟用了 backend，呼叫文件中宣告的同源 API，確認驗證和錯誤回應仍是 API 回應，不會變成靜態 HTML。

## 常見問題

公開目錄是 `dist/public`，不是專案根目錄，也不是私有的 `dist` 根目錄。不要把 access token、SSH key 或 backend secret 寫入 YAML、Markdown 或公開產生檔案。如果代管商不能執行 `page g`，就在 CI 中建置，再透過代管商文件規定的方式上傳 `dist/public` 產物。

## 下一步

閱讀[隱私說明](/zh-tw/privacy/)，把 Cookie、資料收集和聯絡方法寫給訪客。
