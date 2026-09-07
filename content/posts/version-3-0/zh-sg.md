---
title: 3.0 更新：更简单的入口
description: Pageskill 3.0 把日常入口收成 g、s、d，并把新手教程改成可直接阅读的文章。
date: 2026-09-07
---

# 3.0 更新：更简单的入口

Pageskill 3.0 继续用 Markdown、设置和主题生成网站，但第一次使用只需要记住三个入口：生成 `g`、预览 `s`、发布 `d`。这是一次内容和工作流的整理，版本仍然是 3.0.0。

## 这次改了什么

- `pageskill g` 自动校验并生成公开快照。
- `pageskill s` 启动持续预览；用 `Ctrl+C` 结束，编辑工作可以在另一个终端继续。
- `pageskill d` 按 `config.yml` 的发布目标执行。
- 新站从源码仓库复制 `starter`，不再依赖初始化向导。
- 教程、博客和产品记录统一放在 `content/posts/`，每篇文章保留必填 `date`。
- 当前有效的 `content/pages/` 保留三语首页、About 和隐私政策；旧 guide、development 等冗长说明目录已从当前内容树移除，历史留在 Git 和更新日志。

## 从旧内容迁移

1. 保留源码仓库和站点的备份，把教程入口改到 [十分钟开始你的站点](/zh-sg/posts/start/)。
2. 把自己的教程或博客放进 `content/posts/<id>/`，为 `zh-sg`、`zh-tw`、`en` 准备同义文件和 `date`。
3. 把 Cookie 政策入口改为 `/:locale/privacy/`，再按[隐私说明](/zh-sg/privacy/)补上真实联系人和服务。
4. 在站点目录运行 `pageskill g`、`pageskill s` 和 `pageskill d --dry-run`，按目标环境检查生成、预览和发布计划；真正发布时才运行 `pageskill d`。

## 给高级作者的发现入口

生成后可以阅读 `dist/.pagekiln/catalog.json` 或 `dist/.well-known/agent.json`，了解主题和内容的可复用能力。Agent 集成可以调用内部 `getCatalog` 和 `inspect`，但新手只需先写文章和设置，不必把发现文件加入日常步骤。

页面和同源 API 仍然分开：公开静态文件在 `dist/public`，动态业务、写入和秘密留在 `backend/handler.ts`。`config.yml` 只放数据和开关；可选 Cookie 脚本默认关闭，受信的 `gatedScripts` 只在 `theme.yml` 管理。

本次还修复了 Cookie 提示和页脚布局；语言选择页优先采用访客手动选择，再回退到浏览器语言，语言 URL 保持不变。

## 新的学习入口

首页用六只小熊带读者经过[开始](/zh-sg/posts/start/)、[站点设置](/zh-sg/posts/site-settings/)、[Markdown](/zh-sg/posts/markdown/)、[第一篇文章](/zh-sg/posts/first-post/)、[Cookie 选择](/zh-sg/posts/cookies/)和[换样式](/zh-sg/posts/customize/)。个人可以直接操作主题；需要共享能力时实现一次即可复用。

## 发布前验证

按下面的步骤检查自己的站点：

1. 运行 `pageskill g`，确认文章、语言链接和公开文件生成成功。
2. 运行 `pageskill s`，打开本地首页、文章和 Cookie 设置；按 `Ctrl+C` 停止预览。
3. 运行 `pageskill d --dry-run`，确认目标、公开目录和凭据来源；这个步骤不会真正上传。
4. 只有准备好发布时才运行 `pageskill d`，再从目标 URL 检查页面和同源 API。
