---
kind: page
title: Pageskill：用 Markdown 搭建内容网站
description: 用 Markdown、YAML 和可复用主题搭建清晰的多语言内容网站。
component: page
---

:::hero{tone="brand" align="left"}
*Pageskill · 用 Markdown 搭站*

# 用 Markdown 和 YAML 搭建内容网站

Pageskill 把 Markdown 内容和少量 YAML 站点数据编译成多语言网站。可复用 Component 负责表现与行为；数据库、模型和写操作只留在命名外部 API 中。

[开始使用](/zh-sg/posts/start/) [GitHub](https://github.com/jsw-teams/pageskill)
:::

普通作者只需要写 Markdown，需要时修改 `config.yml` 和 `site/theme.yml`，再生成网站。只有站点需要真正新增能力时，才修改主题或 backend 代码。

## Pageskill 组合了什么

| 内容 | 主题 | 多语言 | 发现能力 | 部署 |
| --- | --- | --- | --- | --- |
| Markdown 页面和文章 | 可复用 Component | `zh-sg`、`zh-tw`、`en` | 本地搜索、Feed、Agent 元数据 | 静态输出和可选外部 API |

下面的教程会展示这个预览站实际使用的源文件。

:::learning-path
### [开始](/zh-sg/posts/start/)
克隆源码仓库，运行 `npm install` 和 `page g`，再直接修改第一个首页。

### [站点设置](/zh-sg/posts/site-settings/)
改站点名称、语言和导航；设置文件只放数据，不放代码。

### [Markdown](/zh-sg/posts/markdown/)
用标题、段落、列表和代码围栏写文章，先做出一个最小页面。

### [第一篇教程](/zh-sg/posts/first-post/)
在 `content/posts/` 新建带日期的 post，可选择 taxonomy 分类，生成后从 post 列表打开它。

### [我们如何构建组件](/zh-sg/posts/components/)
学习一个可复用组件如何拥有自己的资源、安全渲染和本地化文案；Consent 组件是更高级的参考实现。

### [开发 Agent Skill](/zh-sg/posts/skill-development/)
编写由生成器产出、只描述真实 Component、内容、配置与外部服务的 Skill 契约。

### [换样式](/zh-sg/posts/customize/)
先复用主题已有能力；需要新结构时实现一次，让之后的页面继续使用。
:::

需要接入真实的鉴权、MCP、WebMCP 或 DNS-AID 时，阅读[配置条件 Agent 能力](/zh-sg/posts/agent-discovery/)，按 backend、主题组件和外部 DNS 的实际边界逐项实现。

## 只记住三个命令

| 命令 | 作用 |
| --- | --- |
| `page g` | 自动校验并生成公开静态文件到 `dist/public`。 |
| `page c` | 启动真实浏览器执行完整的 axe 无障碍审查，并写入私有报告。 |
| `page s` | 启动持续预览；按 `Ctrl+C` 停止，也可以在另一个终端继续编辑。 |

:::post-list{limit="6"}
:::

:::post-list{collection="updates" limit="3"}
:::

:::cta{href="/zh-sg/posts/start/" label="开始阅读"}
## 现在就开始

先完成 [十分钟开始你的站点](/zh-sg/posts/start/)，再按站点设置、Markdown 和第一个 post 继续。每篇教程都给出最小例子、成功结果和一个常见坑。
:::
