---
title: 发布第一篇教程，搭好你的网站
description: 用三条命令预览、生成并发布一个适合教程内容的网站。
pattern: landing
---

:::hero{tone="brand" align="left"}
*Pageskill 3.0.2 · 用教程搭站*

# 发布第一篇教程，搭好你的网站

Pageskill 把 Markdown post、站点设置和样式组装成一个网站。你可以先克隆仓库、在原目录生成，再按自己的内容修改；需要动态功能时，页面和同源 API 仍然各自放在清楚的边界里。

[十分钟开始](/zh-sg/posts/start/) [查看全部教程](/zh-sg/posts/)
:::

:::learning-path
### [开始](/zh-sg/posts/start/)
克隆源码仓库，运行 `npm install` 和 `npm run g`，再直接修改第一个首页。

### [站点设置](/zh-sg/posts/site-settings/)
改站点名称、语言和导航；设置文件只放数据，不放代码。

### [Markdown](/zh-sg/posts/markdown/)
用标题、段落、列表和代码围栏写文章，先做出一个最小页面。

### [第一篇教程](/zh-sg/posts/first-post/)
在 `content/posts/` 新建带日期的 post，选择 Frontmatter 分类，生成后从 post 列表打开它。

### [我们如何构建插件](/zh-sg/posts/cookies/)
以 Cookie 选择器为参考，学习模块资源、安全渲染、部分翻译和同意后加载脚本。

### [换样式](/zh-sg/posts/customize/)
先复用主题已有能力；需要新结构时实现一次，让之后的页面继续使用。
:::

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
