---
title: 給長內容加目錄
description: 使用真正的 Markdown 標題，讓主題產生可用的內容目錄。
date: 2026-09-08
category: tutorial
---

# 給長內容加目錄

內容目錄從真正的 Markdown 標題產生。讀者可以直接跳到章節，不需要你複製錨點。

## 1. 寫出標題層級

使用一個標題，再用二級標題寫章節，三級標題寫細節：

```markdown
# 同意選擇

## 選擇類別

### 保持可選項目關閉

## 檢查撤回
```

標題保持簡短，並讓相同層級在整篇 post 中表示相同類型的章節。

## 2. 產生 post

```powershell
npm run g
npm run s
```

目前 post 樣式可以在正文旁顯示目錄。如果目前主題匯出了 `toc` Block，需要指定目錄位置時，可在正文加入：

```markdown
:::toc
:::
```

預設 `toc` 外掛在 `themes/default/plugins/toc/`；Block、樣式和 messages 是一個可重用模組。在 `themes/default/theme.yml` 的 `plugins.toc` 下設定開關和目錄深度。

```yaml
plugins:
  toc:
    enabled: true
    maxDepth: 4
    copy:
      zh-tw:
        # 只寫已翻譯的文案，其餘標籤從 messages.yml 回退。
        title: 本頁目錄
```

語言啟用仍在 `config.yml`；`copy` 只修改文案，不會再建立另一套語言系統。

## 成功結果

目錄連結會指向產生的章節 ID。點選連結會跳到章節；目錄收起或窄螢幕時，內容仍然可以閱讀。

## 常見問題

粗體文字不是標題，不能產生有用的目錄項目。不要手寫重複錨點或修改產生的 HTML；使用 Markdown 標題和目前主題能力。

## 下一步

當重複結構需要統一實作時，閱讀[開發一個可重用外掛](/zh-tw/posts/plugins/)。
