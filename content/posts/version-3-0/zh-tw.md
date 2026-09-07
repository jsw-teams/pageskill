---
title: 3.0 更新：更簡單的入口
description: Pageskill 3.0 把日常入口整理成 g、s、d，並把新手教學改成可以直接閱讀的文章。
date: 2026-09-07
---

# 3.0 更新：更簡單的入口

Pageskill 3.0 繼續用 Markdown、設定和主題產生網站，但第一次使用只要記住三個入口：產生 `g`、預覽 `s`、發佈 `d`。這是一次內容和工作流程的整理，版本仍然是 3.0.0。

## 這次改了什麼

- `pageskill g` 自動驗證並產生公開快照。
- `pageskill s` 啟動持續預覽；用 `Ctrl+C` 結束，編輯工作可以在另一個終端機繼續。
- `pageskill d` 依照 `config.yml` 的發佈目標執行。
- 新網站從原始碼儲存庫複製 `starter`，不再依賴初始化精靈。
- 教學、部落格和產品記錄統一放在 `content/posts/`，每篇文章保留必填 `date`。
- 目前有效的 `content/pages/` 保留三語首頁、About 和隱私政策；舊 guide、development 等冗長說明資料夾已從目前內容樹移除，歷史留在 Git 和更新日誌。

## 從舊內容遷移

1. 保留原始碼儲存庫和網站備份，把教學入口改到[十分鐘開始你的網站](/zh-tw/posts/start/)。
2. 把自己的教學或部落格放進 `content/posts/<id>/`，為 `zh-sg`、`zh-tw`、`en` 準備同義檔案和 `date`。
3. 把 Cookie 政策入口改為 `/:locale/privacy/`，再依照[隱私說明](/zh-tw/privacy/)補上真實聯絡人和服務。
4. 在網站資料夾執行 `pageskill g`、`pageskill s` 和 `pageskill d --dry-run`，按目標環境檢查產生、預覽和發佈計畫；真正發佈時才執行 `pageskill d`。

## 給進階作者的發現入口

產生後可以閱讀 `dist/.pagekiln/catalog.json` 或 `dist/.well-known/agent.json`，了解主題和內容的可重用能力。Agent 整合可以呼叫內部 `getCatalog` 和 `inspect`，但新手只要先寫文章和設定，不必把發現檔案加入日常步驟。

頁面和同源 API 仍然分開：公開靜態檔案在 `dist/public`，動態業務、寫入和秘密留在 `backend/handler.ts`。`config.yml` 只放資料和開關；可選 Cookie 腳本預設關閉，受信任的 `gatedScripts` 只在 `theme.yml` 管理。

本次也修復了 Cookie 提示和頁尾版面；語言選擇頁優先採用訪客手動選擇，再回退到瀏覽器語言，語言 URL 保持不變。

## 新的學習入口

首頁用六隻小熊帶讀者經過[開始](/zh-tw/posts/start/)、[網站設定](/zh-tw/posts/site-settings/)、[Markdown](/zh-tw/posts/markdown/)、[第一篇文章](/zh-tw/posts/first-post/)、[Cookie 選擇](/zh-tw/posts/cookies/)和[更換樣式](/zh-tw/posts/customize/)。個人可以直接操作主題；需要共享能力時實作一次即可重用。

## 發佈前驗證

依照下面的步驟檢查自己的網站：

1. 執行 `pageskill g`，確認文章、語言連結和公開檔案產生成功。
2. 執行 `pageskill s`，開啟本機首頁、文章和 Cookie 設定；按 `Ctrl+C` 停止預覽。
3. 執行 `pageskill d --dry-run`，確認目標、公開目錄和憑據來源；這個步驟不會真正上傳。
4. 只有準備好發佈時才執行 `pageskill d`，再從目標 URL 檢查頁面和同源 API。
