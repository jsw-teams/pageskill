---
title: 安装、预览、构建与部署 Pageskill
description: 从新建 Pageskill 站点到检查、预览并部署网站的实际操作路径。
pattern: docs
---

# 安装、预览、构建与部署 Pageskill

这是一份当前使用文档。Agent 和页面作者先复用现有能力，再决定是否需要扩展主题。`pages` 描述站点现在如何工作；`posts` 保存有日期的产品变化。如果编译器或主题行为发生变化，应更新本页和其他当前页面。需要新增 Block 或修改主题时，请阅读[二次开发](/zh-sg/development/)。

## 学习路径

:::learning-path
### 从这里开始
安装 Pageskill，创建中性站点并运行第一次检查。
[打开“从这里开始”](/zh-sg/guide/start/)

### 配置站点
设置站点名称、语言、导航、collection schema 和主题。
[打开“站点设置”](/zh-sg/guide/site-settings/)

### 学习 Markdown
编写 Frontmatter、标题、列表、表格、链接和可复用指令。
[打开“Markdown 入门”](/zh-sg/guide/markdown/)

### 发布第一批内容
创建页面和带日期的产品笔记，然后检查、预览并构建。
[打开“第一批内容”](/zh-sg/guide/first-content/)

### 配置 Cookie 同意
让可选类别默认关闭，只在同意后加载受信任的 HTTP(S) 脚本。
[打开“Cookie 同意”](/zh-sg/guide/cookies/)

### 自定义渲染
先复用 Pattern 和 Block，再复制主题实现可复用扩展。
[打开“自定义”](/zh-sg/guide/customize/)
:::

## 1. 安装

Pageskill 要求 Node.js `>=22.12.0` 和 npm。在本仓库中操作：

```bash
git clone https://github.com/jsw-teams/pageskill.git
cd pageskill
npm install
```

使用源码 CLI 前，先编译运行时、主题和后端：

```bash
npm run compile-runtime
npm run compile-theme
npm run compile-backend
```

要在其他目录创建中性的站点，可链接本地 CLI，让它复制真实的 `starter/` 模板：

```bash
npm link
mkdir my-site
cd my-site
pageskill init
```

`pageskill init` 不会在 CLI 里再生成一套隐藏模板，而是复制 `starter/`，包括 `config.yml`、内容和主题资源。

## 2. 先发现并复用能力

新页面先看能力目录，再开始写内容：

```bash
pageskill catalog
pageskill inspect pattern:landing
pageskill inspect block:hero
pageskill inspect collection:pages
```

从结果中选择已有 Pattern、Block 和 collection schema，填写 Markdown、Frontmatter 与 `config.yml` 数据。下面的最小页面使用仓库和 starter 都提供的 `landing` Pattern 与 `hero` Block；页面作者只写内容和属性，不需要逐页手写 HTML：

```markdown
---
title: 产品入口
description: 说明这个入口页面的用途。
pattern: landing
---

:::hero{tone="brand" align="left"}
# 让 Agent 复用已有结构

把页面内容写在 Markdown 中。
:::
```

接着运行 `pageskill check` 和 `pageskill g --profile`。只有 catalog/inspect 没有覆盖需求时，才复制主题并实现一次可复用 Pattern 或 Block；扩展流程见[二次开发](/zh-sg/development/)。

## 3. 写入第一批内容

源码目录有两个 collection：

```text
content/
├─ pages/<id>/<locale>.md       当前站点信息
├─ posts/<id>/<locale>.md       有日期的产品笔记
└─ assets/                      图片及其他站点资源
```

当前页面写在 `content/pages/`。当首页、About、Guide、Reference 和目录页回答“站点现在怎样工作”时，它们都属于 `pages`。`docs` 是 `pages` 中的 Pattern，不是第三个 collection。

```markdown
---
title: 本地搜索
description: 当前构建如何建立索引并标记结果位置。
pattern: docs
---

# 本地搜索

Pageskill 当前为每种语言建立静态索引，并按命中的标题、章节、正文或路径标记结果位置。
```

本仓库的完整默认主题含有 `docs` Pattern；`pageskill init` 复制的最小 starter 只有 `landing`、`document` 和 `blog` 等目录能力。使用 starter 时先用 `document`，或复制提供 `docs` 的主题，并以 `pageskill catalog` 确认能力后再采用上面的示例。

只有在记录一次有日期的决定、实现、发布、事故、部署或测量时，才在 `content/posts/<id>/<locale>.md` 写产品笔记。`date` 字段必填。

```markdown
---
title: 搜索结果新增命中位置
description: 记录 2026-08-10 新增可见命中位置标签的变更。
date: 2026-08-10
pattern: blog
---

# 搜索结果新增命中位置

这篇笔记记录当天改了什么以及为什么这样改。当前搜索用法仍然写在 Guide 中。
```

当前行为变化时，更新原来的页面。旧产品笔记保留为历史；新的有日期变化新增一篇笔记。这样 `pages` 表示当前状态，`posts` 表示时间线历史。

## 4. 检查源码

预览或部署前先运行：

```bash
pageskill check
```

检查会验证 YAML Frontmatter、必填 schema 字段、collection 路由、翻译组、Pattern 和 Block 名称、指令属性以及路由冲突。产品笔记缺少 `date` 会检查失败；当前页面不需要日期。

需要确认当前主题实际提供了什么能力时，使用源码发现命令：

```bash
pageskill catalog
pageskill inspect collection:pages
pageskill inspect collection:posts
pageskill inspect block:hero
```

`catalog` 读取源码能力，不要求先完整构建站点。`inspect` 为内容 id 或明确 namespace 返回结构化事实。

## 5. 本地预览

启动增量预览服务：

```bash
pageskill s
```

打开[http://127.0.0.1:4173/](http://127.0.0.1:4173/)。默认端口被占用时：

```bash
pageskill s --port=4174
```

服务启动时先构建一次，然后监听 `config.yml`、`content/` 和 `themes/`。受影响的输出重建后浏览器会刷新，所以 Markdown、Frontmatter、CSS 或主题修改不需要重启进程即可看到。构建诊断错误会打印出来，但预览进程会继续运行，方便修复后再次构建。

在仓库源码中，等价的 npm 别名是 `npm run s` 和 `npm run s -- --port=4174`。

## 6. 构建 `dist/`

生成构建输出：

```bash
pageskill g
pageskill g --profile
```

短命令和 `pageskill build` 执行相同操作。它写入 `dist/`，包括 HTML、单行压缩并带指纹的 CSS、浏览器 ESM 资源、Feed、sitemap、搜索数据、`llms.txt`、自定义 404 页面和目标平台部署文件。构建 profile 位于 `dist/.pagekiln/build-profile.json`。

在源码仓库中可运行 `npm run g -- --profile`。不要手动编辑 `dist/`，应修改源码后重新生成。

## 7. 从 `config.yml` 部署

部署写在站点配置文件中，不把供应商凭据放到命令行。可以选择一个或多个 target：

```yaml
deployment:
  targets: [cloudflare-pages, vps]
  cloudflare:
    apiTokenEnv: CLOUDFLARE_API_TOKEN
    pages:
      project: example-site
      branch: production
  vps:
    host: vps.example.com
    user: deploy
    port: 22
    remotePath: /var/www/example-site
    identityFile: ~/.ssh/id_ed25519
    publicKeyFile: ~/.ssh/id_ed25519.pub
```

支持的 target 是 `cloudflare-pages`、`cloudflare-workers`、`github-pages`、`vps`，以及可选的 `openai-sites` connector handoff。凭据放在环境变量、本机 SSH agent 或 SSH 密钥文件中，不要把 token 或私钥内容写进 `config.yml`。

上传前先查看解析后的操作：

```bash
pageskill d --dry-run
```

确认后上传：

```bash
pageskill d
```

`pageskill d` 会先构建。Cloudflare Pages 使用 Wrangler 发布目标整理后的输出；Cloudflare Workers 使用生成的标准 module Worker；GitHub Pages 把公开 snapshot 推送到配置的远程分支且不运行 API；VPS 使用 SCP 复制目标部署输出到配置的路径。VPS 必须已有 SSH 访问权限、远程目录，并在使用密钥认证时把公钥放进服务器的 `authorized_keys`。

静态生成是默认渲染方式，不限制产品使用动态能力：普通内容会预先生成，需要交互时再调用同一个 Worker/Fetch 服务提供的同源 API。同一个 Worker/Fetch 服务处理生成页面和 `/api/*`；其他动态路径写入 `deployment.dynamicRoutes`。部署目标会将公开资源与私有 server 代码分开。不要把含有私有代码的构建输出作为公开静态根目录；`server/`、`_pagekiln/`、`.pagekiln/`、Worker 文件和 `*.toml` 必须留在私有目录，秘密只在运行时读取。GitHub Pages 只推送公开 snapshot，不运行 API；Workers 和动态 VPS 使用各自的服务端边界。Cloudflare Workers 默认将公开资源放在 `dist/public`，通过 `assets.directory: public` 隔离公开目录；`.assetsignore` 仅作为额外排除层，Cloudflare Pages 使用目标专用的部署整理，将私有路径排除在公开资源之外。高级部署兼容设置与边界见[二次开发](/zh-sg/development/)。OpenAI Sites 不是本项目的默认绑定，部分地区可能无法访问；需要广泛可达性时，应从目标地区测试最终域名。

## 8. 修改主题或新增 Block

将主题复制到 `themes/<name>/`，在 `theme.ts` 实现 Block，在 `theme.yml` 注册；主题共用 CSS 放入 `style.css`，Block 专用 CSS 放入声明的 `blocks/<id>.css`。然后依次运行 `catalog`、`inspect`、`check`、`build` 和 `serve`。完整示例见[二次开发](/zh-sg/development/)。

不要为了保留旧实现而增加第二份 CSS、浏览器脚本或兼容 wrapper。重新设计替代旧规则或处理器时，删除重复项并检查生成结果。

## 9. 发布前检查

```bash
npm test
pageskill check
pageskill g --profile
pageskill inspect collection:posts
pageskill d --dry-run
```

检查三种语言链接、自定义 404、`feed.xml`、`sitemap.xml`、`llms.txt`、可选 Cookie 脚本、键盘焦点、窄屏表格和生成的部署文件。产品笔记必须按日期倒序出现在 archive/feed；当前页面不应被强制要求填写日期。
