---
title: 给长内容加目录
description: 使用真正的 Markdown 标题，让主题生成可用的内容目录。
date: 2026-09-08
category: tutorial
---

# 给长内容加目录

内容目录从真正的 Markdown 标题生成。读者可以直接跳到章节，不需要你复制锚点。

## 1. 写出标题层级

使用一个标题，再用二级标题写章节，三级标题写细节：

```markdown
# 同意选择

## 选择类别

### 保持可选项关闭

## 检查撤回
```

标题保持简短，并让相同层级在整篇 post 中表示相同类型的章节。

## 2. 生成 post

```powershell
npm run g
npm run s
```

当前 post 样式可以在正文旁显示目录。如果当前主题导出了 `toc` Block，需要指定目录位置时，可在正文加入：

```markdown
:::toc
:::
```

默认 `toc` 插件在 `themes/default/plugins/toc/`；Block、样式和 messages 是一个可复用模块。在 `themes/default/theme.yml` 的 `plugins.toc` 下设置开关和目录深度。

## 成功结果

目录链接会指向生成的章节 ID。点选链接会跳到章节；目录收起或窄屏时，内容仍然可以阅读。

## 常见坑

加粗文字不是标题，不能生成有用的目录项。不要手写重复锚点或修改生成的 HTML；使用 Markdown 标题和当前主题能力。

## 下一步

当重复结构需要统一实现时，阅读[开发一个可复用插件](/zh-sg/posts/plugins/)。
