---
title: 3.0 更新：更简单的入口
description: Pageskill 3.0 把日常入口收成 g、s、d，并把新手教程改成可直接阅读的文章。
date: 2026-09-07
category: update
author: toewpq
cover: assets/og-default-product.webp
---

# 3.0 更新：更简单的入口

Pageskill 3.0 继续用 Markdown、设置和主题生成网站，但第一次使用只需要记住三个入口：生成 `g`、预览 `s`、发布 `d`。这是一次内容和工作流的整理，版本仍然是 3.0.0。

## 这次改了什么

- `npm run g` 自动校验并生成公开快照。
- `npm run s` 启动持续预览；用 `Ctrl+C` 结束，编辑工作可以在另一个终端继续。
- `npm run d` 按 `config.yml` 的发布目标执行。
- 新站从克隆仓库开始，运行 `npm install` 和 `npm run g`，再直接修改这个目录。
- 稳定页面放在 `content/pages/`，不需要日期；教程、博客、产品记录和版本更新都放在 `content/posts/`，必须有 `date`；版本更新增加 `category: update`。
- 增加本地搜索、文章目录和可复用插件开发的简短三语文章。

## 从旧内容迁移

1. 保留备份，克隆当前仓库，运行 `npm install` 和 `npm run g`，把教程入口改到[十分钟开始你的站点](/zh-sg/posts/start/)。
2. 稳定页面放在 `content/pages/<id>/<locale>.md`，不补日期；教程、博客文章和版本更新放在 `content/posts/<id>/`，版本更新增加 `category: update`，并提供对应语言文件和必填 `date`。
3. 把 Cookie 政策入口改为 `/:locale/privacy/`，再按[隐私说明](/zh-sg/privacy/)补上真实联系人和服务。
4. 源码检查运行各 compile 命令、`npm run g -- --profile` 和 `npm run s`；部署检查使用 `npm run d -- --dry-run`，准备好后才运行 `npm run d`。

## 给高级作者的发现入口

生成后可以阅读 `dist/.pagekiln/catalog.json` 或 `dist/.well-known/agent.json`，了解主题和内容的可复用能力。Agent 集成可以调用内部 `getCatalog` 和 `inspect`，但新手只需先写文章和设置，不必把发现文件加入日常步骤。

页面和同源 API 仍然分开：公开静态文件在 `dist/public`，动态业务、写入和秘密留在 `backend/handler.ts`。`config.yml` 保存站点和政策/控制者资料；`theme.name` 选择主题，`themes/<name>/theme.yml` 保存经过 schema 校验的插件实例选项和开关。主题入口组装可复用能力，每个插件保留自己的实现资源。

用现有的 `router.get(...)`、`router.post(...)` 或 `router.all(...)` 注册任意 backend 路径。运行时匹配成功返回 `Response`，无匹配返回 `null`，所以生成入口不需要在 `config.yml` 逐条列出 `dynamicRoutes`。生成的 Worker/Pages/VPS 入口对所有路径先运行 Router，并设置 `run_worker_first = true`；未知路径再交给公开静态资源，未匹配的 `/api` 路径保持 404。API 错误和鉴权响应保持 API 响应，不回退为静态页面。构建/生成会把服务端嵌套 ESM 留在私有边界内；持续运行 `npm run s` 时，嵌套主题 TypeScript 变化会先编译到隔离的新私有运行时再重载，每个公开 CSS/JS 资源独立使用内容 hash，未变化资源继续保留 URL 和缓存身份。

本次还修复了 Cookie 提示和页脚布局；语言选择页优先采用访客手动选择，再回退到浏览器语言，语言 URL 保持不变。版本历史使用 `category: update` 和独立更新视图，不再和教程文章争夺列表位置。

## 新的学习入口

首页用六只小熊带读者经过[开始](/zh-sg/posts/start/)、[站点设置](/zh-sg/posts/site-settings/)、[Markdown](/zh-sg/posts/markdown/)、[第一篇文章](/zh-sg/posts/first-post/)、[Cookie 选择](/zh-sg/posts/cookies/)和[换样式](/zh-sg/posts/customize/)。需要时继续阅读[搜索](/zh-sg/posts/search/)、[文章目录](/zh-sg/posts/toc/)和[插件开发](/zh-sg/posts/plugins/)。

## 发布前验证

按下面的步骤检查自己的站点：

1. 运行 `npm run compile-runtime`、`npm run compile-theme` 和 `npm run compile-backend`。
2. 运行 `npm run g -- --profile`，检查页面、语言链接和公开文件。
3. 运行 `npm run s`，打开本地首页、文章和 Cookie 设置，修改一个嵌套主题 TypeScript 模块确认会重载；按 `Ctrl+C` 停止预览。
4. 运行 `npm run d -- --dry-run`；只有准备好发布时才运行 `npm run d`。
