---
title: 换样式，或让 Agent 帮你改
description: 复制主题一次，先改颜色和间距；需要新结构时，把它做成可重复使用的能力。
date: 2026-09-07
---

# 换样式，或让 Agent 帮你改

样式决定颜色、字体和间距。主题还可以提供可重复使用的文章结构。个人可以直接编辑这些文件，也可以把目标、范围和成功页面交给 Agent。

## 1. 复制一份主题

在站点根目录复制默认主题，给副本换一个名字：

```powershell
Copy-Item -Recurse themes\default themes\journal
```

编辑 `themes/journal/theme.yml`，把 `name` 改成 `journal`；再在 `config.yml` 里选择它：

```yaml
theme:
  name: journal
```

## 2. 先改一个颜色

打开 `themes/journal/style.css`，修改现有的 CSS 变量：

```css
:root {
  --color-brand: #8b4f2f;
  --color-paper: #fffaf1;
}
```

保留主题已有的结构和资源声明，先运行生成确认变化，再继续调整。

## 3. 需要新结构时做一次

如果现有 Block 不够，在主题模块里实现一个可复用 Block，并在 `theme.yml` 登记它。页面文章只写 Markdown 和短属性，不把 HTML 复制到每篇文章。

```powershell
pageskill g
pageskill s
```

## 成功结果

同一个主题副本影响站点中所有使用它的文章；重新生成后，颜色或新 Block 在每个目标页面一致出现。

## 常见坑

只改 `config.yml` 里的样式名称不会产生视觉变化；名称、主题目录和 `theme.yml` 必须一致。不要直接改生成的 `dist/` 文件。

## 下一步

看[把网站放到网上](/zh-sg/posts/deploy/)，确认公开目录和同源 API 的部署边界。
