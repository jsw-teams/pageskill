---
title: 發佈第一篇文章
description: 建立一個帶三種語言版本的文章資料夾，並從首頁開啟它。
date: 2026-09-07
---

# 發佈第一篇文章

普通教學、日誌和產品記錄都可以放在 `content/posts/`，這類文章需要日期。固定的 About 或聯絡頁面放在 `content/pages/`，不需要 `date`；三種語言共用一個資料夾名稱，文章才能互相切換。

## 1. 建立文章資料夾

下面的範例使用 `hello-site` 作為文章 ID：

```powershell
New-Item -ItemType Directory content\posts\hello-site
```

在資料夾內分別建立 `zh-sg.md`、`zh-tw.md` 和 `en.md`。先寫繁體中文版本：

```markdown
---
title: 我的網站上線了
description: 記錄第一次發佈。
date: 2026-09-07
author: Site Owner
cover: assets/og-default-product.webp
---

# 我的網站上線了

這是我的第一篇文章，今天開始記錄這裡的內容。

## 下一步

我會繼續寫下新的嘗試。
```

其他語言只要翻譯標題、說明和正文，保留相同的 `date` 和資料夾名稱；文章集合會提供預設樣式。

`author` 是普通文字；省略它時，會使用 `config.yml` 對應語言的 `author`。`cover` 是可選的：把來源圖片放在 `content/assets/`，在 Frontmatter 寫公開路徑 `assets/<路徑>`（或 `/assets/<路徑>`）。儲存庫現有的 `assets/og-default-product.webp` 是目前的小熊圖片；產生後位於 `dist/public/assets/`。沒有 `cover` 的文章不會被強行加上同一張封面，危險 URL 協定也會被拒絕。

## 2. 產生並開啟

```powershell
npm run g
npm run s
```

開啟 `/zh-tw/posts/hello-site/`，再從文章內的語言連結查看另外兩個版本。

## 成功結果

首頁的文章列表出現新文章，三種語言都能從 `/locale/posts/hello-site/` 進入，Feed 和搜尋也會收到它。

## 常見問題

不要為每種語言使用不同的資料夾名稱，也不要把文章放到只能放目前頁面的路徑。一個 ID 加三個 locale 檔案，才會得到一組可切換的文章。

## 下一步

接著閱讀 [Cookie 選擇：先問訪客再載入](/zh-tw/posts/cookies/)，為可選服務設定預設關閉的選擇。
