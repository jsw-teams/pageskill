---
kind: release
title: '3.0.2：更清楚的歸檔與響應式閱讀'
description: '關於 3.0 版本線中過濾更新、文章版面和響應式主題細節的歷史版本說明。'
date: 2026-09-10
---

# 3.0.2：更清楚的歸檔與響應式閱讀

這是一篇 3.0 版本線的歷史更新說明。目前網站寫法請以[4.0.0](/zh-tw/updates/4.0.0/)和[設定結構](/zh-tw/posts/site-settings/)為準；新網站不應從舊版本文章複製設定。

## 3.0.2 發佈了什麼

- 版本說明透過 post pipeline 和 `content/updates/ collection` 產生。篩選後的 `updates` collection 把版本說明與普通 post 分開，同時保留多語言歸檔、詳情、Feed、搜尋和語言連結。
- Post 分類來自 Markdown Frontmatter：`tutorial`、`update`，或省略後使用 `uncategorized`。
- 文章標題、簡介、發佈日期、作者和封面整理成緊湊的響應式版面。歸檔圖片使用有邊界的容器，手機目錄預設折疊。
- 主題增加了位於標準 Navigation 和 Footer 前後的結構化 Chrome 插槽。這些插槽只接受安全的結構化連結，不接受 HTML 或腳本。
- Discovery 檔案、API 中繼資料、Markdown 協商、Content-Signal 和條件 Agent 宣告都從目前原始碼產生，不再作為手工維護的快照。

## 目前說明

4.0.0 是目前 breaking architecture release。複製舊 checkout 的設定前，請先閱讀[4.0.0 更新說明](/zh-tw/updates/4.0.0/)。

`updates` view 是 post 的版本說明視圖，不等於 post Frontmatter 中可選的 `update` 欄位；後者表示某一篇文章最後一次被修改的時間。

## 下一步

目前流程請從[設定結構](/zh-tw/posts/site-settings/)和[設定 Integration 與隱私同意](/zh-tw/posts/cookies/)開始。
