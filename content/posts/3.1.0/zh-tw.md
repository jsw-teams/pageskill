---
title: '3.1.0：網站作者只有一套設定方式'
description: '用分層 YAML 表達網站意圖，讓受信任適配器承擔 Provider 能力，並讓文章自動顯示準確中繼資料。'
date: 2026-09-13
category: update
---

# 3.1.0：網站作者只有一套設定方式

Pageskill 3.1.0 繼續保留 Markdown、多語言內容、Pattern、Block、Theme、Plugin、搜尋、歸檔、Feed、發現、Backend 和部署目標。這次調整的是普通網站意圖的存放位置，讓網站作者以後主要維護 Markdown 和 YAML。

## 這次有什麼變化

- `config.yml` 可以透過 `extends` 引入 `config/` 下真正相關的專案檔案。物件遞迴合併，陣列整體替換，後層純量覆蓋前層；載入器會檢查專案根邊界、symlink、循環和深度，並把所有有效檔案納入 hash。
- `theme.config` 明確選擇網站實例檔案，例如 `site/theme.yml`。可重用的 `themes/<name>/` 現在只保存實作、資源、外掛和參考範例，不再同時承擔另一套網站設定路徑。
- Navigation 和 Footer 共用一套安全 Link Schema。內部連結可以寫 `/:locale/`，外部連結只允許 HTTP(S)，目前頁面狀態只用於內部路由，`_blank` 會自動獲得 `noopener noreferrer`。
- 根設定的 `integrations` 只描述本站真正使用的 Provider。受信任的 Provider Adapter 自己擁有 schema、公開識別驗證、隱私用途、同意要求、載入策略和資源實作。同意分類從實際設定的適配器推導；沒有需要同意的 Integration 就沒有橫幅。
- Post 根據 Markdown 正文自動計算字數和閱讀時間，接受嚴格的 `update` 時間戳，顯示本地化更新提示；sitemap 的 `lastmod` 使用 `update`，RSS 發佈時間仍使用 `date`，搜尋和增量快取也保存 update。
- `createContext`、`refreshContext`、`build`、`check`、`inspect`、`getCatalog` 和 `siteDiscoveryOptions` 公共 facade 繼續可用；部署設定只在產生建置產物時統一解析。
- `g` 現在會檢查原始碼、最終 HTML、真實瀏覽器、計算樣式、鍵盤、響應式視窗和動態元件；`s` 會在重建後重複回報。預設主題以 WCAG 2.2 AA 為目標，但不會聲稱自動化可以取代人工審查。

## Breaking 設定清理

本版本有意刪除歷史設定入口，不再長期維護兩套互相競爭的網站寫法：

- 不再尋找 `themes/<name>/theme.yml`。把網站覆寫項移到 `site/theme.yml`，並在 `config.yml` 設定 `theme.config: ./site/theme.yml`；省略它就使用空覆寫和程式碼預設值。
- 刪除 `branding` 及其 attribution 欄位。網站若想說明專案來源，直接使用普通 Footer link 或主題內容。
- 刪除過時的部署別名和 `deployment.openaiSites.staticDirectory`。請使用正式的 `deployment.targets` 與 `deployment.staticDirectory`。
- 刪除舊 Navigation 格式和舊 Privacy Consent Provider/分類/腳本設定。請改用 `navigation.links`、`footer.links` 和根級 `integrations`。
- 歷史 `.pagekiln`、`_pagekiln` 內部路徑以及舊瀏覽器同意狀態命名空間統一為 `.pageskill`、`_pageskill` 和 `pageskill-consent`。

最短遷移方式是：

```yaml
# 舊網站實例位置：themes/default/theme.yml
# 新的 config.yml
theme:
  name: default
  config: ./site/theme.yml
```

## 發佈前驗證

```powershell
npm install
npm test
npm run compile-runtime
npm run compile-theme
npm run compile-backend
npm run g
npm run g -- --profile
```

Provider secret 放在環境變數中，產生後的發現檔案要從原始碼結果檢查；靜態目標透過代管商工作流程只發佈 `dist/public`。

請繼續閱讀[設定結構](/zh-tw/posts/site-settings/)、[設定 Integration 與隱私同意](/zh-tw/posts/cookies/)和[文章中繼資料範例](/zh-tw/posts/post-meta-demo/)。
