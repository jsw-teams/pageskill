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

## 這次改了什麼

- 版本說明現在放在 `content/posts/<version>/<locale>.md`，並在 Frontmatter 寫 `category: update`，使用 `/:locale/updates/<version>/` 路由。教學、日誌和產品記錄使用同一個 posts 集合，不寫這個分類。
- 更新日誌有獨立的 `/:locale/updates/` 索引、Feed、搜尋結果、語言連結、導覽入口和首頁欄目；教學文章彙整仍然是 `/:locale/posts/`。
- 文章標題、說明、發佈日期和作者組成緊湊的頁頭；封面和正文閱讀欄共用寬度，並使用穩定的 1200:630 容器。
- 彙整縮圖現在同時限制寬度和高度，不會把原圖的 `height` 屬性當成渲染像素高度，圖片保持 `object-fit: cover`，不會被拉伸。
- 語言卡片預留推薦標籤的行高，並使用固定行高；推薦語言不會把其中一張卡片撐高。小螢幕文章的目錄預設折疊。
- `config.yml` 現在發佈網站 URL `https://pageskill.openjsu.com`，網站作者為 `toewpq`；文章沒有明確 `author` 時會繼承這個值。根級 `i18n` 為只翻譯一部分的主題介面和缺少的語言文件提供回退，同時 `hreflang` 只列出實際存在的翻譯。
- Cookie 選擇器會明確顯示每個類別的提供者和保存期限，借鑑政策產生器的透明資訊，但訪客選擇器仍然和經過審核的法律政策頁面分開。

## 內容放在哪裡

依照文件類型選擇集合：

```text
content/posts/<id>/<locale>.md        教學、文章、日誌和版本更新
                                      （版本更新增加 `category: update`）
```

現有的 3.0.0 和 3.0.1 說明已改為 posts 路徑並增加 `category: update`，發佈日期、作者和封面中繼資料保持不變；本語言的連結仍然是 `/zh-tw/updates/3.0.0/` 和 `/zh-tw/updates/3.0.1/`，由更新視圖提供，不保留重複內容。

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
