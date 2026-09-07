---
title: Cookie 选择：先问访客再加载
description: 复用已有 Cookie 插件，让可选服务默认关闭并在同意后才运行。
date: 2026-09-07
---

# Cookie 选择：先问访客再加载

Cookie 同意是站点的访客选择。Pageskill 已有 `privacyConsent` 插件；可选类别默认关闭，访客同意后才会加载对应服务。

## 1. 打开现成插件

在站点的 `config.yml` 保留插件和政策入口：

```yaml
plugins:
  privacyConsent:
    enabled: true
privacy:
  cookieConsent:
    enabled: true
    policyRoute: /:locale/privacy/
```

政策页面放在 `content/pages/privacy/`，并准备三个语言版本。必要类别可以工作；分析和广告类别应保持 `default: false`。

## 2. 只在主题里登记可信脚本

如果确实要加载可选脚本，把来源和类别写在主题 `theme.yml` 的 `gatedScripts`，由站点维护者审阅：

```yaml
plugins:
  privacyConsent:
    enabled: true
    gatedScripts:
      - src: https://analytics.example/script.js
        category: analytics
```

脚本来源是受信配置，不是访客输入。撤回同意会阻止后续加载，但不能撤销脚本已经执行过的动作。

## 3. 生成并查看提示

```powershell
pageskill g
pageskill s
```

在无选择、同意可选类别和撤回三种状态下查看页面；确认政策链接和语言版本可达。

## 成功结果

首次访问时可选脚本没有运行；访客明确同意后才加载，页脚仍能打开政策和 Cookie 设置。

## 常见坑

不要把脚本 URL 写进文章正文，也不要把可选类别的默认值设为同意。`theme.yml` 的可信清单和插件开关要同时存在。

## 下一步

读[换样式，或让 Agent 帮你改](/zh-sg/posts/customize/)，学习如何复制一次主题能力。
