---
title: 我們如何構建外掛
description: 以 Cookie 選擇器作為參考，學習行為約定、安全渲染、主題設定和部分翻譯的處理方式。
date: 2026-09-07
category: tutorial
---

# 我們如何構建外掛

Cookie 選擇器是我們構建可重用外掛時的參考實作。它把訪客介面、瀏覽器狀態、可選腳本、本地化訊息和政策連結組合起來，同時不需要每個 post 重複 HTML。

我們以 Cookie 選擇器作為參考，並借鑑 [Cookie 政策產生器](https://www.toolszone.net/zh/tools/cookie-policy-generator) 的透明展示思路：把類別、提供者、保存期限和同意要求放在一起，方便訪客檢視。這裡只借鑑展示方式；選擇器仍然只是同意控制，不是法律建議或政策產生器。經過審核的政策繼續用 Markdown 維護。

## 1. 先定義行為約定

寫模組之前，先明確它要支援的狀態：

- 必要功能立即可用；
- 可選用途預設關閉；
- 可選腳本載入前必須取得明確選擇；
- 訪客可以重新開啟選擇器並儲存「僅必要項目」；
- 撤回選擇會阻止後續載入，但不能撤銷腳本已經完成的工作。

這個約定讓外掛可以重用。post 只說明能力，不複製它的標記或瀏覽器邏輯。

## 2. 把模組檔案放在一起

預設主題把實作集中在一個目錄：

```text
themes/default/plugins/cookies/
  index.ts
  script.js
  style.css
  messages.yml
```

`index.ts` 定義能力和資源；`script.js` 負責同意狀態的儲存與載入判斷；`style.css` 負責選擇器外觀；`messages.yml` 負責介面翻譯。

## 3. 在程式碼中登記能力

外掛定義由程式碼擁有。它負責登記能力、資源、本地化訊息、預設值、固定的 provider 適配器和實例資料形狀，不包含本站帳戶值或啟用選擇。以下是實際定義的精簡示例：

```ts
import type { ThemePluginDefinition } from '../../../../src/theme-api.ts';

export const plugin: ThemePluginDefinition = {
  implementation: 'plugins/cookies/index.ts',
  resources: {
    // 程式碼登記資源歸屬；網站實例資料留在 theme.yml。
    styles: ['plugins/cookies/style.css'],
    scripts: ['plugins/cookies/script.js']
  },
  i18n: 'plugins/cookies/messages.yml',
  defaults: {
    enabled: true,
    categories: [
      { purpose: 'essential', required: true, default: true },
      { purpose: 'measurement', required: false, default: false },
      { purpose: 'advertising', required: false, default: false },
      { purpose: 'fraud-prevention', required: false, default: false },
      { purpose: 'social-embedding', required: false, default: false }
    ],
    integrations: [
      { provider: 'google-analytics', enabled: false, measurementId: '', purpose: 'measurement' },
      { provider: 'google-ads', enabled: false, tagId: '', purpose: 'advertising' }
    ],
    gatedScripts: []
  },
  schema: {
    // schema 只描述資料，不接受可執行的 provider 程式碼。
    enabled: { type: 'boolean' },
    categories: { type: 'array' },
    integrations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: true,
        properties: {
          provider: { type: 'string', required: true },
          enabled: { type: 'boolean' },
          purpose: { type: 'string' },
          measurementId: { type: 'string' },
          tagId: { type: 'string' },
          token: { type: 'string' },
          siteSignature: { type: 'string' },
          siteKey: { type: 'string' }
        }
      }
    },
    gatedScripts: { type: 'array' }
  }
};
```

在 `themes/default/plugins/index.ts` 中只登記一次：

```ts
import { plugin as chrome } from './chrome/index.ts';
import { plugin as cookies } from './cookies/index.ts';
import { plugin as language } from './language/index.ts';
import { plugin as search } from './search/index.ts';
import { plugin as toc } from './toc/index.ts';

export const plugins = { chrome, search, toc, privacyConsent: cookies, language };
```

真實 schema 描述的是 provider 實例陣列。內建 provider 值是 `google-analytics`、`google-ads`、`cloudflare-web-analytics`、`baidu-tongji`、`recaptcha`、`hcaptcha`、`turnstile` 和 `x-for-websites`。這些是程式碼擁有的適配器名稱，不是網站憑空生成的 ID。未知項目和額外欄位在主題模組登記對應行為之前保持惰性；設定永遠不是可執行程式碼。

## 4. 在主題資料中使用真實 provider 欄位和用途

目前主題在設定檔中設定外掛實例。可選用途只有在明確接入並審核過的服務後才開啟：

```yaml
# themes/default/theme.yml
plugins:
  privacyConsent:
    enabled: true
    provider: Pageskill
    storage: cookie
    retentionDays: 365
    categories:
      - purpose: essential
        required: true
        default: true
        retentionDays: 365
      - purpose: measurement
        required: false
        default: false
        retentionDays: 0
      - purpose: advertising
        required: false
        default: false
        retentionDays: 0
      - purpose: fraud-prevention
        required: false
        default: false
        retentionDays: 0
      - purpose: social-embedding
        required: false
        default: false
        retentionDays: 0
    integrations:
      - provider: google-analytics
        enabled: false
        measurementId: '' # GA4 值，例如 G-XXXXXXXXXX
        purpose: measurement
      - provider: google-ads
        enabled: false
        tagId: '' # Google tag 值，例如 AW-XXXXXXXXXX 或 GT-XXXXXXXX
        purpose: advertising
      - provider: cloudflare-web-analytics
        enabled: false
        token: '' # Cloudflare beacon 程式碼中的 token
        purpose: measurement
      - provider: baidu-tongji
        enabled: false
        siteSignature: '' # hm.baidu.com/hm.js? 後面的值
        purpose: measurement
      - provider: recaptcha
        enabled: false
        siteKey: ''
        purpose: fraud-prevention
      - provider: hcaptcha
        enabled: false
        siteKey: ''
        purpose: fraud-prevention
      - provider: turnstile
        enabled: false
        siteKey: ''
        purpose: fraud-prevention
      - provider: x-for-websites
        enabled: false
        purpose: social-embedding
    gatedScripts: []
```

這些欄位跟隨 provider 實際的網頁接入約定：[Google Analytics measurement ID](https://support.google.com/analytics/answer/12270356) 使用 `G-...`；Google Ads 的 `tagId` 使用 Ads 顯示的 Google tag 識別，例如 `AW-...` 或 `GT-...`，不是自造的 `conversionId`。外掛使用 Google 的 basic consent mode：選擇前阻止 tag，選擇後傳遞文件規定的 `analytics_storage`、`ad_storage`、`ad_user_data` 和 `ad_personalization` 狀態。外掛只負責初始化帶同意狀態的 Google tag，不會憑空建立轉換事件或 label。[Cloudflare Web Analytics](https://developers.cloudflare.com/web-analytics/get-started/) 提供 beacon `token`，[百度統計](https://tongji.baidu.com/web/help/article?id=219) 提供 `hm.js?` 後的 `siteSignature`。如果 Cloudflare proxy 或 Pages 自動注入 Web Analytics，請關閉那條獨立注入路徑，否則它會繞過此選擇器。`purpose` 不是帳戶 ID 或 Cookie 名稱，而是程式碼登記的處理用途，分別對應真實的訪問量測量、廣告、人機驗證／反濫用或社交嵌入行為。

內建用途登記保持小而有依據：`measurement` 對應 GA4 的 `analytics_storage`、Cloudflare Web Analytics 和百度統計；`advertising` 對應 Google Ads 的儲存和廣告訊號；`fraud-prevention` 對應 reCAPTCHA、hCaptcha、Turnstile 的挑戰；`social-embedding` 對應 X for Websites widget；`essential` 只儲存 Pageskill 的選擇記錄。只有程式碼已登記適配器、存在 provider 的真實公開值、用途與可選項匹配，而且訪客明確同意時，provider 才會執行。

只有在審核 provider 條款、隱私說明、保存期限和 CSP 後，才把 `enabled` 改為 `true`。驗證碼適配器使用 [reCAPTCHA](https://developers.google.com/recaptcha/docs/display)、[hCaptcha](https://docs.hcaptcha.com/) 和 [Turnstile](https://developers.cloudflare.com/turnstile/get-started/) 的官方腳本與標記。它們的 `siteKey` 可以公開；secret key 和伺服器端 token 驗證必須留在 `backend/handler.ts` 或其他私有服務中。X 適配器沒有帳戶 ID：只有頁面存在 X 標記並且訪客同意後，才按 [X for Websites](https://help.x.com/en/using-x/embed-x-feed) 的方式載入官方 widget 資源。

並非每個整合都是字面意義上的 Cookie。Cloudflare Web Analytics 主要使用 beacon token，Turnstile 執行挑戰，X widget 執行時可能接收請求或 Cookie 資訊。應依據 provider 當前說明填寫用途和保存期限，不要宣稱所有可選 provider 都會寫入同一種 Cookie。瀏覽器同意狀態只把這些用途鍵作為穩定儲存鍵，不會把它們偽裝成 provider 識別。

X 整合按需載入：同意後，只有頁面存在 X/Twitter 嵌入標記時才載入 `platform.x.com/widgets.js`。選擇前不會載入社交嵌入。其他 provider 專屬欄位可以保留在主題設定中供未來程式碼使用，但不會僅因寫入設定就發起網路請求。

穩定的政策入口和控制者資料仍然是網站資料：

```yaml
# config.yml
privacy:
  cookieConsent:
    policyRoute: /:locale/privacy/
```

把審核過的政策放在 `content/pages/privacy/<locale>.md`。不要在 YAML 或 Markdown 中放 HTML、JavaScript、CSS、提供者程式碼或隱藏的腳本 URL。`config.yml` 只在產生時讀取，不會複製到 `dist/public`；生成的 backend 也沒有寫入它的路由。設定是資料，可執行行為由外掛模組負責。

## 5. 以安全邊界渲染

`renderCookieConsent` 根據經過驗證的 context 生成固定的彈窗和橫幅。動態值遵循兩條不同規則：

```ts
// 文字和 URL 使用不同的安全渲染路徑。
const label = context.escapeHtml(category.label);
const href = context.safeUrl(privacy.policyHref);
```

標籤和中繼資料作為文字轉義；政策連結和受同意控制的腳本 URL 經過 `safeUrl`，不安全協定會被拒絕。內建 provider 的 URL 固定在已登記的瀏覽器實作中，canonical provider 名稱和公開 token/key 只作為資料處理。瀏覽器腳本使用 DOM API 建立元素，並且只在同意後載入可選資源。外掛介面沒有 `innerHTML`、`eval`、任意屬性或設定注入的標記。

提供者和保存期限會直接顯示在選擇器中，幫助訪客理解類別用途；法律政策仍然是人工審核的頁面，而不是悄悄產生的法律文字。

## 6. 用主題設定控制 nav 和 footer 插入

殼層插入點也是結構化的主題選項。主導覽連結仍由 `config.yml` 管理；這個功能允許主題在標準連結前後新增安全連結：

```yaml
# themes/default/theme.yml
plugins:
  chrome:
    enabled: true
    navigation:
      enabled: true
      before: []
      after:
        - label: Plugin tutorial
          labels:
            zh-sg: 插件教程
            zh-tw: 外掛教學
          href: /:locale/posts/cookies/
    footer:
      enabled: true
      before: []
      after: []
```

這裡只接受 `label`、可選的本地化 `labels` 和 `href`。編譯器會解析 `:locale`，限制連結數量和長度，拒絕不安全協定或目錄穿越 URL；殼層輸出前還會轉義最終標籤。原始 HTML、腳本、樣式、選擇器和任意屬性都沒有設定欄位。

## 7. 不要讓翻譯進度阻塞發布

網站語言放在 `config.yml`，不放在外掛設定中：

```yaml
activeLocales:
  - zh-sg
  - zh-tw
  - en
i18n:
  fallbackLocale: en
  contentFallback: true
```

Cookie 介面訊息放在外掛旁邊的 `messages.yml`。如果新增語言只翻譯了 50%，缺少的介面 key 會從 `en` 合併；整篇內容文件缺失時使用設定的內容回退。已經存在但只翻譯了一部分的 Markdown 會完全按原文顯示，不會靜默按段落混入機器翻譯或回退內容。

## 8. 檢查同意狀態

```powershell
npm run compile-theme
npm run g
npm run s
```

用全新的瀏覽器工作階段確認選擇前不會載入可選腳本。分別接受每個已設定類別，確認只有對應的經過審核 provider 載入：Google Analytics、Google Ads、Cloudflare Web Analytics、驗證碼，或在存在嵌入標記時的 X。驗證碼要在伺服器端驗證 token；X 要先確認頁面確實有嵌入再觀察 widget 請求。重新開啟 Cookie 設定，儲存「僅必要項目」，確認後續載入停止。同時檢查政策連結、鍵盤焦點、語言連結，以及每種啟用語言中的 nav/footer 插入效果。

## 成功結果

Cookie 選擇器成為一個可重用的主題外掛，擁有本地化介面、明確的類別中繼資料、可擴充的 provider 設定、安全的同意後載入和經過審核的政策連結。post 仍然是 Markdown，主題也可以增加少量殼層連結，而不會獲得 HTML 或腳本注入入口。

## 常見問題

不要預設開啟分析、廣告、驗證碼或社交嵌入，不要把未知第三方 URL 當成可信，也不要以為撤回同意可以撤銷之前的腳本工作。擴充 integration 資料可以保留，但只有程式碼模組消費它時才會產生作用。不要把 provider secret 放進 `theme.yml`，不要給外掛增加 `language` 設定，也不要在每個 post 複製選擇器。如果翻譯不完整，讓設定的 fallback 填補缺少的介面 key，再有計畫地完成內容翻譯。

## 下一步

閱讀[開發可重用外掛](/zh-tw/posts/plugins/)，用同樣的模組模式構建更小的能力。
