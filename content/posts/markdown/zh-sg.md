---
kind: post
title: "Markdown：写出完整的 Pageskill 文章"
description: 实际学习 Pageskill 支持并检查的 Markdown 写作语法。
date: 2026-09-07
category: tutorial
---

# Markdown：写出完整的 Pageskill 文章

Pageskill 使用 Markdown 保存内容，让源码在生成网页前也保持容易阅读。顶部的 YAML Frontmatter 描述文档，下面的 Markdown 正文则是读者会看到的内容。

## 1. 从 Frontmatter 开始

新建 `content/posts/hello/zh-sg.md`，为每篇文章填写标题、简介和发布日期。`zh-sg`、`zh-tw` 和 `en` 翻译应使用同一个目录 id。

````markdown
---
title: 我的第一篇文章
description: 今天学到的一件有用的事。
date: 2026-09-07
---

# 我的第一篇文章

今天完成了一个小目标，并记录了它为什么有效。

## 下一步

- 记录结果
- 保留[一个有用链接](https://example.com/notes)

```text
page g
```
````

这个例子中的第一个 `#` 是文章标题。Pageskill 还会提供页面 Header，因此真实文章不要再添加一份相同标题。长内容应该放在 Markdown 中，而不是放进设置里的 HTML 字符串。

## 2. 写出容易阅读的内容

标题应按层级使用，文章标题下面的章节从 `##` 开始。段落之间留一个空行。Markdown 支持 **粗体**、*斜体* 和 ~~删除线~~，也支持用反斜线转义的文字，例如 \*这句话两侧会显示星号\*。

列表可以是无序或有序，也可以嵌套：

- 先收集重要想法。
  - 把补充细节放低一级。
  - 每一项尽量短，便于扫描。
1. 说明背景。
2. 展示变化。
3. 链接到[配置教程](/zh-sg/posts/site-settings/)。

任务列表适合用来表达教程中的小检查清单：

- [x] 写好 Frontmatter
- [ ] 检查生成后的页面
- [ ] 只用键盘测试页面

## 3. 添加链接和图片

链接文字应该说明目的，例如[阅读 Pageskill 配置教程](/zh-sg/posts/site-settings/)，不要只写“点击这里”。Pageskill 支持内部路由、[跳到下面的清单](#checklist)这样的片段链接，也支持 https://github.com/jsw-teams/pageskill 这样的安全外部链接。

![显示站点导航和文章卡片的 Pageskill 首页](/assets/learning/markdown.png)

alt 文字应该描述图片传达的信息，而不是重复写“图片”。装饰图片可以使用空 alt，但应先确认它确实只是装饰。

## 4. 使用代码、引用和表格

短命令或字段名适合使用行内 `code`。多行内容使用代码围栏，并写上语言名称帮助读者识别：

```yaml
theme:
  name: default
  config: ./site/theme.yml
```

每个生成的代码块都有本地化的复制按钮。你可以复制整个代码块，也可以选中其中一部分后使用浏览器正常的复制命令；按钮不会覆盖代码文字。

> Markdown 应让源码和生成后的网页都便于维护者与读者阅读。

| 元素 | 用途 | 无障碍提示 |
| --- | --- | --- |
| 标题 | 组织结构 | 保持层级连续 |
| 链接 | 页面导航 | 描述链接目的地 |
| 图片 | 传达视觉信息 | 撰写有意义的 alt |

使用 `---` 插入主题分隔线。表格在窄屏会保留自己的横向滚动，其他页面内容仍会适应视口宽度。

## 5. 组合可复用 Component

Pageskill 支持可信的 Component，用来重用常见的展示行为。下面这个 Feature Grid 仍然写在 Markdown 中，但结构和样式属于当前主题：

:::feature-grid{columns="2"}
### 内容保持可移植

用 Markdown 写页面和文章，再让编译器生成路由和元数据。

### 配置保持清楚

在 `config.yml` 修改站点数据，在 `site/theme.yml` 修改主题实例选项。
:::

## 清单

在发布前运行：

```text
page g
page s
```

打开 `/zh-sg/posts/hello/`，检查标题和链接，并在窄屏宽度下查看页面。Frontmatter 和路由有效时，生成的文章会进入文章归档、搜索索引、Feed 和 sitemap。

## 常见错误与下一步

没有 `date` 的文章不能发布。使用稳定的 `YYYY-MM-DD` 日期，让翻译文件共用一个文章 id；只有文章在首次发布后修改过，才添加 `updated: YYYY-MM-DD`。

接着阅读[发布第一篇教程](/zh-sg/posts/first-post/)，了解完整发布流程；站点设置请看[配置](/zh-sg/posts/site-settings/)，主题实例边界请看[自定义主题](/zh-sg/posts/customize/)。
