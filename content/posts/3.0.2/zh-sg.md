---
title: 3.0.2 更新：更清楚的归档与响应式阅读
description: 分开版本更新和教程，修正封面比例，并让语言选择页和文章页面更容易浏览。
date: 2026-09-10
category: update
author: toewpq
cover: assets/og-default-product.webp
---

# 3.0.2 更新：更清楚的归档与响应式阅读

Pageskill 3.0.2 把教程和版本历史放在同一个 post 集合中，再用 Frontmatter 分类和筛选视图区分它们；同时收紧文章页头，为封面提供可预测的响应式容器，并让语言选择页在出现推荐标签时仍然整齐。

## 功能特性

- 版本说明使用普通 posts 流程并增加 `category: update`。更新视图会把它们排除在普通 post 列表之外，同时保留 `/:locale/updates/<version>/` 公开路由、Feed、搜索结果、语言链接、导航入口和首页栏目。
- post 分类现在来自 Markdown Frontmatter：`category: tutorial` 表示教程，`category: update` 表示版本说明，省略分类时会渲染并索引为 `uncategorized`（未分类），不会再从 pages collection 猜测。
- 文章标题、说明、发布日期和作者组成紧凑页头；封面和正文阅读栏使用稳定的 1200:630 比例，归档缩略图使用独立的 16:9 容器，不再继承原图的像素高度。
- 文章导航标签单独占行，不会再被误认为链接标题的一部分。语言卡片预留推荐标签行，小屏幕文章目录默认折叠。
- 主题可以通过结构化的 `plugins.chrome` 选项，在标准导航和页脚工具前后增加链接。编译器会解析语言路由、限制链接数量和长度、拒绝不安全或目录穿越 URL，壳层会转义标签；不支持原始 HTML、脚本、CSS 或任意属性。
- Cookie 插件现在由代码登记 provider 能力，并由 `themes/default/theme.yml` 负责 provider 实例。内置同意控制适配 Google Analytics、Google Ads、Cloudflare Web Analytics、reCAPTCHA/hCaptcha/Turnstile 和按需 X 嵌入；额外 provider 字段可以留给未来模块，但不会自行执行。

## 安全与本地化特性

- 主题界面文案会从配置的回退语言合并缺失键和带 ID 的类别项。缺少整篇语言文档时，可以在请求语言的路由提供回退文章；但 `hreflang` 只列出实际存在的翻译。
- Cookie 选择器逐类别显示提供者和保存期限。可选类别默认关闭，受信脚本必须在明确同意后加载，选择器不会替代经过审核的隐私政策页面。
- `config.yml` 继续只保存站点政策/控制者资料：不会进入 `dist/public`，生成的 backend 也没有写入它的路由。provider secret 和验证码 token 校验继续放在服务端。

## 兼容用法与迁移

现有 3.0 站点可以迁移源码目录，同时保持更新文章的公开 URL：

1. 把 `content/updates/<version>/<locale>.md` 移到 `content/posts/<version>/<locale>.md`。
2. 保留原来的 ID、语言文件、`date`、`author` 和 `cover`；每个版本说明的 Frontmatter 增加 `category: update`。
3. 继续使用 `/zh-sg/updates/<version>/`、`/zh-tw/updates/<version>/` 或 `/en/updates/<version>/` 链接。更新视图会提供这些路由，不需要建立 redirect 影子或复制文章；普通文章仍使用 `/:locale/posts/<id>/`。
4. 后续新增语言时，先把语言加入站点启用语言列表，再按完成进度补 UI 和文章文件。主题 UI 缺失键从回退语言取得，整篇缺失的文章使用内容回退；已经存在但只翻译一部分的 Markdown 会按原文提供，Pageskill 不会静默机器翻译。
5. 如果旧主题文件仍有独立的 `plugins.language.enabled` 开关，请删除这个重复开关；语言选择功能仍然存在，并继续按照站点的启用语言和回退行为工作。
6. 教程明确增加 `category: tutorial`；不写 `category` 的新 post 默认是 `uncategorized`（未分类）。已有主导航保持兼容，需要额外壳层链接时使用主题的结构化 `plugins.chrome` 插入点。
7. 在 `themes/<name>/theme.yml` 配置 provider 实例，保留可选类别默认关闭，并使用 Cookie 教程中的类别映射。扩展 provider schema 字段可以保留，但 provider 只有在代码登记模块且取得同意后才会运行。
8. 运行 `npm run g -- --profile`，检查普通 post/更新归档和两个 Feed，再在正式发布前运行 `npm run d -- --dry-run`。

## 已移除项与替代方案

- 已移除独立的 `content/updates` 源 collection；兼容替代方式是 `content/posts` 加 `category: update`。公开更新路由和访客看到的更新功能没有移除。
- 没有移除 Cookie 同意功能；借鉴政策生成器的提供者和保存期限只是展示元数据，法律文本仍维护在经过审核的隐私页面。

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

3.0.2 检查已经完成：`npm run g -- --profile` 通过 runtime、theme、backend 编译并报告 48 篇源文档；临时 provider 配置曾在选择器和机器可读隐私元数据中生成 Google Analytics、Google Ads、Cloudflare Web Analytics、Turnstile 和 X 记录，随后恢复活动主题为全部关闭。56 个 HTML 内部 `href`/`src` 检查没有缺失引用；生成的脚本通过 `node --check`；`/config.yml` 及其 public/static 别名会被判定为私有，公开快照没有配置文件。posts 和 updates Feed 分别有 10 条和 3 条且相互隔离，旧 posts 路由已经删除。1280px 桌面和 390px 手机检查确认语言卡片均为 136px、归档封面为 144x81、文章元数据对齐，手机目录默认折叠且可点击展开，页面没有横向溢出；根语言页匹配繁体中文浏览器偏好，品牌和隐私链接指向 `zh-tw`。`git diff --check` 通过。`npm run d -- --dry-run` 因未配置 `deployment.targets` 以退出码 1 结束，因此不声称已经部署或发布 npm。

教程路径请继续阅读[十分钟开始你的站点](/zh-sg/posts/start/)，版本历史请打开[更新日志归档](/zh-sg/updates/)。
