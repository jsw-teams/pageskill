---
title: 3.0 更新：更簡單的入口
description: Pageskill 3.0 收攏日常入口、明確 post 分類，並說明安全邊界。
date: 2026-09-07
category: update
author: toewpq
cover: assets/og-default-product.webp
---

# 3.0 更新：更簡單的入口

Pageskill 3.0 繼續用 Markdown、設定和主題產生網站，但第一次使用只要記住三個入口：產生 `g`、預覽 `s`、發佈 `d`。這次發佈也明確了 post 分類和執行時邊界，版本仍然是 3.0.0。

## 功能特性

- 日常工作流程有三個清楚的指令：`npm run g` 驗證並產生，`npm run s` 持續執行本機預覽，`npm run d` 發佈已準備好的目標。新網站從複製儲存庫開始，執行 `npm install` 和 `npm run g`，再直接修改這個目錄。
- 穩定頁面放在 `content/pages/<id>/<locale>.md`，不需要日期；教學、部落格、產品記錄和版本更新放在 `content/posts/<id>/<locale>.md`，必須有 ISO `date`；明確寫 `category: tutorial` 才標為教學，省略分類預設為 `uncategorized`（未分類），版本更新使用 `category: update`，可以和教學分開篩選。
- 本地化新手路徑整理成開始、網站設定、Markdown、第一篇教學、Cookie 選擇器外掛構建、主題自訂、搜尋、內容目錄、外掛開發和發佈等短教學。主題能力可以撰寫一次後重用，不需要為每個頁面複製 HTML。
- 首頁學習路徑使用六張可重用的小熊插圖，並連結前六個步驟；本地搜尋、內容目錄和更新視圖提供獨立入口，不會把版本說明混進普通 post 列表。

## 安全與執行時特性

- 公開靜態檔案在 `dist/public`，動態業務、寫入和秘密留在 `backend/handler.ts`。Backend 路徑使用現有的 `router.get(...)`、`router.post(...)` 和 `router.all(...)` 註冊；匹配成功回傳 `Response`，沒有匹配回傳 `null`，作者不需要維護產生的路由清單。
- 產生的 Worker、Pages 和 VPS 入口先執行 Router，再回退靜態資源。未知路徑可以交給公開靜態資源，未匹配的 `/api` 保持 404；API 錯誤和鑑權回應保持 API 回應，不會變成靜態頁面。伺服器端巢狀 ESM 留在私有執行時邊界內。
- 持續 `npm run s` 預覽時，巢狀主題 TypeScript 會先編譯到隔離的新私有執行時再重載。每個公開 CSS/JS 資源獨立使用內容 hash，未變動資源繼續保留 URL 和快取身分。
- Cookie 選擇器保留可選類別預設關閉，並要求明確同意後才載入受信任腳本。語言選擇頁優先採用訪客手動選擇，再回退到瀏覽器語言，語言 URL 保持不變；撤回同意不能撤銷腳本已完成的工作。

## 相容用法與遷移

1. 複製儲存庫，執行 `npm install` 和 `npm run g`，之後直接在複製的網站目錄修改。預覽使用 `npm run s`，發佈前使用 `npm run d -- --dry-run` 檢查計畫，準備好後才執行 `npm run d`。
2. 穩定頁面放在 `content/pages/<id>/<locale>.md`，不補日期；教學、部落格文章、產品記錄和版本文章放在 `content/posts/<id>/<locale>.md`，補上必填的 ISO `date`，讓 `en`、`zh-sg`、`zh-tw` 共用同一個 ID 並保持日期一致。每個版本文章的翻譯都增加 `category: update`。
3. 如果舊版本文章仍在 `content/updates/<version>/`，把各語言檔案移到 `content/posts/<version>/` 並增加 `category: update`。更新視圖可用時保留公開更新連結；普通 post 繼續使用 `/:locale/posts/<id>/`。
4. Cookie 政策繼續指向 `/:locale/privacy/`，並在[隱私說明](/zh-tw/privacy/)中換成真實且經過審核的聯絡人和服務。保留現有同意儲存鍵，避免回訪者無故失去選擇。
5. 舊工作流程如果使用 `npm run build`，改用 `npm run g`；預覽和發佈分別使用 `npm run s`、`npm run d`。已移除的冗長 guide/development 頁面由學習路徑中的短文章取代。

## 已移除項目與替代方案

- `npm run build` 別名不再支援。原因是保留唯一且明確的產生指令；替代用法是 `npm run g`。
- 重複的冗長 guide、development 頁面和舊 prompt 筆記不再產生 redirect 影子。原因是重複來源可能漂移或顯示過期頁面；請使用學習路徑中的短文章，需要舊內容時從 Git 歷史查閱。
- 不再要求作者維護產生的 `dynamicRoutes` 路由清單。真實 backend 行為使用現有 Router 方法註冊；同源 API 能力沒有被刪除。
- 沒有移除 Cookie 同意或語言選擇功能。語言功能的相容用法是先採用訪客手動選擇，再按瀏覽器語言回退；政策替代入口是本地化隱私頁面。

## 給進階作者的發現入口

產生後可以閱讀 `dist/.pagekiln/catalog.json` 或 `dist/.well-known/agent.json`，了解主題和內容的可重用能力。Agent 整合可以呼叫內部 `getCatalog` 和 `inspect`，但新手只要先寫 post 和設定，不必把發現檔案加入日常步驟。

## 新的學習入口

首頁用六隻小熊帶讀者經過[開始](/zh-tw/posts/start/)、[網站設定](/zh-tw/posts/site-settings/)、[Markdown](/zh-tw/posts/markdown/)、[第一篇教學](/zh-tw/posts/first-post/)、[我們如何構建外掛](/zh-tw/posts/cookies/)和[更換樣式](/zh-tw/posts/customize/)。需要時繼續閱讀[搜尋](/zh-tw/posts/search/)、[內容目錄](/zh-tw/posts/toc/)和[外掛開發](/zh-tw/posts/plugins/)。

## 發佈前驗證

依照下面的步驟檢查自己的網站：

1. 執行 `npm run compile-runtime`、`npm run compile-theme` 和 `npm run compile-backend`。
2. 執行 `npm run g -- --profile`，檢查頁面、語言連結和公開檔案。
3. 執行 `npm run s`，開啟本機首頁、post 和 Cookie 設定，修改一個巢狀主題 TypeScript 模組確認會重載；按 `Ctrl+C` 停止預覽。
4. 執行 `npm run d -- --dry-run`；只有準備好發佈時才執行 `npm run d`。
