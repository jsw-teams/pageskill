---
title: 发布第一篇文章
description: 建立一个带三种语言版本的文章目录，并从首页打开它。
date: 2026-09-07
---

# 发布第一篇文章

普通教程、日志和产品记录都可以放在 `content/posts/`，这类文章需要日期。固定的 About 或联系页面放在 `content/pages/`，不需要 `date`；三种语言共用一个目录名，文章才能互相切换。

## 1. 建立文章目录

下面的例子使用 `hello-site` 作为文章 ID：

```powershell
New-Item -ItemType Directory content\posts\hello-site
```

在目录内分别建立 `zh-sg.md`、`zh-tw.md` 和 `en.md`。先写简体中文版本：

```markdown
---
title: 我的网站上线了
description: 记录第一次发布。
date: 2026-09-07
---

# 我的网站上线了

这是我的第一篇文章，今天开始记录这里的内容。

## 下一步

我会继续写下新的尝试。
```

其他语言只需翻译标题、说明和正文，保留相同的 `date` 和目录名；文章集合会提供默认样式。

## 2. 生成并打开

```powershell
pageskill g
pageskill s
```

打开 `/zh-sg/posts/hello-site/`，再从文章内的语言链接查看另外两个版本。

## 成功结果

首页的文章列表出现新文章，三种语言都能从 `/locale/posts/hello-site/` 进入，Feed 和搜索也会收到它。

## 常见坑

不要为每种语言使用不同的目录名，也不要把文章放到只能放当前页面的路径里。一个 ID 加三个 locale 文件，才会得到一组可切换的文章。

## 下一步

继续看 [Cookie 选择：先问访客再加载](/zh-sg/posts/cookies/)，为可选服务设好默认关闭的选择。
