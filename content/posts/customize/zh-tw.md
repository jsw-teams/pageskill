---
kind: post
title: 換樣式，或讓 Agent 幫你改
description: 直接修改模組化主題，重用元件，讓一次改動作用到每個頁面。
date: 2026-09-07
category: tutorial
---

# 換樣式，或讓 Agent 幫你改

樣式決定顏色、字型和間距。主題是模組化的：薄入口負責組裝 Components、文件版面、資源和 shell。你可以自己改，也可以給 Agent 一個目標、範圍和應成功的頁面。

## 1. 選擇主題

網站在 `config.yml` 中選擇主題：

```yaml
theme:
  name: default
```

目前主題把元件選項放在 `theme.config` 指向的網站實例檔案（通常是 `site/theme.yml`），並使用負責組裝的薄入口 `themes/default/index.ts`；實例檔案不選擇主題名稱。

## 2. 先改一個共用樣式

共用 shell 樣式放在 `themes/default/components/shell/style.css`，在這裡改現有變數：

```css
:root {
  --green: #6b3d2e;
  --gold: #d99a32;
}
```

元件專屬樣式放在元件旁邊，例如 `themes/default/components/learning-path/style.css`。元件樣式放在自己的 `themes/default/components/<id>/style.css`。

## 3. 新增、修改或刪除樣式

讓每份樣式和負責它的能力放在一起：

 - 修改現有規則時，編輯負責輸出標記的 Component 旁邊的樣式檔案。
- 新增樣式時，在對應 Component 下建立 stylesheet，加入定義的 `resources.styles`，並確保主題組裝入口仍然匯入這個 Component。新增 Component 時，還要把它加入 `themes/default/components/index.ts`。
- 刪除樣式時，同時刪除 import、資源登記，以及對應 class 或資源的所有參照。產生前先搜尋來源，避免留下沒有用途的檔案。

例如，元件自己的資源要明確登記，並在不明顯的決定旁邊寫註解：

```ts
import type { ComponentDefinition } from '../../../../src/theme-api.ts';

export const component: ComponentDefinition = {
  id: 'reading-tip',
  capabilities: ['render'],
  resources: {
    // 讓編譯器可以追蹤 Component 旁邊的樣式。
    styles: ['components/reading-tip/style.css']
  }
};
```

每次新增、修改或刪除後執行 `npm run compile-theme` 和 `page g --profile`，開啟使用該能力的路由，確認產生的資源清單跟隨來源變化。

## 4. 重用或增加一次能力

先在 Markdown 中使用已有 Component directive，再考慮寫程式碼。如果缺少元件，把 `index.ts`、可選的 `style.css` 和 `messages.yml` 放在 `themes/default/components/<id>/`，再把模組註冊到 `components/index.ts`。把共用組裝留在 Component 實作中，共用輔助函式放在 `components/shared/`，不要把表現標記複製到每篇文章。

```powershell
npm run compile-theme
page g
page s
```

## 5. 在主題實例檔案中安全增加 shell 連結

主導覽仍然是 `config.yml` 中的網站資料。如果主題需要在標準導覽或頁尾工具前後增加連結，請使用結構化的 `components.shell` 選項：

```yaml
# site/theme.yml
components:
  shell:
    enabled: true
    navigation:
      enabled: true
      before: []
      after:
        - label: Component tutorial
          labels:
            zh-sg: 组件教程
            zh-tw: 元件教學
          href: /:locale/posts/components/
    footer:
      enabled: true
      before: []
      after: []
```

這裡只接受 `label`、本地化 `labels` 和 `href`。連結數量和長度有上限，編譯器會解析 `:locale`，拒絕不安全協定和目錄穿越路徑，並轉義標籤。原始 HTML、腳本、樣式、選擇器和任意屬性都不支援。

## 成功結果

顏色或元件改動會穩定出現在使用目前主題的每個頁面。按 `Ctrl+C` 後才會結束持續預覽。

## 常見問題

只改 `config.yml` 只能選擇主題，不會自動產生新的視覺資源。實作、CSS、腳本和 messages 要和模組放在一起，也不要修改產生的 `dist/` 檔案。

## 下一步

當能力需要共用瀏覽器行為或同意後載入時，閱讀[開發一個可重用元件](/zh-tw/posts/components/)。
