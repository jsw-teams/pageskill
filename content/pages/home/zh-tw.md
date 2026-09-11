---
title: 發佈第一篇教學，搭好你的網站
description: 用三個指令預覽、產生並發佈一個適合教學內容的網站。
pattern: landing
---

:::hero{tone="brand" align="left"}
*Pageskill 3.0.2 · 用教學搭站*

# 發佈第一篇教學，搭好你的網站

Pageskill 把 Markdown post、網站設定和樣式組合成一個網站。你可以先複製儲存庫、在原目錄產生，再依照自己的內容修改；需要動態功能時，頁面和同源 API 仍然各自保持清楚的邊界。

[十分鐘開始](/zh-tw/posts/start/) [查看全部教學](/zh-tw/posts/)
:::

:::learning-path
### [開始](/zh-tw/posts/start/)
複製原始碼儲存庫，執行 `npm install` 和 `npm run g`，再直接修改第一個首頁。

### [網站設定](/zh-tw/posts/site-settings/)
修改網站名稱、語言和導覽；設定檔只放資料，不放程式碼。

### [Markdown](/zh-tw/posts/markdown/)
用標題、段落、清單和程式碼圍欄寫文章，先做出最小頁面。

### [第一篇教學](/zh-tw/posts/first-post/)
在 `content/posts/` 新增帶日期的 post，選擇 Frontmatter 分類，產生後從 post 列表開啟它。

### [我們如何構建外掛](/zh-tw/posts/cookies/)
以 Cookie 選擇器為參考，學習模組資源、安全渲染、部分翻譯和同意後載入腳本。

### [更換樣式](/zh-tw/posts/customize/)
先重用主題已有能力；需要新結構時實作一次，讓之後的頁面繼續使用。
:::

需要接入真實的驗證、MCP、WebMCP 或 DNS-AID 時，閱讀[設定條件式 Agent 能力](/zh-tw/posts/agent-discovery/)，依照 backend、主題外掛和外部 DNS 的實際邊界逐項實作。

## 只要記住三個指令

| 指令 | 用途 |
| --- | --- |
| `npm run g` | 自動驗證並產生公開靜態檔案到 `dist/public`。 |
| `npm run s` | 啟動持續預覽；按 `Ctrl+C` 停止，也可以在另一個終端機繼續編輯。 |
| `npm run d` | 依照 `config.yml` 中的目標發佈網站。 |

:::post-list{limit="6"}
:::

:::post-list{collection="updates" limit="3"}
:::

:::cta{href="/zh-tw/posts/start/"}
## 現在就開始

先完成 [十分鐘開始你的網站](/zh-tw/posts/start/)，再依序閱讀網站設定、Markdown 和第一個 post。每篇教學都提供最小範例、成功結果和一個常見問題。
:::
