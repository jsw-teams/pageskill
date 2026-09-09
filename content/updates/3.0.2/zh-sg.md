---
title: 3.0.2 更新：更清楚的归档与响应式阅读
description: 分开版本更新和教程，修正封面比例，并让语言选择页和文章页面更容易浏览。
date: 2026-09-10
author: Site Owner
cover: assets/og-default-product.webp
---

# 3.0.2 更新：更清楚的归档与响应式阅读

Pageskill 3.0.2 把教程和版本历史放进不同的集合，也收紧文章页头，为封面提供可预测的响应式容器，并让语言选择页在出现推荐标签时仍然整齐。

## 这次改了什么

- 版本说明现在放在 `content/updates/<version>/<locale>.md`，使用 `/:locale/updates/<version>/` 路由。教程、日志和产品记录继续放在 `content/posts/<id>/<locale>.md`。
- 更新日志有独立的 `/:locale/updates/` 索引、Feed、搜索结果、语言链接、导航入口和首页栏目；教程文章归档仍然是 `/:locale/posts/`。
- 文章标题、说明、发布日期和作者组成紧凑的页头；封面和正文阅读栏共用宽度，并使用稳定的 1200:630 容器。
- 归档缩略图现在同时限制宽度和高度，不会把原图的 `height` 属性当成渲染像素高度，图片保持 `object-fit: cover`，不会被拉伸。
- 语言卡片预留推荐标签的行高，并使用固定行高；推荐语言不会把其中一张卡片撑高。小屏幕文章的目录默认折叠。

## 内容放在哪里

按文档类型选择集合：

```text
content/posts/<id>/<locale>.md        教程、文章和日志
content/updates/<version>/<locale>.md 版本历史和更新说明
```

现有的 3.0.0 和 3.0.1 说明已经移动，发布日期、作者和封面元数据保持不变；本语言的新链接分别是 `/zh-sg/updates/3.0.0/` 和 `/zh-sg/updates/3.0.1/`。旧文章路径不保留重复内容，也不设置跳转。

## 发布前验证

先运行项目的常规检查，再查看两种响应式视图：

```powershell
npm run compile-runtime
npm run compile-theme
npm run compile-backend
npm run g
npm run g -- --profile
npm run s
npm run d -- --dry-run
```

3.0.2 检查已经完成：`npm run g -- --profile` 通过 runtime、theme、backend 编译并报告 48 篇源文档；56 个 HTML 内部 `href`/`src` 检查没有缺失引用；posts 和 updates Feed 分别有 10 条和 3 条且相互隔离，旧 posts 路由已经删除。1280px 桌面和 390px 手机检查确认语言卡片均为 136px、归档封面为 144x81、文章元数据对齐，手机目录默认折叠且可点击展开，页面没有横向溢出；根语言页匹配繁体中文浏览器偏好，品牌和隐私链接指向 `zh-tw`。`git diff --check` 通过。`npm run d -- --dry-run` 因未配置 `deployment.targets` 以退出码 1 结束，因此不声称已经部署或发布 npm。

教程路径请继续阅读[十分钟开始你的站点](/zh-sg/posts/start/)，版本历史请打开[更新日志归档](/zh-sg/updates/)。
