---
title: Markdown：像寫筆記一樣寫文章
description: 用標題、段落、清單和程式碼圍欄寫一篇可發佈的最小 post。
date: 2026-09-07
category: tutorial
---

# Markdown：像寫筆記一樣寫文章

Markdown 是一種用純文字標記標題和段落的寫法。內容開頭的 Frontmatter 是中繼資料區，用來告訴 Pageskill 標題、日期和其他 post 資訊。

## 1. 新增 post 檔案

在 `content/posts/hello/zh-tw.md` 寫入完整範例：

````markdown
---
title: 我的第一個 post
description: 記錄今天學到的一件事。
date: 2026-09-07
---

# 我的第一個 post

今天我完成了一個小目標。

## 下一步

- 寫下結果
- 留一個連結

```text
npm run g
```
````

標題使用 `#`，小標題使用 `##`；清單用 `-`，程式碼放在三個反引號之間。長內容留在 Markdown，不要把 HTML 字串塞進設定檔。

## 2. 產生並查看

```powershell
npm run g
npm run s
```

開啟 `/zh-tw/posts/hello/`，確認標題、段落和程式碼區塊都依 post 結構顯示。

## 成功結果

這個 post 會進入 post 列表、Feed、搜尋和網站地圖；檔名 `hello` 形成 post 路由。

## 常見問題

post 缺少 `date` 時不能發佈。日期使用 `YYYY-MM-DD`，並讓不同語言版本共用同一個資料夾名稱；沒有 `category` 的 post 預設屬於未分類。

## 下一步

依照[發佈第一篇教學](/zh-tw/posts/first-post/)的步驟補齊三種語言，再從首頁 post 列表開啟它。
