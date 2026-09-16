---
kind: post
title: 讓訪客搜到頁面和內容
description: 啟用現成的本地搜尋，並檢查每種語言產生的索引。
date: 2026-09-08
category: tutorial
---

# 讓訪客搜到頁面和內容

Pageskill 搜尋會從頁面和帶日期的 post 產生。瀏覽器透過 `runtime.assetJson` 讀取目前語言的靜態索引；它不使用 `config.apis`、資料庫、Cookie 或第三方請求。

## 1. 開啟搜尋設定

在 `theme.config` 指向的網站實例檔案（通常是 `site/theme.yml`）中設定元件選項：

```yaml
components:
  search:
    enabled: true
    maxResults: 8
    shardSize: 500
    copy:
      zh-tw:
        # copy 是資料；缺少的 key 會從 messages.yml 回退。
        placeholder: 搜尋本站
```

`maxResults` 限制顯示數量，`shardSize` 控制產生索引如何分片；網站還不大時保持預設值即可。

`copy` 可選，也可以只翻譯一部分。語言啟用和回退仍然放在 `config.yml`，不要為搜尋元件增加語言開關。只有要改變行為或 schema 時，才修改模組程式碼。

目前主題的搜尋模組在 `themes/default/components/search/`；`index.ts`、腳本、樣式和 messages 放在一起。只有需要改變預設搜尋行為時才修改這個模組。

## 2. 產生並試搜

```powershell
page g
page s
```

在與 post 相同的語言頁面開啟預覽，輸入一個完整詞，再點選結果。搜尋會包含該語言的穩定頁面和帶日期 post。

## 成功結果

搜尋框能返回標題、標題層級、摘要和正文的符合結果。結果保留原語言路由，執行 `page g` 後索引會更新。

## 常見問題

不要把 Search 寫進 `config.apis`，也不要把它當成外部服務。修改 Markdown 後，已有預覽不會在沒有產生或重建時更新。不要直接改 `dist/` 下產生的搜尋 JSON；應修改來源內容或 `site/theme.yml` 中的搜尋選項。

## 下一步

閱讀[給長內容加目錄](/zh-tw/posts/toc/)，讓搜尋結果更容易繼續閱讀。
