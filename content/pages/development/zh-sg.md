---
title: 开发 Block 与主题扩展
description: 以主题为起点新增 Block、注册资源、测试扩展并部署结果的实际流程。
pattern: docs
---

# 开发 Block 与主题扩展

Pageskill 的二次开发从复制主题开始。编译器负责 Markdown、schema、路由、依赖、资源和输出；主题负责 Pattern、Block、布局、CSS、浏览器 ESM、图标和隐私呈现。本页描述当前扩展路径。

复用优先：Agent 和页面作者先用 `catalog`、`inspect` 找到现有 Pattern、Block 与 schema，再用 Markdown、Frontmatter 和配置组装页面，不为每页手写 HTML。内置能力也可以由人工直接复用，不依赖 Agent 二次开发。只有发现确实缺少能力时，下面的主题代码才由扩展作者实现一次，之后供多个页面复用。

## 开发规范

### 性能速度

静态 HTML 是默认交付，普通页面不需要 hydration。按功能需要声明浏览器和其他资源，保留增量依赖追踪与内容指纹缓存。改变构建流程或资源后，用 `pageskill g --profile` 或 `npm run bench -- 100` 可复现地测量，再描述成本或速度；没有测量就不要编造性能承诺。默认 CSS 优化只尝试内联小型 Pattern/Block 依赖：每个原始 UTF-8 文件不超过 2,048 bytes，每页内联 CSS 文本总量（包括分隔符）不超过 4,096 bytes；只合并相邻可内联依赖，并按主样式 → Pattern → Block 顺序去重。主主题样式和全局/preset 合并包继续作为外链缓存资源。含 `url()`、`src()`、`image()`、`image-set()`、`@import`、`@charset`、`@namespace`、反斜杠、`<` 或 UTF-8 BOM 的文件保守保持外链，不重写 URL。外链 CSS 会压缩，内联 CSS 保留原文。所有指纹 CSS 资产仍然生成，CSS 修改会使缓存失效；这不表示所有 CSS 越小越好，也不表示一概 inline。

### 页面安全

文本和属性必须转义，链接使用 `safeUrl`，不可信 Markdown、Frontmatter 或配置值不得送进 `unsafeHtml`。搜索、表单和 URL 内容都只是数据，只使用 `textContent` 或其他安全 DOM API 插入；不要写入 `innerHTML`，也不要交给 `eval` 执行。主题 TypeScript 与浏览器 JavaScript 是受信任的应用代码，不是隔离不可信输入的 sandbox。`config.yml` 是非代码配置入口。后端每个输入都要由业务自行校验，受保护操作还要自行实现身份认证、权限和 CSRF 防护；秘密只在运行时由 `backend/handler.ts` 读取。框架和 Fetch router 不会自动提供这些保证。静态页面主体在构建时生成，不依赖 API 请求来渲染或补齐内容。

| 信任边界 | 按什么处理 | 必须做到 |
| --- | --- | --- |
| 访客 query、表单和 URL 输入 | 不可信数据 | 创建文本节点，或只把经过校验的值传给同源 API。 |
| 作者 Markdown、Frontmatter 和 `config.yml` | 数据，绝不当作可执行代码 | 输出转义，使用 `safeUrl` 和 schema，不送进代码执行入口。 |
| 主题 TypeScript 和浏览器 ESM | 需要审查的受信任扩展代码 | 按应用代码审查；它不是 sandbox。 |
| `backend/handler.ts` 运行时请求 | 不可信请求，秘密只在运行时 | 校验输入；受保护操作自行加入身份认证、权限检查、CSRF 防护和失败处理；秘密只从运行时环境读取。 |

用恶意 query、表单和 URL 内容，以及同一服务上的静态页面加 API 请求验证这条边界。记录实际的转义、授权和失败行为，不要笼统宣称完全安全。

`config.yml` 由站点管理员控制；不要把访客 query、表单或 URL 内容原样合并进去。如果在当前主题的 `plugins.privacyConsent.gatedScripts` 中配置脚本，其中的 HTTP(S) 来源是管理员或主题作者的信任决定：协议校验只阻止 `javascript:` 和 `data:` 注入，不能证明第三方脚本本身安全，访客也不能决定它的 `src`。

同一个 Worker/service 默认优先处理 `/api/*` 并调用 `backend/handler.ts`；其他动态路径写入 `deployment.dynamicRoutes`。不要在构建期间 import backend 来发现路由或读取秘密。

### i18n

`zh-sg`、`zh-tw`、`en` 的页面语义保持同步；主题 UI 文案放在 `themes/<name>/i18n.yml`。修改后核对 HTML `lang`、`hreflang`、语言链接和 fallback，不要在同一语言页面混用语言。

### 前后端与动静分离

`content/`、`config.yml`、`themes/` 和生成的输出各有边界；API、秘密、写入和 webhook 只放在 `backend/handler.ts`。静态生成是默认渲染方式：普通内容预先生成，交互功能按需调用同源 API。公开 snapshot 位于 `dist/public`；同一个 Worker/Fetch 服务可以提供这些页面和同源 API，同时保持 server 代码私有。这个服务默认优先处理 `/api/*`；其他动态路径写入 `deployment.dynamicRoutes`，不要在构建期间 import backend 来发现路由或读取秘密。GitHub Pages 或 CDN 只发布公开 snapshot；Fetch 平台可以从同一套包保留 API。Workers 使用 `assets.directory: public`，`.assetsignore` 是额外的排除层。`server/`、`_pagekiln/`、`.pagekiln/`、Worker 文件和 `*.toml` 必须留在私有目录；后端只在服务端或 Worker 运行时加载，runtime secrets 不写入构建产物。Cloudflare Pages 使用目标专用的部署整理，公开静态上传只包含公开资源。静态页面主体不应依赖动态请求渲染；新增动态行为要有独立失败处理。

### 兼容性与迁移

保持已有内容、配置和主题契约。新增能力优先做成可选项并维持既有行为；确需破坏性变更时，提供迁移说明并做兼容验证，避免长期维护重复机制。

当前 CLI 入口只有 `pageskill`，旧终端/CLI 入口已移除。本次改名只涉及源码仓库与 CLI 契约，不对 npm 发布状态作出判断。使用当前源码时，克隆 [Pageskill 源码仓库](https://github.com/jsw-teams/pageskill)，完成 runtime、theme 和 backend 编译后执行 `npm link`。改名不要求重写内容、`config.yml` 或主题；`.pagekiln/` 缓存、目录和构建剖面路径、`_pagekiln` 内部输出路径以及旧 Cookie consent 存储键继续兼容。站点根目录使用 `PAGESKILL_SITE_ROOT`。

以后每次 major、minor 或 patch 发布，都要让 `package.json` 和 `package-lock.json` 的 SemVer 保持一致，在 `CHANGELOG.md` 记录变化，并在 `content/posts/<id>/{en,zh-sg,zh-tw}.md` 添加带日期的本地化 Product Note，写明迁移步骤和验证方式。不要补写 1.0 的版本记录。

## 1. 复制主题边界

在新的主题目录开始，让原主题继续作为可运行的参考：

```text
themes/<name>/
├─ theme.yml
├─ theme.ts
├─ style.css
├─ i18n.yml
├─ blocks/                    可复用 Block 样式
└─ scripts/                 可选的原生浏览器 ESM
```

`theme.yml` 指向 `theme.ts`、`style.css` 和 i18n 资源，并登记已导出的 Pattern/Block 名称、资源映射和插件资源。Pattern/Block 定义及其 `schema` 写在 `theme.ts`；collection 数据 schema 写在根配置 `config.yml` 的 `content.collections.<name>.schema` 下。主题级 `plugins` 开关下放二级插件名称。主题 UI 文案放在 `themes/<name>/i18n.yml`，不放入站务根配置。

复制主题后，在站点根目录的 `config.yml` 选择它：

```yaml
theme:
  name: nebula
```

下面的 TypeScript 只演示最小的 `document` + `notice` 组合。复制现有主题时要保留原主题其他 Pattern 和 Block，尤其是 `landing`、`docs` 和 `blog`，否则现有页面会停止渲染。

## 2. 在 `theme.ts` 添加 Block

下面的代码属于扩展作者的工作：只有 catalog/inspect 找不到合适的可复用 Block 时，才需要写它。普通页面作者继续用 Markdown、Frontmatter 和配置组装页面，不必逐页写 HTML。使用小型主题 API，让 Block schema 保持标量且明确：

```ts
import { defineTheme } from '../../src/theme-api.ts';

export default defineTheme({
  name: 'nebula',
  patterns: {
    document: { name: 'document', contexts: ['page'], render: content => content }
  },
  blocks: {
    notice: {
      name: 'notice',
      schema: { tone: 'string' },
      render: (node, context) => {
        const tone = context.escapeHtml(node.attrs.tone || 'info');
        return `<aside class="notice notice--${tone}">${context.renderNodes(node.children)}</aside>`;
      }
    }
  }
});
```

`context.renderNodes` 渲染 Markdown 子节点。文本和属性使用 `context.escapeHtml`，链接使用 `context.safeUrl`。不要把未经审查的 Markdown、Frontmatter 或配置值送进 `unsafeHtml`。

在 `theme.yml` 注册同一个 Block：

```yaml
name: nebula
module: theme.ts
style: style.css
blockStyles: { notice: ['blocks/notice.css'] }
blocks:
  - notice
patterns:
  - document
plugins:
  privacyConsent:
    enabled: true
```

`theme.ts` 中的 `schema` 与 `theme.yml` 中的能力名称和资源登记共同构成一个契约。作者应保持两者同步，并以 `theme.ts` 实际导出和 `catalog` 的结果核对能力；不要用编译器条件隐藏未完成的 Block。

## 3. 在 Markdown 使用 Block

在 `content/pages/` 下的页面加入指令：

```markdown
:::notice{tone="info"}
当前使用说明在 Guide 中。
:::
```

指令属性保持短小且为标量。标题、段落、列表、表格、代码和链接继续使用普通 Markdown。描述当前行为的 Block 放在 page；记录有日期的实现决定则放在带必填 `date` 的 Product Note。

## 4. 让一个样式文件拥有视觉行为

把 Block 规则放进可复用的 `blocks/notice.css`，并在 `theme.yml` 用 `blockStyles` 声明：

```css
.notice{border-inline-start:3px solid var(--accent);padding:1rem 1.2rem;background:var(--panel);color:var(--ink)}
```

编译器会把外链 CSS 压缩为单行并为文件名加指纹。声明的 `blocks/notice.css` 等小型相邻依赖可能按页面内联；每个原始 UTF-8 文件不超过 2,048 bytes，每页内联 CSS 总量（包括分隔符）不超过 4,096 bytes；只合并相邻可内联依赖，并按主样式 → Pattern → Block 顺序去重。主主题样式和全局/preset 包始终保持外链。含 `url()`、`src()`、`image()`、`image-set()`、`@import`、`@charset`、`@namespace`、反斜杠、`<` 或 UTF-8 BOM 的文件保守外链；内联 CSS 保留原文。严格禁止 inline 的 CSP 可在 `theme.yml` 顶层关闭这项优化：

```yaml
inlineStyles: false
```

这只关闭 CSS 优化，不承诺整站已经符合 CSP。响应式布局、焦点状态、表格适配、图标尺寸和 reduced-motion 行为都放在这个样式文件或声明的主题资源中。新规则替代旧规则时删除重叠规则和无效兼容文件，不要依靠 cascade 顺序同时维持两套设计。

默认主题通过主题模块使用 Lucide 图标包。已有控件应复用已声明的图标库，不要为同一组控件再增加图标字体或另一套内联 SVG。

## 5. 发现并测试扩展

按以下顺序运行：

```bash
npm run compile-theme
npm run catalog
pageskill inspect block:notice
pageskill check
pageskill g --profile
pageskill s
```

`catalog` 确认当前主题的 Pattern、Block、插件、schema 名称和资源依赖。`inspect block:notice` 以结构化输出回答单个能力问题。`check` 会以源码位置报告未知 Block、无效属性、路由冲突和缺少必填字段。`g` 确认 Block 进入静态输出；`s` 确认 Markdown 或主题编辑后浏览器会刷新。

## 6. 添加可选浏览器行为

原生 ESM 放在 `themes/<name>/scripts/`，并在对应插件下声明。每个可选插件都要有明确开关：

```yaml
plugins:
  privacyConsent:
    enabled: true
  search:
    enabled: true
```

可选分析或广告脚本在访客同意对应 Cookie 类别前保持不活动。必要的同意存储由隐私契约启用；footer 打开与访客之后重新打开的同一个设置对话框。浏览器代码只加载一次，每个事件处理器只保留一个拥有者。旧脚本被替代时删除它，不要让两个处理器竞争。

## 7. 分离站务配置与运行时代码

`config.yml` 保存站点信息、语言、collection、路由、schema、隐私设置和部署位置，不保存 CSS 路径、任意 HTML 或浏览器脚本正文。需要动态请求、密钥、写入和 webhook 时，代码只放在 `backend/handler.ts`；使用共享 Fetch router，并在部署前编译后端。

默认公开 snapshot 位于 `dist/public`；同一个包可以保留私有 server/Worker 代码，由单个 Worker/Fetch 服务提供生成页面和同源 API。`/api/*` 默认由 Worker 优先处理；其他动态路径写入 `deployment.dynamicRoutes`，不要在构建期间 import backend 来发现路由或读取秘密。GitHub Pages 或 CDN 只发布 `dist/public`，不运行 API。Workers 使用 `assets.directory: public`，`.assetsignore` 是额外的排除层；Cloudflare Pages 使用目标专用的部署整理。`server/`、`_pagekiln/`、`.pagekiln/`、Worker 文件和 `*.toml` 必须留在私有目录，runtime secrets 不写入构建产物。

仅供高级兼容使用：静态目标确实需要重新构建且不产出 worker、server、backend 文件时，可设置 `deployment.enabled: false`。这不是主线产品路径的必选项，也不会提供动态 API 或应用认证。

需要动态逻辑时，再使用部署目标配置：

```yaml
deployment:
  targets: [cloudflare-pages]
  cloudflare:
    apiTokenEnv: CLOUDFLARE_API_TOKEN
    pages:
      project: example-site
      branch: production
```

```bash
pageskill d --dry-run
pageskill d
```

一次发布需要多个目的地时使用 `targets: [cloudflare-pages, github-pages, vps]`。在 `config.yml` 填写各供应商的项目、远程仓库、分支、SSH 主机、用户、端口、远程路径和密钥路径；密钥值留在环境变量或本机 SSH 配置中。

## 8. 测量修改

可选 fixture 会测量 100 个临时页面，并以 JSON 行报告 cold、no-change、edit、add、delete、theme 和 settings 变化：

```bash
npm run compile-runtime
npm run compile-theme
npm run compile-backend
npm run bench -- 100
```

`maxRssMiB` 是 Node 构建进程的峰值常驻内存，不是输出目录大小。fixture 运行后会移除，不构成产品性能承诺。

## 9. 扩展完成清单

```text
[ ] theme.ts 通过 defineTheme 导出 Block
[ ] theme.yml 注册 Block 和资源
[ ] style.css 负责响应式及焦点状态
[ ] 删除重复 CSS、JS 和兼容层
[ ] 可选插件有明确开关
[ ] i18n 留在 themes/<name>/i18n.yml
[ ] pageskill catalog 和 inspect 能描述 Block
[ ] pageskill check、build、test 和 preview 通过
[ ] 检查生成的 dist/，不手动编辑
```
