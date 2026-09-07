---
title: 開發 Block 與主題擴充
description: 以主題為起點新增 Block、註冊資源、測試擴充並部署結果的實際流程。
pattern: docs
---

# 開發 Block 與主題擴充

Pageskill 的二次開發從複製主題開始。編譯器負責 Markdown、schema、路由、依賴、資源和輸出；主題負責 Pattern、Block、版面、CSS、瀏覽器 ESM、圖示和隱私呈現。本頁描述目前的擴充路徑。

重用優先：Agent 和頁面作者先用 `catalog`、`inspect` 找到現有 Pattern、Block 與 schema，再用 Markdown、Frontmatter 和設定組合頁面，不為每頁手寫 HTML。內建能力也可以由人工直接重用，不依賴 Agent 二次開發。只有發現確實缺少能力時，下面的主題程式碼才由擴充作者實作一次，之後供多個頁面重用。

## 開發規範

### 效能速度

靜態 HTML 是預設交付，普通頁面不需要 hydration。按功能需要宣告瀏覽器和其他資源，保留增量依賴追蹤與內容指紋快取。改變建置流程或資源後，用 `pageskill g --profile` 或 `npm run bench -- 100` 可重現地測量，再描述成本或速度；沒有測量就不要編造效能承諾。預設 CSS 優化只嘗試內嵌小型 Pattern/Block 依賴：每個原始 UTF-8 檔案不超過 2,048 bytes，每頁內嵌 CSS 文字總量（包括分隔符）不超過 4,096 bytes；只合併相鄰可內嵌依賴，並按主樣式 → Pattern → Block 順序去重。主題主樣式和全域/preset 合併包繼續作為外鏈快取資源。含 `url()`、`src()`、`image()`、`image-set()`、`@import`、`@charset`、`@namespace`、反斜線、`<` 或 UTF-8 BOM 的檔案保守保持外鏈，不重寫 URL。外鏈 CSS 會壓縮，內嵌 CSS 保留原文。所有指紋 CSS 資產仍然生成，CSS 修改會使快取失效；這不表示所有 CSS 越小越好，也不表示一概 inline。

### 頁面安全

文字和屬性必須轉義，連結使用 `safeUrl`，不可信 Markdown、Frontmatter 或設定值不得送進 `unsafeHtml`。搜尋、表單和 URL 內容都只是資料，只使用 `textContent` 或其他安全 DOM API 插入；不要寫入 `innerHTML`，也不要交給 `eval` 執行。主題 TypeScript 與瀏覽器 JavaScript 是受信任的應用程式碼，不是隔離不可信輸入的 sandbox。`config.yml` 是非程式碼設定入口。後端每個輸入都要由業務自行驗證，受保護操作還要自行實作身分驗證、權限和 CSRF 防護；秘密只在執行時由 `backend/handler.ts` 讀取。框架和 Fetch router 不會自動提供這些保證。靜態頁面主體在建置時產生，不依賴 API 請求來渲染或補齊內容。

| 信任邊界 | 按什麼處理 | 必須做到 |
| --- | --- | --- |
| 訪客 query、表單和 URL 輸入 | 不可信資料 | 建立文字節點，或只把經過驗證的值傳給同源 API。 |
| 作者 Markdown、Frontmatter 和 `config.yml` | 資料，絕不當作可執行程式碼 | 輸出轉義，使用 `safeUrl` 和 schema，不送進程式碼執行入口。 |
| 主題 TypeScript 和瀏覽器 ESM | 需要審查的受信任擴充程式碼 | 按應用程式碼審查；它不是 sandbox。 |
| `backend/handler.ts` 執行時請求 | 不可信請求，秘密只在執行時 | 驗證輸入；受保護操作自行加入身分驗證、權限檢查、CSRF 防護和失敗處理；秘密只從執行時環境讀取。 |

用惡意 query、表單和 URL 內容，以及同一服務上的靜態頁面加 API 請求驗證這條邊界。記錄實際的轉義、授權和失敗行為，不要籠統宣稱完全安全。

`config.yml` 由網站管理員控制；不要把訪客 query、表單或 URL 內容原樣合併進去。如果在目前主題的 `plugins.privacyConsent.gatedScripts` 中設定腳本，其中的 HTTP(S) 來源是管理員或主題作者的信任決定：協定驗證只阻止 `javascript:` 和 `data:` 注入，不能證明第三方腳本本身安全，訪客也不能決定它的 `src`。

同一個 Worker/service 預設優先處理 `/api/*` 並呼叫 `backend/handler.ts`；其他動態路徑寫入 `deployment.dynamicRoutes`。不要在建置期間 import backend 來發現路由或讀取秘密。

### i18n

`zh-sg`、`zh-tw`、`en` 的頁面語義保持同步；主題 UI 文案放在 `themes/<name>/i18n.yml`。修改後核對 HTML `lang`、`hreflang`、語言連結和 fallback，不要在同一語言頁面混用語言。

### 前後端與動靜分離

`content/`、`config.yml`、`themes/` 和產生的輸出各有邊界；API、秘密、寫入和 webhook 只放在 `backend/handler.ts`。靜態生成是預設渲染方式：一般內容預先產生，互動功能按需呼叫同源 API。公開 snapshot 位於 `dist/public`；同一個 Worker/Fetch 服務可以提供這些頁面和同源 API，同時保持 server 程式碼私有。這個服務預設優先處理 `/api/*`；其他動態路徑寫入 `deployment.dynamicRoutes`，不要在建置期間 import backend 來發現路由或讀取秘密。GitHub Pages 或 CDN 只發佈公開 snapshot；Fetch 平台可以從同一套套件保留 API。Workers 使用 `assets.directory: public`，`.assetsignore` 是額外的排除層。`server/`、`_pagekiln/`、`.pagekiln/`、Worker 檔案和 `*.toml` 必須留在私有目錄；後端只在伺服器端或 Worker 執行時載入，runtime secrets 不寫入建置產物。Cloudflare Pages 使用目標專用的部署整理，公開靜態上傳只包含公開資源。靜態頁面主體不應依賴動態請求渲染；新增動態行為要有獨立失敗處理。

### 相容性與遷移

保持既有內容、設定和主題契約。新增能力優先做成可選項並維持既有行為；確需破壞性變更時，提供遷移說明並做相容驗證，避免長期維護重複機制。

目前 CLI 入口只有 `pageskill`，舊終端/CLI 入口已移除。本次改名只涉及原始碼儲存庫與 CLI 契約，不對 npm 發布狀態作出判斷。使用目前原始碼時，複製 [Pageskill 原始碼儲存庫](https://github.com/jsw-teams/pageskill)，完成 runtime、theme 和 backend 編譯後執行 `npm link`。改名不要求重寫內容、`config.yml` 或主題；`.pagekiln/` 快取、目錄和建置剖面路徑、`_pagekiln` 內部輸出路徑以及舊 Cookie consent 儲存鍵繼續相容。網站根目錄使用 `PAGESKILL_SITE_ROOT`。

之後每次 major、minor 或 patch 發佈，都要讓 `package.json` 和 `package-lock.json` 的 SemVer 保持一致，在 `CHANGELOG.md` 記錄變更，並在 `content/posts/<id>/{en,zh-sg,zh-tw}.md` 新增帶日期的本地化 Product Note，寫明遷移步驟和驗證方式。不要補寫 1.0 的版本記錄。

## 1. 複製主題邊界

在新的主題目錄開始，讓原主題繼續作為可執行的參考：

```text
themes/<name>/
├─ theme.yml
├─ theme.ts
├─ style.css
├─ i18n.yml
├─ blocks/                    可重用 Block 樣式
└─ scripts/                 可選的原生瀏覽器 ESM
```

`theme.yml` 指向 `theme.ts`、`style.css` 和 i18n 資源，並登記已匯出的 Pattern/Block 名稱、資源對應和外掛資源。Pattern/Block 定義及其 `schema` 寫在 `theme.ts`；collection 資料 schema 寫在根設定 `config.yml` 的 `content.collections.<name>.schema` 下。主題層級的 `plugins` 開關下放二級外掛名稱。主題 UI 文案放在 `themes/<name>/i18n.yml`，不放入站務根設定。

複製主題後，在網站根目錄的 `config.yml` 選擇它：

```yaml
theme:
  name: nebula
```

下面的 TypeScript 只示範最小的 `document` + `notice` 組合。複製現有主題時要保留原主題其他 Pattern 和 Block，尤其是 `landing`、`docs` 和 `blog`，否則現有頁面會停止渲染。

## 2. 在 `theme.ts` 新增 Block

下面的程式碼屬於擴充作者的工作：只有 catalog/inspect 找不到合適的可重用 Block 時，才需要寫它。普通頁面作者繼續用 Markdown、Frontmatter 和設定組合頁面，不必逐頁寫 HTML。使用小型主題 API，讓 Block schema 保持標量且明確：

```ts
import { defineTheme } from '../../src/theme-api.ts';

export default defineTheme({
  name: 'nebula',
  patterns: {
    document: { name: 'document', contexts: ['page'], render: content => content }
  },
  blocks: {
    notice: {
      name: 'notice',
      schema: { tone: 'string' },
      render: (node, context) => {
        const tone = context.escapeHtml(node.attrs.tone || 'info');
        return `<aside class="notice notice--${tone}">${context.renderNodes(node.children)}</aside>`;
      }
    }
  }
});
```

`context.renderNodes` 渲染 Markdown 子節點。文字和屬性使用 `context.escapeHtml`，連結使用 `context.safeUrl`。不要把未經審查的 Markdown、Frontmatter 或設定值送進 `unsafeHtml`。

在 `theme.yml` 註冊同一個 Block：

```yaml
name: nebula
module: theme.ts
style: style.css
blockStyles: { notice: ['blocks/notice.css'] }
blocks:
  - notice
patterns:
  - document
plugins:
  privacyConsent:
    enabled: true
```

`theme.ts` 中的 `schema` 與 `theme.yml` 中的能力名稱和資源登記共同構成一個契約。作者應保持兩者同步，並以 `theme.ts` 實際匯出和 `catalog` 的結果核對能力；不要用編譯器條件隱藏尚未完成的 Block。

## 3. 在 Markdown 使用 Block

在 `content/pages/` 下的頁面加入指令：

```markdown
:::notice{tone="info"}
目前使用說明在 Guide 中。
:::
```

指令屬性保持短小且為標量。標題、段落、清單、表格、程式碼和連結繼續使用普通 Markdown。描述目前行為的 Block 放在 page；記錄有日期的實作決定則放在帶必填 `date` 的 Product Note。

## 4. 讓一個樣式檔擁有視覺行為

把 Block 規則放進可重用的 `blocks/notice.css`，並在 `theme.yml` 用 `blockStyles` 宣告：

```css
.notice{border-inline-start:3px solid var(--accent);padding:1rem 1.2rem;background:var(--panel);color:var(--ink)}
```

編譯器會把外鏈 CSS 壓縮為單行並為檔名加指紋。宣告的 `blocks/notice.css` 等小型相鄰依賴可能按頁面內嵌；每個原始 UTF-8 檔案不超過 2,048 bytes，每頁內嵌 CSS 總量（包括分隔符）不超過 4,096 bytes；只合併相鄰可內嵌依賴，並按主樣式 → Pattern → Block 順序去重。主題主樣式和全域/preset 套件始終保持外鏈。含 `url()`、`src()`、`image()`、`image-set()`、`@import`、`@charset`、`@namespace`、反斜線、`<` 或 UTF-8 BOM 的檔案保守外鏈；內嵌 CSS 保留原文。嚴格禁止 inline 的 CSP 可在 `theme.yml` 頂層關閉這項優化：

```yaml
inlineStyles: false
```

這只關閉 CSS 優化，不承諾整站已經符合 CSP。響應式版面、焦點狀態、表格適配、圖示尺寸和 reduced-motion 行為都放在這個樣式檔或宣告的主題資源中。新規則取代舊規則時刪除重疊規則和無效相容檔案，不要依賴 cascade 順序同時維持兩套設計。

預設主題透過主題模組使用 Lucide 圖示套件。既有控件應重用已宣告的圖示庫，不要為同一組控件再增加圖示字型或另一套內嵌 SVG。

## 5. 發現並測試擴充

依照以下順序執行：

```bash
npm run compile-theme
npm run catalog
pageskill inspect block:notice
pageskill check
pageskill g --profile
pageskill s
```

`catalog` 確認目前主題的 Pattern、Block、外掛、schema 名稱和資源依賴。`inspect block:notice` 以結構化輸出回答單一能力問題。`check` 會以原始碼位置報告未知 Block、無效屬性、路由衝突和缺少必填欄位。`g` 確認 Block 進入靜態輸出；`s` 確認 Markdown 或主題編輯後瀏覽器會重新整理。

## 6. 新增可選瀏覽器行為

原生 ESM 放在 `themes/<name>/scripts/`，並在對應外掛下宣告。每個可選外掛都要有明確開關：

```yaml
plugins:
  privacyConsent:
    enabled: true
  search:
    enabled: true
```

可選分析或廣告腳本在訪客同意對應 Cookie 類別前保持不活動。必要的同意儲存由隱私契約啟用；footer 開啟與訪客之後重新開啟的同一個設定對話框。瀏覽器程式碼只載入一次，每個事件處理器只保留一個擁有者。舊腳本被取代時刪除它，不要讓兩個處理器互相競爭。

## 7. 分離站務設定與執行時程式碼

`config.yml` 儲存網站資訊、語言、collection、路由、schema、隱私設定和部署位置，不儲存 CSS 路徑、任意 HTML 或瀏覽器腳本正文。需要動態請求、密鑰、寫入和 webhook 時，程式碼只放在 `backend/handler.ts`；使用共享 Fetch router，並在部署前編譯 backend。

預設公開 snapshot 位於 `dist/public`；同一個套件可以保留私有 server/Worker 程式碼，由單個 Worker/Fetch 服務提供生成頁面和同源 API。`/api/*` 預設由 Worker 優先處理；其他動態路徑寫入 `deployment.dynamicRoutes`，不要在建置期間 import backend 來發現路由或讀取秘密。GitHub Pages 或 CDN 只發佈 `dist/public`，不執行 API。Workers 使用 `assets.directory: public`，`.assetsignore` 是額外的排除層；Cloudflare Pages 使用目標專用的部署整理。`server/`、`_pagekiln/`、`.pagekiln/`、Worker 檔案和 `*.toml` 必須留在私有目錄，runtime secrets 不寫入建置產物。

僅供進階相容使用：靜態目標確實需要重新建置且不產出 worker、server、backend 檔案時，可設定 `deployment.enabled: false`。這不是主線產品路徑的必選項，也不會提供動態 API 或應用程式認證。

需要動態邏輯時，再使用部署目標設定：

```yaml
deployment:
  targets: [cloudflare-pages]
  cloudflare:
    apiTokenEnv: CLOUDFLARE_API_TOKEN
    pages:
      project: example-site
      branch: production
```

```bash
pageskill d --dry-run
pageskill d
```

一次發佈需要多個目的地時使用 `targets: [cloudflare-pages, github-pages, vps]`。在 `config.yml` 填寫各供應商的專案、遠端倉庫、分支、SSH 主機、使用者、連接埠、遠端路徑和金鑰路徑；金鑰值留在環境變數或本機 SSH 設定中。

## 8. 測量修改

可選 fixture 會測量 100 個臨時頁面，並以 JSON 行報告 cold、no-change、edit、add、delete、theme 和 settings 變化：

```bash
npm run compile-runtime
npm run compile-theme
npm run compile-backend
npm run bench -- 100
```

`maxRssMiB` 是 Node 建置程序的峰值常駐記憶體，不是輸出目錄大小。fixture 執行後會移除，不構成產品效能承諾。

## 9. 擴充完成清單

```text
[ ] theme.ts 透過 defineTheme 匯出 Block
[ ] theme.yml 註冊 Block 和資源
[ ] style.css 負責響應式及焦點狀態
[ ] 刪除重複 CSS、JS 和相容層
[ ] 可選外掛有明確開關
[ ] i18n 留在 themes/<name>/i18n.yml
[ ] pageskill catalog 和 inspect 能描述 Block
[ ] pageskill check、build、test 和 preview 通過
[ ] 檢查產生的 dist/，不手動編輯
```
