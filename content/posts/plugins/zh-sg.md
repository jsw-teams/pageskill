---
title: 开发一个可复用插件
description: 增加一个自带资源的主题插件，只注册一次，并在每个页面复用。
date: 2026-09-08
category: tutorial
---

# 开发一个可复用插件

主题插件负责共享的浏览器行为、样式和 messages。只注册一次；post 继续写 Markdown，不复制 HTML。

## 1. 创建一个模块目录

```text
themes/default/plugins/reading-tip/
  index.ts
  script.js
  style.css
  messages.yml
```

目录自己保存资源。`themes/default/index.ts` 是组装入口，`theme.yml` 保存这个主题的插件实例选项。

## 2. 先配置已经登记的插件

改代码前先查看插件 schema，再在 `theme.yml` 使用安全选项。基础插件的开关、限制、同意元数据、shell 插入点和本地化文案都属于实例数据：

```yaml
plugins:
  search:
    enabled: true
    maxResults: 8
    # 只翻译部分语言时，缺少的 key 会从 messages.yml 回退。
    copy:
      zh-sg:
        placeholder: 搜索本主题
  toc:
    enabled: true
    maxDepth: 4
```

语言启用不是插件选项；`activeLocales` 和 `i18n.fallbackLocale` 放在 `config.yml`。新增语言只完成 50% 翻译也可以生成：缺少的界面 key 使用回退语言，已经存在的 Markdown 文件则完全按原文显示。

## 3. 导出插件定义

在 `index.ts` 使用真实的 `ThemePluginDefinition`：

```ts
import type { ThemePluginDefinition } from '../../../../src/theme-api.ts';

export const plugin: ThemePluginDefinition = {
  implementation: 'plugins/reading-tip/index.ts',
  resources: {
    // 让模块拥有自己的资源，编译器才能统一追踪和指纹化。
    styles: ['plugins/reading-tip/style.css'],
    scripts: ['plugins/reading-tip/script.js']
  },
  i18n: 'plugins/reading-tip/messages.yml',
  defaults: { enabled: true },
  schema: { enabled: { type: 'boolean' } }
};
```

在 `themes/default/plugins/index.ts` 注册一次：

```ts
import { plugin as readingTip } from './reading-tip/index.ts';

export const plugins = { search, toc, privacyConsent: cookies, language, readingTip };
```

## 4. 写入最小可运行资源

`script.js`：

```js
// 使用 DOM API，避免插件变成 HTML 注入入口。
const marker = document.createElement('small');
marker.className = 'reading-tip';
marker.textContent = 'Reading tip enabled';
document.querySelector('main')?.prepend(marker);
```

`style.css`：

```css
/* 样式和组件资源放在一起，删除时不会留下孤立依赖。 */
.reading-tip { margin-inline-start: .5rem; }
```

`messages.yml`：

```yaml
messages:
  en:
    readingTip:
      # 界面文案放这里，执行行为仍由 index.ts/script.js 负责。
      label: Reading tip
```

## 5. 在 theme.yml 中保留实例开关

```yaml
# themes/default/theme.yml
plugins:
  readingTip:
    # 不改 renderer 就能开关已经登记的能力。
    enabled: true
```

在克隆的站点运行检查：

```powershell
npm run compile-theme
npm run g
npm run s
```

## 成功结果

生成的页面会加载插件脚本和样式，主要内容区域出现标记。把 `theme.yml` 中的 `plugins.readingTip.enabled` 改为 `false` 后重新生成即可移除；新增文章不需要再写 HTML。

生成时会把模块的资源和 messages 收集到公开主题资源中。服务端嵌套 ESM 留在构建/运行时边界内，未变化的公开资源继续使用原内容 hash 路径和缓存身份。

## 6. 以 Cookie 选择器作为参考

本主题的[Cookie 选择器教程](/zh-sg/posts/cookies/)是一个完整参考实现。它在同样的模块结构上加入了 schema、本地化消息、同意后浏览器行为和安全渲染；当插件不止需要一个资源时，可以照这个结构扩展。

导航和页脚链接属于 shell，因此应通过 `themes/default/theme.yml` 的 `plugins.chrome` 配置。不要让插件脚本向 `.site-header` 或 `.site-footer` 任意追加链接。chrome 插件只接受结构化标签和安全 URL；像本例这样的页面级行为仍可挂载到 `main` 内。

如果插件要向浏览器 Agent 暴露 WebMCP 工具，先按[配置条件 Agent 能力](/zh-sg/posts/agent-discovery/)在插件脚本中登记真实的 `document.modelContext` 工具，再单独打开 `config.yml` 的发现声明；这个开关不会替插件加载脚本。

## 7. 干净地移除插件

能力不再需要时，删除主题组装入口中的 import、插件定义和资源登记、`theme.yml` 实例，以及 Markdown directive 或 shell 引用。重新生成并检查 catalog；不要只删生成的资源，也不要为旧消费者保留第二套实现。

## 常见坑

资源路径都相对主题根目录。不要修改 `dist/`，不要把代码放进 `config.yml`，也不要让每篇文章直接导入插件。

## 下一步

阅读[把网站放到网上](/zh-sg/posts/deploy/)，先做发布 dry-run，再真正发布。
