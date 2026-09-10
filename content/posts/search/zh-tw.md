---
title: 讓訪客搜到頁面和內容
description: 啟用現成的本地搜尋，並檢查每種語言產生的索引。
date: 2026-09-08
category: tutorial
---

# 讓訪客搜到頁面和內容

Pageskill 搜尋會從頁面和帶日期的 post 產生。瀏覽器讀取目前語言的索引，搜尋框不需要自訂 API。

## 1. 開啟搜尋設定

在 `themes/default/theme.yml` 中設定外掛選項：

```yaml
plugins:
  search:
    enabled: true
    maxResults: 8
    shardSize: 500
```

`maxResults` 限制顯示數量，`shardSize` 控制產生索引如何分片；網站還不大時保持預設值即可。

目前主題的搜尋模組在 `themes/default/plugins/search/`；`index.ts`、腳本、樣式和 messages 放在一起。只有需要改變預設搜尋行為時才修改這個模組。

## 2. 產生並試搜

```powershell
npm run g
npm run s
```

在與 post 相同的語言頁面開啟預覽，輸入一個完整詞，再點選結果。搜尋會包含該語言的穩定頁面和帶日期 post。

## 成功結果

搜尋框能返回標題、標題層級、摘要和正文的符合結果。結果保留原語言路由，執行 `npm run g` 後索引會更新。

## 常見問題

修改 Markdown 後，已有預覽不會在沒有產生或重建時更新。不要直接改 `dist/` 下產生的搜尋 JSON；應修改來源內容或 `themes/default/theme.yml` 中的搜尋選項。

## 下一步

閱讀[給長內容加目錄](/zh-tw/posts/toc/)，讓搜尋結果更容易繼續閱讀。
