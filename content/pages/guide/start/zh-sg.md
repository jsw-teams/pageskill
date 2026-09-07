---
title: 从 Pageskill 开始
description: 安装 Pageskill、创建中性站点并运行第一次检查构建。
pattern: docs
---

# 从 Pageskill 开始

Pageskill 将 Markdown、Frontmatter、可复用的 Pattern 和 Block、collection schema 与站点配置编译成可检查的网站。人可以直接使用内置能力，Agent 是可选的；页面作者写内容，不必为每页手写 HTML。

## 需要什么

安装 Node.js `>=22.12.0`、npm 和 Git。为 `pageskill init` 创建的站点准备一个新的目标目录。

## 从源码仓库安装

在 Pageskill 源码仓库中运行：

```bash
git clone https://github.com/jsw-teams/pageskill.git
cd pageskill
npm install
npm run compile-runtime
npm run compile-theme
npm run compile-backend
npm link
```

三个 compile 命令会生成链接的 `pageskill` 所需 runtime、主题和 backend 产物。链接指向当前源码，因此源码变化后重新运行对应的 compile 命令。

## 创建站点

在你存放项目的目录创建空站点目录并初始化：

```bash
mkdir my-site
cd my-site
pageskill init
```

`pageskill init` 复制中性的 `starter/` 契约，创建 `config.yml`、starter 页面和 starter 主题，其中有 `landing`、`document`、`blog` Pattern。CLI 不会暗藏第二份模板。

## 检查并构建

添加内容前先发现能力，再检查并构建：

```bash
pageskill catalog
pageskill inspect pattern:landing
pageskill inspect block:hero
pageskill check
pageskill build
```

预期结果是 check 成功，随后 `dist/` 出现生成的 HTML 和站点资源。需要在浏览器阅读结果时启动本地预览：

```bash
pageskill s
```

打开[http://127.0.0.1:4173/](http://127.0.0.1:4173/)。预览会监听 `config.yml`、`content/` 和 `themes/`，受影响的文件编辑后会重新构建。

## 常见错误

- **找不到 `pageskill`：** 在编译命令后于源码仓库运行 `npm link`；如果 shell 尚未刷新命令路径，重新打开终端。
- **Node 版本被拒绝：** 安装支持的 Node.js 版本后重新运行 `npm install`。
- **初始化复制到了错误位置：** 停止操作，选择空的目标目录，在那里运行 `pageskill init`；源码仓库与站点目录分开。
- **starter 页面使用了 `docs`：** starter 提供 `document`；只有 `catalog` 确认主题含有 `docs` 后才复制并使用它。

## 预期结果与下一步

现在你已有可检查、构建和预览的中性 Pageskill 站点。保持 `dist/` 为生成目录，继续编辑源文件。

[返回 Guide](/zh-sg/guide/) · [下一步：站点设置](/zh-sg/guide/site-settings/)
