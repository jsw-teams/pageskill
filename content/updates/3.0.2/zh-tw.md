---
title: 3.0.2 更新：更清楚的彙整與響應式閱讀
description: 分開版本更新與教學，修正封面比例，並讓語言選擇頁和文章頁更容易瀏覽。
date: 2026-09-10
author: Site Owner
cover: assets/og-default-product.webp
---

# 3.0.2 更新：更清楚的彙整與響應式閱讀

Pageskill 3.0.2 把教學和版本歷史放進不同的集合，也收緊文章頁頭，為封面提供可預測的響應式容器，並讓語言選擇頁在出現推薦標籤時仍然整齊。

## 這次改了什麼

- 版本說明現在放在 `content/updates/<version>/<locale>.md`，使用 `/:locale/updates/<version>/` 路由。教學、日誌和產品記錄繼續放在 `content/posts/<id>/<locale>.md`。
- 更新日誌有獨立的 `/:locale/updates/` 索引、Feed、搜尋結果、語言連結、導覽入口和首頁欄目；教學文章彙整仍然是 `/:locale/posts/`。
- 文章標題、說明、發佈日期和作者組成緊湊的頁頭；封面和正文閱讀欄共用寬度，並使用穩定的 1200:630 容器。
- 彙整縮圖現在同時限制寬度和高度，不會把原圖的 `height` 屬性當成渲染像素高度，圖片保持 `object-fit: cover`，不會被拉伸。
- 語言卡片預留推薦標籤的行高，並使用固定行高；推薦語言不會把其中一張卡片撐高。小螢幕文章的目錄預設折疊。

## 內容放在哪裡

依照文件類型選擇集合：

```text
content/posts/<id>/<locale>.md        教學、文章和日誌
content/updates/<version>/<locale>.md 版本歷史和更新說明
```

現有的 3.0.0 和 3.0.1 說明已經移動，發佈日期、作者和封面中繼資料保持不變；本語言的新連結分別是 `/zh-tw/updates/3.0.0/` 和 `/zh-tw/updates/3.0.1/`。舊文章路徑不保留重複內容，也不設定跳轉。

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
