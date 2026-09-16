---
kind: page
title: 隐私政策
description: 说明 Pageskill 演示站处理什么、什么只留在浏览器，以及启用外部 Provider 后需要怎样更新政策。
toc: false
integrations: []
---

# 隐私政策

本政策适用于 `pageskill.openjsu.com` 的 Pageskill 演示站，描述的是本站当前配置，而不是替所有使用 Pageskill 构建的网站作出承诺。

## 当前处理情况

| 功能 | 涉及信息 | 信息去向 | 当前状态 |
| --- | --- | --- | --- |
| 静态页面传输 | 提供 Web 请求通常需要的网络信息 | 托管服务商 | 打开网站所必需 |
| 本地 Search | 输入的关键词与已生成搜索索引 | 仅在浏览器中 | 已启用 |
| 语言偏好 | 选择的语言 | 本设备浏览器存储 | 已启用 |
| 可选 Provider | 同意前说明的 Provider 专属事件 | 对应 Provider | 本演示未配置 |
| 命名外部 API | 已连接 Component 明确发送的数据 | 配置的 API URL | 本演示未配置 |

Pageskill Core 不创建访客账户，不写入生产数据库，不调用 AI 模型，也不保存评论。这些能力必须由独立部署的 API 服务提供，并由启用它们的网站另行说明。

## 浏览器存储与 Cookie

语言选择器可能在本设备保存语言偏好。如果网站启用了需要同意的 Provider Adapter，Consent Component 还会保存所选用途、schema 版本和更新时间。这项偏好不包含用户画像、指纹、IP 地址或浏览记录。

本站当前没有分析、广告、验证码或社交嵌入 Provider，因此没有需要请求的可选用途。只有配置启用了确实需要同意的受信任 Adapter 时，才会显示同意界面。

## 本地 Search 与外部 API

Search 在浏览器中读取同站生成索引，搜索词不会发送给 Pageskill 或第三方搜索服务。

浏览器 Component 只能调用 `config.yml` 中分配给它的命名 API；该 origin 可以属于第三方。写入浏览器配置的 Token 按设计属于公开信息，私密凭据必须保存在外部服务或其 Secret Store。外部服务负责鉴权、保存、删除及自身隐私说明。

## Provider 变更与政策修订

启用可选 Provider 前，站点运营者必须审查其用途、数据类别、接收方、保存期限、跨境传输、撤回行为和政策链接。Provider Adapter 负责控制加载，但仍必须修订本页，让访问者理解真实处理流程。配置开关不能替代隐私政策审查。

## 你的选择

如果存在可选用途，你可以拒绝，通过“隐私设置”稍后修改，或清除本站的浏览器存储。撤回选择会阻止之后加载 Provider，但无法撤销已经完成的请求。对于外部 API 保存的数据，应联系该服务标明的运营者。

## 联系与修订

本演示站的数据控制者是 toewpq。隐私问题和更正请求可通过 [Pageskill 仓库](https://github.com/jsw-teams/pageskill) 提出。启用的 Provider 或数据流发生实质变化时，必须在部署前复核并更新本政策。
