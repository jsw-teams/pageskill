---
title: 改成你的名字和导航
description: 在 config.yml 里设置站点名称、语言和导航，让首页链接到你的文章。
date: 2026-09-07
category: tutorial
---

# 改成你的名字和导航

`config.yml` 是设置文件：它保存站点数据和开关，不执行代码。先改名称和导航，其他设置以后再加。
post 没有在 Frontmatter 写作者时，会使用对应语言的 `author`。当前站点使用 `toewpq`；套用示例时请换成真实的站点作者。

## 1. 打开设置文件

在新站根目录编辑 `config.yml`，保留下面这组最小设置：

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
  zh-sg: 写下我的文章。
  zh-tw: 寫下我的文章。
  en: Notes from my work.
author:
  zh-sg: toewpq
  zh-tw: toewpq
  en: toewpq
```

## 2. 改导航

在同一个文件的 `navigation.links` 下放公开入口：

```yaml
theme:
  name: default
navigation:
  links:
    - key: home
      href: /:locale/
    - key: posts
      href: /:locale/posts/
```

`:locale` 会在生成时换成 `zh-sg`、`zh-tw` 或 `en`。不要把访客输入拼进设置文件。

主导航是站点数据，因此放在这里。主题需要在标准导航或页脚工具前后增加插入链接时，应在 `themes/default/theme.yml` 的 `plugins.chrome` 下配置：

```yaml
plugins:
  chrome:
    navigation:
      after:
        - label: Plugin tutorial
          href: /:locale/posts/cookies/
    footer:
      after: []
```

chrome 选项只接受结构化标签和安全链接，不接受 HTML、脚本、CSS、选择器或任意属性。

## 3. 生成并预览

```powershell
npm run g
npm run s
```

打开三个语言首页和文章入口，确认名称、语言链接和导航都正确。

## 成功结果

每个启用语言都有自己的首页，页首显示新的站点名称，导航可以进入该语言的文章列表。

## 常见坑

YAML 缩进必须使用空格；`siteName` 和 `description` 的每个启用语言都应有值。写成标签或混用 Tab 时，生成会在配置附近提示错误。

## 下一步

继续读 [Markdown：像写笔记一样写文章](/zh-sg/posts/markdown/)，先做一篇最小文章。
