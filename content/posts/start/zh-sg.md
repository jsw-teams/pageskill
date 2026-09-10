---
title: 十分钟开始你的站点
description: 克隆 Pageskill，在原目录生成网站，然后开始修改页面和 post。
date: 2026-09-07
category: tutorial
---

# 十分钟开始你的站点

克隆下来的 Pageskill 仓库就是可以修改和发布的站点。内容、设置、主题和生成文件都留在这个工作目录中。

## 1. 克隆并安装

在可以使用 Git、Node.js 22 或更新版本的终端执行：

```powershell
git clone https://github.com/jsw-teams/pageskill.git
Set-Location pageskill
npm install
```

## 2. 生成克隆的站点

```powershell
npm run g
```

`npm run g` 会先编译运行时、主题和 backend，再校验并生成这个仓库。现在直接修改源码树即可。

## 3. 直接修改站点

首页改 `content/pages/home/<locale>.md`，带日期的教程和其他 post 改 `content/posts/<id>/<locale>.md`；教程明确写 `category: tutorial`，省略它的 post 默认是 `uncategorized`（未分类），版本更新则加上 `category: update` 进入更新归档。站点数据和开关改 `config.yml`。先复用主题已有能力，再增加新的扩展。

## 4. 打开预览

```powershell
npm run s
```

在浏览器打开终端显示的本地地址。预览会持续运行；按 `Ctrl+C` 停止，也可以另开终端继续修改并再次运行 `npm run g`。

## 成功结果

首页能打开，静态文件位于 `dist/public`，而且 `content/pages/home/en.md` 是你可以直接修改的首页来源。

## 常见坑

如果生成在读取内容前失败，请在克隆的仓库中再次运行 `npm install`，并确认 Node.js 是 22 或更高版本。不要修改 `dist/` 或 `.pagekiln/` 下的生成文件。

## 下一步

去看[改成你的名字和导航](/zh-sg/posts/site-settings/)，先把克隆的站点身份换成自己的。
