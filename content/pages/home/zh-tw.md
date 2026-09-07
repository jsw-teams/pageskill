---
title: 重用結構，寫出可發佈的網站
description: 先發現 Pattern、Block 與 Schema，再用 Markdown、Frontmatter 和設定組合頁面；缺少能力時只需擴充主題一次。
pattern: landing
---

:::hero{tone="brand" align="left"}
*Pageskill 可重用內容編譯器*

# 發現一次，重用到每個頁面。

人可以直接重用現成的 Pattern、Block 與 Schema，不需要 Agent 參與；Agent 也可先用 `pageskill catalog` 和 `pageskill inspect` 查看能力與資源，再用 Markdown、Frontmatter 和 `config.yml` 組合頁面。Agent 和頁面作者都不必逐頁手寫 HTML；只有能力目錄沒有涵蓋需求時，才在主題中實作一次可重用擴充。

[依重用流程開始](/zh-tw/guide/) [查看擴充邊界](/zh-tw/development/)
:::

:::compiler-board
### 先發現能力
從 catalog 和 inspect 讀取主題提供的 Pattern、Block、Schema、外掛和資源依賴，先確認既有能力再開始寫頁面。

### 再組合內容
選擇合適的 Pattern 和 Block，填寫 Markdown、Frontmatter 與設定資料，讓編譯器產生多語言靜態頁面；同一結構可以在多個頁面重用。

### 只擴充缺口
發現沒有可重用能力時，複製主題並實作一次 Pattern 或 Block。擴充完成後回到 catalog、inspect、check 和 build 流程。
:::

:::feature-grid{columns="3"}
### 不必逐頁 HTML
頁面作者寫 Markdown、Frontmatter 和設定；Pattern 決定骨架，Block 提供可重用段落，Schema Data 保存結構化輸入。

### 靜態交付
編譯器產生多語言 HTML、資源、搜尋和部署檔案。普通頁面預設不需要 hydration；需要瀏覽器行為時才宣告對應資源。

### 目前與歷史
`content/pages/` 保存目前有效內容，`content/posts/` 保存帶必填日期的已發生變化；`docs` 仍是 pages 中的呈現 Pattern。
:::

## 從發現到發佈

| 步驟 | 做法 | 結果 |
| --- | --- | --- |
| 發現 | 執行 `pageskill catalog`，再用 `pageskill inspect pattern:<id>`、`block:<id>` 或 `collection:<id>` 查詢 | 確認可重用的 Pattern、Block 與 Schema |
| 組合 | 選擇結構並填寫 Markdown、Frontmatter 與 `config.yml` | 不寫逐頁 HTML 即得到頁面原始檔 |
| 驗證 | 執行 `pageskill check` 和 `pageskill g --profile` | 檢查 schema、路由、翻譯與靜態輸出 |
| 擴充 | 只有缺少能力時在複製的主題中實作一次，並重新 catalog/inspect | 新能力可被後續頁面重用 |

## 內容邊界仍然明確

| 需求 | 檔案入口 | 結果 |
| --- | --- | --- |
| 說明 Pageskill 現在如何運作 | `content/pages/<id>/<locale>.md` | 目前狀態頁面與語言路由 |
| 記錄某一天為何發生變更 | `content/posts/<id>/<locale>.md` | 有日期的產品筆記、彙整、Feed 和搜尋條目 |
| 以文件形式呈現目前頁面 | `content/pages/<id>/<locale>.md` 並使用 `pattern: docs` | docs 形式的 `pages` 頁面，不新增 collection |
| 調整結構與視覺 | `themes/default/theme.ts`、`theme.yml`、`style.css` | 主題級 Pattern、Block 和樣式 |
| 修改網站資訊或能力開關 | `config.yml` | 網站元資料、語言、路由和功能設定 |

## 預設就能重用的能力

Markdown 表格、摘要邊界、三語言回退、文章封面、網站地圖、RSS 訂閱清單、靜態搜尋、404、OG 圖和部署檔案都屬於現成能力。需要客製時，先看主題目錄和能力目錄，再決定是否要寫程式。

:::post-list{limit="3"}
:::

:::cta{href="/zh-tw/guide/"}
## 先重用訪客現在需要的結構

先 catalog/inspect，再選擇 Pattern、Block 和 Schema，填寫 `content/pages/` 的 Markdown；要為已完成變更記錄原因和結果時，放進 `content/posts/`。執行檢查和建置後，再讓主題決定它如何呈現。
:::
