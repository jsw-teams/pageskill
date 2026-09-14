---
kind: page
title: 關於 Pageskill
description: Pageskill 是一個用文章和設定建立網站的工具。
---

# 關於 Pageskill

Pageskill 把 Markdown 文章、網站設定和主題樣式產生成一個可發佈的網站。普通作者可以直接寫內容，不需要為每篇文章手寫 HTML。

## 先重用，再擴充

主題提供可重用的 Component、樣式和內容契約。先使用現有能力；只有確實缺少能力時，才實作一個 Component，讓後續內容繼續重用。個人可以直接修改主題，也可以讓 Agent 按照目標協助。

基礎元件的選項和本地化文案放在 `theme.config` 指向的網站實例檔案（通常是 `site/theme.yml`），語言啟用和回退放在 `config.yml` 或其 extends 檔案。`themes/<name>/` 是可重用的實作程式碼目錄，不是網站實例設定目錄。渲染器會從這些來源產生 Agent 探索資訊和 Markdown 鏡像，所以產生檔案只能用來檢查，不是需要維護的來源。

## 記住兩個指令

| 指令 | 用途 |
| --- | --- |
| `page g` | 自動驗證並產生公開檔案。 |
| `page s` | 啟動持續預覽，按 `Ctrl+C` 停止。 |

目前首頁在 `content/pages/home/`；教學、部落格和產品文章位於 `content/posts/`，版本更新位於獨立的 `content/updates/` collection，直接進入[更新封存](/zh-tw/updates/)。它不再依賴一般文章的分類篩選。隱私政策是固定入口 `/:locale/privacy/`。先從[十分鐘開始你的網站](/zh-tw/posts/start/)開始。
