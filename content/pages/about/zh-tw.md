---
title: 關於 Pageskill
description: Pageskill 是一個用文章和設定建立網站的工具。
---

# 關於 Pageskill

Pageskill 把 Markdown 文章、網站設定和主題樣式產生成一個可發佈的網站。普通作者可以直接寫內容，不需要為每篇文章手寫 HTML。

## 先重用，再擴充

主題提供可重用的文章結構、樣式和 Block。先使用現有能力；只有確實缺少結構時，才做一次主題擴充，讓後續文章繼續使用。個人可以直接修改主題，也可以讓 Agent 按照目標協助。

基礎外掛的選項和本地化文案放在 `themes/<name>/theme.yml`，語言啟用和回退放在 `config.yml`。渲染器會從這些來源產生 Agent 探索資訊和 Markdown 鏡像，所以產生檔案只能用來檢查，不是需要維護的來源。

## 記住三個指令

| 指令 | 用途 |
| --- | --- |
| `npm run g` | 自動驗證並產生公開檔案。 |
| `npm run s` | 啟動持續預覽，按 `Ctrl+C` 停止。 |
| `npm run d` | 依照設定好的目標發佈。 |

目前首頁在 `content/pages/home/`；教學、部落格、產品文章和版本更新都在 `content/posts/`。為版本說明加上 `category: update`，就會進入[更新封存](/zh-tw/updates/)，同時不會混入一般文章列表。隱私政策是固定入口 `/:locale/privacy/`。先從[十分鐘開始你的網站](/zh-tw/posts/start/)開始。
