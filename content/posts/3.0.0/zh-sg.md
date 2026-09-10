---
title: 3.0 更新：更简单的入口
description: Pageskill 3.0 收拢日常入口、明确 post 分类，并说明安全边界。
date: 2026-09-07
category: update
author: toewpq
cover: assets/og-default-product.webp
---

# 3.0 更新：更简单的入口

Pageskill 3.0 继续用 Markdown、设置和主题生成网站，但第一次使用只需要记住三个入口：生成 `g`、预览 `s`、发布 `d`。这次发布也明确了 post 分类和运行时边界，版本仍然是 3.0.0。

## 功能特性

- 日常工作流有三个清晰命令：`npm run g` 校验并生成，`npm run s` 持续运行本地预览，`npm run d` 发布已经准备好的目标。新站从克隆仓库开始，运行 `npm install` 和 `npm run g`，再直接修改这个目录。
- 稳定页面放在 `content/pages/<id>/<locale>.md`，不需要日期；教程、博客、产品记录和版本更新放在 `content/posts/<id>/<locale>.md`，必须有 ISO `date`；明确写 `category: tutorial` 才标为教程，省略分类默认是 `uncategorized`（未分类），版本更新使用 `category: update`，可以和教程分开筛选。
- 本地化新手路径整理成开始、站点设置、Markdown、第一篇教程、Cookie 选择器插件构建、主题自定义、搜索、内容目录、插件开发和部署等短教程。主题能力可以编写一次后复用，不需要给每个页面复制 HTML。
- 首页学习路径使用六张可复用的小熊插图，并链接前六个步骤；本地搜索、内容目录和更新视图提供独立入口，不会把版本说明混进普通 post 列表。

## 安全与运行时特性

- 公开静态文件在 `dist/public`，动态业务、写入和秘密留在 `backend/handler.ts`。Backend 路径使用现有的 `router.get(...)`、`router.post(...)` 和 `router.all(...)` 注册；匹配成功返回 `Response`，无匹配返回 `null`，作者不需要维护生成的路由清单。
- 生成的 Worker、Pages 和 VPS 入口先运行 Router，再回退静态资源。未知路径可以交给公开静态资源，未匹配的 `/api` 保持 404；API 错误和鉴权响应保持 API 响应，不会变成静态页面。服务端嵌套 ESM 留在私有运行时边界内。
- 持续 `npm run s` 预览时，嵌套主题 TypeScript 会先编译到隔离的新私有运行时再重载。每个公开 CSS/JS 资源独立使用内容 hash，未变化资源继续保留 URL 和缓存身份。
- Cookie 选择器保留可选类别默认关闭，并要求明确同意后才加载受信脚本。语言选择页优先采用访客手动选择，再回退到浏览器语言，语言 URL 保持不变；撤回同意不能撤销脚本已经完成的工作。

## 兼容用法与迁移

1. 克隆仓库，运行 `npm install` 和 `npm run g`，之后直接在克隆的站点目录修改。预览使用 `npm run s`，发布前使用 `npm run d -- --dry-run` 检查计划，准备好后才运行 `npm run d`。
2. 稳定页面放在 `content/pages/<id>/<locale>.md`，不补日期；教程、博客文章、产品记录和版本文章放在 `content/posts/<id>/<locale>.md`，补上必填的 ISO `date`，让 `en`、`zh-sg`、`zh-tw` 共用同一个 ID 并保持日期一致。每个版本文章的翻译都增加 `category: update`。
3. 如果旧版本文章仍在 `content/updates/<version>/`，把各语言文件移到 `content/posts/<version>/` 并增加 `category: update`。更新视图可用时保留公开更新链接；普通 post 继续使用 `/:locale/posts/<id>/`。
4. Cookie 政策继续指向 `/:locale/privacy/`，并在[隐私说明](/zh-sg/privacy/)中换成真实且经过审核的联系人和服务。保留现有同意存储键，避免回访者无故丢失选择。
5. 旧工作流如果使用 `npm run build`，改用 `npm run g`；预览和发布分别使用 `npm run s`、`npm run d`。已经移除的冗长 guide/development 页面由学习路径中的短文章替代。

## 已移除项与替代方案

- `npm run build` 别名不再支持。原因是保留唯一且明确的生成命令；替代用法是 `npm run g`。
- 重复的冗长 guide、development 页面和旧 prompt 笔记不再生成 redirect 影子。原因是重复源文件可能漂移或显示过期页面；请使用学习路径中的短文章，需要旧内容时从 Git 历史查阅。
- 不再要求作者维护生成的 `dynamicRoutes` 路由清单。真实 backend 行为使用现有 Router 方法注册；同源 API 能力没有被删除。
- 没有移除 Cookie 同意或语言选择功能。语言功能的兼容用法是先采用访客手动选择，再按浏览器语言回退；政策替代入口是本地化隐私页面。

## 给高级作者的发现入口

生成后可以阅读 `dist/.pagekiln/catalog.json` 或 `dist/.well-known/agent.json`，了解主题和内容的可复用能力。Agent 集成可以调用内部 `getCatalog` 和 `inspect`，但新手只需先写 post 和设置，不必把发现文件加入日常步骤。

## 新的学习入口

首页用六只小熊带读者经过[开始](/zh-sg/posts/start/)、[站点设置](/zh-sg/posts/site-settings/)、[Markdown](/zh-sg/posts/markdown/)、[第一篇教程](/zh-sg/posts/first-post/)、[我们如何构建插件](/zh-sg/posts/cookies/)和[换样式](/zh-sg/posts/customize/)。需要时继续阅读[搜索](/zh-sg/posts/search/)、[内容目录](/zh-sg/posts/toc/)和[插件开发](/zh-sg/posts/plugins/)。

## 发布前验证

按下面的步骤检查自己的站点：

1. 运行 `npm run compile-runtime`、`npm run compile-theme` 和 `npm run compile-backend`。
2. 运行 `npm run g -- --profile`，检查页面、语言链接和公开文件。
3. 运行 `npm run s`，打开本地首页、post 和 Cookie 设置，修改一个嵌套主题 TypeScript 模块确认会重载；按 `Ctrl+C` 停止预览。
4. 运行 `npm run d -- --dry-run`；只有准备好发布时才运行 `npm run d`。
