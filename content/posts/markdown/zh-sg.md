---
title: Markdown：像写笔记一样写文章
description: 用标题、段落、列表和代码围栏写一篇可发布的最小文章。
date: 2026-09-07
---

# Markdown：像写笔记一样写文章

Markdown 是一种用纯文本标记标题和段落的写法。文章开头的 Frontmatter 是元数据区，用来告诉 Pageskill 标题、日期和其他信息。

## 1. 新建文章文件

在 `content/posts/hello/zh-sg.md` 写入完整例子：

````markdown
---
title: 我的第一篇文章
description: 记录今天学到的一件事。
date: 2026-09-07
---

# 我的第一篇文章

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

打开 `/zh-sg/posts/hello/`，确认标题、段落和代码块都按文章结构显示。

## 成功结果

这篇文章会进入文章列表、Feed、搜索和站点地图；文件名 `hello` 形成文章路由。

## 常见坑

文章缺少 `date` 时不能作为文章发布。日期使用 `YYYY-MM-DD`，并让不同语言版本共用同一个目录名；普通文章直接使用集合默认样式即可。

## 下一步

按[发布第一篇文章](/zh-sg/posts/first-post/)的步骤补齐三种语言，再从首页文章列表打开它。
