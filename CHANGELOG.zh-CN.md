# 更新日志

[English](CHANGELOG.md) · [中文 README](README.md) · [English README](README.en.md)

版本标签与 `package.json`、本更新日志以及带日期的本地化版本更新保持一致。本文件记录仓库变化；日志条目不代表已经发布到 npm 或已经部署。

## 3.0.2 — 2026-09-10

Pageskill 3.0.2 把版本历史和教程内容分开，并收紧响应式阅读布局。

### 变更

- 将版本更新改为 `posts` collection 中的 `updates` 过滤视图，源文件位于 `content/posts/<version>/<locale>.md` 并使用 `category: update`。它拥有独立的本地化索引/详情路由、归档、Feed、搜索结果、语言链接、导航和首页栏目；教程仍在同一个源 collection 中，不带 update 分类。
- 增加由 Markdown Frontmatter 驱动的 post 分类：`category: tutorial` 标记教程，`category: update` 标记版本更新，省略分类默认是 `uncategorized`（未分类）；不会从 pages collection 猜测 post 分类。
- 复用现有 collection 驱动的归档、Feed 和文章列表机制，没有新增第二套内容 collection 或页面 Pattern。更新日志的前后文章关系只在过滤视图内，生成的归档页现在有可见标题、说明和本地化链接。
- 增加了部分本地化的回退行为：缺少的界面翻译键会从回退语言合并，缺少整篇文章时可以使用回退内容，但不会把回退页面错误标成已经翻译的页面。
- 语言选择现在统一遵循启用语言和回退行为。Cookie 选择器现在逐用途显示 provider 和保存期限，借鉴政策生成器的透明字段，但经过审核的法律政策仍由内容页面维护。
- 修复语言选择页的推荐标签布局，预留标签行并保持卡片等高。文章页头现在和正文阅读栏对齐，在封面之前紧凑显示标题、说明、日期和作者；手机目录默认折叠。
- 归档缩略图固定使用 16:9 容器并显式设置 `height: 100%`、`width: 100%` 和 `object-fit: cover`，不会让原图 `height` 属性撑出高空白行；post 卡片和文章封面使用稳定容器，并用 `object-fit: contain` 保留完整原图。
- 增加主题级 `plugins.chrome` 结构化插槽，可在标准导航和页脚工具前后增加链接。语言替换、尺寸上限、路径穿越/协议检查和标签转义把自定义限制在安全链接范围；不接受 HTML、脚本、CSS、选择器或任意属性。
- 扩展 Cookie 插件为由代码登记能力、由主题配置 provider 实例的同意控制模块。内置配置使用 provider 数组和真实网页接入字段：GA4 的 `measurementId`（`G-...`）、Google Ads 的 `tagId`（`AW-...`/`GT-...`）、Cloudflare Web Analytics 的 `token`、百度统计的 `siteSignature`、验证码的 `siteKey`，以及不需要账户 ID 的 X for Websites widget。额外 integration 字段可以扩展，但只有登记对应模块后才会生效。可选 provider 资源必须在明确同意后加载，`config.yml` 不会进入 `dist/public`，也没有线上运行时写入路由。
- 将 Cookie 分类改为代码登记的用途契约：`measurement`、`advertising`、`fraud-prevention` 和 `social-embedding` 分别绑定真实 provider 行为；主题配置使用 `purpose`，不再要求作者凭空填写无实际含义的 `id`。旧 `id`/`category` 和浏览器中已有的旧同意状态会迁移到新用途键。
- 让 Agent 发现信息归渲染器负责：编译器根据配置和实际输出生成 `.well-known/agent.json`、ARD、条件生成的 RFC 9727 API catalog、Agent Skills 索引、`robots.txt` 和 `llms.txt`。共享 Fetch Router 生成 RFC 8288 `Link`，用 `Vary: Accept` 协商 `Accept: text/markdown` 镜像，并把 robots 策略中的 `Content-Signal` 带到响应中。生成的 Skill 会遍历代码登记能力表和配置段落，不再维护第二份手写字段映射。
- 让日常插件和样式工作优先配置化。`search`、`toc`、`privacyConsent` 和 `chrome` 在 `theme.yml` 公开受 schema 约束的实例选项和部分 `copy.<locale>` 映射；新增、修改、删除样式都通过所属模块的资源登记完成，不修改生成输出。

### 兼容用法

- 仍放在 `content/updates/<version>/` 的旧版本文章，迁移到 `content/posts/<version>/`，保留语言、日期、作者和封面字段，并给每种语言增加 `category: update`。现有公开的 `/:locale/updates/<version>/` 链接继续作为更新视图链接；普通 post 继续使用 `/:locale/posts/<id>/`。教程增加 `category: tutorial`，想使用默认未分类时省略 `category`。
- 新增语言可以在尚未完成翻译前启用。随着翻译进度补上界面和内容文件；缺失的界面键使用回退语言，缺失整篇文档使用回退内容，已经部分翻译的 Markdown 则保持原样，不会静默机器翻译。
- 如果旧主题有语言启用/禁用开关，请删除这个重复设置；访客语言选择仍来自有效语言列表，并保留回退行为。
- 发布前运行 `npm run g -- --profile`，检查文章和更新归档/Feed，再运行 `npm run d -- --dry-run`。
- 不要把生成的发现文件复制回源码。需要 API 条目、可选 ARD 查询或条件 Agent 能力时，先按[配置条件 Agent 能力](content/posts/agent-discovery/zh-sg.md)实现真实服务、主题浏览器模块或外部 DNS，再在 `config.yml` 配置后重新生成，让文件、媒体类型和响应头保持一致。
- 把旧的对象形 `privacyConsent.integrations` 迁移为 Cookie 教程中的数组。迁移期间编译器会接受旧 provider key，并把 `conversionId` 映射到 Google Ads 的 `tagId`、把 `siteId` 映射到百度的 `siteSignature`；新配置应使用 canonical provider 名称和 provider 自己提供的真实值。Google Ads 转化事件仍需单独审核并实现事件逻辑，同意适配器只初始化 Google tag。
- Cookie 的新配置使用 `purpose`：`measurement` 对应访问量测量，`advertising` 对应广告信号，`fraud-prevention` 对应验证码/反滥用，`social-embedding` 对应 X widget；这些键是同意状态的稳定用途键，不是账户 ID、Cookie 名称或 provider 自造标识。

### 已移除项与替代方案

- 不再使用独立的 `content/updates` 源 collection。原因是版本文章和普通文章需要共用一套按日期排序的来源，避免重复内容机制；替代用法是 `content/posts` 加 `category: update`。公开更新索引、路由、Feed、搜索结果和语言链接没有被删除。
- 没有移除 Cookie 同意或语言选择功能。提供者/保存期限是说明性元数据，经过审核的本地化隐私页面仍然是法律政策来源。canonical integration 结构替换了含义不清的 provider 对象键；旧结构在迁移期间仍可读取，并提供了明确替代用法。
- 现有 Cookie 存储键和 `gatedScripts` 行为保持兼容。把 provider 实例移到 `themes/<name>/theme.yml`；secret 和验证码校验继续放在服务端。provider 字段不完整或尚未支持时会被忽略，默认不会启用任何 provider。
- 没有移除发现 endpoint；手工维护的快照改由渲染器生成。需要 OAuth/OIDC、MCP、WebMCP 或 DNS-AID 时，按[配置条件 Agent 能力](content/posts/agent-discovery/zh-sg.md)先完成真实服务、主题模块或外部 DNS/DNSSEC 契约，再开启对应配置。

### 验证

- `npm run g -- --profile` 通过；runtime、theme、backend 编译通过，构建报告 48 篇源文档。
- 本地预览实测：明确请求 Markdown 时返回 `text/markdown`，`/.well-known/api-catalog` 返回 `application/linkset+json`，响应带生成的 `Link`/`Content-Signal`；访问 `/config.yml` 和 `/assets/config.yml` 返回 404 且没有私有配置文本。
- 56 个 HTML 内部 `href`/`src` 检查没有缺失引用。posts Feed 有 10 条、updates Feed 有 3 条，两个集合保持隔离；3.0.0 和 3.0.1 的旧 posts 路由已经不存在。
- 1280px 桌面和 390px 手机检查通过：语言卡片均为 136px 且标题基线一致，归档封面为 144x81，文章标题／日期／作者紧凑对齐，手机目录默认折叠并可点击展开，页面没有横向溢出。根语言页能匹配繁体中文浏览器偏好，品牌和隐私链接会指向 `zh-tw`。
- `git diff --check` 通过。`npm run d -- --dry-run` 因未配置 `deployment.targets` 以退出码 1 结束；没有执行部署或 npm 发布。

## 3.0.1 — 2026-09-09

Pageskill 3.0.1 是 3.0 版本线上的修订版，把当前编译器、内容和发布修正合并成一次有记录的发布；现有文章发布日期保持不变。

### 变更

- 加固增量工作流：backend 和嵌套主题使用隔离的私有运行时，公开 CSS/JS 资源各自保留内容 hash，持续预览的 SSE 重载路径在源码变化后仍然有效。
- 保持运行时路由由源码驱动：生成的 Worker/Pages/VPS 入口先运行 Fetch Router，未匹配的 `/api` 仍返回 404，公开输出继续位于 `dist/public`，私有发布文件不进入公开快照。
- 文章排序改为使用有效 ISO 发布日期，按新到旧排列；同日文章按稳定的 ID 次序排列。现有日期没有被改成今天；无效文章日期现在会在校验阶段失败，不会被悄悄排成当前文章。
- 让文章 collection schema、文档/缓存映射、文章页、文章列表和归档都支持可选的 `author`、`cover` Frontmatter。作者缺省时回退到对应语言的站点作者；封面只接受安全的本地资源路径或 HTTPS URL，并提供 alt、尺寸和加载策略；没有封面时干净隐藏。
- 更新三语内容路径和发布说明。Git 集成使用 `npm run g`，只发布 `dist/public`；同包 backend 使用 `npm run d`，让私有运行时单独暂存。退休的 `npm run build` 别名和发布整个 `dist` 都不是当前契约。

### 兼容用法

- 旧文章不需要批量补新字段：保留有效 ISO `date`，没有特别作者时可省略 `author`，只有需要图片时才增加安全的本地资源或 HTTPS `cover`。
- 用 `npm run g` 替代 `npm run build`；预览使用 `npm run s`，真实发布前使用 `npm run d -- --dry-run`。静态托管接收 `dist/public`，包含 backend 的发布使用 `npm run d` 正确暂存私有文件。
- 保留现有文章 ID、日期和 `/:locale/posts/<id>/` 链接。封面路径不安全时，改成 `content/assets/` 下的本地路径、HTTPS URL，或直接省略封面。

### 已移除项与替代方案

- `npm run build` 别名已移除，原因是避免同一生成步骤存在两个名称；替代用法是 `npm run g`。
- 不支持发布整个 `dist/` 目录，因为其中可能包含私有运行时文件；静态输出使用 `dist/public`，需要 backend 时使用 `npm run d` 生成发布包。
- 没有移除文章元数据能力。没有 `author` 或 `cover` 的文章仍按作者回退和无封面行为显示。

### 验证

- 本次在本地实际观察到：`npm run compile-runtime`、`npm run compile-theme` 和 `npm run g`（其中包含 backend 编译），生成 42 篇文档；局部检查确认了新到旧及同日稳定排序、标题/摘要/日期/作者分离、封面与缺省回退、三语标签、没有重复文章标题，以及危险封面 URL 会被拒绝。
- 本条不声称 npm 发布或 Cloudflare 部署。旧的 `test/` 树仍保持删除状态；本次也实际运行了 `npm run d -- --dry-run`，由于当前 checkout 没有发布目标而正确拒绝并退出。准备好发布目标后仍需重新 dry-run，再执行 `npm run d`。

## 3.0.0 — 2026-09-07

Pageskill 3.0.0 沿用 3.0 版本线，让第一次搭站更容易开始。

### 变更

- 对外日常 CLI 收成 `pageskill g`、`pageskill s` 和 `pageskill d`。`g` 自动校验并生成，`s` 持续预览，`d` 发布已配置目标。新站从克隆仓库开始，运行 `npm install` 和 `npm run g`，再直接修改这个目录。
- 重组当前内容树。稳定页面保留三语首页、About 和隐私政策。教程、普通博客文章和产品记录统一放在 `content/posts/<id>/<locale>.md`，保留必填 `date`，使用语言文章路由。旧的冗长 guide、development 页面副本和旧 prompt 笔记从当前树移除，不建立 redirect 影子；历史留在 Git 和本更新日志。
- 围绕开始、站点设置、Markdown、第一篇文章、Cookie 选择、主题自定义、搜索、文章目录、插件开发、部署和本篇 3.0 说明重写本地化新手路径。隐私政策是稳定页面；每篇教程文章提供步骤、最小可用例子、成功结果、常见坑和下一步链接。
- 首页学习路径换成六张可复用的小熊插图，并链接前六个步骤。这是内容和主题视觉更新，不暗示 benchmark 或性能结果。
- 保留静态与公开边界：`dist/public` 是公开快照，`backend/handler.ts` 保存动态逻辑和运行时秘密，同源 API 在服务边界运行。Backend 路径使用现有的 `router.get(...)`、`router.post(...)` 和 `router.all(...)` 注册任意路径；运行时匹配返回 `Response` 或 `null`，生成时不需要逐条维护路由清单。生成的 Worker/Pages/VPS 入口对所有路径先运行 Router，并设置 `run_worker_first = true`；未知路径再交给公开静态资源，未匹配的 `/api` 路径保持 404。API 错误和鉴权响应不会回退到静态输出。构建/生成会把服务端嵌套 ESM 留在私有边界内，持续运行的 `pageskill s` 会在隔离的新私有运行时重编译嵌套主题 TypeScript；每个公开 CSS/JS 资源独立使用内容 hash，未变化资源继续保留 URL 和缓存身份。
- 保留现有 Cookie 插件。可选类别默认关闭，受信的 gated scripts 需要明确同意，撤回同意不能撤销已经执行的脚本动作。政策入口仍是本地化隐私页面 `/:locale/privacy/`。
- 修复 Cookie 提示和页脚布局；语言选择页优先采用访客手动选择，再回退到浏览器语言，同时保持语言 URL 不变。
- 简化主题契约：主题入口组装已导出的能力，`layouts/site/` 保存共用 shell，`components/shared/` 保存共享辅助函数，文章关系跟随文章布局/组件，插件目录自带样式、脚本和本地化 messages。个人或 Agent 可以复用一次扩展，不必给每个页面复制 HTML。
- 增加本地搜索、文章目录和开发可复用插件的实用三语文章；文章只引用当前主题契约中已经存在的路径和命令。
- 高级作者可读取生成的 `dist/.pagekiln/catalog.json` 和 `dist/.well-known/agent.json`，或使用内部 `getCatalog`/`inspect` 集成；这些发现细节不放进新手日常步骤。

### 迁移

1. 克隆仓库，运行 `npm install` 和 `npm run g`；之后直接在克隆的站点目录修改。
2. 稳定页面放在 `content/pages/<id>/<locale>.md`，不需要日期。教程、博客文章、产品记录和版本文章放在 `content/posts/<id>/<locale>.md`，补上必填的 ISO 日期，并让多个语言共用同一个 id。
3. 如果版本文章仍在 `content/updates/<version>/`，移到 `content/posts/<version>/` 并增加 `category: update`；保留公开更新链接，普通文章使用文章路由。
4. Cookie 政策继续使用 `/:locale/privacy/`，把示例联系人和服务替换为真实且经过审核的内容，并保留现有同意存储键。
5. 旧工作流如果使用 `npm run build`，改用 `npm run g`；预览使用 `npm run s`，发布前使用 `npm run d -- --dry-run`。

### 已移除项与替代方案

- 旧的 `npm run build` 入口已移除，兼容替代是 `npm run g`。
- 冗长的 guide/development 页面副本和旧 prompt 笔记不再作为 redirect 影子保留。原因是重复来源容易漂移；替代内容是本地化短教程，需要旧版本时查阅 Git 历史。
- 不要求作者维护生成的 `dynamicRoutes` 清单；使用现有 Router 方法即可，backend 路由和同源 API 行为仍然可用。
- Cookie 同意和语言选择仍受支持；使用本地化隐私页面，以及“手动选择优先、浏览器语言回退”的语言选择行为。

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
