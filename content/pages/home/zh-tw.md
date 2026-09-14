---
kind: page
title: Pageskill：用 Markdown 建立內容網站
description: 用 Markdown、YAML 和可重用主題建立清楚的多語言內容網站。
component: page
---

:::hero{tone="brand" align="left"}
*Pageskill · 用 Markdown 搭站*

# 用 Markdown 和 YAML 建立內容網站

Pageskill 把 Markdown 內容和少量 YAML 網站資料編譯成多語言網站。可重用主題負責版面和元件，動態 API 則保持在清楚的同源邊界之後。

[開始使用](/zh-tw/posts/start/) [GitHub](https://github.com/jsw-teams/pageskill)
:::

普通作者只需要撰寫 Markdown，需要時修改 `config.yml` 和 `site/theme.yml`，再產生網站。只有網站需要真正新增能力時，才修改主題或 backend 程式碼。

## Pageskill 組合了什麼

| 內容 | 主題 | 多語言 | 發現能力 | 部署 |
| --- | --- | --- | --- | --- |
| Markdown 頁面和文章 | 可重用 Component | `zh-sg`、`zh-tw`、`en` | 搜尋、Feed、Agent 中繼資料 | 靜態輸出和可選 Runtime API |

下面的教學會展示這個預覽站實際使用的原始檔案。

:::learning-path
### [開始](/zh-tw/posts/start/)
複製原始碼儲存庫，執行 `npm install` 和 `page g`，再直接修改第一個首頁。

### [網站設定](/zh-tw/posts/site-settings/)
修改網站名稱、語言和導覽；設定檔只放資料，不放程式碼。

### [Markdown](/zh-tw/posts/markdown/)
用標題、段落、清單和程式碼圍欄寫文章，先做出最小頁面。

### [第一篇教學](/zh-tw/posts/first-post/)
在 `content/posts/` 新增帶日期的 post，可選擇 taxonomy 分類，產生後從 post 列表開啟它。

### [我們如何構建元件](/zh-tw/posts/components/)
學習一個可重用元件如何擁有自己的資源、安全渲染和本地化文案；Consent 元件是更進階的參考實作。

### [更換樣式](/zh-tw/posts/customize/)
先重用主題已有能力；需要新結構時實作一次，讓之後的頁面繼續使用。
:::

需要接入真實的驗證、MCP、WebMCP 或 DNS-AID 時，閱讀[設定條件式 Agent 能力](/zh-tw/posts/agent-discovery/)，依照 backend、主題元件和外部 DNS 的實際邊界逐項實作。

## 只要記住兩個指令

| 指令 | 用途 |
| --- | --- |
| `page g` | 自動驗證並產生公開靜態檔案到 `dist/public`。 |
| `page s` | 啟動持續預覽；按 `Ctrl+C` 停止，也可以在另一個終端機繼續編輯。 |

:::post-list{limit="6"}
:::

:::post-list{collection="updates" limit="3"}
:::

:::cta{href="/zh-tw/posts/start/" label="開始閱讀"}
## 現在就開始

先完成 [十分鐘開始你的網站](/zh-tw/posts/start/)，再依序閱讀網站設定、Markdown 和第一個 post。每篇教學都提供最小範例、成功結果和一個常見問題。
:::
