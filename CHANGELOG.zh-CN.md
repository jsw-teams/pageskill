# 更新日志

[English](CHANGELOG.md) · [中文 README](README.md) · [English README](README.en.md)

版本标签与 `package.json`、本更新日志以及带日期的本地化版本更新保持一致。本文件记录仓库变化；日志条目不代表已经发布到 npm 或已经部署。

## 3.0.2 — 2026-09-10

Pageskill 3.0.2 把版本历史和教程内容分开，并收紧响应式阅读布局。

### 变更

- 将版本更新改为 `posts` collection 中的 `updates` 过滤视图，源文件位于 `content/posts/<version>/<locale>.md` 并使用 `category: update`。它拥有独立的本地化索引/详情路由、归档、Feed、搜索结果、语言链接、导航和首页栏目；教程仍在同一个源 collection 中，不带 update 分类。
- 复用现有 collection 驱动的归档、Feed 和文章列表机制，没有新增第二套内容 collection 或页面 Pattern。更新日志的前后文章关系只在过滤视图内，生成的归档页现在有可见标题、说明和本地化链接。
- 将发布站点 URL 设为 `https://pageskill.openjsu.com`，三种语言的站点作者设为 `toewpq`；文章没有显式 `author` 时会继承这个值，增量文档缓存已预留重新计算逻辑。根级 `i18n` 现在负责回退语言和缺失内容处理；主题界面只翻译一部分时，会从回退语言合并缺失键，同时不会把回退页面错误宣称为已翻译页面。
- 语言能力的资源仍由主题代码拥有，但已经从 `theme.yml` 移除语言选项。Cookie 选择器现在逐类别显示提供者和保存期限，借鉴政策生成器的透明字段，但经过审核的法律政策仍由内容页面维护。
- 修复语言选择页的推荐标签布局，预留标签行并保持卡片等高。文章页头现在和正文阅读栏对齐，在封面之前紧凑显示标题、说明、日期和作者；手机目录默认折叠。
- 归档缩略图固定使用 16:9 容器并显式设置 `height: 100%`、`width: 100%` 和 `object-fit: cover`，不会让原图 `height` 属性撑出高空白行；文章封面使用稳定的 1200:630 容器，不会被拉伸。

### 验证

- `npm run g -- --profile` 通过；runtime、theme、backend 编译通过，构建报告 48 篇源文档。
- 56 个 HTML 内部 `href`/`src` 检查没有缺失引用。posts Feed 有 10 条、updates Feed 有 3 条，两个集合保持隔离；3.0.0 和 3.0.1 的旧 posts 路由已经不存在。
- 1280px 桌面和 390px 手机检查通过：语言卡片均为 136px 且标题基线一致，归档封面为 144x81，文章标题／日期／作者紧凑对齐，手机目录默认折叠并可点击展开，页面没有横向溢出。根语言页能匹配繁体中文浏览器偏好，品牌和隐私链接会指向 `zh-tw`。
- `git diff --check` 通过。`npm run d -- --dry-run` 因未配置 `deployment.targets` 以退出码 1 结束；没有执行部署或 npm 发布。

## 3.0.1 — 2026-09-09

Pageskill 3.0.1 是 3.0 版本线上的修订版，把当前编译器、内容和发布修正合并成一次有记录的发布；现有文章发布日期保持不变。

### 变更

- 让 `config.yml` 继续负责站点元数据、导航、collection schema、隐私/控制者资料、图片和发布设置；主题入口与模块自带的界面/资源留在 `themes/default/`，插件实例选项留在 `theme.yml`。
- 加固增量工作流：backend 和嵌套主题使用隔离的私有运行时，公开 CSS/JS 资源各自保留内容 hash，持续预览的 SSE 重载路径在源码变化后仍然有效。
- 保持运行时路由由源码驱动：生成的 Worker/Pages/VPS 入口先运行 Fetch Router，未匹配的 `/api` 仍返回 404，公开输出继续位于 `dist/public`，私有发布文件不进入公开快照。
- 文章排序改为使用有效 ISO 发布日期，按新到旧排列；同日文章按稳定的 ID 次序排列。现有日期没有被改成今天；无效文章日期现在会在校验阶段失败，不会被悄悄排成当前文章。
- 让文章 collection schema、文档/缓存映射、文章页、文章列表和归档都支持可选的 `author`、`cover` Frontmatter。作者缺省时回退到对应语言的站点作者；封面只接受安全的本地资源路径或 HTTPS URL，并提供 alt、尺寸和加载策略；没有封面时干净隐藏。
- 更新三语内容路径和 Cloudflare Pages 说明。Git 集成使用 `npm run g`，只发布 `dist/public`；同包 backend 使用配置好的 CLI 目标和 `npm run d` 打包。退休的 `npm run build` 别名和发布整个 `dist` 都不是当前契约。

### 验证

- 本次在本地实际观察到：`npm run compile-runtime`、`npm run compile-theme` 和 `npm run g`（其中包含 backend 编译），生成 42 篇文档；局部检查确认了新到旧及同日稳定排序、标题/摘要/日期/作者分离、封面与缺省回退、三语标签、没有重复文章标题，以及危险封面 URL 会被拒绝。
- 本条不声称 npm 发布或 Cloudflare 部署。旧的 `test/` 树仍保持删除状态；本次也实际运行了 `npm run d -- --dry-run`，由于当前 checkout 没有发布目标而正确提示 `Set deployment.targets in config.yml` 并退出。配置目标后仍需重新 dry-run，再执行 `npm run d`。

## 3.0.0 — 2026-09-07

Pageskill 3.0.0 沿用 3.0 版本线，让第一次搭站更容易开始。

### 变更

- 对外日常 CLI 收成 `pageskill g`、`pageskill s` 和 `pageskill d`。`g` 自动校验并生成，`s` 持续预览，`d` 发布已配置目标。新站从克隆仓库开始，运行 `npm install` 和 `npm run g`，再直接修改这个目录。
- 重组当前内容树。稳定页面保留三语首页、About 和隐私政策。教程、普通博客文章和产品记录统一放在 `content/posts/<id>/<locale>.md`，保留必填 `date`，使用语言文章路由。旧的冗长 guide、development 页面副本和旧 prompt 笔记从当前树移除，不建立 redirect 影子；历史留在 Git 和本更新日志。
- 围绕开始、站点设置、Markdown、第一篇文章、Cookie 选择、主题自定义、搜索、文章目录、插件开发、部署和本篇 3.0 说明重写本地化新手路径。隐私政策是稳定页面；每篇教程文章提供步骤、最小可用例子、成功结果、常见坑和下一步链接。
- 首页学习路径换成六张可复用的小熊插图，并链接前六个步骤。这是内容和主题视觉更新，不暗示 benchmark 或性能结果。
- 保留静态与公开边界：`dist/public` 是公开快照，`backend/handler.ts` 保存动态逻辑和运行时秘密，同源 API 在服务边界运行。Backend 路径使用现有的 `router.get(...)`、`router.post(...)` 和 `router.all(...)` 注册任意路径；运行时匹配返回 `Response` 或 `null`，生成时不需要在 `config.yml` 逐条列出 `dynamicRoutes`。生成的 Worker/Pages/VPS 入口对所有路径先运行 Router，并设置 `run_worker_first = true`；未知路径再交给公开静态资源，未匹配的 `/api` 路径保持 404。API 错误和鉴权响应不会回退到静态输出。构建/生成会把服务端嵌套 ESM 留在私有边界内，持续运行的 `pageskill s` 会在隔离的新私有运行时重编译嵌套主题 TypeScript；每个公开 CSS/JS 资源独立使用内容 hash，未变化资源继续保留 URL 和缓存身份。`config.yml` 仍然只是数据和设置入口。
- 保留现有 Cookie 插件。可选类别默认关闭，受信的 `gatedScripts` 由 `themes/<name>/plugins/cookies/index.ts` 中代码拥有的 `defaults` 和 schema 声明；主题实例选项放在 `themes/<name>/theme.yml`，站点配置只保存政策/控制者数据。撤回同意不能撤销已经执行的脚本动作。政策入口是稳定页面路由 `/:locale/privacy/`。
- 修复 Cookie 提示和页脚布局；语言选择页优先采用访客手动选择，再回退到浏览器语言，同时保持语言 URL 不变。
- 简化主题契约：`themes/<name>/index.ts` 组装已导出的能力，`layouts/site/` 保存共用 shell，`components/shared/` 保存共享辅助函数，文章关系跟随文章布局/组件，插件目录自带样式、脚本和 `messages.yml`，`theme.yml` 保存经过 schema 校验的插件实例数据和开关。个人或 Agent 可以复用一次扩展，不必给每个页面复制 HTML。
- 增加本地搜索、文章目录和开发可复用插件的实用三语文章；文章只引用当前主题契约中已经存在的路径和命令。
- 高级作者可读取生成的 `dist/.pagekiln/catalog.json` 和 `dist/.well-known/agent.json`，或使用内部 `getCatalog`/`inspect` 集成；这些发现细节不放进新手日常步骤。

### 迁移

1. 克隆仓库，运行 `npm install` 和 `npm run g`；之后直接在克隆的站点目录修改。
2. 稳定页面放在 `content/pages/<id>/<locale>.md`，不需要日期。教程、博客文章、产品记录和版本文章放在 `content/posts/<id>/<locale>.md`，补上必填的 ISO 日期，并让多个语言共用同一个 id。
3. 将 Cookie 政策设置改为 `/:locale/privacy/`，把示例联系人和服务替换为真实内容。
4. 源码检查运行各 compile 命令、`npm run g -- --profile` 和 `npm run s`；部署检查使用 `npm run d -- --dry-run`，配置好目标后才运行 `npm run d`。

### 验证流程

日常检查使用部署 dry-run；真正发布命令只在目标准备好后执行：

```text
npm run compile-runtime
npm run compile-theme
npm run compile-backend
npm run g
npm run g -- --profile
npm run s
npm run d -- --dry-run
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
