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
- Cookie 外掛現在由程式碼登記 provider 能力，並由 `themes/default/theme.yml` 負責 provider 實例。內建同意控制使用 canonical provider 陣列和真實網頁欄位：GA4 的 `measurementId`（`G-...`）、Google Ads 的 `tagId`（`AW-...`/`GT-...`）、Cloudflare Web Analytics 的 `token`、百度統計的 `siteSignature`、驗證碼的 `siteKey`，以及不需要帳戶 ID 的 X for Websites widget。額外 provider 欄位可以留給未來模組，但不會自行執行。
- Agent 探索資訊現在由渲染器根據目前設定和實際寫出的輸出產生。公開集合可以包含 `/.well-known/agent.json`、`/.well-known/ai-catalog.json`、設定的 RFC 9727 API catalog、Agent Skills 索引、`robots.txt` 和 `llms.txt`；共用 Fetch Router 會加入 RFC 8288 `Link`，用 `Vary: Accept` 協商 `Accept: text/markdown` 鏡像，並傳遞設定的 `Content-Signal`。發布的 Skill 會遍歷程式碼登記的能力表和設定段落，新增登記欄位時不需要再維護第二份輸出欄位清單。
- 基礎外掛的文案和選項屬於實例資料：`search`、`toc`、`privacyConsent` 和 `chrome` 可以在 `theme.yml` 依照程式碼擁有的 schema 調整。樣式現在有明確的新增、修改、刪除流程，透過所屬模組的資源登記完成，不需要修改產生 CSS 或為了日常調整去改 renderer。

## 安全與本地化特性

- 主題介面文案會從配置的回退語言合併缺少的鍵和帶 ID 的類別項目。缺少整篇語言文件時，可以在請求語言的路由提供回退文章；但 `hreflang` 只列出實際存在的翻譯。
- Cookie 選擇器逐類別顯示提供者和保存期限。可選類別預設關閉，受信任腳本必須在明確同意後載入，選擇器不會取代經過審核的隱私政策頁面。並非每個 provider 都會建立 Cookie；政策應按 provider 文件說明實際的 token、挑戰、請求或儲存行為。
- `config.yml` 繼續只保存網站政策／控制者資料：不會進入 `dist/public`，生成的 backend 也沒有寫入它的路由。provider secret 和驗證碼 token 驗證繼續放在伺服器端。
- 驗證元資料、MCP 卡片、WebMCP 登記和 DNS-AID 都是條件能力，不是預設開啟的輸出。只有真實的受保護服務、瀏覽器工具模組或外部發佈的 DNS/DNSSEC 記錄存在時才啟用；靜態渲染器不會偽造 endpoint，也不會發佈 DNS。

## 相容用法與遷移

現有 3.0 網站可以遷移來源資料夾，同時保持更新文章的公開 URL：

1. 將 `content/updates/<version>/<locale>.md` 移到 `content/posts/<version>/<locale>.md`。
2. 保留原來的 ID、語言檔案、`date`、`author` 和 `cover`；每個版本說明的 Frontmatter 增加 `category: update`。
3. 繼續使用 `/zh-tw/updates/<version>/`、`/zh-sg/updates/<version>/` 或 `/en/updates/<version>/` 連結。更新視圖會提供這些路由，不需要建立 redirect 影子或複製文章；一般文章仍使用 `/:locale/posts/<id>/`。
4. 後續新增語言時，先把語言加入網站啟用語言列表，再按完成進度補 UI 和文章檔案。主題 UI 缺少的鍵從回退語言取得，整篇缺少的文章使用內容回退；已存在但只翻譯一部分的 Markdown 會按原文提供，Pageskill 不會靜默機器翻譯。
5. 如果舊主題檔案仍有獨立的 `plugins.language.enabled` 開關，請刪除這個重複開關；語言選擇功能仍然存在，並繼續按照網站的啟用語言和回退行為工作。
6. 教學明確增加 `category: tutorial`；不寫 `category` 的新 post 預設是 `uncategorized`（未分類）。既有主導覽保持相容，需要額外殼層連結時使用主題的結構化 `plugins.chrome` 插入點。
7. 在 `themes/<name>/theme.yml` 以 Cookie 教學中的 canonical 陣列設定 provider 實例，保留可選類別預設關閉，並使用對應類別映射。遷移期間編譯器會把舊物件形 provider key 的 `conversionId` 映射為 Google Ads `tagId`、把 `siteId` 映射為百度 `siteSignature`；新檔案應使用 provider 自己的真實欄位。擴充 provider schema 欄位可以保留，但 provider 只有在程式碼登記模組且取得同意後才會執行。
8. 執行 `npm run g -- --profile`，檢查一般 post/更新彙整和兩個 Feed，再在正式發佈前執行 `npm run d -- --dry-run`。
9. 不要複製或手工修改產生的探索檔案。需要 API 項目、可選 ARD 查詢或條件驗證/MCP 中繼資料時，在 `config.yml` 設定後重新產生，讓渲染器和執行時回應標頭保持一致。
10. 新語言只完成部分翻譯時，只把已完成的外掛文案放在 `theme.yml` 的 `copy.<locale>`；缺少的介面 key 會回退，已存在的 Markdown 文件按原文顯示，整篇缺少時才使用內容回退。

## 已移除項目與替代方案

- 已移除獨立的 `content/updates` 來源 collection；相容替代方式是 `content/posts` 加 `category: update`。公開更新路由和訪客看到的更新功能沒有移除。
- 沒有移除 Cookie 同意功能；借鑑政策產生器的提供者和保存期限只是展示中繼資料，法律文字仍維護在經過審核的隱私政策頁面。canonical 陣列取代含義不清的物件鍵，同時為既有主題保留相容正規化。
- 手工維護的探索快照不是作者入口。相容替代是由渲染器產生探索檔案和執行時回應標頭，避免第二套清單與實際路由漂移。OAuth、MCP、WebMCP 和 DNS-AID 仍可在真實服務契約完成後按條件啟用。

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

3.0.2 檢查已完成：`npm run g -- --profile` 通過 runtime、theme、backend 編譯並報告 48 篇源文件；臨時使用 provider 真實欄位形狀的陣列設定和測試值，在選擇器與機器可讀隱私中繼資料中生成了八個內建 provider 記錄，隨後恢復目前主題為全部關閉。生成的瀏覽器腳本包含官方 provider endpoint，且不再包含舊物件鍵。56 個 HTML 內部 `href`/`src` 檢查沒有缺失引用；生成的腳本通過 `node --check`；`/config.yml` 及其 public/static 別名會被判定為私有，公開快照沒有設定檔。posts 和 updates Feed 分別有 10 條和 3 條且彼此隔離，舊 posts 路徑已刪除。1280px 桌面和 390px 手機檢查確認語言卡片均為 136px、彙整封面為 144x81、文章中繼資料對齊，手機目錄預設折疊且可點擊展開，頁面沒有橫向溢出；根語言頁匹配繁體中文瀏覽器偏好，品牌和隱私連結指向 `zh-tw`。`git diff --check` 通過。`npm run d -- --dry-run` 因未設定 `deployment.targets` 以退出碼 1 結束，因此不聲稱已部署或發佈 npm。

教學路徑請繼續閱讀[十分鐘開始你的網站](/zh-tw/posts/start/)，版本歷史請開啟[更新日誌彙整](/zh-tw/updates/)。
