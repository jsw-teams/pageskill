---
title: '3.1.0：站点作者只有一套配置方式'
description: '用分层 YAML 表达站点意图，让受信任适配器承担 Provider 能力，并让文章自动显示准确元数据。'
date: 2026-09-13
category: update
---

# 3.1.0：站点作者只有一套配置方式

Pageskill 3.1.0 继续保留 Markdown、多语言内容、Pattern、Block、Theme、Plugin、搜索、归档、Feed、发现、Backend 和部署目标。这次调整的是普通站点意图的存放位置，让站点作者以后主要维护 Markdown 和 YAML。

## 这次有什么变化

- `config.yml` 可以通过 `extends` 引入 `config/` 下真正相关的项目文件。对象递归合并，数组整体替换，后层标量覆盖前层；加载器会检查项目根边界、symlink、循环和深度，并把所有有效文件纳入 hash。
- `theme.config` 明确选择站点实例文件，例如 `site/theme.yml`。可复用的 `themes/<name>/` 现在只保存实现、资源、插件和参考示例，不再同时承担另一套站点配置路径。
- Navigation 和 Footer 共用一套安全 Link Schema。内部链接可以写 `/:locale/`，外部链接只允许 HTTP(S)，当前页状态只用于内部路由，`_blank` 会自动获得 `noopener noreferrer`。
- 根配置的 `integrations` 只描述本站真正使用的 Provider。受信任的 Provider Adapter 自己拥有 schema、公开标识校验、隐私用途、同意要求、加载策略和资源实现。同意分类从实际配置的适配器推导；没有需要同意的 Integration 就没有横幅。
- Post 根据 Markdown 正文自动计算字数和阅读时间，接受严格的 `update` 时间戳，显示本地化更新提示；sitemap 的 `lastmod` 使用 `update`，RSS 发布时间仍使用 `date`，搜索和增量缓存也保存 update。
- `createContext`、`refreshContext`、`build`、`check`、`inspect`、`getCatalog` 和 `siteDiscoveryOptions` 公共 facade 继续可用；部署配置只在生成构建产物时统一解析。
- `g` 现在会检查源码、最终 HTML、真实浏览器、计算样式、键盘、响应式视口和动态组件；`s` 会在重建后重复反馈。默认主题以 WCAG 2.2 AA 为目标，但不会声称自动化可以取代人工审查。

## Breaking 配置清理

本版本有意删除历史配置入口，不再长期维护两套互相竞争的站点写法：

- 不再寻找 `themes/<name>/theme.yml`。把站点覆盖项移到 `site/theme.yml`，并在 `config.yml` 设置 `theme.config: ./site/theme.yml`；省略它就使用空覆盖和代码默认值。
- 删除 `branding` 及其 attribution 字段。站点若想说明项目来源，直接使用普通 Footer link 或主题内容。
- 删除过时的部署别名和 `deployment.openaiSites.staticDirectory`。请使用正式的 `deployment.targets` 与 `deployment.staticDirectory`。
- 删除旧 Navigation 格式和旧 Privacy Consent Provider/分类/脚本配置。请改用 `navigation.links`、`footer.links` 和根级 `integrations`。
- 历史 `.pagekiln`、`_pagekiln` 内部路径以及旧浏览器同意状态命名空间统一为 `.pageskill`、`_pageskill` 和 `pageskill-consent`。

最短迁移方式是：

```yaml
# 旧站点实例位置：themes/default/theme.yml
# 新的 config.yml
theme:
  name: default
  config: ./site/theme.yml
```

## 发布前验证

```powershell
npm install
npm test
npm run compile-runtime
npm run compile-theme
npm run compile-backend
npm run g
npm run g -- --profile
```

Provider secret 放在环境变量中，生成后的发现文件要从源码结果检查；静态目标通过主机工作流只发布 `dist/public`。

请继续阅读[配置结构](/zh-sg/posts/site-settings/)、[配置 Integration 与隐私同意](/zh-sg/posts/cookies/)和[文章元数据示例](/zh-sg/posts/post-meta-demo/)。
