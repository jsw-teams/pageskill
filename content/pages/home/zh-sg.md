---
kind: page
title: Pageskill：用 Markdown 搭建内容网站
description: 用 Markdown、YAML 和可复用 Component 搭建清晰的多语言内容网站。
component: home
toc: false
---

:::hero{tone="brand" align="left" media="/assets/hero-telescope.png" mediaAlt="代表清晰站点发现能力的小型望远镜" mediaWidth="300" mediaHeight="300"}
*Pageskill · 静态优先*

# 从内容出发，发布一个认真打磨的网站

用 Markdown 写内容，用 YAML 保存站点决策，让可移植 Component 负责表现。本地 Search 留在静态站点中；数据库、模型、密钥和写操作通过命名外部 API 提供。

[开始搭建](/zh-sg/posts/start/) [查看源码](https://github.com/jsw-teams/pageskill)
:::

Pageskill 把日常编辑的内容与静态站点不应承担的基础设施分开。这样的网站更容易审阅和迁移，也能如实说明每一项已启用能力。

## 边界清晰，不增加额外模式

:::feature-grid{columns="3"}
### 内容保持可读
页面、教程、发布说明、导航和政策文本放在 Markdown 或配置中，而不是藏进 Theme TypeScript。

### Component 保持可移植
Component 负责布局、交互、无障碍和简短界面文案，不硬编码本站的介绍、路由或演示数据。

### 服务保持外置
命名 API 通过已配置 URL 连接可选数据或 AI 服务。私密凭据只保存在独立部署的服务中，绝不进入生成的 JavaScript。
:::

## 沿着真实项目学习

下面每一篇指南都对应本站构建时真正使用的文件和契约。

:::learning-path
### [开始](/zh-sg/posts/start/)
安装项目、运行生成器，并修改 `content/pages/` 下的稳定首页。

### [编写 Markdown](/zh-sg/posts/markdown/)
使用标题、列表、链接、表格和简短 Component 指令，不把页面写成配置语言。

### [配置站点](/zh-sg/posts/site-settings/)
在可审阅的 YAML 中设置站点身份、语言、路由、导航、隐私数据和命名 API。

### [构建 Component](/zh-sg/posts/components/)
通过唯一的 `ComponentDefinition` 扩展契约添加可复用表现或行为。

### [连接发现能力](/zh-sg/posts/agent-discovery/)
生成基于事实的 Agent 元数据，让条件能力始终对应真实实现。

### [开发 Agent Skill](/zh-sg/posts/skill-development/)
向 Agent 描述站点真实的内容、配置、Component 与外部服务边界。
:::

## 三个命令，三个清晰职责

| 命令 | 职责 |
| --- | --- |
| `page g` | 校验并把静态站点生成到 `dist/public`。 |
| `page c` | 运行完整浏览器无障碍审查，并把报告留在私有目录。 |
| `page s` | 开发时监听、重建并预览同一份静态输出。 |

:::cta{href="/zh-sg/updates/1.0.0-beta.0/" label="阅读 1.0.0 beta 说明"}
## 只保留一套当前契约

1.0.0 beta 移除了历史运行模式和扩展别名，只保留一套 Component 模型、统一 Client Runtime 和外部 API 边界。
:::
