---
kind: page
title: 隐私说明
description: 说明本站如何处理数据，以及已配置的 Integration 如何参与同意流程。
integrations: []
---

# 隐私说明

这是一份固定的隐私政策页面，说明本站如何处理运行页面所需的信息，以及访客如何管理可选 Integration。

## 本 Demo 当前状态

Pageskill Demo 没有配置第三方 Integration，因此不会显示同意横幅，也不会加载分析、广告、验证码或社交嵌入服务。

站点负责人在 `config.yml` 的 `integrations` 下加入服务后，活动主题的受信任 Provider Adapter 会提供公开字段、处理用途、同意要求和加载策略。站点 YAML 不能提供脚本 URL，也不能自行选择 purpose。

## 同意选择

同意用途由已启用的 Adapter 自动推导。对话框只显示本站实际配置的 Integration 所对应的用途；Pageskill 自身的必要运行能力由系统处理，不作为站点级分类。需要同意的 Provider 在访客允许对应用途前不会加载。撤回同意会阻止之后的加载，但不能撤销 Provider 已经完成的工作。

## 选择保存

同意 Component 会把选择保存为小型浏览器偏好，内容只有 schema 版本、当前用途选择和更新时间。`privacy.consent.decisionRetentionDays` 只控制浏览器记住选择多久，不代表 Provider 服务端的数据保存期限或隐私政策。

## 本地功能与外部 API

本地 Search 读取同站生成索引，不使用 Cookie 或第三方服务。通过命名 `apis` 项连接的 Component 会直接访问已配置外部服务；其客户端 Token 是公开数据，服务端则负责私密凭据、数据处理与自身隐私义务。

## 联系我们

隐私问题请通过 [Pageskill GitHub](https://github.com/jsw-teams/pageskill) 联系 toewpq。启用 Integration 的站点必须在这份经过审核的政策中补充真实的数据处理和联系人信息。
