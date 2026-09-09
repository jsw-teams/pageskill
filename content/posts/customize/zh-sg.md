---
title: 换样式，或让 Agent 帮你改
description: 直接修改模块化主题，复用组件，让一次改动作用到每个页面。
date: 2026-09-07
---

# 换样式，或让 Agent 帮你改

样式决定颜色、字体和间距。主题是模块化的：薄入口负责组装布局、组件、插件和 shell。你可以自己改，也可以给 Agent 一个目标、范围和应成功的页面。

## 1. 选择主题

站点在 `config.yml` 中选择主题：

```yaml
theme:
  name: default
```

当前主题把插件选项放在 `themes/default/theme.yml`，并使用负责组装的薄入口 `themes/default/index.ts`；`theme.yml` 不选择主题名称。

## 2. 先改一个共用样式

共用 shell 样式放在 `themes/default/layouts/site/style.css`，在这里改现有变量：

```css
:root {
  --green: #6b3d2e;
  --gold: #d99a32;
}
```

组件专属样式放在组件旁边，例如 `themes/default/components/learning-path/style.css`。插件样式放在自己的 `themes/default/plugins/<id>/style.css`。

## 3. 复用或增加一次能力

先在 Markdown 中使用已有 Block，再考虑写代码。如果缺少组件，把 `index.ts`、可选的 `style.css` 和 `messages.yml` 放在 `themes/default/components/<id>/`，再把模块加入 `components/index.ts`。保留 `index.ts` 的统一组装，共享辅助函数放在 `components/shared/`，不要把标记复制到每篇文章。

```powershell
npm run compile-theme
npm run g
npm run s
```

## 成功结果

颜色或组件改动会稳定出现在使用当前主题的每个页面。按 `Ctrl+C` 后才会结束持续预览。

## 常见坑

只改 `config.yml` 只能选择主题，不会自动产生新的视觉资源。实现、CSS、脚本和 messages 要和模块放在一起，也不要修改生成的 `dist/` 文件。

## 下一步

当能力需要共享浏览器行为或同意后加载时，阅读[开发一个可复用插件](/zh-sg/posts/plugins/)。
