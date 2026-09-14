---
kind: release
title: '3.1.0：3.x 最后的配置版本'
description: '保留用于版本历史的 3.x 更新说明；新站点应遵循 4.0 Component 契约。'
date: 2026-09-13
---

# 3.1.0：3.x 最后的配置版本

这是 3.x 版本线的历史更新说明。它保留在 release archive 中以保持版本记录准确，但不是当前使用指南。新站点应阅读[4.0.0](/zh-sg/updates/4.0.0/)和[配置结构](/zh-sg/posts/site-settings/)。

3.x 版本线整理了分层配置、站点实例设置、多语言内容、Provider 声明、生成式 discovery 和无障碍检查。4.0.0 又重新审查了这些边界，并有意不把旧写法作为兼容 API 延续下去。

不要把这篇历史说明中的配置或扩展代码复制到 4.0 站点。当前边界很清楚：Markdown 与 Frontmatter 负责内容，Config 负责站点结构，Component 负责可复用行为与表现，Runtime Adapter 可选。
