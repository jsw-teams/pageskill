---
title: Pageskill：用 Markdown 搭建内容网站
description: 用 Markdown、YAML 和可复用主题搭建清晰的多语言内容网站。
pattern: landing
---

:::hero{tone="brand" align="left"}
*Pageskill · 用 Markdown 搭站*

# 用 Markdown 和 YAML 搭建内容网站

Pageskill 把 Markdown 内容和少量 YAML 站点数据编译成多语言网站。可复用主题负责布局和插件，动态 API 则保持在清楚的同源边界之后。

[开始使用](/zh-sg/posts/start/) [GitHub](https://github.com/jsw-teams/pageskill)
:::

普通作者只需要写 Markdown，需要时修改 `config.yml` 和 `site/theme.yml`，再生成网站。只有站点需要真正新增能力时，才修改主题或 backend 代码。

## Pageskill 组合了什么

| 内容 | 主题 | 多语言 | 发现能力 | 部署 |
| --- | --- | --- | --- | --- |
| Markdown 页面和文章 | Pattern、Block、Plugin | `zh-sg`、`zh-tw`、`en` | 搜索、Feed、Agent 元数据 | 静态输出和同源 API |

下面的教程会展示这个预览站实际使用的源文件。

:::learning-path
### [开始](/zh-sg/posts/start/)
克隆源码仓库，运行 `npm install` 和 `npm run g`，再直接修改第一个首页。

### [站点设置](/zh-sg/posts/site-settings/)
改站点名称、语言和导航；设置文件只放数据，不放代码。

### [Markdown](/zh-sg/posts/markdown/)
用标题、段落、列表和代码围栏写文章，先做出一个最小页面。

### [第一篇教程](/zh-sg/posts/first-post/)
在 `content/posts/` 新建带日期的 post，选择 Frontmatter 分类，生成后从 post 列表打开它。

### [我们如何构建插件](/zh-sg/posts/plugins/)
学习一个可复用插件如何拥有自己的资源、安全渲染和本地化文案；Cookie 选择器是更高级的参考实现。

### [换样式](/zh-sg/posts/customize/)
先复用主题已有能力；需要新结构时实现一次，让之后的页面继续使用。
:::

需要接入真实的鉴权、MCP、WebMCP 或 DNS-AID 时，阅读[配置条件 Agent 能力](/zh-sg/posts/agent-discovery/)，按 backend、主题插件和外部 DNS 的实际边界逐项实现。

## 只记住三个命令

| 命令 | 作用 |
| --- | --- |
| `npm run g` | 自动校验并生成公开静态文件到 `dist/public`。 |
| `npm run s` | 启动持续预览；按 `Ctrl+C` 停止，也可以在另一个终端继续编辑。 |
| `npm run d` | 按 `config.yml` 中的目标发布网站。 |

:::post-list{limit="6"}
:::

:::post-list{collection="updates" limit="3"}
:::

:::cta{href="/zh-sg/posts/start/"}
## 现在就开始

先完成 [十分钟开始你的站点](/zh-sg/posts/start/)，再按站点设置、Markdown 和第一个 post 继续。每篇教程都给出最小例子、成功结果和一个常见坑。
:::
