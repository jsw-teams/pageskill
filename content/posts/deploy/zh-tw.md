---
title: 把網站放到網路上
description: 設定一個發佈目標，產生公開快照，並保持同源 API 與私有程式碼隔離。
date: 2026-09-07
---

# 把網站放到網路上

發佈前先確認網站在本機可以開啟。Pageskill 的公開快照位於 `dist/public`；`backend/handler.ts` 和執行時秘密留在伺服器，動態請求由同源 API 處理。

## 1. 填寫發佈目標

在網站根目錄的 `config.yml` 填入實際使用的目標。下面以既有 Git remote 發佈為例：

```yaml
deployment:
  targets:
    - github
  github:
    remote: origin
    branch: gh-pages
```

Token 或 SSH 金鑰放在本機環境和金鑰檔案，不要寫進 `config.yml`、文章或公開目錄。

## 2. 先產生公開檔案

```powershell
pageskill g
```

查看 `dist/public`，確認首頁、文章、資源和網站地圖都在裡面。需要 API 的網站還要準備同一個服務的後端執行時。

## 3. 發佈

```powershell
pageskill d
```

Pageskill 會依照 `deployment.targets` 執行目標。發佈後從目標網域開啟首頁和一篇文章，再呼叫你自己的同源 API 路徑確認伺服器邊界。

## 成功結果

託管平台接收了 `dist/public`，公開 URL 可以開啟產生頁面；私有的 Worker、server 檔案和秘密沒有進入靜態快照。

## 常見問題

`targets: []` 或 remote、branch 不符合時，發佈沒有可執行的目標。先檢查 `config.yml`，也不要把完整專案根目錄直接當成靜態網站根目錄。

## 下一步

閱讀[隱私說明](/zh-tw/privacy/)，把 Cookie、資料收集和聯絡方法寫給訪客。
