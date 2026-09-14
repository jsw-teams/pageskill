---
kind: release
title: '4.0.0：Component 負責行為，Content 負責內容'
description: '一次 breaking architecture release：Theme 擴充統一為 Component，並把網站內容與可重用實作徹底分開。'
date: 2026-09-14
---

# 4.0.0：Component 負責行為，Content 負責內容

Pageskill 4.0.0 是一次 breaking architecture release。現在 Theme 只有一個公開擴充概念，並遵循一條清楚的歸屬原則：

> Component owns behavior and presentation; Content owns content.

## 這次改變了什麼

- Built-in Component 和 External Component 是僅有的來源概念。`render`、`client`、`server`、`storage`、`cache`、`ai`、`integration` 表達一個 Component 需要的能力，不再建立 Plugin、Pattern、Layout 或 Module 等平行 API。
- Markdown、Frontmatter、Config 和 Runtime Data 負責讀者看到的文案、連結、文件、分類與品牌資料。Component defaults 只能保存行為與結構預設值，不能保存 Demo 記錄或網站正文。
- Component 支援 children、named slots、structured props 和 Runtime Data。穩定的組合與 Core content query 取代頁面專用 variant 和寫死的文章 ID。
- 普通文章使用 `kind: post`；release note 是真正的 `content/updates/` 集合並使用 `kind: release`。`updated` 只表示最後一次實質修改，`category` 仍然只是普通文章分類，歸檔類型明確分層。
- Comments 是可選 External Component；Comment Translation 是獨立的可選能力，使用平台無關 Server Function contract、L1 與持久化 Cache、source hash 和 single-flight 推理。
- Core 在沒有 Server 環境時仍可工作。Cloudflare Pages、D1、Workers AI 和 Cache API 只是一个 Reference Runtime Adapter，不是 Core 依賴。
- `page g` 和 `page s` 仍是僅有的公開指令。`page g` 產生帶多解析度截圖的私有無障礙報告，絕不把報告或 disclaimer 發佈到 `dist/public`。

## 遷移邊界

這不是相容版本。把 Theme TypeScript 和 Component messages 中的讀者內容移回 `content/` 或網站設定；把舊擴充註冊改成 `ComponentDefinition`，為文件設定 `kind`，只有真實實作 Runtime 時才設定 `runtime.adapter`。請閱讀[開發可重用 Component](/zh-tw/posts/components/)和[設定結構](/zh-tw/posts/site-settings/)了解目前寫法。

最直接的可重用性測試是：只更換網站名稱、首頁內容、導覽、文章、分類和 Runtime Data，不修改 Theme TypeScript；正確的 Component 應繼續產生新網站。
