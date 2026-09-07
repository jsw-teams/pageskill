---
title: 用主题自定义渲染
description: 先发现可复用能力，再复制主题实现共享的 Pattern 和 Block 行为。
pattern: docs
---

# 用主题自定义渲染

人可以直接复用内置 Pattern、Block 和 schema，不需要 Agent。只有 `catalog` 和 `inspect` 显示缺少可复用能力时才复制主题。主题扩展是共享行为，不是让每个页面手写 HTML 的理由。

## 复制前先发现

在站点根目录检查已经覆盖页面和产品笔记的能力：

```bash
pageskill catalog
pageskill inspect pattern:document
pageskill inspect pattern:blog
pageskill inspect block:hero
```

如果结果已经够用，继续写 Markdown。如果缺少共享行为，使用文件管理器或递归复制命令把现有主题复制到 `themes/nebula/`，然后在站点根 `config.yml` 中设置：

```yaml
theme:
  name: nebula
```

保留原主题已经导出的所有 Pattern 和 Block，尤其是 `landing`、`docs` 和 `blog`。只展示 `document` 与 `notice` 的最小例子只是说明；用它替换整个主题会移除首页、文档和博客页面所需的渲染器。

## 把主题契约放在正确文件

Pattern 和 Block 定义及其 schema 写在 `theme.ts`。`theme.yml` 登记已导出的名称和资源。下面只是合并到复制主题的局部片段，不是完整替换文件。保留已有的每个 Pattern、Block、插件和资源映射，再添加或更新 `notice` 条目。共享 CSS 放在 `style.css`，Block 专用 CSS 在 `blockStyles` 中声明：

```yaml
# 合并到现有 themes/nebula/theme.yml 映射。
blockStyles:
  notice:
    - blocks/notice.css
# 保留已有列表，仅在没有时追加这个名称。
blocks:
  - notice
```

对应的 `theme.ts` 局部映射可以让页面和文章分别渲染，同时继续接受 Markdown 子节点。把这些条目合并到现有的 `defineTheme({...})` 对象，不要替换主题其余部分：

```ts
// 放在现有 defineTheme({...}) 对象内；保留其他每个条目。
  patterns: {
    document: { name: 'document', contexts: ['page'], render: content => `<article class="document-body">${content}</article>` },
    blog: { name: 'blog', contexts: ['post', 'blog'], render: content => `<article class="post">${content}</article>` }
  },
  blocks: {
    notice: {
      name: 'notice',
      schema: { tone: 'string' },
      render: (node, context) => {
        const tone = context.escapeHtml(node.attrs.tone || 'info');
        return `<aside class="notice notice--${tone}">${context.renderNodes(node.children)}</aside>`;
      }
    }
  }
```

把对应的 `.notice` 规则放在 `themes/nebula/blocks/notice.css`。不要再把同一规则复制进 `style.css`；一个 Block 规则只保留一个所有者。主题 TypeScript 和浏览器 ESM 是受信任的应用代码，主题不是 sandbox。

默认的 `learning-path` Block 还会读取 `content/assets/learning/` 中的六张图片。把这个 Block 移到另一个站点时，也要复制这些站点资源，或把 renderer 改成新站点实际存在的资源。

## 让作者继续写 Markdown

注册 `document` 和 `blog` Pattern 后，作者使用不同的 collection 路径和 Frontmatter，但继续写同一种 Markdown：

```text
content/pages/overview/zh-sg.md       pattern: document  -> /zh-sg/overview/
content/posts/release/zh-sg.md        pattern: blog      -> /zh-sg/posts/release/
```

页面写当前信息，不要求日期；产品笔记必须有 ISO `date`，并进入按日期排列的归档和 Feed。两个文件都不包含逐页 HTML。

## 验证扩展

复制或编辑主题后运行发现和构建检查。`npm run compile-theme` 要在 Pageskill 源码仓库中运行；复制出来的 starter 站点没有可执行这个命令的 `package.json` 脚本：

```bash
npm run compile-theme
pageskill catalog
pageskill inspect pattern:document
pageskill inspect pattern:blog
pageskill inspect block:notice
pageskill check
pageskill build
```

预期结果是 catalog 列出保留的 Pattern 和 Block，能看到 `notice` schema，构建的页面和产品笔记使用各自的渲染器。编译器会用 Block schema 拒绝未知的 directive 属性；renderer 仍需安全处理已接受的值。检查生成 CSS，确认 Block 规则只出现一次。

Agent 也可以按这个受限任务操作：“先运行 `pageskill catalog` 和 `inspect`。只有没有现成能力覆盖需求时才复制现有主题，保留每个已导出的 Pattern 和 Block，在 `theme.ts` 用标量 schema 添加一个经过审查的 Block，在 `theme.yml` 登记名称和 `blockStyles` 资源，用 `check` 和 `build` 验证。不要写逐页 HTML，也不要在构建期间读取秘密。” 人可以直接执行相同步骤。

## 常见错误

- **复制主题只能渲染一种页面：** 恢复其他已导出的 Pattern 和 Block，尤其是 `landing`、`docs` 和 `blog`。
- **未知的 `notice` 属性被拒绝：** 在 `theme.ts` 的 Block schema 中加入对应的标量名称，并让登记名称与 `theme.yml` 保持一致。
- **CSS 没有加载：** 确认路径写在 `blockStyles` 下，文件位于复制的主题内。
- **同一 CSS 出现两次：** 从旧所有者删除重复规则，不要依赖 cascade 顺序。
- **starter 无法使用 `docs`：** 在 starter 使用 `document`，或复制 `catalog` 确认提供 `docs` 的主题。

## 预期结果与下一步

现在已有可复用主题扩展，页面和文章有不同渲染，内容作者仍然只写 Markdown。更深的契约、CSS 限制和安全边界见[二次开发](/zh-sg/development/)，也可以返回 [Guide](/zh-sg/guide/)。

[返回 Guide](/zh-sg/guide/) · [下一步：二次开发](/zh-sg/development/)
