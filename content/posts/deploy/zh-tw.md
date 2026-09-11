---
title: 把網站放到網路上
description: 設定一個發佈目標，產生公開快照，並保持同源 API 與私有程式碼隔離。
date: 2026-09-07
category: tutorial
---

# 把網站放到網路上

發佈前先確認網站在本機可以開啟。Pageskill 的公開快照位於 `dist/public`；`backend/handler.ts` 和執行時秘密留在伺服器，動態請求由同源 API 處理。

## 1. 填寫發佈目標

在網站根目錄的 `config.yml` 填入實際使用的目標。下面以既有 Git remote 發佈為例：

```yaml
deployment:
  targets:
    - github
  github:
    remote: origin
    branch: gh-pages
```

Token 或 SSH 金鑰放在本機環境和金鑰檔案，不要寫進 `config.yml`、文章或公開目錄。

## 2. 設定 Cloudflare Pages Git 整合（僅靜態）

如果 Cloudflare Pages 從 Git 建置這個專案，在專案根目錄的控制台使用以下值：

```text
建置命令：npm run g
建置輸出目錄：dist/public
```

`npm run build` 不是 Pageskill 指令，不要為了相容控制台而新增別名。`dist/public` 是公開快照，裡面只有產生頁面、資源、Feed 和網站地圖。不要把輸出目錄設成 `dist`；私有建置根目錄還可能包含 `_pagekiln/`、`server/`、`.pagekiln/`、`_worker.js` 和其他部署檔案，直接發佈整個 `dist/` 可能暴露 backend 程式碼或私有執行時檔案。

這條 Git 整合路徑只發佈靜態內容，不會自動把 `backend/handler.ts` 打包成同一個 Pages Worker。如果網站不需要執行時 API，可以按需設定 `deployment.backend: false`；輸出目錄仍必須是 `dist/public`。

## 3. 先產生公開檔案

```powershell
npm run g
```

查看 `dist/public`，確認首頁、文章、資源和網站地圖都在裡面。需要 API 的網站還要準備同一個服務的後端執行時。

渲染器還會根據 `config.yml` 和實際寫出的輸出產生 Agent 探索資訊：`/.well-known/agent.json`、`/.well-known/ai-catalog.json`、條件產生的 API catalog、Agent Skills 索引、`robots.txt` 和 `llms.txt`。不要手工新增這些檔案。啟用 Markdown mirror 時，頁面會協商 `Accept: text/markdown`。

如果需要驗證中繼資料、MCP card、WebMCP 或 DNS-AID，先閱讀[設定條件式 Agent 能力](/zh-tw/posts/agent-discovery/)：受保護路由和 issuer 放在 backend／外部服務，MCP card 的 endpoint 和工具必須對應真實 transport，WebMCP 必須由主題瀏覽器模組呼叫 `document.modelContext.registerTool()`，DNS-AID 必須由權威 DNS 發佈並驗證 DNSSEC。完成這些實作和線上檢查後，才在 `config.yml` 開啟對應開關；靜態產生器只產生宣告，不會建立 endpoint 或發佈 DNS。

## 4. 先查看發佈計畫

先執行安全檢查：

```powershell
npm run d -- --dry-run
```

查看目標和來源檔案路徑；這個指令不會上傳檔案。

## 5. 準備好後發佈

```powershell
npm run d
```

只有目標準備好時才執行 `npm run d`。Pageskill 會依照 `deployment.targets` 執行目標。發佈後從目標網域開啟首頁和一篇文章，再呼叫你自己的同源 API 路徑確認伺服器邊界。

如果 Pages 專案必須在同一次部署中包含 backend，不要把 Git 整合的輸出目錄改成 `dist`。請設定 CLI 目標，讓 `npm run d` 負責打包：

```yaml
deployment:
  targets:
    - cloudflare-pages
  backend: true
  cloudflare:
    apiTokenEnv: CLOUDFLARE_API_TOKEN
    pages:
      project: your-pages-project
```

把 `CLOUDFLARE_API_TOKEN` 放在部署環境中，然後先執行 `npm run d -- --dry-run`，確認結果後再執行 `npm run d`。CLI 會產生 `dist`，把公開目錄複製到暫存的 `.pagekiln/pages-upload-*`，再把產生的 `_worker.js` 和私有 `_pagekiln` 執行時放進這個上傳目錄。Pages 上傳的是這個暫存目錄，而不是私有的 `dist/` 根目錄，因此 backend 和公開資源可以一起工作，又不會把私有建置檔案當成靜態資源。現有 Git 整合不會自動執行這一步；把控制台輸出目錄改成 `dist` 不是安全的解決方法。

## 成功結果

靜態 Git 整合接收 `dist/public` 並開啟產生頁面；CLI Pages 目標接收上面所述的過濾後 Worker 包，私有 Worker、server 檔案和秘密不會進入公開快照。

## 常見問題

`targets: []` 或 remote、branch 不符合時，發佈沒有可執行的目標。先檢查 `config.yml`，也不要把完整專案根目錄直接當成靜態網站根目錄。

## 下一步

閱讀[隱私說明](/zh-tw/privacy/)，把 Cookie、資料收集和聯絡方法寫給訪客。
