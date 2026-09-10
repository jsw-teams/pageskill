---
title: 開發一個可重用外掛
description: 增加一個自帶資源的主題外掛，只註冊一次，並在每個頁面重用。
date: 2026-09-08
category: tutorial
---

# 開發一個可重用外掛

主題外掛負責共用的瀏覽器行為、樣式和 messages。只註冊一次；post 繼續寫 Markdown，不複製 HTML。

## 1. 建立一個模組目錄

```text
themes/default/plugins/reading-tip/
  index.ts
  script.js
  style.css
  messages.yml
```

目錄自己保存資源。`themes/default/index.ts` 是組裝入口，`theme.yml` 保存這個主題的外掛實例選項。

## 2. 先設定已登記的外掛

改程式碼前先查看外掛 schema，再在 `theme.yml` 使用安全選項。基礎外掛的開關、限制、同意中繼資料、shell 插入點和本地化文案都屬於實例資料：

```yaml
plugins:
  search:
    enabled: true
    maxResults: 8
    # 只翻譯部分語言時，缺少的 key 會從 messages.yml 回退。
    copy:
      zh-tw:
        placeholder: 搜尋本主題
  toc:
    enabled: true
    maxDepth: 4
```

語言啟用不是外掛選項；`activeLocales` 和 `i18n.fallbackLocale` 放在 `config.yml`。新增語言只完成 50% 翻譯也可以產生：缺少的介面 key 使用回退語言，已存在的 Markdown 檔案則完全按原文顯示。

## 3. 匯出外掛定義

在 `index.ts` 使用真實的 `ThemePluginDefinition`：

```ts
import type { ThemePluginDefinition } from '../../../../src/theme-api.ts';

export const plugin: ThemePluginDefinition = {
  implementation: 'plugins/reading-tip/index.ts',
  resources: {
    // 讓模組擁有自己的資源，編譯器才能統一追蹤和指紋化。
    styles: ['plugins/reading-tip/style.css'],
    scripts: ['plugins/reading-tip/script.js']
  },
  i18n: 'plugins/reading-tip/messages.yml',
  defaults: { enabled: true },
  schema: { enabled: { type: 'boolean' } }
};
```

在 `themes/default/plugins/index.ts` 註冊一次：

```ts
import { plugin as readingTip } from './reading-tip/index.ts';

export const plugins = { search, toc, privacyConsent: cookies, language, readingTip };
```

## 4. 寫入最小可運作資源

`script.js`：

```js
// 使用 DOM API，避免外掛變成 HTML 注入入口。
const marker = document.createElement('small');
marker.className = 'reading-tip';
marker.textContent = 'Reading tip enabled';
document.querySelector('main')?.prepend(marker);
```

`style.css`：

```css
/* 樣式和元件資源放在一起，刪除時不會留下孤立依賴。 */
.reading-tip { margin-inline-start: .5rem; }
```

`messages.yml`：

```yaml
messages:
  en:
    readingTip:
      # 介面文案放這裡，執行行為仍由 index.ts/script.js 負責。
      label: Reading tip
```

## 5. 在 theme.yml 保留實例開關

```yaml
# themes/default/theme.yml
plugins:
  readingTip:
    # 不改 renderer 就能開關已登記的能力。
    enabled: true
```

在複製下來的網站執行檢查：

```powershell
npm run compile-theme
npm run g
npm run s
```

## 成功結果

產生的頁面會載入外掛腳本和樣式，主要內容區域出現標記。把 `theme.yml` 中的 `plugins.readingTip.enabled` 改為 `false` 後重新產生即可移除；新增文章不需要再寫 HTML。

產生時會把模組的資源和 messages 收集到公開主題資源中。伺服器端巢狀 ESM 留在建置/執行時邊界內，未變動的公開資源繼續使用原內容 hash 路徑和快取身分。

## 6. 以 Cookie 選擇器作為參考

本主題的 [Cookie 選擇器教學](/zh-tw/posts/cookies/)是一個完整參考實作。它在同樣的模組結構上加入 schema、本地化訊息、同意後瀏覽器行為和安全渲染；當外掛不只需要一個資源時，可以依照這個結構擴充。

導覽和頁尾連結屬於 shell，因此應透過 `themes/default/theme.yml` 的 `plugins.chrome` 設定。不要讓外掛腳本向 `.site-header` 或 `.site-footer` 任意追加連結。chrome 外掛只接受結構化標籤和安全 URL；像本例這樣的頁面級行為仍可掛載到 `main` 內。

## 7. 乾淨地移除外掛

能力不再需要時，刪除主題組裝入口中的 import、外掛定義和資源登記、`theme.yml` 實例，以及 Markdown directive 或 shell 參照。重新產生並檢查 catalog；不要只刪產生的資源，也不要為舊消費者保留第二套實作。

## 常見問題

資源路徑都相對主題根目錄。不要修改 `dist/`，不要把程式碼放進 `config.yml`，也不要讓每篇文章直接匯入外掛。

## 下一步

閱讀[把網站放到網上](/zh-tw/posts/deploy/)，先做發佈 dry-run，再真正發佈。
