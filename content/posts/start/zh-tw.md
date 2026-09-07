---
title: 十分鐘開始你的網站
description: 從原始碼儲存庫安裝 Pageskill，複製 starter，產生一個可以繼續寫文章的網站。
date: 2026-09-07
---

# 十分鐘開始你的網站

Pageskill 的原始碼儲存庫和你要發佈的網站是兩件事。先在原始碼儲存庫編譯 CLI，再複製 `starter` 作為新網站。

## 1. 安裝 Pageskill

在可以使用 Git、Node.js 22 或更新版本的終端機執行：

```powershell
git clone https://github.com/jsw-teams/pageskill.git
Set-Location pageskill
npm install
npm run g
npm link
```

`npm run g` 會先編譯原始碼，再產生儲存庫自己的網站；`npm link` 讓 `pageskill` 指令可以在其他資料夾使用。

## 2. 複製 starter

離開原始碼儲存庫，複製一個乾淨的起點：

```powershell
Copy-Item -Recurse starter ..\my-site
Set-Location ..\my-site
pageskill g
```

現在你有一個只含首頁的網站。之後修改的是 `my-site`，原始碼儲存庫負責提供 CLI 和主題能力。

## 3. 開啟預覽

```powershell
pageskill s
```

在瀏覽器開啟終端機顯示的本機網址。預覽會持續執行；按 `Ctrl+C` 停止，也可以另開終端機繼續修改並再次執行 `pageskill g`。

## 成功結果

首頁可以開啟，靜態檔案位於 `dist/public`，而且 `content/pages/home/en.md` 是你可以直接修改的首頁來源。

## 常見問題

如果找不到 `pageskill`，通常是還沒有在原始碼儲存庫執行 `npm link`，或目前終端機還沒有更新 PATH。重新開啟終端機後，再從新網站資料夾執行 `pageskill g`。

## 下一步

前往[改成你的名稱和導覽](/zh-tw/posts/site-settings/)，先把網站身份換成自己的。
