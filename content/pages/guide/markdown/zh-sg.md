---
title: Markdown 入门
description: 编写 Frontmatter 和 Pageskill 可以校验、渲染的普通 Markdown。
pattern: docs
---

# Markdown 入门

Pageskill 将页面当作内容数据处理。Frontmatter 提供 collection schema 要求的字段，正文使用 CommonMark 和 GFM 功能。Pattern 和 Block 提供可复用结构，作者不必为每页编写 HTML。

## 创建 document 页面

在站点根目录创建 `content/pages/hello/zh-sg.md`：

```markdown
---
title: 来自 Markdown 的问候
description: 使用标题、列表、表格和一个可复用 Block 的小页面。
pattern: document
---

# 来自 Markdown 的问候

Pageskill 会将这段源码生成到 `/zh-sg/hello/`。

## 简短清单

- 用 Markdown 编写页面。
- 让 Frontmatter 名称与 collection schema 保持一致。
- 只有 `pageskill catalog` 显示 Block 存在时才复用它。

| 源码 | 结果 |
| --- | --- |
| `# 标题` | 语义化标题 |
| `[Guide](/zh-sg/guide/)` | 普通站内链接 |

:::hero{tone="brand" align="left"}
`hero` Block 是可复用的主题结构。
:::
```

starter 提供 `document` Pattern 和 `hero` Block。完整默认主题还提供 `docs`；使用前先运行 `pageskill catalog` 确认能力。

## 使用常见构件

用 `#`、`##` 和 `###` 标题组织文档。正文可使用段落、列表、引用、围栏代码、表格、任务列表和普通 Markdown 链接。在指令上使用标量属性，例如 `:::hero{tone="brand"}`。长段落写在 Markdown 中，不要编码成 HTML 字符串。

复制示例前先查看当前名称：

```bash
pageskill catalog
pageskill inspect pattern:document
pageskill inspect block:hero
```

## 检查结果

在站点根目录运行检查和构建：

```bash
pageskill check
pageskill build
```

预期结果是 check 成功，并在 `dist/` 生成 `/zh-sg/hello/` 页面。运行 `pageskill s` 时，Markdown 文件变化会触发预览刷新。

## 常见错误

- **页面没有标题：** 在 Frontmatter 添加必填的 `title`。
- **Pattern 不存在：** starter 使用 `document`；其他 Pattern 只有在 `catalog` 显示主题提供后才能复制使用。
- **Block 属性被拒绝：** inspect 该 Block，只使用它声明的标量 schema 和允许值。
- **表格或指令显示异常：** 检查结尾的 `:::`，并在 Block 内容前后留空行。
- **为了修一个页面加入 HTML：** 回到 Markdown 和可复用 Pattern 或 Block；原始 HTML 默认会被转义。

## 预期结果与下一步

现在你可以用 Frontmatter 和可复用 Markdown 结构写出可检查的 document 页面。继续阅读[第一批内容](/zh-sg/guide/first-content/)创建页面和带日期的产品笔记，或返回 [Guide](/zh-sg/guide/)。

[返回 Guide](/zh-sg/guide/) · [下一步：第一批内容](/zh-sg/guide/first-content/)
