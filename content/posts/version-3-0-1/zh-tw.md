---
title: 3.0.1 更新：文章元資料與更安全的發佈
description: 增加可選的文章作者和封面，保持日期彙整穩定，並遵循目前 npm 與 Cloudflare Pages 契約。
date: 2026-09-09
author: Site Owner
cover: assets/og-default-product.webp
---

# 3.0.1 更新：文章元資料與更安全的發佈

Pageskill 3.0.1 是 3.0 版本線上的修訂版。它繼續把原始碼儲存庫作為可以修改的網站，把公開快照放在 `dist/public`，也不會重寫舊文章的發佈日期。

## 這次改了什麼

- `config.yml` 繼續負責網站資料、導覽、collection schema、隱私/控制者資料、圖片和發佈設定。主題由 `theme.name` 選擇；精簡的 `themes/<name>/index.ts` 組裝模組自帶的版面、元件、外掛、樣式、腳本和 messages；外掛實例選項留在 `themes/<name>/theme.yml`。
- 增量建置讓 backend 和巢狀主題程式碼留在隔離的私有執行時中。公開 CSS 和 JavaScript 資源各自保留內容 hash，持續 `npm run s` 預覽仍透過 SSE 路徑重載。
- 文章按有效 ISO 發佈日期從新到舊排列；同日文章使用確定的 ID 次序，因此彙整、文章列表、Feed 和前後文章連結不會混淆新舊文章。現有日期保持原樣；不要為了把文章移到前面就把舊日期全部改成今天。

## 增加作者或封面

普通作者只要在 Markdown Frontmatter 填欄位，不需要寫 HTML。完整文章範例如下：

```markdown
---
title: 我的網站上線了
description: 記錄第一次發佈。
date: 2026-09-07
author: Site Owner
cover: assets/og-default-product.webp
---

# 我的網站上線了
```

`author` 是可選的普通文字。省略時，文章會使用 `config.yml` 中 `author` 對應語言的值；發佈前請把儲存庫裡明確可編輯的 `Site Owner` 換成真實的網站作者。`cover` 是可選的：把本地來源圖片放在 `content/assets/`，在 Frontmatter 寫 `assets/<路徑>`（或 `/assets/<路徑>`）；公開檔案會產生到 `dist/public/assets/<路徑>`。儲存庫現有的 `assets/og-default-product.webp` 是目前的小熊圖片。也可以使用 HTTPS 圖片 URL；危險協定和越界路徑會被拒絕。沒有封面的文章頁、文章列表和彙整不會顯示圖片，也不會被強行塞入統一預設圖。

頁面會把標題、Frontmatter 說明、發佈日期和作者分開顯示。若 Markdown 的 `#` 標題與 Frontmatter 標題相同，正文不會重複顯示；列表和彙整摘要使用說明欄位，不會從正文裡的程式碼或標題抽取摘要。

## Cloudflare Pages 契約

Cloudflare Pages Git 整合使用 `npm run g` 作為建置命令，輸出目錄填寫 `dist/public`。沒有 `npm run build` 相容別名。這條路徑只發佈靜態內容，絕不能發佈私有的 `dist/` 根目錄，因為那裡可能有 `_pagekiln/`、`server/`、`.pagekiln/` 和 `_worker.js`。

如果同一個 Pages 發佈必須包含 `backend/handler.ts`，就在 `config.yml` 設定 `cloudflare-pages` 目標，把 `CLOUDFLARE_API_TOKEN` 放在發佈環境，先執行 `npm run d -- --dry-run`，確認計畫後才執行 `npm run d`。CLI 會把 `dist/public`、產生的 `_worker.js` 和私有 `_pagekiln` 執行時暫存成 Pages 上傳套件。

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

本次 3.0.1 工作實際觀察到執行時/主題編譯、`npm run g` 產生 45 篇文件，本機預覽以 200 狀態提供首頁和本文，以及日期排序、同日穩定次序、元資料映射、三語作者標籤、封面載入、無封面回退、標題去重和危險封面 URL 拒絕等局部檢查。本次也執行了 `npm run d -- --dry-run`，因目前 checkout 沒有發佈目標而正確提示 `Set deployment.targets in config.yml` 並退出。不聲稱 npm 發佈、Cloudflare 部署或生產瀏覽器結果。

## 保持遷移最小

穩定頁面放在 `content/pages/<id>/<locale>.md`，帶日期的文章放在 `content/posts/<id>/<locale>.md`。使用同一個 ID 和對應的 `en`、`zh-sg`、`zh-tw` 檔案，讓發佈日期 `date` 保持一致，只為文章需要的欄位補 Frontmatter。新手路徑可以繼續閱讀[十分鐘開始你的網站](/zh-tw/posts/start/)和[把網站放到網路上](/zh-tw/posts/deploy/)。
