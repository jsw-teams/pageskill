---
title: 关于 Pageskill
description: Pageskill 是一个用文章和设置搭建网站的工具。
---

# 关于 Pageskill

Pageskill 把 Markdown 文章、站点设置和主题样式生成成一个可发布的网站。普通作者可以直接写内容，不需要为每篇文章手写 HTML。

## 先复用，再扩展

主题提供可复用的文章结构、样式和 Block。先使用现成能力；只有确实缺少结构时，才做一次主题扩展，让后续文章继续使用。个人可以直接修改主题，也可以让 Agent 按目标协助。

基础插件的选项和本地化文案放在 `themes/<name>/theme.yml`，语言启用和回退放在 `config.yml`。渲染器会从这些来源生成 Agent 发现信息和 Markdown 镜像，所以生成文件只能用来检查，不是需要维护的源码。

## 记住三个命令

| 命令 | 作用 |
| --- | --- |
| `npm run g` | 自动校验并生成公开文件。 |
| `npm run s` | 启动持续预览，按 `Ctrl+C` 停止。 |
| `npm run d` | 按设置好的目标发布。 |

当前首页在 `content/pages/home/`；教程、博客、产品文章和版本更新都在 `content/posts/`。给版本说明加上 `category: update`，就会进入[更新归档](/zh-sg/updates/)，同时不会混入普通文章列表。隐私政策是固定入口 `/:locale/privacy/`。先从[十分钟开始你的站点](/zh-sg/posts/start/)开始。
