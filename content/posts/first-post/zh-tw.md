---
title: 發佈第一篇教學
description: 建立一個帶三種語言版本的 post 資料夾，並從首頁開啟它。
date: 2026-09-07
category: tutorial
---

# 發佈第一篇教學

教學、日誌、產品內容和版本更新都放在 `content/posts/`，每篇 post 都需要日期。明確寫 `category: tutorial` 才歸入教學；省略 `category` 時預設是 `uncategorized`（未分類）。為版本說明加上 `category: update`，這樣[更新封存](/zh-tw/updates/)會和一般 post 分開。固定的 About 或聯絡頁面放在 `content/pages/`，不需要 `date`；三種語言共用一個資料夾名稱，post 才能互相切換。

## 1. 建立 post 資料夾

下面的範例使用 `hello-site` 作為 post ID：

```powershell
New-Item -ItemType Directory content\posts\hello-site
```

在資料夾內分別建立 `zh-sg.md`、`zh-tw.md` 和 `en.md`。先寫繁體中文版本：

```markdown
---
title: 我的網站上線了
description: 記錄第一次發佈。
date: 2026-09-07
author: toewpq
cover: assets/og-default-product.webp
---

# 我的網站上線了

這是我的第一個 post，今天開始記錄這裡的內容。

## 下一步

我會繼續寫下新的嘗試。
```

其他語言只要翻譯標題、說明和正文，保留相同的 `date` 和資料夾名稱；post 集合會提供預設樣式。

`author` 是普通文字；省略它時，會使用 `config.yml` 對應語言的 `author`。`cover` 是可選的：把來源圖片放在 `content/assets/`，在 Frontmatter 寫公開路徑 `assets/<路徑>`（或 `/assets/<路徑>`）。儲存庫現有的 `assets/og-default-product.webp` 是目前的小熊圖片；產生後位於 `dist/public/assets/`。沒有 `cover` 的文章不會被強行加上同一張封面，危險 URL 協定也會被拒絕。

## 2. 產生並開啟

```powershell
npm run g
npm run s
```

開啟 `/zh-tw/posts/hello-site/`，再從文章內的語言連結查看另外兩個版本。

## 成功結果

首頁的 post 列表出現新內容，三種語言都能從 `/locale/posts/hello-site/` 進入，Feed 和搜尋也會收到它。

## 常見問題

不要為每種語言使用不同的資料夾名稱，也不要把 post 放到只能放目前頁面的路徑。一個 ID 加三個 locale 檔案，才會得到一組可切換的內容。

## 下一步

接著閱讀[我們如何構建外掛：以 Cookie 選擇器為例](/zh-tw/posts/cookies/)，學習完整的同意後載入外掛。
