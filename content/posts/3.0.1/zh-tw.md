---
title: 3.0.1 更新：文章元資料與更安全的發佈
description: 增加可選的文章元資料，保持日期彙整穩定，並保護公開與私有發佈邊界。
date: 2026-09-09
category: update
author: toewpq
cover: assets/og-default-product.webp
---

# 3.0.1 更新：文章元資料與更安全的發佈

Pageskill 3.0.1 是 3.0 版本線上的修訂版。它保留現有發佈日期，讓文章元資料按需使用，並把可見功能和發佈安全邊界分開說明。

## 功能特性

- 文章使用有效的 ISO 發佈日期排序；同日文章使用確定的 ID 次序，因此彙整、文章列表、Feed 和前後文章連結保持穩定。介面把日期和關係標籤與文章標題分開顯示，不會把關係說明拼接到標題旁。
- 文章可以在 Markdown Frontmatter 中選擇填寫 `author`，封面可以選擇填寫 `cover`。省略作者時會沿用對應語言的網站作者；封面可以是本地資源或 HTTPS URL，省略封面則保持不顯示，不會強行套用預設圖片。
- 文章頁首把標題、Frontmatter 說明、發佈日期和作者分開顯示。正文中與 Frontmatter 相同的 Markdown `#` 標題不會重複顯示，列表和彙整摘要使用說明欄位，不會從正文程式碼或標題中抽取。

## 安全與發佈特性

- 增量建置讓 backend 和巢狀主題程式碼留在隔離的私有執行時中。公開 CSS 和 JavaScript 資源各自保留內容 hash，持續 `npm run s` 預覽仍透過 SSE 路徑重載。
- 靜態發佈只公開 `dist/public`。需要 backend 的發佈會把產生的 worker 和私有執行時留在發佈套件中，不會把整個建置目錄暴露出去。執行時先處理路由再回退靜態資源；未匹配的 `/api` 仍返回 404，API 錯誤和鑑權回應不會變成 HTML 頁面。
- 本地封面限制在資源目錄內，HTTPS 封面只接受允許的協定；危險協定和越界路徑會在成為連結或圖片來源前被拒絕。

## 相容文章用法

普通作者只要在 Markdown Frontmatter 填欄位，不需要寫 HTML。相容的文章範例如下：

```markdown
---
title: 我的網站上線了
description: 記錄第一次發佈。
date: 2026-09-07
author: toewpq
cover: assets/og-default-product.webp
---

# 我的網站上線了
```

`author` 是可選的普通文字。省略時，文章會沿用對應語言的網站作者，因此舊文章不必批次修改。`cover` 是可選的：把本地來源圖片放在 `content/assets/`，在 Frontmatter 寫 `assets/<路徑>`（或 `/assets/<路徑>`）；公開檔案會產生到 `dist/public/assets/<路徑>`。也可以使用 HTTPS 圖片 URL。沒有封面的文章頁、文章列表和彙整不會顯示圖片，也不會被強行套用統一預設圖。

靜態 Git 整合使用 `npm run g` 並發佈 `dist/public`。同一次發佈需要 backend 時，先執行 `npm run d -- --dry-run`，確認目標和計畫正確後才執行 `npm run d`；不要發佈私有的 `dist/` 根目錄。

## 相容遷移

1. 現有帶日期文章可以繼續使用。保留原來的 ISO `date`；`author` 和 `cover` 都是可選欄位，不需要批次補 Frontmatter。
2. 已有 `author` 就繼續保留普通文字；沒有作者就讓網站作者回退生效。封面請改為 `content/assets/` 下的本地路徑或 HTTPS URL；危險協定、越界路徑無法相容時，直接移除 `cover` 即可。
3. 已退休的 `npm run build` 別名請改用 `npm run g`。持續預覽使用 `npm run s`，真正發佈前使用 `npm run d -- --dry-run`；靜態代管接收 `dist/public`，包含 backend 的發佈使用發佈命令正確暫存私有執行時。
4. 保留現有 `/:locale/posts/<id>/` 文章連結。元資料欄位是向後相容的增量，不會改變文章 ID 或路由。

## 已移除項目與替代方案

- `npm run build` 別名不再支援。原因是減少含義重複的建置入口；替代用法是 `npm run g`，它會驗證並產生公開快照。
- 不再支援發佈整個 `dist/` 目錄，因為其中可能包含私有執行時資料。靜態發佈使用 `dist/public`，需要 backend 時使用 `npm run d` 產生發佈套件。
- 沒有移除文章元資料能力。沒有 `author` 或 `cover` 的舊文章仍按作者回退和無封面行為正常顯示。

## 發佈前驗證

執行專案支援的檢查：

```powershell
npm run compile-runtime
npm run compile-theme
npm run compile-backend
npm run g
npm run g -- --profile
npm run s
npm run d -- --dry-run
```

本次 3.0.1 工作實際觀察到執行時/主題編譯、`npm run g` 產生 45 篇文件，本機預覽以 200 狀態提供首頁和本文，以及日期排序、同日穩定次序、元資料映射、三語作者標籤、封面載入、無封面回退、標題去重和危險封面 URL 拒絕等局部檢查。本次也執行了 `npm run d -- --dry-run`，因目前 checkout 沒有發佈目標而正確拒絕並退出。不聲稱 npm 發佈、Cloudflare 部署或生產瀏覽器結果。

## 繼續閱讀

穩定頁面放在 `content/pages/<id>/<locale>.md`，帶日期的教學、文章和版本更新都在 `content/posts/<id>/<locale>.md`；版本更新增加 `category: update`。使用同一個 ID 和對應的 `en`、`zh-sg`、`zh-tw` 檔案，讓發佈日期 `date` 保持一致，只為文件需要的欄位補 Frontmatter。新手路徑可以繼續閱讀[十分鐘開始你的網站](/zh-tw/posts/start/)和[把網站放到網路上](/zh-tw/posts/deploy/)。
