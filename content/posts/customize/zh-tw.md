---
title: 更換樣式，或讓 Agent 幫你改
description: 複製主題一次，先修改顏色和間距；需要新結構時，把它做成可重複使用的能力。
date: 2026-09-07
---

# 更換樣式，或讓 Agent 幫你改

樣式決定顏色、字型和間距。主題還可以提供可重複使用的文章結構。個人可以直接編輯這些檔案，也可以把目標、範圍和成功頁面交給 Agent。

## 1. 複製一份主題

在網站根目錄複製預設主題，為副本換一個名稱：

```powershell
Copy-Item -Recurse themes\default themes\journal
```

編輯 `themes/journal/theme.yml`，把 `name` 改成 `journal`；再在 `config.yml` 選擇它：

```yaml
theme:
  name: journal
```

## 2. 先改一個顏色

開啟 `themes/journal/style.css`，修改現有的 CSS 變數：

```css
:root {
  --color-brand: #8b4f2f;
  --color-paper: #fffaf1;
}
```

保留主題已有的結構和資源宣告，先執行產生確認變化，再繼續調整。

## 3. 需要新結構時做一次

如果現有 Block 不夠，在主題模組中實作一個可重用 Block，並在 `theme.yml` 登記。頁面文章只寫 Markdown 和短屬性，不把 HTML 複製到每篇文章。

```powershell
pageskill g
pageskill s
```

## 成功結果

同一份主題副本會影響網站中所有使用它的文章；重新產生後，顏色或新 Block 會在每個目標頁面一致出現。

## 常見問題

只修改 `config.yml` 裡的樣式名稱不會產生視覺變化；名稱、主題資料夾和 `theme.yml` 必須一致。不要直接修改產生的 `dist/` 檔案。

## 下一步

閱讀[把網站放到網路上](/zh-tw/posts/deploy/)，確認公開目錄和同源 API 的部署邊界。
