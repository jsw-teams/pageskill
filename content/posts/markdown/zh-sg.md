---
title: Markdown：像写笔记一样写文章
description: 用标题、段落、列表和代码围栏写一篇可发布的最小 post。
date: 2026-09-07
category: tutorial
---

# Markdown：像写笔记一样写文章

Markdown 是一种用纯文本标记标题和段落的写法。内容开头的 Frontmatter 是元数据区，用来告诉 Pageskill 标题、日期和其他 post 信息。

## 1. 新建 post 文件

在 `content/posts/hello/zh-sg.md` 写入完整例子：

````markdown
---
title: 我的第一个 post
description: 记录今天学到的一件事。
date: 2026-09-07
---

# 我的第一个 post

今天我完成了一个小目标。

## 下一步

- 写下结果
- 留一个链接

```text
npm run g
```
````

标题使用 `#`，小标题使用 `##`；列表用 `-`，代码放在三个反引号之间。长内容留在 Markdown，不要把 HTML 字符串塞进设置文件。

## 2. 生成并查看

```powershell
npm run g
npm run s
```

打开 `/zh-sg/posts/hello/`，确认标题、段落和代码块都按 post 结构显示。

## 成功结果

这个 post 会进入 post 列表、Feed、搜索和站点地图；文件名 `hello` 形成 post 路由。

## 常见坑

post 缺少 `date` 时不能发布。日期使用 `YYYY-MM-DD`，并让不同语言版本共用同一个目录名；没有 `category` 的 post 默认属于未分类。

## 下一步

按[发布第一篇教程](/zh-sg/posts/first-post/)的步骤补齐三种语言，再从首页 post 列表打开它。
