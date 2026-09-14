---
kind: post
title: 配置结构：站点设置只有一个清晰来源
description: 理解 config.yml、可选配置分层、site/theme.yml、content，以及站点数据和主题代码的边界。
date: 2026-09-07
category: tutorial
---

# 配置结构：站点设置只有一个清晰来源

Pageskill 把站点作者会修改的文件，与主题实现代码分开。可以这样理解：

```text
config.yml
├─ 站点身份、语言、导航、页脚
├─ 内容 collection 以及各 collection 自己的归档/Feed
├─ integrations、隐私政策、发现、部署
└─ 可选 extends：./config/*.yml

site/theme.yml
└─ 少量、经过 schema 校验的主题/组件外观覆盖

content/
└─ Markdown 页面、文章、资源和 Frontmatter

themes/default/
└─ 可复用实现、资源、组件和参考示例
```

普通站点工作只需要前三层。`themes/default/` 不是另一套站点配置目录。

## 1. 保持根配置可读

先写站点身份和主题实例：

```yaml
siteUrl: https://example.com
defaultLocale: zh-sg
activeLocales:
  - zh-sg
  - zh-tw
  - en
siteName:
  zh-sg: 我的文章站
  zh-tw: 我的文章站
  en: My article site
description:
  zh-sg: 用 Markdown 写下我的文章。
  zh-tw: 用 Markdown 寫下我的文章。
  en: Notes from my work.

theme:
  name: default
  config: ./site/theme.yml
```

Navigation 和 Footer 也放在这个根配置或相关的配置分层中：

```yaml
navigation:
  links:
    - key: home
      href: /:locale/
    - key: posts
      href: /:locale/posts/
    - label: GitHub
      href: https://github.com/example/example
      target: _blank

footer:
  links:
    - key: privacy
      href: /:locale/privacy/
    - label: 项目源码
      href: https://github.com/example/example
      target: _blank
```

内部链接可以使用 `:locale`，外部链接只允许 HTTP(S)。新窗口链接会自动带 `rel="noopener noreferrer"`。标签可以用 `labels.<locale>`，并按当前语言、配置的 fallback、English、翻译键、最后是 link key 依次回退。

## 2. 只拆分真正相关的设置

配置变大时，再从根文件引用项目内 YAML：

```yaml
extends:
  - ./config/content.yml
  - ./config/discovery.yml
```

加载顺序是：Pageskill 内建默认值、按顺序读取的这些文件、最后的 `config.yml`。对象递归合并，数组整体替换，标量（包括显式 `null`）覆盖前值。YAML 不会执行代码、随意 include 路径或自动追加数组。每个文件都必须留在项目根内，循环或缺失文件会显示来源路径并失败。

不要为了证明 `extends` 而制造很多小文件。Demo 把 content policy 和 discovery policy 分开，是因为它们是有意义的分组；小站完全可以只使用一个 `config.yml`。

## 3. 在 `config.yml` 表达 Provider 意图

第三方服务属于站点能力，不是主题外观。只配置本站实际使用的服务：

```yaml
integrations:
  google-analytics:
    measurementId: G-XXXXXXXXXX
```

受信任的 adapter registry 会提供 Provider schema、隐私用途、同意要求和安全资源加载器。Provider 节点默认启用，也可以写 `enabled: false` 暂停。不要再添加 `purpose`、脚本 URL、inline code、分类列表或一堆 false Provider。公开标识会被校验；secret 应放在部署环境和 backend 中。

如果配置的 adapter 需要同意，Consent UI 只会生成它实际使用的 purpose；没有这样的 adapter 就没有横幅。只有确有需要时，才设置浏览器选择策略：

```yaml
privacy:
  consent:
    decisionRetentionDays: 180
```

它表示浏览器保存选择的时间，不是 Provider 服务端的数据保留期限。完整说明请看[配置 Integration 与隐私同意](/zh-sg/posts/cookies/)。

## 4. `site/theme.yml` 只放外观覆盖

站点实例文件可以是空的：

```yaml
# site/theme.yml
components: {}
```

省略 `theme.config` 也会得到同样的空覆盖对象。组件默认值和 schema 在代码中维护，因此不要把每个 `enabled: true` 都复制进来。只有站点与主题默认值不同才写，例如：

```yaml
components:
  search:
    maxResults: 12
```

高级主题仍可以使用 `components.shell.navigation.before/after` 和 `components.shell.footer.before/after` 插槽插入可复用链接；它们共用同一套安全链接模型，但普通 Navigation 和 Footer link 属于站点级配置。

## 5. 用 Markdown 管理内容

稳定页面位于 `content/pages/<id>/<locale>.md`。教程、博客、产品记录和普通文章位于 `content/posts/<id>/<locale>.md`，版本说明位于 `content/updates/<id>/<locale>.md`。每篇 post 都需要 `date`；可选的 `updated` 记录后续修改，不改变发布日期。`content/updates/` 是独立的版本说明 collection，不是筛选 view，也不是 `updated` 时间戳。[文章元数据示例](/zh-sg/posts/post-meta-demo/)同时展示了两条路径。

## 预期结果

站点作者第一次打开配置文件，就能看懂身份、语言、链接、内容模型和部署，不会先面对一整面主题默认值。主题代码保持可复用，生成文件只作为输出检查，而不是作者编辑入口。

## 下一步

继续阅读 [Markdown：像写笔记一样写文章](/zh-sg/posts/markdown/)，创建第一篇页面或文章。
