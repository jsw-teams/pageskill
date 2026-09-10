---
title: 3.0 更新：更簡單的入口
description: Pageskill 3.0 把日常入口整理成 g、s、d，並把新手教學改成可以直接閱讀的文章。
date: 2026-09-07
category: update
author: toewpq
cover: assets/og-default-product.webp
---

# 3.0 更新：更簡單的入口

Pageskill 3.0 繼續用 Markdown、設定和主題產生網站，但第一次使用只要記住三個入口：產生 `g`、預覽 `s`、發佈 `d`。這是一次內容和工作流程的整理，版本仍然是 3.0.0。

## 這次改了什麼

- `npm run g` 自動驗證並產生公開快照。
- `npm run s` 啟動持續預覽；用 `Ctrl+C` 結束，編輯工作可以在另一個終端機繼續。
- `npm run d` 依照 `config.yml` 的發佈目標執行。
- 新網站從複製儲存庫開始，執行 `npm install` 和 `npm run g`，再直接修改這個目錄。
- 穩定頁面放在 `content/pages/`，不需要日期；教學、部落格、產品記錄和版本更新都放在 `content/posts/`，必須有 `date`；版本更新增加 `category: update`。
- 增加本地搜尋、文章目錄和可重用外掛開發的簡短三語文章。

## 從舊內容遷移

1. 保留備份，複製目前儲存庫，執行 `npm install` 和 `npm run g`，把教學入口改到[十分鐘開始你的網站](/zh-tw/posts/start/)。
2. 穩定頁面放在 `content/pages/<id>/<locale>.md`，不補日期；教學、部落格文章和版本更新放在 `content/posts/<id>/`，版本更新增加 `category: update`，並提供對應語言檔案和必填 `date`。
3. 把 Cookie 政策入口改為 `/:locale/privacy/`，再依照[隱私說明](/zh-tw/privacy/)補上真實聯絡人和服務。
4. 原始碼檢查執行各 compile 指令、`npm run g -- --profile` 和 `npm run s`；發佈檢查使用 `npm run d -- --dry-run`，準備好後才執行 `npm run d`。

## 給進階作者的發現入口

產生後可以閱讀 `dist/.pagekiln/catalog.json` 或 `dist/.well-known/agent.json`，了解主題和內容的可重用能力。Agent 整合可以呼叫內部 `getCatalog` 和 `inspect`，但新手只要先寫文章和設定，不必把發現檔案加入日常步驟。

頁面和同源 API 仍然分開：公開靜態檔案在 `dist/public`，動態業務、寫入和秘密留在 `backend/handler.ts`。`config.yml` 保存網站和政策/控制者資料；`theme.name` 選擇主題，`themes/<name>/theme.yml` 保存經過 schema 校驗的外掛實例選項和開關。主題入口組裝可重用能力，每個外掛保留自己的實作資源。

使用現有的 `router.get(...)`、`router.post(...)` 或 `router.all(...)` 註冊任意 backend 路徑。執行時匹配成功回傳 `Response`，沒有匹配回傳 `null`，所以產生入口不需要在 `config.yml` 逐條列出 `dynamicRoutes`。產生的 Worker/Pages/VPS 入口對所有路徑先執行 Router，並設定 `run_worker_first = true`；未知路徑再交給公開靜態資源，未匹配的 `/api` 路徑保持 404。API 錯誤和鑑權回應保持 API 回應，不回退為靜態頁面。建置/產生會把伺服器端巢狀 ESM 留在私有邊界內；持續執行 `npm run s` 時，巢狀主題 TypeScript 變更會先編譯到隔離的新私有執行時再重載，每個公開 CSS/JS 資源獨立使用內容 hash，未變動資源繼續保留 URL 和快取身分。

本次也修復了 Cookie 提示和頁尾版面；語言選擇頁優先採用訪客手動選擇，再回退到瀏覽器語言，語言 URL 保持不變。版本歷史使用 `category: update` 和獨立更新視圖，不再和教學文章爭奪列表位置。

## 新的學習入口

首頁用六隻小熊帶讀者經過[開始](/zh-tw/posts/start/)、[網站設定](/zh-tw/posts/site-settings/)、[Markdown](/zh-tw/posts/markdown/)、[第一篇文章](/zh-tw/posts/first-post/)、[Cookie 選擇](/zh-tw/posts/cookies/)和[更換樣式](/zh-tw/posts/customize/)。需要時繼續閱讀[搜尋](/zh-tw/posts/search/)、[文章目錄](/zh-tw/posts/toc/)和[外掛開發](/zh-tw/posts/plugins/)。

## 發佈前驗證

依照下面的步驟檢查自己的網站：

1. 執行 `npm run compile-runtime`、`npm run compile-theme` 和 `npm run compile-backend`。
2. 執行 `npm run g -- --profile`，檢查頁面、語言連結和公開檔案。
3. 執行 `npm run s`，開啟本機首頁、文章和 Cookie 設定，修改一個巢狀主題 TypeScript 模組確認會重載；按 `Ctrl+C` 停止預覽。
4. 執行 `npm run d -- --dry-run`；只有準備好發佈時才執行 `npm run d`。
