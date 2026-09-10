---
title: 让访客搜到页面和内容
description: 启用现成本地搜索，并检查每种语言生成的索引。
date: 2026-09-08
category: tutorial
---

# 让访客搜到页面和内容

Pageskill 搜索会从页面和带日期的 post 生成。浏览器读取当前语言的索引，搜索框不需要自定义 API。

## 1. 打开搜索设置

在 `themes/default/theme.yml` 中设置插件选项：

```yaml
plugins:
  search:
    enabled: true
    maxResults: 8
    shardSize: 500
    copy:
      zh-sg:
        # copy 是数据；缺少的 key 会从 messages.yml 回退。
        placeholder: 搜索本站
```

`maxResults` 限制显示数量，`shardSize` 控制生成索引如何分片；站点还不大时保持默认值即可。

`copy` 可选，也可以只翻译一部分。语言启用和回退仍然放在 `config.yml`，不要给搜索插件增加语言开关。只有要改变行为或 schema 时，才修改模块代码。

当前主题的搜索模块在 `themes/default/plugins/search/`；`index.ts`、脚本、样式和 messages 放在一起。只有需要改变默认搜索行为时才修改这个模块。

## 2. 生成并试搜

```powershell
npm run g
npm run s
```

在与 post 相同的语言页面打开预览，输入一个完整词，再点选结果。搜索会包含该语言的稳定页面和带日期 post。

## 成功结果

搜索框能返回标题、标题层级、摘要和正文的匹配结果。结果保留原语言路由，运行 `npm run g` 后索引会更新。

## 常见坑

修改 Markdown 后，已有预览不会在没有生成或重建时更新。不要直接改 `dist/` 下生成的搜索 JSON；应修改源内容或 `themes/default/theme.yml` 中的搜索选项。

## 下一步

阅读[给长内容加目录](/zh-sg/posts/toc/)，让搜索结果更容易继续阅读。
