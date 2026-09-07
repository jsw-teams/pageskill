# Pageskill：复用优先的网站编译器

[简体中文](README.md) · [English](README.en.md) · [中文更新日志](CHANGELOG.zh-CN.md) · [English changelog](CHANGELOG.md)

Pageskill 3.0.0 是复用优先的网站编译器：人可以直接使用内置能力，Agent 可选，页面作者不必逐页手写 HTML。它基于 TypeScript/Node 22+，把 YAML 1.2 Frontmatter、CommonMark/GFM Markdown、Pattern、Block 和 Schema Data 编译成可检查的网站输出；普通内容预生成，交互功能按需调用同源 API，公开 snapshot 位于 `dist/public`。

当前版本是 3.0.0；版本变化见 [中文更新日志](CHANGELOG.zh-CN.md) 或 [English changelog](CHANGELOG.md)。

## 中文文档导航

- [使用指南](content/pages/guide/zh-sg.md)：从安装、检查和预览开始，了解 Pageskill 的日常使用方式。
- [二次开发](content/pages/development/zh-sg.md)：扩展 Pattern、Block、主题资源和动态边界。
- 学习路径：[从这里开始](content/pages/guide/start/zh-sg.md) · [站点设置](content/pages/guide/site-settings/zh-sg.md) · [Markdown 入门](content/pages/guide/markdown/zh-sg.md) · [第一批内容](content/pages/guide/first-content/zh-sg.md) · [Cookie 同意](content/pages/guide/cookies/zh-sg.md) · [自定义渲染](content/pages/guide/customize/zh-sg.md)

## Quick Start

```bash
npm install
npm run g -- --profile
npm run check
npm run s
```

源码仓库使用 `npm run g`、`npm run check` 和 `npm run s`；从源码目录完成编译并执行 `npm link` 后，在站点目录使用 `pageskill g`、`pageskill check` 和 `pageskill s`。打开 `http://127.0.0.1:4173/` 选择网站版本。语言选择页保留语言自称：`简体中文`、`繁體中文` 和 `English`。`g --profile` 会输出 discover、load、validate、parse、route、render、assets、write 各阶段时间。构建后的页面不为每页启动 HTTP 或 Fetch 生命周期；`src/runtime/` 是预编译 JavaScript。

### 先复用，再扩展

Agent 和页面作者先用 `pageskill catalog`、`pageskill inspect` 查看可用的 Pattern、Block、Schema 和资源依赖，再选择结构、填写 Markdown/Frontmatter 与配置来组装页面。内置能力也可以由人直接复用，不需要 Agent 参与；页面作者无需为每页手写 HTML。只有发现目录中确实缺少能力时，才复制主题并实现一次可复用的扩展。

```bash
pageskill catalog
pageskill inspect pattern:landing
pageskill inspect block:hero
pageskill check
pageskill g --profile
```

## Start Writing

### Content paths

`pages` 保存站点当前有效的内容，放在 `content/pages/<id>/<locale>.md`；首页、About、Guide、Reference 和目录页都属于这里。Pageskill 行为变化后，更新对应页面。`docs` 只是 `pages` 中的文档呈现 Pattern，不是第三个 collection。`posts` 保存已经发生的产品决定、实现、发布、问题处理、部署或测量结果，放在 `content/posts/<id>/<locale>.md`；每篇 Product Note 的 `date` 必填，并进入按日期排列的归档和 Feed。当前使用说明写在 `pages`，历史记录写在 `posts`。资源放在 `content/assets/`。默认站点提供 `zh-sg`、`zh-tw`、`en`，文件名最后的 locale 决定翻译关系、路由和 hreflang。

```markdown
---
title: 搜索结果新增命中位置
description: 记录 2026-08-10 新增可见命中位置标签的产品变更。
pattern: blog
date: 2026-08-10
cover: /assets/product-note-cover.webp
---

# 搜索结果新增命中位置

这篇笔记记录一次已经完成的变更。当前搜索使用方式回到 `content/pages/` 中的 Guide；`<more>` 前的内容会成为归档摘要。

<more>

这里是完整正文，仍然是普通 Markdown。
```

### Markdown model

正文支持 GFM 表格、任务列表、删除线、引用、代码围栏和自动链接。Block Directive 只承载短标量属性，标题、列表、表格和说明保留在 Markdown：

```markdown
:::feature-grid{columns="3"}
### 页面
`pages` 保存当前有效的首页、说明和目录。行为变化后，直接更新对应页面。

### 产品笔记
`posts` 保存有日期的已发生决定、实现、发布和问题处理，不是当前使用文档。

### 主题
主题负责 Pattern、Block、视觉和可选浏览器行为。
:::
```

未知 Block、错误属性、缺少 schema 字段和路由冲突会报告源文件、行列和修复建议。原始 HTML 默认转义；只有经过代码审阅的可信值才可使用 `unsafeHtml`。MDX、JSX、虚拟 DOM 和 HTML comment Slot 不在编译路径中。

### Built-in outputs

站点默认生成静态 HTML、404、自定义 Feed（RSS/Atom 类的更新订阅文件）、`sitemap.xml`（搜索引擎站点地图）、本地搜索索引、`llms.txt`（给 Agent 读取站点入口的简明文本）、`.pagekiln/catalog.json`（列出主题能力和内容上下文）以及 `.well-known/agent.json`。搜索结果会标注命中标题、摘要、正文小节或路径，而不是只给出模糊标题。`pageskill catalog` 直接从配置、内容和主题源码建立能力目录，不渲染全站或依赖已有 `dist/`。

## Secondary Development

### Project structure

```text
config.yml                 站点信息、语言、路由、collection 和插件开关
starter/                   `pageskill init` 复制的最小可构建项目模板
content/                   Markdown 内容与用户资产
themes/default/            theme.yml、i18n.yml、theme.ts、style.css、插件脚本和 Pattern/Block 资源
src/compiler.ts            BuildContext、解析、schema、依赖图、缓存和静态输出
src/theme-api.ts           主题 Pattern、Block、Shell 契约
src/lib/                   Markdown、SafeHtml、URL 与小型基础模块
src/fetch-router.ts        共享 Web Standard Fetch 路由器
backend/handler.ts         动态业务和秘密读取的唯一来源
test/                      单元、集成和输出契约测试
scripts/benchmark.mjs      临时规模夹具，不写入生产 dist
```

`src/runtime/`、`.pagekiln/` 和 `dist/` 都是生成物，不手动编辑。项目根目录的 `src/` 不再保留空的旧层；需要新的内容能力先检查主题和现有 Block。

### Commands

| 命令 | 用途 |
| --- | --- |
| `pageskill init` | 创建不含生产域名、令牌和个人身份的中性项目 |
| `pageskill g --profile` | 生成静态站点并写入机器可读构建剖面 |
| `pageskill s [port]` | 保持 BuildContext 的增量预览 |
| `pageskill d --dry-run` | 按 `config.yml` 预览部署动作，不上传 |
| `pageskill d` | 按 `config.yml` 部署目标；公开 snapshot 位于 `dist/public` |
| `pageskill check` | 检查 Markdown、schema、Block、路由和输出 |
| `pageskill catalog` | 从当前源码查看 Pattern、Block、schema、插件和资源依赖；不执行完整构建 |
| `pageskill inspect <query>` | 以结构化 JSON 查看内容或 `page:`, `block:`, `pattern:`, `collection:`, `plugin:` 命名空间对象 |

`pageskill inspect <id>` 仍按内容 id 查询；命名空间查询用于避免内容和能力同名时产生歧义。找不到对象会返回非零退出码和稳定的 `INSPECT_NOT_FOUND` JSON 错误。

### Theme-first extension

只有 `catalog`/`inspect` 显示现有能力不足时，才从 `themes/<name>/` 开始扩展。复制默认主题后，在 `theme.ts` 中新增 Pattern 或 Block 并定义其 `schema`，在 `theme.yml` 中登记能力名称和资源，把共享样式写入 `style.css`、Block 专用 CSS 放入 `blockStyles` 声明的资源，并把可选能力放在带 `enabled: true|false` 开关的 `plugins.<name>` 二级节点；collection 的数据 schema 则写在根配置 `config.yml` 的 `content.collections.<name>.schema` 下，本地化 UI 文案放进独立的 `i18n.yml`。页面 shell、移动端断点、目录展开、搜索命中标注、无动效默认和 Cookie 选择器都属于主题边界。扩展作者应实现一次可复用能力；普通页面不 hydration，也不需要逐页写 HTML。

Pattern → Block → Schema Data 是推荐组合方式。集合、翻译 fallback、Feed、站点地图、搜索、图片缓存、增量依赖图和部署产物由核心提供，避免为每个页面重复写模板。

默认 CSS 优化只会尝试内联小型 Pattern/Block 依赖：单文件原始 UTF-8 不超过 2,048 bytes，单页内联 CSS 总量（含分隔符）不超过 4,096 bytes，只合并相邻可内联依赖并按主样式 → Pattern → Block 去重；主主题样式和全局/preset 包继续作为可缓存外链。含 `url()`、`src()`、`image()`、`image-set()`、`@import`、`@charset`、`@namespace`、反斜杠、`<` 或 UTF-8 BOM 的文件保守外链。外链 CSS 会压缩，内联 CSS 保留原文。所有指纹 CSS 资产仍会生成；严格 inline-CSP 可在主题 `theme.yml` 顶层设 `inlineStyles: false`，它只关闭 CSS 优化，不承诺整站 CSP。

### 改名兼容

当前 CLI 入口是 `pageskill`，旧终端/CLI 入口已移除。本次改名只涉及源码仓库与 CLI 契约，不对 npm 发布状态作出判断。使用当前源码时，克隆 [Pageskill 源码仓库](https://github.com/jsw-teams/pageskill)，完成 runtime、theme 和 backend 编译后执行 `npm link`；`.pagekiln/` 缓存、目录和构建剖面路径、`_pagekiln` 内部输出路径以及旧 Cookie consent 存储键继续保留兼容。站点根目录使用 `PAGESKILL_SITE_ROOT`。

### Configuration boundaries

`config.yml` 只管理站点信息、语言、导航、collection、路由、schema、图片处理、搜索、隐私和部署等设置。它不是 CSS、HTML、浏览器脚本或 `unsafeHtml` 注入入口。视觉与行为进入主题目录，动态业务进入 `backend/handler.ts`。原始 `config.yml`、`content/` 和 `themes/` 是事实来源；`.pagekiln/catalog.json` 与 `.well-known/agent.json` 是生成的发现层；`AGENTS.md` 只提供操作约束。

搜索、表单和 URL 内容都作为数据处理，只使用 `textContent` 或其他安全 DOM API 插入；不要写入 `innerHTML`，也不要交给 `eval` 执行。主题 TypeScript 与浏览器 JavaScript 是受信任的应用代码，不是隔离不可信输入的 sandbox。后端每个输入都要由业务自行校验，受保护操作还要自行实现身份认证、权限和 CSRF 防护；Fetch router 不会替代这些控制。静态页面主体在构建时生成，不依赖 API 请求来渲染或补齐内容；静态生成是默认渲染方式，不限制产品使用动态能力。主线部署可由单个 Worker/Fetch 服务同时承载生成页面与同源动态 API，交互功能按需调用同源 API。
`config.yml` 由站点管理员控制；不要把访客 query、表单或 URL 内容原样合并进去。如果在当前主题的 `plugins.privacyConsent.gatedScripts` 配置了脚本，其中的 HTTP(S) 来源是管理员或主题作者的信任决定：协议校验只阻止 `javascript:` 和 `data:` 注入，不能证明第三方脚本本身安全，访客也不能决定它的 `src`。

同一个 Worker/service 默认优先处理 `/api/*` 并调用 `backend/handler.ts`；其他动态路径写入 `deployment.dynamicRoutes`。不要在构建期间 import backend 来发现路由或读取秘密。

默认主题的共享样式保留在 `style.css`，Block 专用规则放在 `theme.yml` 声明的 `blockStyles` 资源中。外链 CSS 资产构建为压缩单行文件，内联 CSS 保留原文；CSS 和原生 ESM 文件名使用内容指纹版本化，不依赖查询字符串缓存。OG 图和产品笔记封面由图片变体配置生成，未提供页面资源时使用默认源图。

### Privacy and accessibility

Cookie 选择器由主题的 `privacyConsent` 插件声明，并可由主题和 `config.yml` 中的 `enabled` 开关关闭。必要类别默认存在，可选类别默认关闭；未同意前不会插入可选脚本。人类访客从页脚打开本地化设置，Agent 读取单独的 JSON 披露文件，两者不混在同一入口中。输出包含跳过链接、语义标题、键盘焦点、`aria` 状态、hreflang 和站点地图；移动端表格转为带字段标签的纵向内容，目录展开后随页面流动，不依赖原生横向滑动条。

可选服务写在 `config.yml` 的 `privacy.cookieConsent.integrations` 中，不填写脚本路径。内置 provider 包括 `googleAnalytics`（`measurementId`）、`googleAds`（`conversionId`）、`cloudflareWebAnalytics`（`token`）和 `baiduTongji`（`siteId`）；它们只有在对应类别获得选择后才加载，Google 同步 Consent Mode，百度保留官方异步代码，Cloudflare Web Analytics 即使不使用 Cookie 也作为可选数据发送服务处理。

```yaml
privacy:
  cookieConsent:
    integrations:
      googleAnalytics: { enabled: true, measurementId: G-XXXXXXXXXX, category: analytics }
      googleAds: { enabled: true, conversionId: AW-XXXXXXXXXX, category: advertising }
      cloudflareWebAnalytics: { enabled: true, token: YOUR_CLOUDFLARE_TOKEN, category: analytics }
      baiduTongji: { enabled: true, siteId: YOUR_BAIDU_SITE_ID, category: analytics }
```

### Deployments and dependencies

默认公开站点 snapshot 位于 `dist/public`；不要把包含私有代码的完整构建输出交给 CDN、Caddy、Nginx 或 GitHub Pages 作为公开根目录。Pageskill 的主线部署隔离公开资源和私有 server 代码，由单个 Worker/Fetch 服务同时承载预生成页面与同源动态 API；`backend/handler.ts` 只在服务端或 Worker 运行时加载，runtime secrets 不写入构建产物。同一个 Worker/service 默认优先处理 `/api/*` 并调用 backend，其他动态路径写入 `deployment.dynamicRoutes`。GitHub Pages 只发布 `dist/public` snapshot，不运行 API；VPS 动态 backend 应安装在私有服务目录。`server/`、`_pagekiln/`、`.pagekiln/`、Worker 文件和 `*.toml` 必须留在私有目录。Workers 用 `assets.directory: public`，`.assetsignore` 是额外的排除层；Cloudflare Pages 使用目标专用的部署整理，公开静态上传只包含公开资源。部署目标和路径只写在站点根目录 `config.yml`；`targets` 可以填一个目标，也可以填多个目标，按列表顺序执行：

使用目标专用的 server/worker 边界，让同一服务承载页面和同源 API：

```yaml
deployment:
  targets: [vps, cloudflare-pages]
  cloudflare:
    accountId: CF_ACCOUNT_ID
    apiTokenEnv: CLOUDFLARE_API_TOKEN
    pages:
      project: site-name
      branch: production
    workers:
      name: site-worker
      compatibilityDate: '2026-08-10'
  github:
    remote: origin
    branch: gh-pages
    tokenEnv: GITHUB_TOKEN
  vps:
    host: vps.example.com
    user: deploy
    port: 22
    remotePath: /var/www/site
    identityFile: ~/.ssh/id_ed25519
    publicKeyFile: ~/.ssh/id_ed25519.pub
```

然后运行 `pageskill d`；`pageskill d --dry-run` 只检查所有已选动作。Cloudflare Pages 需要项目名，可选分支；Workers 需要 Worker 名称和兼容日期。配置 `cloudflare.apiTokenEnv` 后，脚本只从该环境变量读取 Cloudflare API token；省略或设为 `null` 时交给 Wrangler 使用本机登录状态。GitHub 需要已存在的 remote 名称和目标分支；配置 `github.tokenEnv` 后，HTTPS remote 使用子进程环境中的 Git authorization header，token 不进入命令行、配置或日志，SSH remote 则继续使用本机 SSH agent/config。VPS 需要主机、用户、SSH 端口和已存在的远程目录；`identityFile` 是私钥，`publicKeyFile` 可选用于确认配套公钥文件存在，公钥必须预先放在服务器的 `authorized_keys` 中，Pageskill 不上传密钥。所有凭据只存在运行时环境或本机密钥文件中。OpenAI Sites 目标仍是可选适配，但本项目已移除 Sites 绑定，不会再默认发布到该平台。

凭据边界遵循 [GitHub 的 HTTPS token 说明](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)、[Wrangler 的 Cloudflare API token 说明](https://developers.cloudflare.com/workers/wrangler/commands/general/) 和 [OpenSSH scp 的 `-i` 私钥参数](https://man.openbsd.org/scp.1)。部署成功只代表托管平台接收并发布了产物，不代表所有地区都能访问；DNS、运营商路由、企业网络策略、平台区域可用性和自定义域名状态都可能造成部分地区打不开。面向多地区访客时，应从目标地区实测，并准备 Cloudflare、GitHub Pages 或 VPS 等替代出口。

生产直接依赖有明确职责：`markdown-it` 和 `markdown-it-task-lists` 解析 GFM，`yaml` 解析 YAML 1.2，`sharp` 生成图片变体，`lucide` 提供成熟开源 SVG 图标。遍历、watch、hash、路由、RSS、站点地图、搜索序列化、原子写和测试使用 Node/Web Standard，未增加重复便利包。

### Verification and limits

```bash
npm run compile-runtime
npm run compile-theme
npm run compile-backend
npm test
pageskill g --profile
pageskill check
npm run catalog
npm run inspect -- home
npm run bench -- 100
npm run bench:compare -- --sizes=100 --scenario=cold --tools=pageskill,astro,eleventy,hugo
```

规模夹具在系统临时目录生成并在运行结束清理，默认测 100 份内容，可用 `--locales=3` 测三语言、`--images` 测图片缓存、`--quick` 测冷构建与无变化构建。每行 JSON 包含机器、阶段、场景、输出数量、图片计数和 `maxRssMiB`；它表示 Node 进程峰值常驻内存（RSS，KiB 除以 1024 得到 MiB），不是 `dist/` 大小，也不是单页占用。仓库不提交临时构建 JSON，也不把夹具结果伪装成产品承诺。

对比研究页只使用各工具官方文档可确认的能力，并将工具本身耗时与 Pageskill 额外交付契约分开记录。完整边界和复现方式见 `content/pages/about/`、`content/pages/guide/` 与 `content/pages/development/`。

MIT 许可证、`NOTICE`、现有用户资产和可选的 `Pageskill by JSW Teams` 署名策略必须保留。`branding.showAttribution` 只控制页脚是否显示署名，不改变许可证义务。
