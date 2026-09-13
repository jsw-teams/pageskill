---
title: '3.0.2：更清晰的归档与响应式阅读'
description: '关于 3.0 版本线中过滤更新、文章布局和响应式主题细节的历史版本说明。'
date: 2026-09-10
category: update
---

# 3.0.2：更清晰的归档与响应式阅读

这是一篇 3.0 版本线的历史更新说明。当前站点写法请以[3.1.0](/zh-sg/updates/3.1.0/)和[配置结构](/zh-sg/posts/site-settings/)为准；新站不应从旧版本文章复制配置。

## 3.0.2 发布了什么

- 版本说明通过 post pipeline 和 `category: update` 生成。筛选后的 updates view 把版本说明与普通 post 分开，同时保留多语言归档、详情、Feed、搜索和语言链接。
- Post 分类来自 Markdown Frontmatter：`tutorial`、`update`，或省略后使用 `uncategorized`。
- 文章标题、简介、发布日期、作者和封面整理成紧凑的响应式布局。归档图片使用有边界的容器，手机目录默认折叠。
- 主题增加了位于标准 Navigation 和 Footer 前后的结构化 Chrome 插槽。这些插槽只接受安全的结构化链接，不接受 HTML 或脚本。
- Discovery 文件、API 元数据、Markdown 协商、Content-Signal 和条件 Agent 声明都从当前源码生成，不再作为手工维护的快照。

## 当前说明

3.1.0 保留了有价值的内容和渲染能力，但删除了历史配置别名。站点实例覆盖项现在只放在 `theme.config` 指向的文件中，普通 Integration 放在根级 `integrations`，Navigation/Footer link 使用同一套站点级 schema。复制旧 checkout 的配置前，请先阅读[3.1.0 更新说明](/zh-sg/updates/3.1.0/)。

`updates` view 是 post 的版本说明视图，不等于 post Frontmatter 中可选的 `update` 字段；后者表示某一篇文章最后一次被修改的时间。

## 下一步

当前流程请从[配置结构](/zh-sg/posts/site-settings/)和[配置 Integration 与隐私同意](/zh-sg/posts/cookies/)开始。
