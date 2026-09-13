---
title: 一篇诚实显示文章元数据的文章
description: 用一篇真实的中英混合文章展示发布日期、修改日期、字数和阅读时间。
date: 2026-09-01
update: 2026-09-12
category: tutorial
---

# 一篇诚实显示文章元数据的文章

这篇文章特意写得足够长，让文章页头的元数据真正有用。Pageskill 会读取 Markdown 正文，统计可见的 CJK 字符和拉丁文字词元，并估算阅读时间，不要求作者另外维护一组容易过期的数字。

发布日期是 `2026-09-01`，`update` 字段记录后来在 `2026-09-12` 做过修改；它不会改变文章原本的发布日期，也不会把这篇教程变成版本说明。版本说明使用 `category: update`，并出现在单独的[项目更新视图](/zh-sg/updates/)中。

## 读者会看到什么

默认的 `postMeta` 插件会在紧凑的文章页头显示发布日期、修改日期、约略字数、阅读时间和作者。因为本文填写了 `update`，正文前还会出现更新提示。提示文案来自主题 messages，不是 renderer 里根据语言写一串条件分支。

普通文章可以省略 `update`。发布日期、字数和阅读时间仍然显示，但修改日期和更新提示会完全消失，不留下空位。可以和[没有 update 的第一篇文章示例](/zh-sg/posts/first-post/)比较这一点。

## 一个小型 Markdown 实验

这句话同时包含中文、繁體中文和 English words，说明中英混合文章可以自然地写在一起，不必把每种语言拆成不同页面。像[配置说明](/zh-sg/posts/site-settings/)这样的链接，会把读者看得到的链接文字计入 reading units，但不会把 URL 本身算进去。

像 `npm run g` 这样的 inline code 对读者有帮助，但不会计入字数。fenced code sample 也不会计入，因为实现代码不应该让一段简短说明看起来像巨长文章：

```yaml
theme:
  name: default
  config: ./site/theme.yml

post:
  date: 2026-09-01
  update: 2026-09-12
```

更长的代码示例也遵循相同规则：

```ts
const visibleText = markdownBody;
const metrics = calculateMetrics(visibleText);
console.log(metrics.readingMinutes);
```

## 为什么要自动计算

作者擅长写作和编辑，但手动维护字数很容易忘记。确定性的 metrics 让页面在每次修改后仍然诚实。拉丁文字按词元统计，汉字、平假名、片假名和韩文字符逐字统计。合并后的 reading units 足够支持主题显示“约 1,240 字”或英文 “1,240 words” 这样的紧凑标签。

阅读时间使用拉丁文字和 CJK 字符各自的默认速度。短文章仍然至少显示 1 分钟，较长文章则随正文长度增加。Frontmatter、Markdown 标记、代码和链接目的地都不会被当成普通正文。

## 安全地制作类似文章

要制作类似文章，在 `content/posts/` 下建立一个目录，并在里面为每个启用的语言放一个文件。翻译版本使用同一个 ID 和发布日期。主题插件覆盖放在 `site/theme.yml`，站点身份和链接放在 `config.yml` 或项目内部的 `extends` 文件中。

编辑后运行 `npm run g`，再在 preview 中打开生成的页面。如果 update 早于 date，或者不是严格的 ISO 日期/时间，build 会指出源文件位置并失败，让错误在发布前被修正。

这是一篇 Demo，但同样的模型也适合真实的日志、教程和产品说明，不需要作者手写 HTML。
