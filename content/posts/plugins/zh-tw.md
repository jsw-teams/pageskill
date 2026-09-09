---
title: 開發一個可重用外掛
description: 增加一個自帶資源的主題外掛，只註冊一次，並在每個頁面重用。
date: 2026-09-08
---

# 開發一個可重用外掛

主題外掛負責共用的瀏覽器行為、樣式和 messages。只註冊一次；文章繼續寫 Markdown，不複製 HTML。

## 1. 建立一個模組目錄

```text
themes/default/plugins/reading-tip/
  index.ts
  script.js
  style.css
  messages.yml
```

目錄自己保存資源。`themes/default/index.ts` 是組裝入口，`theme.yml` 保存這個主題的外掛實例選項。

## 2. 匯出外掛定義

在 `index.ts` 使用真實的 `ThemePluginDefinition`：

```ts
import type { ThemePluginDefinition } from '../../../../src/theme-api.ts';

export const plugin: ThemePluginDefinition = {
  implementation: 'plugins/reading-tip/index.ts',
  resources: {
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

## 3. 寫入最小可運作資源

`script.js`：

```js
const marker = document.createElement('small');
marker.className = 'reading-tip';
marker.textContent = 'Reading tip enabled';
document.querySelector('.site-footer')?.append(marker);
```

`style.css`：

```css
.reading-tip { margin-inline-start: .5rem; }
```

`messages.yml`：

```yaml
messages:
  en:
    readingTip:
      label: Reading tip
```

## 4. 在 theme.yml 保留實例開關

```yaml
# themes/default/theme.yml
plugins:
  readingTip:
    enabled: true
```

在複製下來的網站執行檢查：

```powershell
npm run compile-theme
npm run g
npm run s
```

## 成功結果

產生的頁面會載入外掛腳本和樣式，頁尾出現標記。把 `theme.yml` 中的 `plugins.readingTip.enabled` 改為 `false` 後重新產生即可移除；新增文章不需要再寫 HTML。

產生時會把模組的資源和 messages 收集到公開主題資源中。伺服器端巢狀 ESM 留在建置/執行時邊界內，未變動的公開資源繼續使用原內容 hash 路徑和快取身分。

## 常見問題

資源路徑都相對主題根目錄。不要修改 `dist/`，不要把程式碼放進 `config.yml`，也不要讓每篇文章直接匯入外掛。

## 下一步

閱讀[把網站放到網上](/zh-tw/posts/deploy/)，先做發佈 dry-run，再真正發佈。
