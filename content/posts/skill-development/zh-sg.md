---
kind: post
title: 开发真实可信的 Agent Skill
description: 让 Agent 指令与 Pageskill 的内容边界、本地资源、外部 API、Provider 同意机制和生成发现信息保持一致。
date: 2026-09-16
category: tutorial
---

# 开发真实可信的 Agent Skill

Pageskill 从发现输出使用的同一份能力映射生成公开 Agent Skill。源码契约见[仓库 Skill 开发者规范](https://github.com/jsw-teams/pageskill/blob/main/docs/skill-development.md)；`.well-known/agent-skills/` 下的生成文件是证据，不是编辑入口。

## 只描述真实源码入口

Skill 应把内容修改指向 `content/`，把站点结构指向合并配置，把站点 Component 选项指向 `site/theme.yml`，把可复用行为指向 `ComponentDefinition`。绝不能要求 Agent 编辑 `dist/`、`.pageskill/`、`src/runtime/` 或生成发现文件。

## 使用统一 Client Runtime 契约

每个浏览器 Component 使用同一套生命周期契约。本地 Search 通过 `runtime.assetJson` 读取生成静态索引，不需要 API 声明。数据库、共享状态、模型、由私密凭据支持的操作和写入只需增加一个绑定 `config.apis` 的命名 `client.api`。第三方浏览器资源使用根级 `integrations` 选择的可信 Provider Adapter；这套同意与隐私机制不是另一种 Client mode，也不能从站点配置传入任意脚本 URL。

## 把隐私修订纳入任务

启用 Provider 后，必须审核每个活动语言的隐私政策。把 Provider ID 加入政策 Frontmatter 的 `integrations` 数组，并写清真实用途、数据处理、撤回行为、保存期限来源与联系人。若本地化政策没有声明已启用 Provider，生成会失败。

## 验证生成指令

运行 `page g --profile`，检查 `/.well-known/agent.json`、Agent Skill 索引和生成 `SKILL.md`，再运行 `page c`。元数据必须描述当前 Component 与服务，不得虚构 endpoint 或凭据。
