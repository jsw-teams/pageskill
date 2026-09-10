---
title: 3.0.2 更新：更清楚的彙整與響應式閱讀
description: 分開版本更新與教學，修正封面比例，並讓語言選擇頁和文章頁更容易瀏覽。
date: 2026-09-10
category: update
author: toewpq
cover: assets/og-default-product.webp
---

# 3.0.2 更新：更清楚的彙整與響應式閱讀

Pageskill 3.0.2 把教學和版本歷史放在同一個 post 集合中，再用 Frontmatter 分類和篩選視圖區分它們；同時收緊文章頁頭，為封面提供可預測的響應式容器，並讓語言選擇頁在出現推薦標籤時仍然整齊。

## 功能特性

- 版本說明使用一般 posts 流程並增加 `category: update`。更新視圖會把它們排除在一般 post 列表之外，同時保留 `/:locale/updates/<version>/` 公開路由、Feed、搜尋結果、語言連結、導覽入口和首頁欄目。
- post 分類現在來自 Markdown Frontmatter：`category: tutorial` 表示教學，`category: update` 表示版本說明，省略分類時會渲染並索引為 `uncategorized`（未分類），不會再從 pages collection 猜測。
- 文章標題、說明、發佈日期和作者組成緊湊頁頭；封面和正文閱讀欄使用穩定的 1200:630 比例，彙整縮圖使用獨立的 16:9 容器，不再繼承原圖的像素高度。
- 文章導覽標籤單獨佔行，不會再被誤認為連結標題的一部分。語言卡片預留推薦標籤行，小螢幕文章目錄預設折疊。
- 主題可以透過結構化的 `plugins.chrome` 選項，在標準導覽和頁尾工具前後增加連結。編譯器會解析語言路由、限制連結數量和長度、拒絕不安全或目錄穿越 URL，殼層會轉義標籤；不支援原始 HTML、腳本、CSS 或任意屬性。

## 安全與本地化特性

- 主題介面文案會從配置的回退語言合併缺少的鍵和帶 ID 的類別項目。缺少整篇語言文件時，可以在請求語言的路由提供回退文章；但 `hreflang` 只列出實際存在的翻譯。
- Cookie 選擇器逐類別顯示提供者和保存期限。可選類別預設關閉，受信任腳本必須在明確同意後載入，選擇器不會取代經過審核的隱私政策頁面。

## 相容用法與遷移

現有 3.0 網站可以遷移來源資料夾，同時保持更新文章的公開 URL：

1. 將 `content/updates/<version>/<locale>.md` 移到 `content/posts/<version>/<locale>.md`。
2. 保留原來的 ID、語言檔案、`date`、`author` 和 `cover`；每個版本說明的 Frontmatter 增加 `category: update`。
3. 繼續使用 `/zh-tw/updates/<version>/`、`/zh-sg/updates/<version>/` 或 `/en/updates/<version>/` 連結。更新視圖會提供這些路由，不需要建立 redirect 影子或複製文章；一般文章仍使用 `/:locale/posts/<id>/`。
4. 後續新增語言時，先把語言加入網站啟用語言列表，再按完成進度補 UI 和文章檔案。主題 UI 缺少的鍵從回退語言取得，整篇缺少的文章使用內容回退；已存在但只翻譯一部分的 Markdown 會按原文提供，Pageskill 不會靜默機器翻譯。
5. 如果舊主題檔案仍有獨立的 `plugins.language.enabled` 開關，請刪除這個重複開關；語言選擇功能仍然存在，並繼續按照網站的啟用語言和回退行為工作。
6. 教學明確增加 `category: tutorial`；不寫 `category` 的新 post 預設是 `uncategorized`（未分類）。既有主導覽保持相容，需要額外殼層連結時使用主題的結構化 `plugins.chrome` 插入點。
7. 執行 `npm run g -- --profile`，檢查一般 post/更新彙整和兩個 Feed，再在正式發佈前執行 `npm run d -- --dry-run`。

## 已移除項目與替代方案

- 已移除獨立的 `content/updates` 來源 collection；相容替代方式是 `content/posts` 加 `category: update`。公開更新路由和訪客看到的更新功能沒有移除。
- 沒有移除 Cookie 同意功能；借鑑政策產生器的提供者和保存期限只是展示中繼資料，法律文字仍維護在經過審核的隱私政策頁面。

## 發佈前驗證

先執行專案的常規檢查，再查看兩種響應式視圖：

```powershell
npm run compile-runtime
npm run compile-theme
npm run compile-backend
npm run g
npm run g -- --profile
npm run s
npm run d -- --dry-run
```

3.0.2 檢查已完成：`npm run g -- --profile` 通過 runtime、theme、backend 編譯並報告 48 篇源文件；56 個 HTML 內部 `href`/`src` 檢查沒有缺失引用；posts 和 updates Feed 分別有 10 條和 3 條且彼此隔離，舊 posts 路徑已刪除。1280px 桌面和 390px 手機檢查確認語言卡片均為 136px、彙整封面為 144x81、文章中繼資料對齊，手機目錄預設折疊且可點擊展開，頁面沒有橫向溢出；根語言頁匹配繁體中文瀏覽器偏好，品牌和隱私連結指向 `zh-tw`。`git diff --check` 通過。`npm run d -- --dry-run` 因未設定 `deployment.targets` 以退出碼 1 結束，因此不聲稱已部署或發佈 npm。

教學路徑請繼續閱讀[十分鐘開始你的網站](/zh-tw/posts/start/)，版本歷史請開啟[更新日誌彙整](/zh-tw/updates/)。
