---
title: "Pageskill 3.0.0：为 2.0 翻篇"
description: "Pageskill 3.0.0 在归档的 2.0 阶段之后开启复用优先的产品线，带来 CLI 迁移、public 运行边界、更谨慎的浏览器处理和六个插画教程。"
date: 2026-09-07
pattern: blog
---

# Pageskill 3.0.0：为 2.0 翻篇

Pageskill 3.0.0 标志着 2.0 阶段归档，并开启新的产品线。这篇笔记记录 2026-09-07 的仓库源码和内容状态。发布到 npm 与部署属于这份记录之外的独立操作。

## 2.0 现在是归档章节

2.0 奠定的基础仍然支撑这次转换：Markdown 和配置可以与可复用的主题能力组合，编译器生成可检查的页面和交付产物。3.0 延续这套基础，把复用、运行边界和 Pageskill 名称放到产品的可见中心。

## 改名与迁移

公开名称从 Pagekiln 改为 Pageskill，范围包括 package 元数据、CLI、站点身份、主题文案、文档和仓库链接。旧的 `pagekiln` CLI 入口与 `src/bin/pagekiln.mjs` 已移除。请把 `pagekiln build` 这类命令改为 `pageskill build`，把 `PAGEKILN_SITE_ROOT` 改为 `PAGESKILL_SITE_ROOT`；旧环境变量不再作为后备值。

迁移范围保持明确。生成的 `.pagekiln/` discovery 和 build-profile 路径、`_pagekiln/` 运行时路径，以及现有的 `pagekiln-consent` Cookie 存储键继续兼容。已有内容、多语言路由和默认主题的 `landing`、`document`、`docs`、`blog` Pattern 仍然属于契约。

部署配置还有一项相关迁移：如果 `deployment.openaiSites.staticDirectory` 是 `dist`，请改为 `deployment.staticDirectory: public`。新的 `deployment.staticDirectory` 设置是可选的，旧 OpenAI Sites 设置中的安全自定义目录仍会作为后备值。

## 先复用，再扩展

正常的创作路径从 `pageskill catalog` 和 `pageskill inspect` 开始。这些命令公开源码中的 Pattern、Block、Schema、插件、上下文和资源依赖，供站点复用。作者继续使用 Markdown、Frontmatter 和 `config.yml` 组装页面；主题扩展用于补足缺少的共享能力，不需要为每个页面分别书写 HTML。

新的 Guide 也遵循这套方式。六个多语言步骤覆盖[开始使用](/zh-sg/guide/start/)、[站点设置](/zh-sg/guide/site-settings/)、[Markdown](/zh-sg/guide/markdown/)、[第一份内容](/zh-sg/guide/first-content/)、[Cookie 同意](/zh-sg/guide/cookies/)和[主题定制](/zh-sg/guide/customize/)。`learning-path` Block 将这段顺序作为可复用内容渲染，`content/assets/learning/` 中的六张独立 bear PNG 为每一步提供插画。

## 静态页面与同源 API 共享边界

页面仍然在请求之前预生成。统一构建会把公开页面和资源放入 `dist/public`。一个同源 Worker/Fetch 运行时可以位于这份输出之前，优先处理 `/api/*`，并加入明确配置的动态路由。`backend/handler.ts` 仍然是动态业务逻辑和运行时秘密的来源。

公开侧默认是 `dist/public`。`server/`、`_pagekiln/`、`.pagekiln/`、Worker 文件和部署清单留在 public 边界之外；不应把整个 `dist/` 当作 CDN 根目录暴露。这条边界限制静态文件暴露，但不会自动完成用户身份认证、受保护操作的授权或 CSRF 防护；这些仍然是应用业务逻辑。

## CSS 预算与浏览器边界

只有同时满足以下条件时，Pattern 和 Block 样式表才会内联：每个原始 UTF-8 文件不超过 2,048 字节，每页合计内联 CSS 不超过 4,096 字节，并且源码没有不安全的相对资源或 style 元素风险。主主题 bundle 仍然是带指纹的外部资源，不安全或过大的样式会保持外部加载。

本地搜索继续使用 DOM API 生成标签、高亮、摘要和链接。3.0 会先把结果 URL 校验为 HTTP(S)，再创建同源锚点。Cookie 同意会让可选类别在明确同意前保持关闭，检查配置的可选脚本来源是否为 HTTP(S)，并保留兼容的 `pagekiln-consent` 键。这些检查收紧了输入处理；提供商配置、隐私义务和后端授权仍由站点及其应用负责。

## 验证

这份源码状态的本地验证已通过：`npm run compile-runtime`、`npm run compile-theme`、`npm run compile-backend`、`npm run build -- --profile` 和 `npm run check` 在 39 份文档上完成；`npm test` 通过 66/66，并检查了 1,080 个内部链接和资源引用。100 条目夹具的增量构建与预览同步也通过；桌面和 390px 手机宽度下的学习入口没有横向溢出，六张图片都正常加载。VPS 验证使用生成的 handler 对接 mock Deno 接口，Pages 验证使用带 ASSETS 的 dry-run staging。没有执行真实云端或 Deno 部署，也没有发布 npm。

## 兼容性与下一章

这个版本改变公开的产品和 CLI 名称，同时保留现有站点需要的内容模型、多语言页面、主题契约、内部路径和同意存储。从现在开始，major、minor 和 patch 版本号都应当在 package 元数据、更新日志和带日期的内容记录之间保持同步。3.0.0 笔记记录的是源码状态，不表示已经发布 npm 包或部署站点。
