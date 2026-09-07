---
title: 十分钟开始你的站点
description: 从源码仓库安装 Pageskill，复制 starter，并生成一个可以继续写文章的网站。
date: 2026-09-07
---

# 十分钟开始你的站点

Pageskill 的源码仓库和你要发布的站点是两件事。先在源码仓库编译 CLI，再复制 `starter` 作为新站。

## 1. 安装 Pageskill

在可以使用 Git、Node.js 22 或更新版本的终端执行：

```powershell
git clone https://github.com/jsw-teams/pageskill.git
Set-Location pageskill
npm install
npm run g
npm link
```

`npm run g` 会先编译源码，再生成仓库自己的站点；`npm link` 让 `pageskill` 命令可以在其他目录使用。

## 2. 复制 starter

离开源码仓库，复制一个干净的起点：

```powershell
Copy-Item -Recurse starter ..\my-site
Set-Location ..\my-site
pageskill g
```

你现在有了一个只含首页的站点。以后修改的是 `my-site`，源码仓库负责提供 CLI 和主题能力。

## 3. 打开预览

```powershell
pageskill s
```

在浏览器打开终端显示的本地地址。预览会持续运行；按 `Ctrl+C` 停止，也可以另开终端继续修改并再次运行 `pageskill g`。

## 成功结果

首页能打开，静态文件位于 `dist/public`，而且 `content/pages/home/en.md` 是你可以直接修改的首页来源。

## 常见坑

如果 `pageskill` 找不到，通常是还没有在源码仓库运行 `npm link`，或当前终端没有刷新 PATH。重新打开终端后，再从新站目录运行 `pageskill g`。

## 下一步

去看[改成你的名字和导航](/zh-sg/posts/site-settings/)，先把站点身份换成自己的。
