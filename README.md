# Pageskill：写教程，搭网站

[English](README.en.md) · [更新日志](CHANGELOG.zh-CN.md) · [English changelog](CHANGELOG.md)

Pageskill 3.0.2 把 Markdown 内容、站点设置和主题样式生成成一个可发布的网站。先写内容，再让主题负责结构和视觉；普通站点不需要为每个 post 手写 HTML。

## 十分钟开始

克隆的源码仓库就是要修改和发布的站点。先安装依赖并生成它：

```powershell
git clone https://github.com/jsw-teams/pageskill.git
Set-Location pageskill
npm install
npm run g
```

`npm run g` 会先编译运行时、主题和 backend，再校验并生成当前站点。之后直接在这个目录修改：

```powershell
npm run s
```

`npm run s` 会持续预览，监听嵌套主题 TypeScript 模块和 backend 变化，并在重载前生成隔离的新私有运行时；按 `Ctrl+C` 停止预览，也可以另开终端继续编辑并再次运行 `npm run g`。准备好发布时，在 `config.yml` 填入目标并先运行 dry-run：

```powershell
npm run d -- --dry-run
```

确认目标后才运行 `npm run d`。完整步骤见[十分钟开始你的站点](content/posts/start/zh-sg.md)。

## 学习路径

按顺序阅读这些短文章：

- [改成你的名字和导航](content/posts/site-settings/zh-sg.md)
- [Markdown：像写笔记一样写内容](content/posts/markdown/zh-sg.md)
- [发布第一篇教程](content/posts/first-post/zh-sg.md)
- [我们如何构建插件](content/posts/cookies/zh-sg.md)
- [换样式，或让 Agent 帮你改](content/posts/customize/zh-sg.md)
- [让访客搜到页面和内容](content/posts/search/zh-sg.md)
- [给长内容加目录](content/posts/toc/zh-sg.md)
- [开发一个可复用插件](content/posts/plugins/zh-sg.md)
- [把网站放到网上](content/posts/deploy/zh-sg.md)
- [配置条件 Agent 能力](content/posts/agent-discovery/zh-sg.md)
- [关于 Pageskill](content/pages/about/zh-sg.md)
- [隐私说明](content/pages/privacy/zh-sg.md)
- [3.0.2 更新：更清楚的归档与响应式阅读](content/posts/3.0.2/zh-sg.md)
- [3.0.1 更新：文章元数据和更安全的发布](content/posts/3.0.1/zh-sg.md)
- [3.0 更新：更简单的入口](content/posts/3.0.0/zh-sg.md)

英文和繁体中文版本与每个教程或版本说明放在同一个目录。

## 内容和源码放在哪里

- `content/pages/<id>/<locale>.md` 保存稳定页面，例如首页、About 和隐私政策；它们不需要 `date`，由 pages collection 提供默认页面样式。所有带日期的教程、博客、产品记录和版本更新都放在 `content/posts/<id>/<locale>.md`；明确写 `category: tutorial` 才标为教程，省略 `category` 默认标为 `uncategorized`（未分类），版本更新使用 `category: update`，更新视图会把它们单独列到 `/:locale/updates/<id>/`。可选 `author` 和 `cover` 分别用于作者和封面；当前站点三种语言的站点作者都是 `toewpq`，省略作者时回退到它。本地封面放在 `content/assets/`，Frontmatter 使用 `assets/<path>` 或 `/assets/<path>`。
- `config.yml` 保存站点名称、语言、i18n 回退、导航、路由、隐私政策/控制者、图片和发布目标等设置；`theme.name` 选择主题，不放浏览器脚本或 HTML 代码。主题插件的实例选项和开关集中在 `themes/<name>/theme.yml`，语言列表和回退不属于插件设置。
- `themes/<name>/` 负责样式、文章结构和可复用 Block。根目录的 `index.ts` 只组装 `components/index.ts`、`layouts/index.ts` 和 `plugins/index.ts`；站点 shell 在 `layouts/site/`，共享辅助函数在 `components/shared/`，文章关系属于文章组件，组件在 `components/<id>/`，插件在 `plugins/<id>/`，各模块自带 `index.ts` 以及需要的 CSS、JS、`messages.yml`。插件定义代码保留 `schema`、`implementation`、`resources`、本地化 messages 和 `defaults`；`theme.yml` 只提供经过 schema 白名单校验的插件选项，不再选择主题名称。个人可以直接复用主题，Agent 也可以按同一契约扩展；文章不需要复制 HTML。
- `backend/handler.ts` 负责动态业务、写入、webhook 和运行时秘密。用现有 `router.get(...)`、`router.post(...)` 或 `router.all(...)` 注册任意路径；运行时匹配返回 `Response` 或未匹配的 `null`，生成入口不需要在 `config.yml` 逐条重复 `dynamicRoutes`。有 backend 时生成的 Worker/Pages/VPS 入口会对所有路径先运行 Router，并设置 `run_worker_first = true`；未知路径再交给公开静态资源，而未匹配的 `/api` 保持 404。API 错误和鉴权响应保持 API 响应，不回退到静态页面。公开静态快照位于 `dist/public`；构建/生成会把服务端嵌套 ESM 留在私有边界，每个公开 CSS/JS 资源独立使用内容 hash，未变化资源继续保留原 URL 和缓存身份。
- Cookie 选择器复用现成插件；可选用途默认关闭，选择器会按用途显示 provider 和保存期限。代码在 `themes/<name>/plugins/cookies/index.ts` 登记能力、资源、官方 provider 合约、用途映射和 schema，`themes/<name>/theme.yml` 负责 provider 实例；内置配置使用 `google-analytics`/`measurementId`、`google-ads`/`tagId`、`cloudflare-web-analytics`/`token`、`baidu-tongji`/`siteSignature`、验证码 `/siteKey` 和无账户 ID 的 `x-for-websites`。这些是代码适配器名称，字段值来自 provider 自己的后台或 snippet，不是 Pageskill 空想的 ID。`measurement`、`advertising`、`fraud-prevention` 和 `social-embedding` 是有实际 provider 行为支撑的用途键，不是 Cookie 名称。所有可选资源都要在同意后加载，公开标识仍是数据，secret 和服务端验证留在私有 backend；并非每个 provider 都会写 Cookie。`config.yml` 不进入 `dist/public`，也没有线上写入路由。它借鉴政策生成器的透明字段展示，但访客选择器不冒充法律政策生成器；站点政策仍由 `content/pages/privacy/` 维护，访客撤回同意不能撤销已经执行的脚本动作。完整构建过程见 Cookie 教程。
- 基础插件优先通过 `themes/<name>/theme.yml` 配置：`search`、`toc`、`privacyConsent` 和 `chrome` 的开关、限制、用途、provider 实例、插入链接和 `copy.<locale>` 都由 schema 白名单约束。代码只登记能力、资源、默认值和渲染行为；语言启用与回退仍属于 `config.yml`，不在插件设置里。新增语言只翻译 50% 时，缺少的插件 UI key 会从回退语言补齐；已经存在的 Markdown 文件按原文显示，不会逐段混入回退内容。
- 换样式时先改所属 layout、component、Block 或 plugin 的现有 CSS；新增样式要在模块旁创建文件并在模块资源和主题组装入口登记，删除样式则同时移除 import、资源和引用，再运行生成检查。不要只介绍替换核心 layout，也不要修改生成 CSS。

## 给 Agent 的发现信息

Agent 相关文件由渲染器从配置和真实输出自动生成，不要手写 `dist/` 里的内容。公开输出包括 `/.well-known/agent.json`、`/.well-known/ai-catalog.json`、条件生成的 `/.well-known/api-catalog`、`/.well-known/agent-skills/index.json`、`robots.txt` 和 `llms.txt`；页面在启用 Markdown mirror 时响应 `Accept: text/markdown`，共享 Fetch Router 同时添加 RFC 8288 `Link` 和 `Vary: Accept`。生成的 Skill 会遍历代码登记的能力字段和配置段落，不再维护第二份字段映射。`robots.contentSignals` 生成 `Content-Signal`。

鉴权元数据、MCP card、WebMCP 和 DNS-AID 的实现步骤见[配置条件 Agent 能力](content/posts/agent-discovery/zh-sg.md)：先在 backend、主题浏览器模块或外部 DNS 中实现真实能力，再在 `config.yml` 声明。`agentDiscovery.auth` 必须有真实资源和 issuer，`agentDiscovery.mcp` 的 endpoint/tool schema 必须对应实际 MCP 服务，WebMCP 需要主题脚本登记 `document.modelContext` 工具，DNS-AID 需要权威 DNS 已发布并验证 DNSSEC。默认示例保持关闭；渲染器不会伪造 endpoint，也不会发布 DNS。

高级作者在生成后可以阅读 `dist/.pagekiln/catalog.json` 或 `dist/.well-known/agent.json` 来发现可复用能力；内部集成可使用已导出的 `getCatalog` 和 `inspect`。新手先从教程、内容和设置开始即可。

`src/runtime/`、`.pagekiln/` 和 `dist/` 是生成物，不要手工修改。站点来源是 `config.yml`、`content/` 和 `themes/`。Pageskill 使用 MIT License，见 [LICENSE](LICENSE)。
