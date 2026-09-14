---
kind: page
title: 关于 Pageskill
description: Pageskill 是一个用文章和设置搭建网站的工具。
---

# 关于 Pageskill

Pageskill 把 Markdown 文章、站点设置和主题样式生成成一个可发布的网站。普通作者可以直接写内容，不需要为每篇文章手写 HTML。

## 先复用，再扩展

主题提供可复用的 Component、样式和内容契约。先使用现成能力；只有确实缺少能力时，才实现一个 Component，让后续内容继续复用。个人可以直接修改主题，也可以让 Agent 按目标协助。

基础组件的选项和本地化文案放在 `theme.config` 指向的站点实例文件（通常是 `site/theme.yml`），语言启用和回退放在 `config.yml` 或其 extends 文件。`themes/<name>/` 是可复用的实现代码目录，不是站点实例配置目录。渲染器会从这些来源生成 Agent 发现信息和 Markdown 镜像，所以生成文件只能用来检查，不是需要维护的源码。

## 记住两个命令

| 命令 | 作用 |
| --- | --- |
| `page g` | 自动校验并生成公开文件。 |
| `page s` | 启动持续预览，按 `Ctrl+C` 停止。 |

当前首页在 `content/pages/home/`；教程、博客和产品文章位于 `content/posts/`，版本更新位于独立的 `content/updates/` collection，并直接进入[更新归档](/zh-sg/updates/)。它不再依赖普通文章的分类过滤。隐私政策是固定入口 `/:locale/privacy/`。先从[十分钟开始你的站点](/zh-sg/posts/start/)开始。
