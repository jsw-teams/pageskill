---
title: 实用对比：安装、预览、部署与扩展
description: 对比 Pageskill、Astro、Eleventy、Hugo、VitePress 和 Docusaurus 的官方操作路径。
pattern: docs
---

# 实用对比：安装、预览、部署与扩展

本页比较开发者需要实际操作的命令和文件，不把一次 benchmark 运行变成普遍排名。表中的命令来自各项目官方文档；Pageskill 命令以本仓库当前 CLI 为准。

Pageskill 的定位是复用优先：人可以直接使用现成 Pattern、Block 和 Schema，Agent 只是可选的发现助手，页面作者不必逐页手写 HTML。只有目录中确实缺少能力时，才在主题中实现一次可复用扩展。

## 最短可运行路径

| 工具 | 安装 / 启动 | 本地预览 | 生产构建 | 扩展入口 |
| --- | --- | --- | --- | --- |
| Pageskill | `npm install`；`npm link`；`pageskill init` | `pageskill s` | `pageskill g` → `dist/public` 公开 snapshot | `themes/<name>/theme.ts`、`theme.yml`、`style.css`、插件开关 |
| Astro | `npm create astro@latest` | `npm run dev` | `npm run build` → `dist/` | `.astro` 页面、组件、integrations |
| Eleventy | `npm install @11ty/eleventy`；`npx @11ty/eleventy --serve` | `npx @11ty/eleventy --serve` | `npx @11ty/eleventy` → `_site/` | 模板、shortcodes、Data Cascade |
| Hugo | 安装 Hugo；`hugo new site` | `hugo server` | `hugo` → `public/` | `layouts/`、shortcodes、modules、resources |
| VitePress | `npx vitepress init` | `npm run docs:dev` | `npm run docs:build` → `.vitepress/dist/` | Vue 主题、Markdown 中的 Vue 组件 |
| Docusaurus | `npm init docusaurus@latest my-website classic` | `npm run start` | `npm run build` → `build/` | React 主题、plugins、MDX |

输出边界是部署事实，不是外观细节：公开 snapshot 位于 `dist/public`，目标专用的 server 或 Worker 文件保持私有。Pageskill 从 `config.yml` 读取部署目的地。静态生成是默认渲染方式：普通内容预先生成，需要交互时再调用同一个 Worker/Fetch 服务提供的同源 API。单个 Worker/Fetch 服务可以同时承载生成页面与同源动态 API；`/api/*` 默认由 Worker 优先处理，其他动态路径写入 `deployment.dynamicRoutes`。不要把含有私有代码的构建输出作为 CDN、Caddy、Nginx 或 GitHub Pages 的公开根目录。`server/`、`_pagekiln/`、`.pagekiln/`、Worker 文件和 `*.toml` 必须留在私有目录，秘密只在运行时读取。

## Pageskill 任务配方

### 安装新站点

```bash
npm install
npm run compile-runtime
npm run compile-theme
npm run compile-backend
npm link
pageskill init
pageskill check
```

Starter 是真实源码目录。它的 `config.yml`、`content/` 和 `themes/` 展示 CLI 复制的契约。

### 预览并编辑

```bash
pageskill s
pageskill s --port=4174
```

预览服务监听 `config.yml`、`content/` 和 `themes/`。Markdown、CSS 或主题编辑会触发重建和浏览器刷新，诊断错误后进程仍然保持运行。

### 部署

```yaml
deployment:
  targets: [cloudflare-pages, github-pages, vps]
  cloudflare:
    apiTokenEnv: CLOUDFLARE_API_TOKEN
    pages:
      project: example-site
      branch: production
  github:
    remote: origin
    branch: gh-pages
    tokenEnv: GITHUB_TOKEN
  vps:
    host: vps.example.com
    user: deploy
    port: 22
    remotePath: /var/www/example-site
    identityFile: ~/.ssh/id_ed25519
```

```bash
pageskill d --dry-run
pageskill d
```

支持的 connector 是 `cloudflare-pages`、`cloudflare-workers`、`github-pages`、`vps` 和可选的 `openai-sites` handoff。Token 放在环境变量中。VPS 使用本机 SSH agent 或已有私钥认证，服务器必须已经授权对应公钥。GitHub Pages 只发布 `dist/public` snapshot，不运行 API；动态 VPS 后端应安装在私有服务目录。Workers 使用 `assets.directory: public`，`.assetsignore` 是额外的排除层；Cloudflare Pages 使用目标专用的部署整理，公开静态上传只包含公开资源。Worker/Fetch 服务可以同时提供生成页面与同源动态 API；`/api/*` 默认由 Worker 优先处理，其他动态路径写入 `deployment.dynamicRoutes`。

### 开发 Block

```text
content/pages/guide/zh-sg.md   当前说明
themes/default/theme.ts        Block 渲染器和 schema
themes/default/theme.yml       Block/资源注册
themes/default/style.css       单一视觉来源
```

通过 `defineTheme` 实现 Block，在 `theme.yml` 注册，用 Markdown 指令调用，再运行：

```bash
npm run compile-theme
pageskill catalog
pageskill inspect block:hero
pageskill check
pageskill g
```

完整示例和安全边界见[二次开发](/zh-sg/development/)。

## 各工具需要维护什么

### Pageskill

内容身份明确：`content/pages/<id>/<locale>.md` 是当前站点内容，`content/posts/<id>/<locale>.md` 是带必填 `date` 的产品笔记。`docs` 是 `pages` 内的 Pattern，不是并列 collection。`config.yml` 负责站点设置和部署目的地；复制的主题负责 Pattern、Block、CSS、浏览器 ESM 和插件呈现。

### Astro

Astro[官方安装文档](https://docs.astro.build/en/install-and-setup/)从 `npm create astro@latest` 开始；[开发与构建文档](https://docs.astro.build/en/develop-and-build/)使用 `npm run dev` 和 `npm run build`。`.astro` 页面、组件、integrations 和 content collections 构成扩展面。需要组件和 integrations 作为主要开发方式时，使用这条路径。

### Eleventy

Eleventy[官网](https://www.11ty.dev/)展示 Markdown、模板、`npx @11ty/eleventy --serve` 和 `_site/`；[Data Cascade](https://www.11ty.dev/docs/data-cascade/)与[Collections](https://www.11ty.dev/docs/collections/)是主要组织面。需要多种模板语言和数据组合时，使用这条路径。

### Hugo

Hugo[快速开始](https://gohugo.io/getting-started/quick-start/)使用 `hugo new site`、`hugo server` 和 `hugo`，输出为 `public/`；[内容组织](https://gohugo.io/content-management/organization/)和[shortcodes](https://gohugo.io/content-management/shortcodes/)把结构放进内容树和布局。需要 sections、taxonomies、模板和原生二进制时，使用这条路径。

### VitePress

VitePress[入门文档](https://vitepress.dev/guide/getting-started)使用 `npx vitepress init`、`npm run docs:dev` 和 `npm run docs:build`；[在 Markdown 中使用 Vue](https://vitepress.dev/guide/using-vue.html)让 Vue 组件和客户端行为成为文档创作的一部分。文档站本身就是 Vue 应用时，使用这条路径。

### Docusaurus

Docusaurus[安装文档](https://docusaurus.io/docs/installation)使用 React starter、`npm run start` 和 `npm run build`；[i18n 文档](https://docusaurus.io/docs/i18n/introduction)处理 locale 目录以及主题和插件翻译。需要 docs sidebar、版本、MDX 和 React plugins 时，使用这条路径。

## 按下一个具体任务选择

- 需要 Markdown 优先的产品站，并且要明确区分当前页面、带日期产品笔记、语言、搜索、归档、sitemap 和静态部署：使用 Pageskill，从 Guide 开始。
- 需要 `.astro` 组件或 integrations 生态：使用 Astro starter。
- 需要模板语言选择和 Data Cascade：使用 Eleventy starter。
- 需要 sections、taxonomies、shortcodes 和原生二进制：使用 Hugo 快速开始。
- 需要在文档中使用 Vue 组件：使用 VitePress。
- 需要带 sidebar、版本和插件翻译的 React/MDX 文档：使用 Docusaurus。

选择应跟随下一个需要编写的文件。对 Pageskill 来说，当前用法写入 `content/pages/`，有日期的变化写入 `content/posts/`，新 Block 写入 `themes/<name>/theme.ts`。
