---
title: "Pageskill 3.0.0：為 2.0 翻篇"
description: "Pageskill 3.0.0 在歸檔的 2.0 階段之後開啟重用優先的產品線，帶來 CLI 遷移、public 執行邊界、更謹慎的瀏覽器處理和六個插畫教學。"
date: 2026-09-07
pattern: blog
---

# Pageskill 3.0.0：為 2.0 翻篇

Pageskill 3.0.0 標誌著 2.0 階段歸檔，並開啟新的產品線。這篇筆記記錄 2026-09-07 的儲存庫原始碼與內容狀態。發布到 npm 與部署屬於這份記錄之外的獨立操作。

## 2.0 現在是歸檔章節

2.0 奠定的基礎仍然支撐這次轉換：Markdown 和設定可以與可重用的主題能力組合，編譯器產生可檢查的頁面與交付產物。3.0 延續這套基礎，把重用、執行邊界和 Pageskill 名稱放到產品的可見中心。

## 改名與遷移

公開名稱從 Pagekiln 改為 Pageskill，範圍包括 package 中繼資料、CLI、網站身分、主題文案、文件和儲存庫連結。舊的 `pagekiln` CLI 入口與 `src/bin/pagekiln.mjs` 已移除。請把 `pagekiln build` 這類命令改為 `pageskill build`，把 `PAGEKILN_SITE_ROOT` 改為 `PAGESKILL_SITE_ROOT`；舊環境變數不再作為後備值。

遷移範圍保持明確。產生的 `.pagekiln/` discovery 和 build-profile 路徑、`_pagekiln/` 執行時路徑，以及現有的 `pagekiln-consent` Cookie 儲存鍵繼續相容。既有內容、多語言路由和預設主題的 `landing`、`document`、`docs`、`blog` Pattern 仍然屬於契約。

部署設定還有一項相關遷移：如果 `deployment.openaiSites.staticDirectory` 是 `dist`，請改為 `deployment.staticDirectory: public`。新的 `deployment.staticDirectory` 設定是可選的，舊 OpenAI Sites 設定中的安全自訂目錄仍會作為後備值。

## 先重用，再擴充

正常的創作路徑從 `pageskill catalog` 和 `pageskill inspect` 開始。這些命令公開原始碼中的 Pattern、Block、Schema、外掛、上下文和資源依賴，供網站重用。作者繼續使用 Markdown、Frontmatter 和 `config.yml` 組合頁面；主題擴充用來補足缺少的共享能力，不需要為每個頁面分別撰寫 HTML。

新的 Guide 也遵循這套方式。六個多語言步驟涵蓋[開始使用](/zh-tw/guide/start/)、[網站設定](/zh-tw/guide/site-settings/)、[Markdown](/zh-tw/guide/markdown/)、[第一份內容](/zh-tw/guide/first-content/)、[Cookie 同意](/zh-tw/guide/cookies/)和[主題自訂](/zh-tw/guide/customize/)。`learning-path` Block 將這段順序作為可重用內容渲染，`content/assets/learning/` 中的六張獨立 bear PNG 為每一步提供插畫。

## 靜態頁面與同源 API 共用邊界

頁面仍然在請求之前預先產生。統一建置會把公開頁面與資源放入 `dist/public`。一個同源 Worker/Fetch 執行時可以位於這份輸出之前，優先處理 `/api/*`，並加入明確設定的動態路由。`backend/handler.ts` 仍然是動態業務邏輯與執行時秘密的來源。

公開側預設是 `dist/public`。`server/`、`_pagekiln/`、`.pagekiln/`、Worker 檔案和部署清單留在 public 邊界之外；不應把整個 `dist/` 當作 CDN 根目錄暴露。這條邊界限制靜態檔案暴露，但不會自動完成使用者身分驗證、受保護操作的授權或 CSRF 防護；這些仍然是應用程式業務邏輯。

## CSS 預算與瀏覽器邊界

只有同時滿足以下條件時，Pattern 和 Block 樣式表才會內聯：每個原始 UTF-8 檔案不超過 2,048 bytes，每頁合計內聯 CSS 不超過 4,096 bytes，而且原始碼沒有不安全的相對資源或 style 元素風險。主題 bundle 仍然是帶指紋的外部資源，不安全或過大的樣式會保持外部載入。

本機搜尋繼續使用 DOM API 產生標籤、高亮、摘要和連結。3.0 會先把結果 URL 驗證為 HTTP(S)，再建立同源錨點。Cookie 同意會讓可選類別在明確同意前保持關閉，檢查設定的可選腳本來源是否為 HTTP(S)，並保留相容的 `pagekiln-consent` 鍵。這些檢查收緊了輸入處理；提供商設定、隱私義務和後端授權仍由網站及其應用程式負責。

## 驗證

這份原始碼狀態的本機驗證已通過：`npm run compile-runtime`、`npm run compile-theme`、`npm run compile-backend`、`npm run build -- --profile` 和 `npm run check` 在 39 份文件上完成；`npm test` 通過 66/66，並檢查了 1,080 個內部連結與資源引用。100 個條目的夾具增量建置與預覽同步也通過；桌面和 390px 手機寬度下的學習入口沒有橫向溢出，六張圖片都正常載入。VPS 驗證使用產生的 handler 對接 mock Deno 介面，Pages 驗證使用帶 ASSETS 的 dry-run staging。沒有執行真實雲端或 Deno 部署，也沒有發布 npm。

## 相容性與下一章

這個版本改變公開的產品和 CLI 名稱，同時保留既有網站需要的內容模型、多語言頁面、主題契約、內部路徑和同意儲存。從現在開始，major、minor 和 patch 版本號都應當在 package 中繼資料、更新日誌和帶日期的內容記錄之間保持同步。3.0.0 筆記記錄的是原始碼狀態，不表示已經發布 npm 套件或部署網站。
