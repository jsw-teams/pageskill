---
kind: release
title: '4.0.0：Component 负责行为，Content 负责内容'
description: '一次 breaking architecture release：Theme 扩展统一为 Component，并把站点内容与可复用实现彻底分开。'
date: 2026-09-14
---

# 4.0.0：Component 负责行为，Content 负责内容

Pageskill 4.0.0 是一次 breaking architecture release。现在 Theme 只有一个公开扩展概念，并遵循一条清楚的归属原则：

> Component owns behavior and presentation; Content owns content.

## 这次改变了什么

- Built-in Component 和 External Component 是仅有的来源概念。`render`、`client`、`server`、`storage`、`cache`、`ai`、`integration` 表达一个 Component 需要的能力，不再建立 Plugin、Pattern、Layout 或 Module 等平行 API。
- Markdown、Frontmatter、Config 和 Runtime Data 负责读者看到的文案、链接、文档、分类与品牌数据。Component defaults 只能保存行为与结构默认值，不能保存 Demo 记录或站点正文。
- Component 支持 children、named slots、structured props 和 Runtime Data。稳定的组合与 Core content query 取代页面专用 variant 和写死的文章 ID。
- 普通文章使用 `kind: post`；release note 是真正的 `content/updates/` 集合并使用 `kind: release`。`updated` 只表示最后一次实质修改，`category` 仍然只是普通文章分类，归档类型明确分层。
- Comments 是可选 External Component；Comment Translation 是独立的可选能力，使用平台无关 Server Function contract、L1 与持久化 Cache、source hash 和 single-flight 推理。
- Core 在没有 Server 环境时仍可工作。Cloudflare Pages、D1、Workers AI 和 Cache API 只是一个 Reference Runtime Adapter，不是 Core 依赖。
- `page g`、`page c` 和 `page s` 是仅有的公开命令。`page g` 不启动浏览器；`page c` 生成带标注和多分辨率截图的私有 PDF 无障碍报告，绝不把报告或 disclaimer 发布到 `dist/public`。

## 迁移边界

这不是兼容版本。把 Theme TypeScript 和 Component messages 中的读者内容迁回 `content/` 或站点配置；把旧扩展注册改成 `ComponentDefinition`，为文档设置 `kind`，只有真实实现 Runtime 时才配置 `runtime.adapter`。请阅读[开发可复用 Component](/zh-sg/posts/components/)和[配置结构](/zh-sg/posts/site-settings/)了解当前写法。

最直接的可复用性测试是：只更换站点名称、首页内容、导航、文章、分类和 Runtime Data，不修改 Theme TypeScript；正确的 Component 应继续生成新站点。
