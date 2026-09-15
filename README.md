# Pageskill：用 Markdown 写内容，用 YAML 配置站点

[English](README.en.md) · [更新日志](CHANGELOG.zh-CN.md) · [English changelog](CHANGELOG.md)

Pageskill 4.0.0 是一个 Markdown-first 内容系统。站点作者主要维护 Markdown、`config.yml` 和可选的 `site/theme.yml`；Theme 的可复用行为与表现由 Components 提供，Server Function、数据库、Cache 和 AI 只在需要时由 Runtime Adapter 接入。

## 最小配置

```yaml
siteUrl: https://example.com
defaultLocale: en
activeLocales: [en]
siteName: Example

theme:
  name: default
  config: ./site/theme.yml

navigation:
  links:
    - key: home
      href: /:locale/
    - label: GitHub
      href: https://github.com/example/example
      target: _blank

footer:
  links:
    - key: privacy
      href: /:locale/privacy/
```

配置较大时，再把确实相关的设置拆到 `config/*.yml`，用 `extends` 按顺序载入。完整参考见 [`config.example.yml`](config.example.yml)。

## 开始使用

```powershell
git clone https://github.com/jsw-teams/pageskill.git
Set-Location pageskill
npm install
npx page g
npx page c
npx page s
```

公共 CLI 只有三个命令：

- `page g [--profile]`：快速校验、生成 `dist/public` 并生成 Agent readiness 输出；不会启动浏览器，也不会执行页面级无障碍检测。
- `page c`：启动真实浏览器执行完整的 axe、键盘、动态状态、响应式视口和缩放无障碍检测，并把私有报告与截图写入 `.pageskill/`。
- `page s [port]` 或 `page s --port <port>`：监视源码并预览。没有 Runtime Adapter 时使用 Core 静态预览；配置 Cloudflare 适配器时，直接在 Node 中运行生成的 Fetch Worker，不依赖 Wrangler。

没有 backend、数据库、Cache、AI 或 Runtime Adapter 时，`page g` 和 `page s` 仍然完整工作；`page c` 只额外要求当前环境提供可启动的浏览器。Cloudflare Pages + Functions + D1 + Workers AI 只是官方参考 Runtime Adapter，不是 Pageskill Core 依赖。Pageskill 不生成或调用 Wrangler 配置；生产环境的 `COMMENTS_DB`、`AI` 等 binding 由 Cloudflare Pages 项目设置提供，本地 Node 预览只提供文件型 `ASSETS`，未配置的可选 binding 会返回明确的 503。

## Component 的核心原则

> Component owns behavior and presentation; Content owns content.

Component 负责怎么渲染、怎么排列、怎么交互和怎么响应状态；Markdown、Frontmatter、Config 与 Runtime Data 负责显示什么。组件不能把站点标题、长文案、文章 ID、分类、locale URL、品牌或 Demo 数据写进 TypeScript。

Markdown 可以用短 directive 调用 Component：

```markdown
:::hero{tone="brand"}
# 这个标题属于 Markdown 内容

正文和按钮文案也属于内容层。
:::
```

Component 接受 `children`、named slots、structured props 和 runtime data。优先通过组合与数据变化复用稳定 Component，而不是为每个页面增加一个 variant。默认 Theme 应能在不修改 Theme TypeScript 的情况下用于完全不同的站点。

Component 只有两种来源：Built-in Component 与 External Component；能力用 `render`、`client`、`server`、`storage`、`cache`、`ai`、`integration` 表达。公开开发模型是 `ComponentDefinition`、Render Context、Content Context、Client Runtime、Server Function、Provider 和 Runtime Adapter，不再有平行的 Plugin、Pattern、Layout 或 Module 扩展 API。

`messages.yml` 只保存 Component 自有的短 UI 文案，例如按钮、状态、ARIA label 和控件提示；首页正文、Feature 描述、教程、法律文本和 Demo 数据必须留在 `content/`。

## 内容与运行时

```text
config.yml / config/*.yml     站点结构化设置、导航、路由、集合、集成
site/theme.yml                当前站点的 schema-bounded Component 覆盖
content/pages/                稳定页面
content/posts/                普通文章、教程和博客
content/updates/              独立的 release note 集合
themes/<name>/components/     可复用 Component 实现
backend/                      参考 Runtime Adapter 的私有 Server Function
```

普通 post 使用 `kind: post` 和必需的 `date`；可选 `updated` 只表示最后一次实质修改。Release note 使用 `kind: release`，不使用 `category: update`。`category` 只表示普通文章分类；缺失分类为 `uncategorized`。Posts、Releases、Category 和 Uncategorized archive 是显式分开的查询与路由。

不同 locale 的同一篇文档共享 `contentKey`，例如 `posts:markdown`。Comments 使用 `contentKey` 与 `sourceLocale` 记录来源，读者的 `viewerLocale` 只决定展示语言，因此不同语言页面看到相同评论集合。Comments 是可选 External Component；Comment Translation 是另一个可选能力，使用 L1 Function Cache、持久化翻译 Cache 和 single-flight，AI 不可用时评论仍可正常使用且翻译控件不启用。

## 发现与质量报告

生成器只根据真实实现生成 sitemap、RSS、搜索索引、Markdown mirror、`llms.txt`、Agent Discovery、Agent Skills 和 API Catalog。`enabled: true` 不会凭空创建 OAuth、MCP、WebMCP、DNS-AID、D1 或 AI 服务；DNS-AID 只负责 derive/check/report，不自动改 DNS。

无障碍报告属于开发工具，不会发布到站点：

```text
.pageskill/reports/accessibility/index.html
.pageskill/reports/accessibility/report.pdf
.pageskill/reports/accessibility/report.json
.pageskill/reports/accessibility/summary.json
.pageskill/reports/accessibility/screenshots/
```

`page c` 覆盖源码契约、最终 HTML、真实浏览器/axe，以及键盘、动态状态、响应式视口和缩放检查。它生成带标注截图的问题 PDF，同时保留 HTML 视图和 JSON 数据；截图包含 320×800、375×812、768×1024、1280×800、1440×900。自动化检查不能替代人工辅助技术审查。生产构建使用 `page g`，把完整浏览器检测放在具备浏览器的 CI 或发布前检查中，以避免托管构建因下载或启动浏览器而变慢。

不要手工编辑生成的 `dist/`、`.pageskill/` 或 `src/runtime/`。源码来源是 `config.yml`、`config/`、`site/theme.yml`、`content/`、`themes/` 和 `backend/`。Pageskill 使用 MIT License，见 [LICENSE](LICENSE)。
