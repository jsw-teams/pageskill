---
title: 配置站点设置
description: 在 config.yml 中设置站点身份、语言、导航、collection、schema 和主题。
pattern: docs
---

# 配置站点设置

站点根目录的 `config.yml` 描述编译器要构建的站点。它保存元数据、语言、导航、collection 路由和 schema、隐私、搜索、图片与部署目的地。主题标记、CSS、浏览器 ESM 和主题 UI 文案放在 `themes/` 下。

## 打开站点根目录

进入[从 Pageskill 开始](/zh-sg/guide/start/)创建的站点，用编辑器打开 `config.yml`：

```bash
cd my-site
```

准备好域名后使用真实的 `siteUrl`，在此之前用于本地检查的中性地址即可。不要把访客 query、表单或 URL 内容写入这个文件；它是管理员控制的数据，不是代码或 HTML 注入入口。

## 一个完整的小型配置

下面的例子适合小型三语站点。每个 active locale 都需要对应页面文件；如果还没有翻译内容，先只使用 `en`。

```yaml
siteUrl: https://example.com
defaultLocale: en
activeLocales: [en, zh-sg, zh-tw]
siteName:
  en: Example site
  zh-sg: 示例站点
  zh-tw: 範例網站
description:
  en: A small Pageskill site.
  zh-sg: 一个小型 Pageskill 站点。
  zh-tw: 一個小型 Pageskill 網站。
theme:
  name: default
  nav:
    links:
      - key: home
        href: /:locale/
      - key: posts
        href: /:locale/posts/
content:
  collections:
    pages:
      contentType: page
      pattern: document
      route: /:locale/:id/
      schema:
        title:
          type: string
          required: true
        description: string
        pattern: string
    posts:
      contentType: post
      pattern: blog
      route: /:locale/posts/:id/
      feed: true
      archive: true
      orderBy: date:desc
      schema:
        title:
          type: string
          required: true
        description: string
        date:
          type: string
          required: true
        pattern: string
deployment:
  targets: []
```

这个 starter 示例只保留 `home` 和 `posts` 链接，因为中性 starter 没有 Guide 页面。创建或复制 Guide 页面后，再添加 `guide` 链接。

路由中的 `:locale` 和 `:id` 会替换为语言和内容 id。collection 的 `schema` 描述 Frontmatter 数据；它与主题 `theme.ts` 中的 Pattern 或 Block schema 分开。

## 检查设置

在站点根目录运行：

```bash
pageskill inspect collection:pages
pageskill inspect collection:posts
pageskill check
```

预期结果是 check 成功并报告配置的路由和必填字段。如果启用了三种语言，构建前补齐对应的 `zh-sg` 和 `zh-tw` Markdown 文件：

```bash
pageskill build
```

## 常见错误

- **默认语言不在 activeLocales：** 把 `defaultLocale` 加入 `activeLocales`，或将默认语言改为已启用的语言。
- **缺少本地化值：** 为每个 active locale 添加相同的站点名称和描述键，并添加对应 Markdown 文件。
- **页面路由冲突：** 保持页面路由和文章路由不同；文章要使用上面带 `/posts/` 的路径。
- **starter 找不到 `docs`：** starter 站点使用 `pattern: document`，只有 `catalog` 显示主题含有 `docs` 后才复制并使用它。
- **把标记或脚本写进 config：** 视觉行为移到主题，动态业务移到 `backend/handler.ts`。

## 预期结果与下一步

现在 `config.yml` 已提供 Pageskill 所需的站点身份、多语言路由、collection 校验和主题选择。UI 文案放在主题 `i18n.yml`，接着阅读 [Markdown 入门](/zh-sg/guide/markdown/)或返回 [Guide](/zh-sg/guide/)。

[返回 Guide](/zh-sg/guide/) · [下一步：Markdown 入门](/zh-sg/guide/markdown/)
