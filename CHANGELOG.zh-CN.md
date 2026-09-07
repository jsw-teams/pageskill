# 更新日志

[English](CHANGELOG.md) · [中文 README](README.md) · [English README](README.en.md)

版本标签与 `package.json`、本更新日志以及带日期的本地化版本文章保持一致。本文件记录仓库变化；日志条目不代表已经发布到 npm 或已经部署。

## 3.0.0 — 2026-09-07

Pageskill 3.0.0 沿用 3.0 版本线，让第一次搭站更容易开始。

### 变更

- 对外日常 CLI 收成 `pageskill g`、`pageskill s` 和 `pageskill d`。`g` 自动校验并生成，`s` 持续预览，`d` 发布已配置目标。源码仓库使用 `npm run g` 编译并生成，再执行 `npm link`；新站从 `starter` 复制。
- 重组当前内容树。稳定页面保留三语首页、About 和隐私政策。教程、普通博客文章和产品记录统一放在 `content/posts/<id>/<locale>.md`，保留必填 `date`，使用语言文章路由。旧的冗长 guide、development 页面副本和旧 prompt 笔记从当前树移除，不建立 redirect 影子；历史留在 Git 和本更新日志。
- 围绕八篇短文章重写本地化新手路径：开始、站点设置、Markdown、第一篇文章、Cookie 选择、主题自定义、部署和本篇 3.0 说明。隐私政策是稳定页面；每篇教程文章提供步骤、最小可用例子、成功结果、常见坑和下一步链接。
- 首页学习路径换成六张可复用的小熊插图，并链接前六个步骤。这是内容和主题视觉更新，不暗示 benchmark 或性能结果。
- 保留静态与公开边界：`dist/public` 是公开快照，`backend/handler.ts` 保存动态逻辑和运行时秘密，同源 API 在服务边界运行。`config.yml` 仍然只是数据和设置入口。
- 保留现有 Cookie 插件。可选类别默认关闭，受信的 `gatedScripts` 只放在 `theme.yml`；撤回同意不能撤销已经执行的脚本动作。政策入口是稳定页面路由 `/:locale/privacy/`。
- 修复 Cookie 提示和页脚布局；语言选择页优先采用访客手动选择，再回退到浏览器语言，同时保持语言 URL 不变。
- 高级作者可读取生成的 `dist/.pagekiln/catalog.json` 和 `dist/.well-known/agent.json`，或使用内部 `getCatalog`/`inspect` 集成；这些发现细节不放进新手日常步骤。

### 迁移

1. 让源码仓库和站点保持两个目录。在源码仓库运行 `npm run g` 和 `npm link`，再复制 `starter` 创建新站。
2. 将教程和博客文章放到 `content/posts/<id>/`，按需提供 `en.md`、`zh-sg.md`、`zh-tw.md`。补上必填的 ISO 日期，并让多个语言共用同一个 id。
3. 将 Cookie 政策设置改为 `/:locale/privacy/`，把示例联系人和服务替换为真实内容。
4. 在站点目录运行 `pageskill g`，用 `pageskill s` 做本地预览；配置好发布目标后再运行 `pageskill d`。

### 验证流程

日常检查使用部署 dry-run；真正发布命令只在目标准备好后执行：

```text
npm run g
npm test
pageskill g
pageskill s
pageskill d --dry-run
```

只有准备好真正发布时才运行 `pageskill d`。

## 历史

### 早期 3.0 基础

- 将对外产品从 Pagekiln 重命名为 Pageskill，覆盖包元数据、CLI、站点身份、主题文案、文档和仓库链接；旧名称和环境变量迁移到 Pageskill 对应名称。
- 增加源代码驱动的可复用 Pattern、Block、schema、plugin、context 和资源依赖、静态多语言输出、同源 Fetch 处理以及私有 backend 边界。
- 增加保守的样式表规划、浏览器安全的本地搜索、可选 Cookie 脚本门控、生成的目录、构建剖面和围绕 `dist/` 输出的部署适配器。

### 2.0 — 归档总结

这里没有记录可靠的原始发布日期。

- 建立 Pagekiln TypeScript/Node 22+ 静态优先编译器：YAML 1.2 Frontmatter 和 CommonMark/GFM Markdown 与主题拥有的 Pattern、Block 及 collection schema 组合使用。
- 增加本地化 collection、路由生成、翻译回退、Feed、归档、站点地图、404 输出、本地搜索和源代码驱动的发现文件。
- 建立页面和文章 shell、本地化 UI、可选浏览器行为、图标、Cookie 同意和无障碍导航的主题契约。
- 增加增量构建上下文和依赖追踪、缓存图片变体、指纹化资源、构建剖面、检查以及围绕生成输出的部署适配器。
