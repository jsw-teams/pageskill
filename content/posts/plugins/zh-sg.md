---
title: 开发一个可复用插件
description: 增加一个自带资源的主题插件，只注册一次，并在每个页面复用。
date: 2026-09-08
---

# 开发一个可复用插件

主题插件负责共享的浏览器行为、样式和 messages。只注册一次；文章继续写 Markdown，不复制 HTML。

## 1. 创建一个模块目录

```text
themes/default/plugins/reading-tip/
  index.ts
  script.js
  style.css
  messages.yml
```

目录自己保存资源。`themes/default/index.ts` 是组装入口，`theme.yml` 保存这个主题的插件实例选项。

## 2. 导出插件定义

在 `index.ts` 使用真实的 `ThemePluginDefinition`：

```ts
import type { ThemePluginDefinition } from '../../../../src/theme-api.ts';

export const plugin: ThemePluginDefinition = {
  implementation: 'plugins/reading-tip/index.ts',
  resources: {
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

## 3. 写入最小可运行资源

`script.js`：

```js
const marker = document.createElement('small');
marker.className = 'reading-tip';
marker.textContent = 'Reading tip enabled';
document.querySelector('.site-footer')?.append(marker);
```

`style.css`：

```css
.reading-tip { margin-inline-start: .5rem; }
```

`messages.yml`：

```yaml
messages:
  en:
    readingTip:
      label: Reading tip
```

## 4. 在 theme.yml 中保留实例开关

```yaml
# themes/default/theme.yml
plugins:
  readingTip:
    enabled: true
```

在克隆的站点运行检查：

```powershell
npm run compile-theme
npm run g
npm run s
```

## 成功结果

生成的页面会加载插件脚本和样式，页脚出现标记。把 `theme.yml` 中的 `plugins.readingTip.enabled` 改为 `false` 后重新生成即可移除；新增文章不需要再写 HTML。

生成时会把模块的资源和 messages 收集到公开主题资源中。服务端嵌套 ESM 留在构建/运行时边界内，未变化的公开资源继续使用原内容 hash 路径和缓存身份。

## 常见坑

资源路径都相对主题根目录。不要修改 `dist/`，不要把代码放进 `config.yml`，也不要让每篇文章直接导入插件。

## 下一步

阅读[把网站放到网上](/zh-sg/posts/deploy/)，先做发布 dry-run，再真正发布。
