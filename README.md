# Pageskill：用 Markdown 写内容，用 YAML 配置站点

[English](README.en.md) · [更新日志](CHANGELOG.zh-CN.md) · [English changelog](CHANGELOG.md)

Pageskill 1.0.0 beta（`1.0.0-beta.0`）是一个 Markdown-first 静态内容系统。站点作者主要维护 Markdown、`config.yml` 和可选的 `site/theme.yml`；Theme 的可复用行为与表现由 Components 提供。数据库、Cache、AI、私密凭据和写操作属于独立 API 服务，不进入 Core 构建器或浏览器包。

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
- `page s [port]` 或 `page s --port <port>`：监视源码、重新生成并启动纯静态预览。

`page g` 与 `page s` 永远只处理 `dist/public` 静态文件；`page c` 只额外要求当前环境提供可启动的浏览器。Pageskill 不生成 `_worker.js`、主机配置或 Wrangler 文件。动态 Component 从配置中选择一个命名 `apis` 项；URL 可以是第三方来源，鉴权可选 `bearer` 或 `x-api-key`。写入配置的 Token 必然会成为公开浏览器数据，只能使用受限、可撤销的客户端 Token；私密凭据必须经独立部署的代理调用。

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

Component 只有两种来源：Built-in Component 与 External Component；能力用 `render`、`client`、`server`、`storage`、`cache`、`ai`、`integration` 表达。公开 Theme 模型只有 `ComponentDefinition`、Render Context、Content Context 和 Client Runtime；服务端能力通过独立 API contract 提供，不再有 Plugin、Pattern、Layout、Module 或 Runtime Adapter 扩展面。

每个浏览器 Component 在 `ComponentDefinition.client` 中只声明一个 ES module 与 root selector。统一 Client Runtime 提供 DOM 生命周期与生成资源访问；需要外部服务的 Component 只需增加命名 API id，例如 `api: 'comments'`，`config.apis.comments` 再提供绝对 URL 与可选客户端鉴权。Core 生成唯一 bootstrap，负责挂载、生命周期、已配置 origin/path 校验、鉴权 Header 和 JSON 请求；旧的模式切换、`resources.scripts`、全局注册对象与脚本自扫描已删除。数据库、Cache、模型、私密凭据或写操作由独立 API 服务实现。第三方浏览器供应商仍由 `integrations` 选择可信 Adapter，并单独强制同意机制与各语言隐私政策修订。

`messages.yml` 只保存 Component 自有的短 UI 文案，例如按钮、状态、ARIA label 和控件提示；首页正文、Feature 描述、教程、法律文本和 Demo 数据必须留在 `content/`。

## 内容与运行时

```text
config.yml / config/*.yml     站点结构化设置、导航、路由、集合、集成
site/theme.yml                当前站点的 schema-bounded Component 覆盖
content/pages/                稳定页面
content/posts/                普通文章、教程和博客
content/updates/              独立的 release note 集合
themes/<name>/components/     可复用 Component 实现
backend/                      可独立部署、Bearer Token 保护的参考 API 服务
```

普通 post 使用 `kind: post` 和必需的 `date`；可选 `updated` 只表示最后一次实质修改。Release note 使用 `kind: release`，不使用 `category: update`。`category` 只表示普通文章分类；缺失分类为 `uncategorized`。Posts、Releases、Category 和 Uncategorized archive 是显式分开的查询与路由。

不同 locale 的同一篇文档共享 `contentKey`，例如 `posts:markdown`。Comments 使用 `contentKey` 与 `sourceLocale` 记录来源，读者的 `viewerLocale` 只决定展示语言，因此不同语言页面看到相同评论集合。Comments 是可选 External Component；Comment Translation 是另一个可选能力，使用 L1 Function Cache、持久化翻译 Cache 和 single-flight，AI 不可用时评论仍可正常使用且翻译控件不启用。

## 发现与质量报告

生成器只根据真实实现生成 sitemap、RSS、搜索索引、Markdown mirror、`llms.txt`、Agent Discovery、Agent Skills 和 API Catalog。`enabled: true` 不会凭空创建 OAuth、MCP、WebMCP、DNS-AID、D1 或 AI 服务；DNS-AID 只负责 derive/check/report，不自动改 DNS。

Agent 指令遵循源码管理的 [Skill 开发者规范](docs/skill-development.md)；生成 Skill 是输出，不是编辑入口。

无障碍报告属于开发工具，不会发布到站点：

```text
.pageskill/reports/accessibility/index.html
.pageskill/reports/accessibility/report.pdf
.pageskill/reports/accessibility/report.json
.pageskill/reports/accessibility/summary.json
.pageskill/reports/accessibility/screenshots/
```

`page c` 覆盖源码契约、最终 HTML、真实浏览器/axe，以及键盘、动态状态、响应式视口和缩放检查。审计沙箱不会访问配置的上游 API、外接数据库、第三方模型或私密 Token；API 服务另做合约测试。`page c` 会从当次构建数据自动生成可阅读、带结构标签的 PDF，并加入本地搜索结果、移动端目录、代码复制、命名 API 配置和 Provider 隐私修订等细节图；HTML 报告和截图目录保留完整原始证据。截图包含 320×800、375×812、768×1024、1280×800、1440×900。

不要手工编辑生成的 `dist/`、`.pageskill/` 或 `src/runtime/`。源码来源是 `config.yml`、`config/`、`site/theme.yml`、`content/`、`themes/` 和 `backend/`。Pageskill 使用 MIT License，见 [LICENSE](LICENSE)。
