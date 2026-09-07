---
title: 发布第一页面和产品笔记
description: 创建当前页面和带日期的文章，然后检查、预览并构建。
pattern: docs
---

# 发布第一页面和产品笔记

页面表示站点当前状态，产品笔记表示带日期的历史。保持两种职责分开，当前说明变化时不必改写旧记录。下面的例子是你在自己站点中创建的文件，本教程不会把文章写入 Pageskill 仓库。

## 创建当前页面

创建 `content/pages/welcome/zh-sg.md`：

```markdown
---
title: 欢迎
description: 这个 Pageskill 站点的第一个页面。
pattern: document
---

# 欢迎

这个页面说明站点今天提供什么。

## 从这里开始

返回[站点首页](/zh-sg/)，并复用 `pageskill catalog` 报告的 Pattern 和 Block。只有你自己的站点已有 Guide 时，才把链接写向 Guide。
```

按照 starter 的 collection 路由，这个页面会变成 `/zh-sg/welcome/`。starter 使用 `document`，因为它的主题没有完整默认主题提供的 `docs` Pattern。

## 创建带日期的产品笔记

只有在记录有日期的决定、实现、发布、事故、部署或测量时，才创建 `content/posts/release-note/zh-sg.md`：

```markdown
---
title: 第一篇产品笔记
description: 记录发生了什么变化以及原因。
date: 2026-09-06
pattern: blog
---

# 第一篇产品笔记

这篇笔记记录一次有日期的变化。未来的当前说明放在页面或 Guide 中。
```

文章路由会变成 `/zh-sg/posts/release-note/`，`date` 是 `posts` collection schema 的必填字段。不要为了通过校验给当前页面添加日期。

## 有计划地添加翻译

如果启用了 `en`、`zh-sg` 或 `zh-tw`，为同一个 id 创建对应语言文件，翻译标题、描述和正文，并保持语义同步：

```text
content/pages/welcome/en.md
content/pages/welcome/zh-sg.md
content/pages/welcome/zh-tw.md
content/posts/release-note/en.md
content/posts/release-note/zh-sg.md
content/posts/release-note/zh-tw.md
```

## 检查、预览并构建

在站点根目录运行：

```bash
pageskill inspect page:welcome
pageskill inspect collection:posts
pageskill check
pageskill build
pageskill s
```

预期结果是 check 成功，本地预览出现新页面和笔记，并在 `dist/` 生成对应路由。启用归档和 Feed 时，产品笔记也会进入按日期排列的输出。`pageskill s` 会持续运行；如果还要运行另一个 `pageskill build`，请另开终端，或先按 Ctrl+C 停止预览。

## 常见错误

- **产品笔记没有 `date`：** 添加如 `2026-09-06` 的 ISO 日期。
- **文章放在 `content/pages/`：** 将带日期历史移到 `content/posts/<id>/<locale>.md`。
- **starter 页面使用 `pattern: docs`：** 改为 `document`，或使用 `catalog` 确认提供 `docs` 的主题。
- **三种语言启用却只添加一种：** 添加对应语言文件，或在翻译完成前减少 `activeLocales`。
- **把页面写成 HTML：** 保持 Markdown 内容，并复用 Pattern 或 Block。

## 预期结果与下一步

现在你知道如何发布当前信息和带日期的历史，并保持两者契约分开。继续阅读 [Cookie 同意](/zh-sg/guide/cookies/)安全配置可选脚本，或返回 [Guide](/zh-sg/guide/)。

[返回 Guide](/zh-sg/guide/) · [下一步：Cookie 同意](/zh-sg/guide/cookies/)
