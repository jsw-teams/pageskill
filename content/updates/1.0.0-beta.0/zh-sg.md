---
kind: release
title: Pageskill 1.0.0 beta
description: 纯静态 Component 系统、命名外部 API 与包含细节图的无障碍报告。
date: 2026-09-16
---

# Pageskill 1.0.0 beta

这个 beta 建立一套干净的公开模型：Markdown 与配置负责内容，Component 负责表现和行为，Core 永远只生成静态文件。

## 受控浏览器行为

每个交互 Component 只声明一个 client module 与 root selector。统一 Client Runtime 管理生命周期与生成资源；增加 `client.api` 时只开放一个已配置外部服务。Provider 同意仍是 integration 政策，不是另一种 client mode。

## 命名外部 API

Component 可把可选 `client.api` 绑定到一个命名 `config.apis` 项。每项可使用第三方 HTTP(S) URL，并选择 Bearer 或 `x-api-key` 客户端鉴权。配置 Token 属于公开浏览器数据；数据库、模型调用、写操作与私密凭据只留在独立部署的服务中。

## 可检查的证据

`page c` 会生成可读、带结构标签的 PDF，包含响应式基线以及本地 Search、移动端目录、代码复制、命名 API 配置与 Provider 隐私修订细节图。完整 HTML、JSON 与原始截图继续私密保存在 `.pageskill/`。
