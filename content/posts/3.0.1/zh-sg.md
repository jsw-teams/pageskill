---
title: 3.0.1 更新：文章元数据和更安全的发布
description: 增加可选的文章元数据，保持日期归档稳定，并保护公开与私有发布边界。
date: 2026-09-09
category: update
author: toewpq
cover: assets/og-default-product.webp
---

# 3.0.1 更新：文章元数据和更安全的发布

Pageskill 3.0.1 是 3.0 版本线上的修订版。它保留现有发布日期，让文章元数据按需使用，并把可见功能和发布安全边界分开说明。

## 功能特性

- 文章使用有效的 ISO 发布日期排序；同日文章使用确定的 ID 次序，因此归档、文章列表、Feed 和前后文章链接保持稳定。界面把日期和关系标签与文章标题分开显示，不会把关系说明拼接到标题旁。
- 文章可以在 Markdown Frontmatter 中选择填写 `author`，封面可以选择填写 `cover`。省略作者时会沿用对应语言的站点作者；封面可以是本地资源或 HTTPS URL，省略封面则保持不显示，不会强行套用默认图片。
- 文章页头把标题、Frontmatter 说明、发布日期和作者分开显示。正文中与 Frontmatter 相同的 Markdown `#` 标题不会重复显示，列表和归档摘要使用说明字段，不会从正文代码或标题中抽取。

## 安全与发布特性

- 增量构建让 backend 和嵌套主题代码留在隔离的私有运行时中。公开 CSS 和 JavaScript 资源各自保留内容 hash，持续 `npm run s` 预览仍通过 SSE 路径重载。
- 静态发布只公开 `dist/public`。需要 backend 的发布会把生成的 worker 和私有运行时留在发布包中，不会把整个构建目录暴露出去。运行时先处理路由再回退静态资源；未匹配的 `/api` 仍返回 404，API 错误和鉴权响应不会变成 HTML 页面。
- 本地封面限制在资源目录内，HTTPS 封面只接受允许的协议；危险协议和越界路径会在成为链接或图片来源前被拒绝。

## 兼容用法

普通作者只要在 Markdown Frontmatter 填字段，不需要写 HTML。兼容的文章例子如下：

```markdown
---
title: 我的网站上线了
description: 记录第一次发布。
date: 2026-09-07
author: toewpq
cover: assets/og-default-product.webp
---

# 我的网站上线了
```

`author` 是可选的普通文字。省略时，文章会沿用对应语言的站点作者，因此旧文章无需批量修改。`cover` 是可选的：把本地源图片放在 `content/assets/`，在 Frontmatter 写 `assets/<路径>`（或 `/assets/<路径>`）；公开文件会生成到 `dist/public/assets/<路径>`。也可以使用 HTTPS 图片 URL。没有封面的文章页、文章列表和归档不会显示图片，也不会被强行塞入统一默认图。

静态 Git 集成使用 `npm run g` 并发布 `dist/public`。同一次发布需要 backend 时，先运行 `npm run d -- --dry-run`，确认目标和计划正确后才运行 `npm run d`；不要发布私有的 `dist/` 根目录。

## 兼容迁移

1. 现有带日期文章可以继续使用。保留原来的 ISO `date`；`author` 和 `cover` 都是可选字段，不需要批量补 Frontmatter。
2. 已有 `author` 就继续保留普通文字；没有作者就让站点作者回退生效。封面请改为 `content/assets/` 下的本地路径或 HTTPS URL；危险协议、越界路径无法兼容时，直接移除 `cover` 即可。
3. 已退休的 `npm run build` 别名请改用 `npm run g`。持续预览使用 `npm run s`，真正发布前使用 `npm run d -- --dry-run`；静态托管接收 `dist/public`，包含 backend 的发布使用发布命令正确暂存私有运行时。
4. 保留现有 `/:locale/posts/<id>/` 文章链接。元数据字段是向后兼容的增量，不会改变文章 ID 或路由。

## 已移除项与替代方案

- `npm run build` 别名不再支持。原因是减少含义重复的生成入口；替代用法是 `npm run g`，它会校验并生成公开快照。
- 不再支持发布整个 `dist/` 目录，因为其中可能包含私有运行时资料。静态发布使用 `dist/public`，需要 backend 时使用 `npm run d` 生成发布包。
- 没有移除文章元数据能力。没有 `author` 或 `cover` 的旧文章仍按作者回退和无封面行为正常显示。

## 发布前验证

运行项目支持的检查：

```powershell
npm run compile-runtime
npm run compile-theme
npm run compile-backend
npm run g
npm run g -- --profile
npm run s
npm run d -- --dry-run
```

本次 3.0.1 工作实际观察到运行时/主题编译、`npm run g` 生成 45 篇文档，本地预览以 200 状态提供首页和本文，以及日期排序、同日稳定次序、元数据映射、三语作者标签、封面加载、无封面回退、标题去重和危险封面 URL 拒绝等局部检查。本次也运行了 `npm run d -- --dry-run`，因当前 checkout 没有发布目标而正确拒绝并退出。不声称 npm 发布、Cloudflare 部署或生产浏览器结果。

## 继续阅读

稳定页面放在 `content/pages/<id>/<locale>.md`，带日期的教程、文章和版本更新都在 `content/posts/<id>/<locale>.md`；版本更新增加 `category: update`。使用同一个 ID 和对应的 `en`、`zh-sg`、`zh-tw` 文件，让发布日期 `date` 保持一致，只为文档需要的字段补 Frontmatter。新手路径可以继续阅读[十分钟开始你的站点](/zh-sg/posts/start/)和[把网站放到网上](/zh-sg/posts/deploy/)。
