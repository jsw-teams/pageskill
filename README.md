# Pageskill：用 Markdown 写内容，用 YAML 配置站点

[English](README.en.md) · [更新日志](CHANGELOG.zh-CN.md) · [English changelog](CHANGELOG.md)

Pageskill 3.1.0 是一个静态优先的网站生成器：它把 Markdown 内容、YAML 站点数据和可复用主题编译成网站。普通作者主要维护内容与配置，不需要为每篇文章手写 HTML。

## 最小配置

```yaml
siteUrl: https://example.com
defaultLocale: en
activeLocales:
  - en
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

当配置变大时，可以把确实相关的内容、发现或部署设置拆到 `config/*.yml`，再按顺序写入：

```yaml
extends:
  - ./config/content.yml
  - ./config/discovery.yml
```

对象递归合并，数组整体替换，后面的标量覆盖前面的值。完整参考见 [`config.example.yml`](config.example.yml)；主题插件的完整参考见 [`themes/default/theme.example.yml`](themes/default/theme.example.yml)。

## 十分钟开始

```powershell
git clone https://github.com/jsw-teams/pageskill.git
Set-Location pageskill
npm install
npm run g
npm run s
```

`g` 校验并生成，`s` 启动本地预览，`d` 发布 `deployment.targets` 中声明的正式目标。发布前先运行：

```powershell
npm run d -- --dry-run
```

完整步骤请看[十分钟开始你的站点](content/posts/start/zh-sg.md)或[Start your site in ten minutes](content/posts/start/en.md)。

## 普通站点维护哪些文件？

- `content/pages/<id>/<locale>.md`：首页、About、隐私政策等稳定页面。
- `content/posts/<id>/<locale>.md`：教程、博客、产品记录和版本说明。每篇 post 需要 ISO `date`；`update` 是可选的最后修改时间，不会替代发布日期。文章会自动计算字数和阅读时间。
- `config.yml` 与 `config/*.yml`：站点名称、语言、导航、页脚、内容、发现和部署设置。导航与页脚使用同一套安全的内部/外部链接格式；外部 `_blank` 链接自动带 `noopener noreferrer`。
- `site/theme.yml`：当前站点对主题插件的少量覆盖，例如搜索结果数量。主题代码的默认值和 schema 仍由插件实现拥有。

`themes/<name>/` 只保存可复用的主题实现、资源、插件和参考示例，不保存站点实例配置。需要新增 Pattern、Block、Plugin、浏览器能力或动态 API 时，才修改主题代码或 `backend/handler.ts`。

第三方服务属于根配置的 `integrations`，不是主题配置。只写本站实际使用的 Provider；Provider Adapter 会自己提供 schema、purpose、同意要求和安全加载方式：

```yaml
integrations:
  google-analytics:
    measurementId: G-XXXXXXXXXX
```

Provider 节点默认启用，公开标识会被校验；secret 只能来自部署环境或 backend。没有需要同意的 Integration 时不会显示 Consent UI。完整规则见[配置 Integration 与隐私同意](content/posts/cookies/zh-sg.md)。

## 内容与发现

默认主题提供多语言、文章目录、搜索、Cookie 同意、归档、RSS、sitemap、PWA、图片派生和响应式文章布局。渲染器还会根据真实配置和输出生成 Agent Discovery、Agent Skills、API Catalog、Markdown mirror、`llms.txt` 等机器可读资源；没有真实服务时，不会伪造 OAuth、MCP、WebMCP 或 DNS-AID 能力。

在线示例的配置结构、内容模型、主题插件、发现能力和部署教程都在 `content/posts/` 中；先读[配置结构](content/posts/site-settings/zh-sg.md)，再按需要进入高级章节。README 负责快速开始，在线 Docs 负责完整配置和实现边界。

生成的 `dist/`、`.pageskill/` 和 `src/runtime/` 不要手工修改；源码来源是 `config.yml`、`config/*.yml`、`site/theme.yml`、`content/`、`themes/` 和 `backend/`。

Pageskill 使用 MIT License，见 [LICENSE](LICENSE)。
