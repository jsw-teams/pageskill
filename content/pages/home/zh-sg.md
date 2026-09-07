---
title: 复用结构，写出可发布的网站
description: 先发现 Pattern、Block 与 Schema，再用 Markdown、Frontmatter 和配置组装页面；缺少能力时只需扩展主题一次。
pattern: landing
---

:::hero{tone="brand" align="left"}
*Pageskill 可复用内容编译器*

# 发现一次，复用到每个页面。

人可以直接复用现成的 Pattern、Block 和 Schema，不需要 Agent 参与；Agent 也可先用 `pageskill catalog` 和 `pageskill inspect` 查看能力与资源，再用 Markdown、Frontmatter 和 `config.yml` 组装页面。Agent 和页面作者都不必逐页手写 HTML；只有能力目录没有覆盖需求时，才在主题中实现一次可复用扩展。

[按复用流程开始](/zh-sg/guide/) [查看扩展边界](/zh-sg/development/)
:::

:::compiler-board
### 先发现能力
从 catalog 和 inspect 读取主题提供的 Pattern、Block、Schema、插件和资源依赖，先确认已有能力再开始写页面。

### 再组合内容
选择合适的 Pattern 和 Block，填写 Markdown、Frontmatter 与配置数据，让编译器生成多语言静态页面；同一结构可以在多个页面复用。

### 只扩展缺口
发现没有可复用能力时，复制主题并实现一次 Pattern 或 Block。扩展完成后回到 catalog、inspect、check 和 build 流程。
:::

:::feature-grid{columns="3"}
### 无需逐页 HTML
页面作者写 Markdown、Frontmatter 和配置；Pattern 决定骨架，Block 提供可复用段落，Schema Data 保存结构化输入。

### 静态交付
编译器生成多语言 HTML、资源、搜索和部署文件。普通页面默认不需要 hydration；需要浏览器行为时才声明对应资源。

### 当前与历史
`content/pages/` 保存当前有效内容，`content/posts/` 保存带必填日期的已发生变化；`docs` 仍是 pages 中的呈现 Pattern。
:::

## 从发现到发布

| 步骤 | 做法 | 结果 |
| --- | --- | --- |
| 发现 | 运行 `pageskill catalog`，再用 `pageskill inspect pattern:<id>`、`block:<id>` 或 `collection:<id>` 查询 | 确认可复用的 Pattern、Block 与 Schema |
| 组装 | 选择结构并填写 Markdown、Frontmatter 与 `config.yml` | 不写逐页 HTML 即得到页面源文件 |
| 验证 | 运行 `pageskill check` 和 `pageskill g --profile` | 检查 schema、路由、翻译与静态输出 |
| 扩展 | 只有缺能力时在复制的主题中实现一次，并重新 catalog/inspect | 新能力可被后续页面复用 |

## 内容边界仍然明确

| 需求 | 文件入口 | 结果 |
| --- | --- | --- |
| 说明 Pageskill 现在怎样工作 | `content/pages/<id>/<locale>.md` | 当前状态页面与语言路由 |
| 记录某一天为什么发生了变更 | `content/posts/<id>/<locale>.md` | 有日期的产品笔记、归档、Feed 和搜索条目 |
| 以文档形式呈现当前页面 | `content/pages/<id>/<locale>.md` 并使用 `pattern: docs` | docs 形式的 `pages` 页面，不新增 collection |
| 调整结构与视觉 | `themes/default/theme.ts`、`theme.yml`、`style.css` | 主题级 Pattern、Block 和样式 |
| 改站点信息或能力开关 | `config.yml` | 站点元数据、语言、路由和功能配置 |

## 默认就能复用的能力

Markdown 表格、摘要边界、三语言回退、文章封面、站点地图、RSS 订阅清单、静态搜索、404、OG 图和部署文件都属于现成能力。需要定制时，先看主题目录和能力目录，再决定是否要写代码。

:::post-list{limit="3"}
:::

:::cta{href="/zh-sg/guide/"}
## 先复用访客现在需要的结构

先 catalog/inspect，再选择 Pattern、Block 和 Schema，填写 `content/pages/` 的 Markdown；对已完成变更的原因和结果做有日期的记录时，放进 `content/posts/`。运行检查和构建后，再让主题决定它如何呈现。
:::
