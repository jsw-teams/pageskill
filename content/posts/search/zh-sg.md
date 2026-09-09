---
title: 让访客搜到页面和文章
description: 启用现成本地搜索，并检查每种语言生成的索引。
date: 2026-09-08
---

# 让访客搜到页面和文章

Pageskill 搜索会从页面和带日期的文章生成。浏览器读取当前语言的索引，搜索框不需要自定义 API。

## 1. 打开搜索设置

在 `themes/default/theme.yml` 中设置插件选项：

```yaml
plugins:
  search:
    enabled: true
    maxResults: 8
    shardSize: 500
```

`maxResults` 限制显示数量，`shardSize` 控制生成索引如何分片；站点还不大时保持默认值即可。

当前主题的搜索模块在 `themes/default/plugins/search/`；`index.ts`、脚本、样式和 messages 放在一起。只有需要改变默认搜索行为时才修改这个模块。

## 2. 生成并试搜

```powershell
npm run g
npm run s
```

在与文章相同的语言页面打开预览，输入一个完整词，再点选结果。搜索会包含该语言的稳定页面和带日期文章。

## 成功结果

搜索框能返回标题、标题层级、摘要和正文的匹配结果。结果保留原语言路由，运行 `npm run g` 后索引会更新。

## 常见坑

修改 Markdown 后，已有预览不会在没有生成或重建时更新。不要直接改 `dist/` 下生成的搜索 JSON；应修改源内容或 `themes/default/theme.yml` 中的搜索选项。

## 下一步

阅读[给长文章加目录](/zh-sg/posts/toc/)，让搜索结果更容易继续阅读。
