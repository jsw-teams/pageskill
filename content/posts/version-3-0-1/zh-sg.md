---
title: 3.0.1 更新：文章元数据和更安全的发布
description: 增加可选的文章作者和封面，保持日期归档稳定，并遵循当前 npm 与 Cloudflare Pages 契约。
date: 2026-09-09
author: Site Owner
cover: assets/og-default-product.webp
---

# 3.0.1 更新：文章元数据和更安全的发布

Pageskill 3.0.1 是 3.0 版本线上的修订版。它继续把源码仓库作为可以修改的站点，把公开快照放在 `dist/public`，也不会重写旧文章的发布日期。

## 这次改了什么

- `config.yml` 继续负责站点资料、导航、collection schema、隐私/控制者资料、图片和发布设置。主题由 `theme.name` 选择；精简的 `themes/<name>/index.ts` 组装模块自带的布局、组件、插件、样式、脚本和 messages；插件实例选项留在 `themes/<name>/theme.yml`。
- 增量构建让 backend 和嵌套主题代码留在隔离的私有运行时中。公开 CSS 和 JavaScript 资源各自保留内容 hash，持续 `npm run s` 预览仍通过 SSE 路径重载。
- 文章按有效 ISO 发布日期从新到旧排列；同日文章使用确定的 ID 次序，因此归档、文章列表、Feed 和前后文章链接不会混淆新旧文章。现有日期保持原样；不要为了把文章移到前面就把旧日期全部改成今天。

## 增加作者或封面

普通作者只要在 Markdown Frontmatter 填字段，不需要写 HTML。完整文章例子如下：

```markdown
---
title: 我的网站上线了
description: 记录第一次发布。
date: 2026-09-07
author: Site Owner
cover: assets/og-default-product.webp
---

# 我的网站上线了
```

`author` 是可选的普通文字。省略时，文章会使用 `config.yml` 中 `author` 对应语言的值；发布前请把仓库里明确可编辑的 `Site Owner` 换成真实站点作者。`cover` 是可选的：把本地源图片放在 `content/assets/`，在 Frontmatter 写 `assets/<路径>`（或 `/assets/<路径>`）；公开文件会生成到 `dist/public/assets/<路径>`。仓库现有的 `assets/og-default-product.webp` 是当前的小熊图片。也可以使用 HTTPS 图片 URL；危险协议和越界路径会被拒绝。没有封面的文章页、文章列表和归档不会显示图片，也不会被强行塞入统一默认图。

页面会把标题、Frontmatter 说明、发布日期和作者分开显示。若 Markdown 的 `#` 标题与 Frontmatter 标题相同，正文不会重复显示；列表和归档摘要使用说明字段，不会从正文里的代码或标题抽取摘要。

## Cloudflare Pages 契约

Cloudflare Pages Git 集成使用 `npm run g` 作为构建命令，输出目录填写 `dist/public`。没有 `npm run build` 兼容别名。这条路径只发布静态内容，绝不能发布私有的 `dist/` 根目录，因为那里可能有 `_pagekiln/`、`server/`、`.pagekiln/` 和 `_worker.js`。

如果同一个 Pages 部署必须包含 `backend/handler.ts`，就在 `config.yml` 配置 `cloudflare-pages` 目标，把 `CLOUDFLARE_API_TOKEN` 放在部署环境，先运行 `npm run d -- --dry-run`，确认计划后才运行 `npm run d`。CLI 会把 `dist/public`、生成的 `_worker.js` 和私有 `_pagekiln` 运行时暂存成 Pages 上传包。

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

本次 3.0.1 工作实际观察到运行时/主题编译、`npm run g` 生成 45 篇文档，本地预览以 200 状态提供首页和本文，以及日期排序、同日稳定次序、元数据映射、三语作者标签、封面加载、无封面回退、标题去重和危险封面 URL 拒绝等局部检查。本次也运行了 `npm run d -- --dry-run`，因当前 checkout 没有发布目标而正确提示 `Set deployment.targets in config.yml` 并退出。不声称 npm 发布、Cloudflare 部署或生产浏览器结果。

## 保持迁移最小

稳定页面放在 `content/pages/<id>/<locale>.md`，带日期的文章放在 `content/posts/<id>/<locale>.md`。使用同一个 ID 和对应的 `en`、`zh-sg`、`zh-tw` 文件，让发布日期 `date` 保持一致，只为文章需要的字段补 Frontmatter。新手路径可以继续阅读[十分钟开始你的站点](/zh-sg/posts/start/)和[把网站放到网上](/zh-sg/posts/deploy/)。
