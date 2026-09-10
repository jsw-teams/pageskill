---
title: 十分鐘開始你的網站
description: 複製 Pageskill，在原目錄產生網站，再開始修改頁面和 post。
date: 2026-09-07
category: tutorial
---

# 十分鐘開始你的網站

複製下來的 Pageskill 儲存庫就是可以修改和發佈的網站。內容、設定、主題和產生檔案都留在這個工作目錄中。

## 1. 複製並安裝

在可以使用 Git、Node.js 22 或更新版本的終端機執行：

```powershell
git clone https://github.com/jsw-teams/pageskill.git
Set-Location pageskill
npm install
```

## 2. 產生複製下來的網站

```powershell
npm run g
```

`npm run g` 會先編譯執行時、主題和 backend，再驗證並產生這個儲存庫。現在直接修改原始碼樹即可。

## 3. 直接修改網站

首頁改 `content/pages/home/<locale>.md`，帶日期的教學和其他 post 改 `content/posts/<id>/<locale>.md`；教學明確寫 `category: tutorial`，省略它的 post 預設是 `uncategorized`（未分類），版本更新則加上 `category: update` 進入更新封存。網站資料和開關改 `config.yml`。先重用主題已有能力，再增加新的擴充。

## 4. 開啟預覽

```powershell
npm run s
```

在瀏覽器開啟終端機顯示的本機網址。預覽會持續執行；按 `Ctrl+C` 停止，也可以另開終端機繼續修改並再次執行 `npm run g`。

## 成功結果

首頁可以開啟，靜態檔案位於 `dist/public`，而且 `content/pages/home/en.md` 是你可以直接修改的首頁來源。

## 常見問題

如果產生在讀取內容前失敗，請在複製下來的儲存庫再次執行 `npm install`，並確認 Node.js 是 22 或更新版本。不要修改 `dist/` 或 `.pagekiln/` 下的產生檔案。

## 下一步

前往[改成你的名稱和導覽](/zh-tw/posts/site-settings/)，先把複製下來的網站身份換成自己的。
