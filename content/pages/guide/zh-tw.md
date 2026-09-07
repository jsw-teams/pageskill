---
title: 安裝、預覽、建置與部署 Pageskill
description: 從新建 Pageskill 網站到檢查、預覽並部署網站的實際操作路徑。
pattern: docs
---

# 安裝、預覽、建置與部署 Pageskill

這是一份目前的使用文件。Agent 和頁面作者先重用現有能力，再決定是否需要擴充主題。`pages` 描述網站現在如何運作；`posts` 保存有日期的產品變化。如果編譯器或主題行為發生變化，應更新本頁和其他目前頁面。需要新增 Block 或修改主題時，請閱讀[二次開發](/zh-tw/development/)。

## 學習路徑

:::learning-path
### 從這裡開始
安裝 Pageskill，建立中性網站並執行第一次檢查。
[開啟「從這裡開始」](/zh-tw/guide/start/)

### 設定網站
設定網站名稱、語言、導覽、collection schema 和主題。
[開啟「網站設定」](/zh-tw/guide/site-settings/)

### 學習 Markdown
編寫 Frontmatter、標題、清單、表格、連結和可重用指令。
[開啟「Markdown 入門」](/zh-tw/guide/markdown/)

### 發佈第一批內容
建立頁面和帶日期的產品筆記，然後檢查、預覽並建置。
[開啟「第一批內容」](/zh-tw/guide/first-content/)

### 設定 Cookie 同意
讓可選類別預設關閉，只在同意後載入受信任的 HTTP(S) 腳本。
[開啟「Cookie 同意」](/zh-tw/guide/cookies/)

### 自訂渲染
先重用 Pattern 和 Block，再複製主題實作可重用擴充。
[開啟「自訂」](/zh-tw/guide/customize/)
:::

## 1. 安裝

Pageskill 要求 Node.js `>=22.12.0` 和 npm。在本倉庫中操作：

```bash
git clone https://github.com/jsw-teams/pageskill.git
cd pageskill
npm install
```

使用原始碼 CLI 前，先編譯 runtime、主題和 backend：

```bash
npm run compile-runtime
npm run compile-theme
npm run compile-backend
```

要在其他目錄建立中性的網站，可以連結本機 CLI，讓它複製真實的 `starter/` 範本：

```bash
npm link
mkdir my-site
cd my-site
pageskill init
```

`pageskill init` 不會在 CLI 裡再產生一套隱藏範本，而是複製 `starter/`，包括 `config.yml`、內容和主題資源。

## 2. 先發現並重用能力

新頁面先查看能力目錄，再開始寫內容：

```bash
pageskill catalog
pageskill inspect pattern:landing
pageskill inspect block:hero
pageskill inspect collection:pages
```

從結果中選擇既有 Pattern、Block 和 collection schema，填寫 Markdown、Frontmatter 與 `config.yml` 資料。下面的最小頁面使用倉庫和 starter 都提供的 `landing` Pattern 與 `hero` Block；頁面作者只寫內容和屬性，不需要逐頁手寫 HTML：

```markdown
---
title: 產品入口
description: 說明這個入口頁面的用途。
pattern: landing
---

:::hero{tone="brand" align="left"}
# 讓 Agent 重用既有結構

把頁面內容寫在 Markdown 中。
:::
```

接著執行 `pageskill check` 和 `pageskill g --profile`。只有 catalog/inspect 沒有涵蓋需求時，才複製主題並實作一次可重用 Pattern 或 Block；擴充流程見[二次開發](/zh-tw/development/)。

## 3. 寫入第一批內容

原始碼目錄有兩個 collection：

```text
content/
├─ pages/<id>/<locale>.md       目前網站資訊
├─ posts/<id>/<locale>.md       有日期的產品筆記
└─ assets/                      圖片及其他網站資源
```

目前頁面寫在 `content/pages/`。當首頁、About、Guide、Reference 和目錄頁回答「網站現在如何運作」時，它們都屬於 `pages`。`docs` 是 `pages` 中的 Pattern，不是第三個 collection。

```markdown
---
title: 本機搜尋
description: 目前建置如何建立索引並標記結果位置。
pattern: docs
---

# 本機搜尋

Pageskill 目前為每種語言建立靜態索引，並按照命中的標題、章節、內文或路徑標記結果位置。
```

本倉庫的完整預設主題含有 `docs` Pattern；`pageskill init` 複製的最小 starter 只有 `landing`、`document` 和 `blog` 等目錄能力。使用 starter 時先用 `document`，或複製提供 `docs` 的主題，並以 `pageskill catalog` 確認能力後再採用上面的範例。

只有在記錄一次有日期的決定、實作、發佈、事件、部署或測量時，才在 `content/posts/<id>/<locale>.md` 寫產品筆記。`date` 欄位必填。

```markdown
---
title: 搜尋結果新增命中位置
description: 記錄 2026-08-10 新增可見命中位置標籤的變更。
date: 2026-08-10
pattern: blog
---

# 搜尋結果新增命中位置

這篇筆記記錄當天改了什麼以及為什麼這樣改。目前搜尋用法仍然寫在 Guide 中。
```

目前行為變化時，更新原來的頁面。舊產品筆記保留為歷史；新的有日期變化新增一篇筆記。這樣 `pages` 表示目前狀態，`posts` 表示時間線歷史。

## 4. 檢查原始碼

預覽或部署前先執行：

```bash
pageskill check
```

檢查會驗證 YAML Frontmatter、必填 schema 欄位、collection 路由、翻譯組、Pattern 和 Block 名稱、指令屬性以及路由衝突。產品筆記缺少 `date` 會檢查失敗；目前頁面不需要日期。

需要確認目前主題實際提供了什麼能力時，使用原始碼發現命令：

```bash
pageskill catalog
pageskill inspect collection:pages
pageskill inspect collection:posts
pageskill inspect block:hero
```

`catalog` 讀取原始碼能力，不要求先完整建置網站。`inspect` 為內容 id 或明確 namespace 返回結構化事實。

## 5. 本機預覽

啟動增量預覽服務：

```bash
pageskill s
```

開啟[http://127.0.0.1:4173/](http://127.0.0.1:4173/)。預設埠被占用時：

```bash
pageskill s --port=4174
```

服務啟動時先建置一次，然後監看 `config.yml`、`content/` 和 `themes/`。受影響的輸出重建後瀏覽器會重新整理，因此 Markdown、Frontmatter、CSS 或主題修改不需要重啟程序即可看到。建置診斷錯誤會列印出來，但預覽程序會繼續執行，方便修正後再次建置。

在倉庫原始碼中，等價的 npm 別名是 `npm run s` 和 `npm run s -- --port=4174`。

## 6. 建置 `dist/`

產生建置輸出：

```bash
pageskill g
pageskill g --profile
```

短命令和 `pageskill build` 執行相同操作。它寫入 `dist/`，包括 HTML、單行壓縮並帶指紋的 CSS、瀏覽器 ESM 資源、Feed、sitemap、搜尋資料、`llms.txt`、自訂 404 頁面和目標平台部署檔案。建置 profile 位於 `dist/.pagekiln/build-profile.json`。

在原始碼倉庫中可以執行 `npm run g -- --profile`。不要手動編輯 `dist/`，應修改原始碼後重新產生。

## 7. 從 `config.yml` 部署

部署寫在網站設定檔中，不把供應商憑證放到命令列。可以選擇一個或多個 target：

```yaml
deployment:
  targets: [cloudflare-pages, vps]
  cloudflare:
    apiTokenEnv: CLOUDFLARE_API_TOKEN
    pages:
      project: example-site
      branch: production
  vps:
    host: vps.example.com
    user: deploy
    port: 22
    remotePath: /var/www/example-site
    identityFile: ~/.ssh/id_ed25519
    publicKeyFile: ~/.ssh/id_ed25519.pub
```

支援的 target 是 `cloudflare-pages`、`cloudflare-workers`、`github-pages`、`vps`，以及可選的 `openai-sites` connector handoff。憑證放在環境變數、本機 SSH agent 或 SSH 金鑰檔案中，不要把 token 或私鑰內容寫進 `config.yml`。

上傳前先查看解析後的操作：

```bash
pageskill d --dry-run
```

確認後上傳：

```bash
pageskill d
```

`pageskill d` 會先建置。Cloudflare Pages 使用 Wrangler 發佈目標整理後的輸出；Cloudflare Workers 使用產生的標準 module Worker；GitHub Pages 把公開 snapshot 推送到設定的遠端分支且不執行 API；VPS 使用 SCP 複製目標部署輸出到設定的路徑。VPS 必須已有 SSH 存取權限、遠端目錄，並在使用金鑰認證時把公鑰放進伺服器的 `authorized_keys`。

靜態生成是預設渲染方式，不限制產品使用動態能力：一般內容會預先產生，需要互動時再呼叫同一個 Worker/Fetch 服務提供的同源 API。同一個 Worker/Fetch 服務處理生成頁面和 `/api/*`；其他動態路徑寫入 `deployment.dynamicRoutes`。部署目標會將公開資源與私有 server 程式碼分開。不要把含有私有程式碼的建置輸出作為公開靜態根目錄；`server/`、`_pagekiln/`、`.pagekiln/`、Worker 檔案和 `*.toml` 必須留在私有目錄，秘密只在執行時讀取。GitHub Pages 只推送公開 snapshot，不執行 API；Workers 和動態 VPS 使用各自的伺服器端邊界。Cloudflare Workers 預設將公開資源放在 `dist/public`，透過 `assets.directory: public` 隔離公開目錄；`.assetsignore` 僅作為額外排除層，Cloudflare Pages 使用目標專用的部署整理，將私有路徑排除在公開資源之外。進階部署相容設定與邊界見[二次開發](/zh-tw/development/)。OpenAI Sites 不是本專案的預設綁定，部分地區可能無法存取；需要廣泛可達性時，應從目標地區測試最終網域。

## 8. 修改主題或新增 Block

將主題複製到 `themes/<name>/`，在 `theme.ts` 實作 Block，在 `theme.yml` 註冊；主題共用 CSS 放入 `style.css`，Block 專用 CSS 放入宣告的 `blocks/<id>.css`。然後依序執行 `catalog`、`inspect`、`check`、`build` 和 `serve`。完整範例見[二次開發](/zh-tw/development/)。

不要為了保留舊實作而增加第二份 CSS、瀏覽器腳本或相容 wrapper。重新設計取代舊規則或處理器時，刪除重複項並檢查產生結果。

## 9. 發佈前檢查

```bash
npm test
pageskill check
pageskill g --profile
pageskill inspect collection:posts
pageskill d --dry-run
```

檢查三種語言連結、自訂 404、`feed.xml`、`sitemap.xml`、`llms.txt`、可選 Cookie 腳本、鍵盤焦點、窄螢幕表格和產生的部署檔案。產品筆記必須按日期倒序出現在 archive/feed；目前頁面不應被強制要求填寫日期。
