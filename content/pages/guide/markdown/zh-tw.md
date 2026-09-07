---
title: Markdown 入門
description: 編寫 Frontmatter 和 Pageskill 可以驗證、渲染的普通 Markdown。
pattern: docs
---

# Markdown 入門

Pageskill 將頁面當作內容資料處理。Frontmatter 提供 collection schema 要求的欄位，正文使用 CommonMark 和 GFM 功能。Pattern 和 Block 提供可重用結構，作者不必為每頁編寫 HTML。

## 建立 document 頁面

在網站根目錄建立 `content/pages/hello/zh-tw.md`：

```markdown
---
title: 來自 Markdown 的問候
description: 使用標題、清單、表格和一個可重用 Block 的小頁面。
pattern: document
---

# 來自 Markdown 的問候

Pageskill 會將這段原始碼產生到 `/zh-tw/hello/`。

## 簡短清單

- 用 Markdown 編寫頁面。
- 讓 Frontmatter 名稱與 collection schema 保持一致。
- 只有 `pageskill catalog` 顯示 Block 存在時才重用它。

| 原始碼 | 結果 |
| --- | --- |
| `# 標題` | 語義化標題 |
| `[Guide](/zh-tw/guide/)` | 普通站內連結 |

:::hero{tone="brand" align="left"}
`hero` Block 是可重用的主題結構。
:::
```

starter 提供 `document` Pattern 和 `hero` Block。完整預設主題還提供 `docs`；使用前先執行 `pageskill catalog` 確認能力。

## 使用常見構件

用 `#`、`##` 和 `###` 標題組織文件。正文可使用段落、清單、引用、圍欄程式碼、表格、任務清單和普通 Markdown 連結。在指令上使用標量屬性，例如 `:::hero{tone="brand"}`。長段落寫在 Markdown 中，不要編碼成 HTML 字串。

複製範例前先查看目前名稱：

```bash
pageskill catalog
pageskill inspect pattern:document
pageskill inspect block:hero
```

## 檢查結果

在網站根目錄執行檢查和建置：

```bash
pageskill check
pageskill build
```

預期結果是 check 成功，並在 `dist/` 產生 `/zh-tw/hello/` 頁面。執行 `pageskill s` 時，Markdown 檔案變更會觸發預覽重新整理。

## 常見錯誤

- **頁面沒有標題：** 在 Frontmatter 加入必填的 `title`。
- **Pattern 不存在：** starter 使用 `document`；其他 Pattern 只有在 `catalog` 顯示主題提供後才能複製使用。
- **Block 屬性被拒絕：** inspect 該 Block，只使用它宣告的標量 schema 和允許值。
- **表格或指令顯示異常：** 檢查結尾的 `:::`，並在 Block 內容前後留空行。
- **為了修一個頁面加入 HTML：** 回到 Markdown 和可重用 Pattern 或 Block；原始 HTML 預設會被轉義。

## 預期結果與下一步

現在你可以用 Frontmatter 和可重用 Markdown 結構寫出可檢查的 document 頁面。繼續閱讀[第一批內容](/zh-tw/guide/first-content/)建立頁面和帶日期的產品筆記，或返回 [Guide](/zh-tw/guide/)。

[返回 Guide](/zh-tw/guide/) · [下一步：第一批內容](/zh-tw/guide/first-content/)
