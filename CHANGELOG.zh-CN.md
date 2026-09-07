# 更新日志

[简体中文](CHANGELOG.zh-CN.md) · [English](CHANGELOG.md) · [中文 README](README.md) · [English README](README.en.md)

版本标签与 `package.json`、本更新日志以及同一变更对应的带日期产品笔记保持一致。本文件记录仓库变化；日志条目不代表已经发布到 npm 或已经部署。

## 3.0.0 — 2026-09-07

Pageskill 3.0.0 收束已归档的 2.0 阶段，并开启复用优先的产品线。

### 变更

- 将对外产品从 Pagekiln 重命名为 Pageskill，覆盖包元数据、CLI、站点身份、主题文案、文档和仓库链接；旧的 `pagekiln` CLI 入口已移除。请将命令迁移到 `pageskill`，并把 `PAGEKILN_SITE_ROOT` 替换为 `PAGESKILL_SITE_ROOT`。如果现有 `deployment.openaiSites.staticDirectory` 为 `dist`，请迁移到 `deployment.staticDirectory: public`；新的设置可选，旧 OpenAI Sites 设置中安全的自定义目录值仍可作为 fallback。
- 将发现和复用设为作者路径：`pageskill catalog` 和 `pageskill inspect` 暴露源代码驱动的 Pattern、Block、schema、plugin、context 和资源依赖。作者继续使用 Markdown、Frontmatter 和 `config.yml` 组装页面；主题扩展应成为可复用的共享能力，而不是逐页手写 HTML。
- 保持页面生成静态化，同时允许一个同源 Worker/Fetch 运行时处理 `/api/*` 和已配置的动态路由。统一构建将公开页面和资源放入 `dist/public`，并将 `server/`、`_pagekiln/`、`.pagekiln/`、Worker 文件和部署清单保留为私有内容。`backend/handler.ts` 仍是动态业务逻辑和运行时秘密的来源；这条边界不会自动提供应用身份认证、授权或 CSRF 防护。
- 增加保守的主题样式规划：只有原始 UTF-8 源文件不超过 2,048 bytes、每页合并后的内联 CSS 不超过 4,096 bytes，且源文件不含不安全的相对资源或 style 元素风险时，Pattern 或 Block 样式表才可以内联。主题主样式包仍然使用指纹化外链。
- 收紧本地搜索和可选 Cookie 脚本的浏览器边界。搜索结果值使用 DOM 文本 API 创建，结果 URL 会校验协议；已配置的可选脚本只有在其 Cookie 类别获得同意后，且来源为 HTTP(S) 时才会加载。现有 `pagekiln-consent` 存储键继续兼容。这些检查收窄了输入处理边界；站点所有者仍负责 provider 配置和后端授权。
- 增加六个本地化指南步骤——从这里开始、站点设置、Markdown、第一批内容、Cookie 同意和主题自定义——以及可复用的 `learning-path` Block，并在 `content/assets/learning/` 下加入六张独立的小熊 PNG 插图。
- 保留现有内容、本地化路由、主题 Pattern 和 Block、生成的 catalog/build-profile 路径以及内部 `_pagekiln`/`.pagekiln` 名称，同时变更对外产品和 CLI 名称。今后的 major、minor 和 patch 条目会让包、更新日志和带日期内容中的版本标签保持一致。

## 历史

### 2.0 — 归档总结

这里没有记录可靠的原始发布日期。

- 建立了 Pagekiln TypeScript/Node 22+ 静态优先编译器：YAML 1.2 Frontmatter 和 CommonMark/GFM Markdown 与主题拥有的 Pattern、Block 及 collection schema 组合使用。
- 增加本地化 collection、路由生成、翻译 fallback、feed、归档、站点地图、404 输出、本地搜索，以及源代码驱动的 `.pagekiln/catalog.json` 和 `.well-known/agent.json` 发现文件。
- 建立主题契约，涵盖页面和文章 shell、视觉语言、本地化 UI、可选浏览器行为、图标、Cookie 同意和可访问导航。`backend/handler.ts` 继续作为动态业务逻辑和秘密的存放位置。
- 增加增量 BuildContext 和依赖追踪、缓存图片变体、指纹化 CSS/ESM 资源、构建剖面、检查，以及围绕生成 `dist/` 输出的部署适配器。
