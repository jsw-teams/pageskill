---
title: 發佈第一個頁面和產品筆記
description: 建立目前頁面和帶日期的文章，然後檢查、預覽並建置。
pattern: docs
---

# 發佈第一個頁面和產品筆記

頁面表示網站目前狀態，產品筆記表示帶日期的歷史。保持兩種職責分開，目前說明變更時不必改寫舊記錄。下面的例子是你在自己網站中建立的檔案，本教學不會把文章寫入 Pageskill 倉庫。

## 建立目前頁面

建立 `content/pages/welcome/zh-tw.md`：

```markdown
---
title: 歡迎
description: 這個 Pageskill 網站的第一個頁面。
pattern: document
---

# 歡迎

這個頁面說明網站今天提供什麼。

## 從這裡開始

返回[網站首頁](/zh-tw/)，並重用 `pageskill catalog` 報告的 Pattern 和 Block。只有你自己的網站已有 Guide 時，才把連結寫向 Guide。
```

按照 starter 的 collection 路由，這個頁面會變成 `/zh-tw/welcome/`。starter 使用 `document`，因為它的主題沒有完整預設主題提供的 `docs` Pattern。

## 建立帶日期的產品筆記

只有在記錄有日期的決定、實作、發佈、事件、部署或測量時，才建立 `content/posts/release-note/zh-tw.md`：

```markdown
---
title: 第一篇產品筆記
description: 記錄發生了什麼變化以及原因。
date: 2026-09-06
pattern: blog
---

# 第一篇產品筆記

這篇筆記記錄一次有日期的變化。未來的目前說明放在頁面或 Guide 中。
```

文章路由會變成 `/zh-tw/posts/release-note/`，`date` 是 `posts` collection schema 的必填欄位。不要為了通過驗證給目前頁面加上日期。

## 有計畫地新增翻譯

如果啟用了 `en`、`zh-sg` 或 `zh-tw`，為同一個 id 建立對應語言檔案，翻譯標題、描述和正文，並保持語義同步：

```text
content/pages/welcome/en.md
content/pages/welcome/zh-sg.md
content/pages/welcome/zh-tw.md
content/posts/release-note/en.md
content/posts/release-note/zh-sg.md
content/posts/release-note/zh-tw.md
```

## 檢查、預覽並建置

在網站根目錄執行：

```bash
pageskill inspect page:welcome
pageskill inspect collection:posts
pageskill check
pageskill build
pageskill s
```

預期結果是 check 成功，本機預覽出現新頁面和筆記，並在 `dist/` 產生對應路由。啟用封存和 Feed 時，產品筆記也會進入按日期排列的輸出。`pageskill s` 會持續執行；如果還要執行另一個 `pageskill build`，請另開終端機，或先按 Ctrl+C 停止預覽。

## 常見錯誤

- **產品筆記沒有 `date`：** 加入如 `2026-09-06` 的 ISO 日期。
- **文章放在 `content/pages/`：** 將帶日期歷史移到 `content/posts/<id>/<locale>.md`。
- **starter 頁面使用 `pattern: docs`：** 改為 `document`，或使用 `catalog` 確認提供 `docs` 的主題。
- **啟用三種語言卻只新增一種：** 新增對應語言檔案，或在翻譯完成前減少 `activeLocales`。
- **把頁面寫成 HTML：** 保持 Markdown 內容，並重用 Pattern 或 Block。

## 預期結果與下一步

現在你知道如何發佈目前資訊和帶日期的歷史，並保持兩者契約分開。繼續閱讀 [Cookie 同意](/zh-tw/guide/cookies/)安全設定可選腳本，或返回 [Guide](/zh-tw/guide/)。

[返回 Guide](/zh-tw/guide/) · [下一步：Cookie 同意](/zh-tw/guide/cookies/)
