---
title: 发布第一篇教程
description: 建立一个带三种语言版本的 post 目录，并从首页打开它。
date: 2026-09-07
category: tutorial
---

# 发布第一篇教程

教程、日志、产品内容和版本更新都放在 `content/posts/`，每篇 post 都需要日期。明确写 `category: tutorial` 才归入教程；省略 `category` 时默认是 `uncategorized`（未分类）。给版本说明加上 `category: update`，这样[更新归档](/zh-sg/updates/)会和普通 post 分开。固定的 About 或联系页面放在 `content/pages/`，不需要 `date`；三种语言共用一个目录名，post 才能互相切换。

## 1. 建立 post 目录

下面的例子使用 `hello-site` 作为 post ID：

```powershell
New-Item -ItemType Directory content\posts\hello-site
```

在目录内分别建立 `zh-sg.md`、`zh-tw.md` 和 `en.md`。先写简体中文版本：

```markdown
---
title: 我的网站上线了
description: 记录第一次发布。
date: 2026-09-07
author: toewpq
cover: assets/og-default-product.webp
---

# 我的网站上线了

这是我的第一个 post，今天开始记录这里的内容。

## 下一步

我会继续写下新的尝试。
```

其他语言只需翻译标题、说明和正文，保留相同的 `date` 和目录名；post 集合会提供默认样式。

`author` 是普通文字；省略它时，会使用 `config.yml` 里对应语言的 `author`。`cover` 是可选的：把源图片放在 `content/assets/`，在 Frontmatter 写公开路径 `assets/<路径>`（或 `/assets/<路径>`）。仓库现有的 `assets/og-default-product.webp` 是当前的小熊图片；生成后位于 `dist/public/assets/`。没有 `cover` 的文章不会被强行加上统一封面，危险 URL 协议也会被拒绝。

## 2. 生成并打开

```powershell
npm run g
npm run s
```

打开 `/zh-sg/posts/hello-site/`，再从文章内的语言链接查看另外两个版本。

## 成功结果

首页的 post 列表出现新内容，三种语言都能从 `/locale/posts/hello-site/` 进入，Feed 和搜索也会收到它。

## 常见坑

不要为每种语言使用不同的目录名，也不要把 post 放到只能放当前页面的路径里。一个 ID 加三个 locale 文件，才会得到一组可切换的内容。

## 下一步

继续看[我们如何构建插件：以 Cookie 选择器为例](/zh-sg/posts/cookies/)，学习完整的同意后加载插件。
