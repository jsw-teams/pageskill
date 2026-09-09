# Pageskill：写文章，搭网站

[English](README.en.md) · [更新日志](CHANGELOG.zh-CN.md) · [English changelog](CHANGELOG.md)

Pageskill 3.0.1 把 Markdown 文章、站点设置和主题样式生成成一个可发布的网站。先写内容，再让主题负责结构和视觉；普通站点不需要为每篇文章手写 HTML。

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
- [Markdown：像写笔记一样写文章](content/posts/markdown/zh-sg.md)
- [发布第一篇文章](content/posts/first-post/zh-sg.md)
- [Cookie 选择：先问访客再加载](content/posts/cookies/zh-sg.md)
- [换样式，或让 Agent 帮你改](content/posts/customize/zh-sg.md)
- [让访客搜到页面和文章](content/posts/search/zh-sg.md)
- [给长文章加目录](content/posts/toc/zh-sg.md)
- [开发一个可复用插件](content/posts/plugins/zh-sg.md)
- [把网站放到网上](content/posts/deploy/zh-sg.md)
- [关于 Pageskill](content/pages/about/zh-sg.md)
- [隐私说明](content/pages/privacy/zh-sg.md)
- [3.0.1 更新：文章元数据和更安全的发布](content/posts/version-3-0-1/zh-sg.md)
- [3.0 更新：更简单的入口](content/posts/version-3-0/zh-sg.md)

英文和繁体中文版本与每篇文章放在同一个目录。

## 内容和源码放在哪里

- `content/pages/<id>/<locale>.md` 保存稳定页面，例如首页、About 和隐私政策；它们不需要 `date`，由 pages collection 提供默认页面样式。新手教程、博客、产品记录和版本文章放在 `content/posts/<id>/<locale>.md`，每篇文章都要有有效的 ISO `date`；可选 `author` 和 `cover` 分别用于作者和封面，省略作者时回退到 `config.yml` 的站点作者，路由是 `/:locale/posts/<id>/`。本地封面放在 `content/assets/`，Frontmatter 使用 `assets/<path>` 或 `/assets/<path>`。
- `config.yml` 保存站点名称、语言、导航、路由、隐私政策/控制者、图片和发布目标等设置；`theme.name` 选择主题，不放浏览器脚本或 HTML 代码。主题插件的实例选项和开关集中在 `themes/<name>/theme.yml`。
- `themes/<name>/` 负责样式、文章结构和可复用 Block。根目录的 `index.ts` 只组装 `components/index.ts`、`layouts/index.ts` 和 `plugins/index.ts`；站点 shell 在 `layouts/site/`，共享辅助函数在 `components/shared/`，文章关系属于文章组件，组件在 `components/<id>/`，插件在 `plugins/<id>/`，各模块自带 `index.ts` 以及需要的 CSS、JS、`messages.yml`。插件定义代码保留 `schema`、`implementation`、`resources`、本地化 messages 和 `defaults`；`theme.yml` 只提供经过 schema 白名单校验的插件选项，不再选择主题名称。个人可以直接复用主题，Agent 也可以按同一契约扩展；文章不需要复制 HTML。
- `backend/handler.ts` 负责动态业务、写入、webhook 和运行时秘密。用现有 `router.get(...)`、`router.post(...)` 或 `router.all(...)` 注册任意路径；运行时匹配返回 `Response` 或未匹配的 `null`，生成入口不需要在 `config.yml` 逐条重复 `dynamicRoutes`。有 backend 时生成的 Worker/Pages/VPS 入口会对所有路径先运行 Router，并设置 `run_worker_first = true`；未知路径再交给公开静态资源，而未匹配的 `/api` 保持 404。API 错误和鉴权响应保持 API 响应，不回退到静态页面。公开静态快照位于 `dist/public`；构建/生成会把服务端嵌套 ESM 留在私有边界，每个公开 CSS/JS 资源独立使用内容 hash，未变化资源继续保留原 URL 和缓存身份。
- Cookie 选择复用现成插件；可选类别默认关闭，受信的 `gatedScripts` 由 `themes/<name>/plugins/cookies/index.ts` 的 `plugin.defaults` 和 schema 声明，并可在 `themes/<name>/theme.yml` 配置。站点配置只保存政策和控制者数据。访客撤回同意不能撤销已经执行的脚本动作。

高级作者在生成后可以阅读 `dist/.pagekiln/catalog.json` 或 `dist/.well-known/agent.json` 来发现可复用能力；内部集成可使用已导出的 `getCatalog` 和 `inspect`。新手先从文章和设置开始即可。

`src/runtime/`、`.pagekiln/` 和 `dist/` 是生成物，不要手工修改。站点来源是 `config.yml`、`content/` 和 `themes/`。Pageskill 使用 MIT License，见 [LICENSE](LICENSE)。
