---
title: 從 Pageskill 開始
description: 安裝 Pageskill、建立中性網站並執行第一次檢查建置。
pattern: docs
---

# 從 Pageskill 開始

Pageskill 將 Markdown、Frontmatter、可重用的 Pattern 和 Block、collection schema 與網站設定編譯成可檢查的網站。人可以直接使用內建能力，Agent 是可選的；頁面作者寫內容，不必為每頁手寫 HTML。

## 需要什麼

安裝 Node.js `>=22.12.0`、npm 和 Git。為 `pageskill init` 建立的網站準備一個新的目標目錄。

## 從原始碼倉庫安裝

在 Pageskill 原始碼倉庫中執行：

```bash
git clone https://github.com/jsw-teams/pageskill.git
cd pageskill
npm install
npm run compile-runtime
npm run compile-theme
npm run compile-backend
npm link
```

三個 compile 命令會產生連結的 `pageskill` 所需 runtime、主題和 backend 產物。連結指向目前原始碼，因此原始碼變更後重新執行對應的 compile 命令。

## 建立網站

在你存放專案的目錄建立空網站目錄並初始化：

```bash
mkdir my-site
cd my-site
pageskill init
```

`pageskill init` 複製中性的 `starter/` 契約，建立 `config.yml`、starter 頁面和 starter 主題，其中有 `landing`、`document`、`blog` Pattern。CLI 不會暗藏第二份模板。

## 檢查並建置

新增內容前先發現能力，再檢查並建置：

```bash
pageskill catalog
pageskill inspect pattern:landing
pageskill inspect block:hero
pageskill check
pageskill build
```

預期結果是 check 成功，接著 `dist/` 出現產生的 HTML 和網站資源。需要在瀏覽器閱讀結果時啟動本機預覽：

```bash
pageskill s
```

開啟[http://127.0.0.1:4173/](http://127.0.0.1:4173/)。預覽會監看 `config.yml`、`content/` 和 `themes/`，受影響的檔案編輯後會重新建置。

## 常見錯誤

- **找不到 `pageskill`：** 在編譯命令後於原始碼倉庫執行 `npm link`；如果 shell 尚未更新命令路徑，重新開啟終端機。
- **Node 版本被拒絕：** 安裝支援的 Node.js 版本後重新執行 `npm install`。
- **初始化複製到錯誤位置：** 停止操作，選擇空的目標目錄，在那裡執行 `pageskill init`；原始碼倉庫與網站目錄分開。
- **starter 頁面使用了 `docs`：** starter 提供 `document`；只有 `catalog` 確認主題含有 `docs` 後才複製並使用它。

## 預期結果與下一步

現在你已有可檢查、建置和預覽的中性 Pageskill 網站。保持 `dist/` 為產生目錄，繼續編輯原始碼檔案。

[返回 Guide](/zh-tw/guide/) · [下一步：網站設定](/zh-tw/guide/site-settings/)
