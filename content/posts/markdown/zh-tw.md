---
title: "Markdown：寫出完整的 Pageskill 文章"
description: 實際學習 Pageskill 支援並檢查的 Markdown 寫作語法。
date: 2026-09-07
category: tutorial
---

# Markdown：寫出完整的 Pageskill 文章

Pageskill 使用 Markdown 保存內容，讓原始碼在產生網頁前也保持容易閱讀。頂部的 YAML Frontmatter 描述文件，下面的 Markdown 正文則是讀者會看到的內容。

## 1. 從 Frontmatter 開始

新增 `content/posts/hello/zh-tw.md`，為每篇文章填寫標題、簡介和發佈日期。`zh-sg`、`zh-tw` 和 `en` 翻譯應使用同一個目錄 id。

````markdown
---
title: 我的第一篇文章
description: 今天學到的一件有用的事。
date: 2026-09-07
---

# 我的第一篇文章

今天完成了一個小目標，並記錄它為什麼有效。

## 下一步

- 記錄結果
- 保留[一個有用連結](https://example.com/notes)

```text
npm run g
```
````

這個例子中的第一個 `#` 是文章標題。Pageskill 還會提供頁面 Header，因此真實文章不要再新增一份相同標題。長內容應放在 Markdown 中，而不是放進設定裡的 HTML 字串。

## 2. 寫出容易閱讀的內容

標題應按層級使用，文章標題下面的章節從 `##` 開始。段落之間留一個空行。Markdown 支援 **粗體**、*斜體* 和 ~~刪除線~~，也支援用反斜線轉義的文字，例如 \*這句話兩側會顯示星號\*。

清單可以是無序或有序，也可以巢狀：

- 先整理重要想法。
  - 把補充細節放低一級。
  - 每一項盡量短，方便掃讀。
1. 說明背景。
2. 展示變化。
3. 連結到[設定教學](/zh-tw/posts/site-settings/)。

任務清單適合用來表達教學中的小檢查清單：

- [x] 寫好 Frontmatter
- [ ] 檢查產生後的頁面
- [ ] 只用鍵盤測試頁面

## 3. 新增連結和圖片

連結文字應該說明目的，例如[閱讀 Pageskill 設定教學](/zh-tw/posts/site-settings/)，不要只寫「點擊這裡」。Pageskill 支援內部路由、[跳到下面的清單](#checklist)這樣的片段連結，也支援 https://github.com/jsw-teams/pageskill 這樣的安全外部連結。

![顯示網站導覽和文章卡片的 Pageskill 首頁](/assets/learning/markdown.png)

alt 文字應該描述圖片傳達的資訊，而不是重複寫「圖片」。裝飾圖片可以使用空 alt，但應先確認它確實只是裝飾。

## 4. 使用程式碼、引用和表格

短命令或欄位名稱適合使用行內 `code`。多行內容使用程式碼圍欄，並寫上語言名稱幫助讀者識別：

```yaml
theme:
  name: default
  config: ./site/theme.yml
```

每個產生的程式碼區塊都有本地化的複製按鈕。你可以複製整個程式碼區塊，也可以選取其中一部分後使用瀏覽器正常的複製命令；按鈕不會覆蓋程式碼文字。

> Markdown 應讓原始碼和產生後的網頁都方便維護者與讀者閱讀。

| 元素 | 用途 | 無障礙提示 |
| --- | --- | --- |
| 標題 | 組織結構 | 保持層級連續 |
| 連結 | 頁面導覽 | 描述連結目的地 |
| 圖片 | 傳達視覺資訊 | 撰寫有意義的 alt |

使用 `---` 插入主題分隔線。表格在窄螢幕會保留自己的橫向捲動，其他頁面內容仍會適應視窗寬度。

## 5. 重用 Pageskill Block

Pageskill 支援可信的 Block，用來重用常見的展示模式。下面這個 Feature Grid 仍然寫在 Markdown 中，但結構和樣式屬於目前主題：

:::feature-grid{columns="2"}
### 內容保持可移植

用 Markdown 寫頁面和文章，再讓編譯器產生路由和元資料。

### 設定保持清楚

在 `config.yml` 修改網站資料，在 `site/theme.yml` 修改主題實例選項。
:::

## 清單

在發佈前執行：

```text
npm run g
npm run s
```

開啟 `/zh-tw/posts/hello/`，檢查標題和連結，並在窄螢幕寬度下查看頁面。Frontmatter 和路由有效時，產生的文章會進入文章歸檔、搜尋索引、Feed 和 sitemap。

## 常見錯誤與下一步

沒有 `date` 的文章不能發佈。使用穩定的 `YYYY-MM-DD` 日期，讓翻譯檔案共用一個文章 id；只有文章在首次發佈後修改過，才新增 `update: YYYY-MM-DD`。

接著閱讀[發佈第一篇教學](/zh-tw/posts/first-post/)，了解完整發佈流程；網站設定請看[設定](/zh-tw/posts/site-settings/)，主題實例邊界請看[自訂主題](/zh-tw/posts/customize/)。
