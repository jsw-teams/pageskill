---
title: 我们如何构建插件
description: 以 Cookie 选择器作为参考，学习行为约定、安全渲染、主题配置和部分翻译的处理方式。
date: 2026-09-07
category: tutorial
---

# 我们如何构建插件

Cookie 选择器是我们构建可复用插件时的参考实现。它把访客界面、浏览器状态、可选脚本、本地化消息和政策链接组合起来，同时不需要每个 post 重复 HTML。

我们以 Cookie 选择器作为参考，并借鉴 [Cookie 政策生成器](https://www.toolszone.net/zh/tools/cookie-policy-generator) 的透明展示思路：把类别、提供者、保存期限和同意要求放在一起，方便访客查看。这里只借鉴展示方式；选择器仍然只是同意控制，不是法律建议或政策生成器。经过审核的政策继续用 Markdown 维护。

## 1. 先定义行为约定

写模块之前，先明确它要支持的状态：

- 必要功能立即可用；
- 可选用途默认关闭；
- 可选脚本加载前必须得到明确选择；
- 访客可以重新打开选择器并保存“仅必要项”；
- 撤回选择会阻止后续加载，但不能撤销脚本已经完成的工作。

这个约定让插件可以复用。post 只说明能力，不复制它的标记或浏览器逻辑。

## 2. 把模块文件放在一起

默认主题把实现集中在一个目录：

```text
themes/default/plugins/cookies/
  index.ts
  script.js
  style.css
  messages.yml
```

`index.ts` 定义能力和资源；`script.js` 负责同意状态的保存与加载判断；`style.css` 负责选择器外观；`messages.yml` 负责界面翻译。

## 3. 在代码中登记能力

插件定义由代码拥有。它负责登记能力、资源、本地化消息、默认值、固定的 provider 适配器和实例数据形状，不包含本站账户值或启用选择。下面是实际定义的精简示例：

```ts
import type { ThemePluginDefinition } from '../../../../src/theme-api.ts';

export const plugin: ThemePluginDefinition = {
  implementation: 'plugins/cookies/index.ts',
  resources: {
    // 代码登记资源归属；本站实例数据留在 theme.yml。
    styles: ['plugins/cookies/style.css'],
    scripts: ['plugins/cookies/script.js']
  },
  i18n: 'plugins/cookies/messages.yml',
  defaults: {
    enabled: true,
    categories: [
      { purpose: 'essential', required: true, default: true },
      { purpose: 'measurement', required: false, default: false },
      { purpose: 'advertising', required: false, default: false },
      { purpose: 'fraud-prevention', required: false, default: false },
      { purpose: 'social-embedding', required: false, default: false }
    ],
    integrations: [
      { provider: 'google-analytics', enabled: false, measurementId: '', purpose: 'measurement' },
      { provider: 'google-ads', enabled: false, tagId: '', purpose: 'advertising' }
    ],
    gatedScripts: []
  },
  schema: {
    // schema 只描述数据，不接受可执行的 provider 代码。
    enabled: { type: 'boolean' },
    categories: { type: 'array' },
    integrations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: true,
        properties: {
          provider: { type: 'string', required: true },
          enabled: { type: 'boolean' },
          purpose: { type: 'string' },
          measurementId: { type: 'string' },
          tagId: { type: 'string' },
          token: { type: 'string' },
          siteSignature: { type: 'string' },
          siteKey: { type: 'string' }
        }
      }
    },
    gatedScripts: { type: 'array' }
  }
};
```

在 `themes/default/plugins/index.ts` 中只登记一次：

```ts
import { plugin as chrome } from './chrome/index.ts';
import { plugin as cookies } from './cookies/index.ts';
import { plugin as language } from './language/index.ts';
import { plugin as search } from './search/index.ts';
import { plugin as toc } from './toc/index.ts';

export const plugins = { chrome, search, toc, privacyConsent: cookies, language };
```

真实 schema 描述的是 provider 实例数组。内置 provider 值是 `google-analytics`、`google-ads`、`cloudflare-web-analytics`、`baidu-tongji`、`recaptcha`、`hcaptcha`、`turnstile` 和 `x-for-websites`。这些是代码拥有的适配器名称，不是站点凭空生成的 ID。未知条目和额外字段在主题模块登记对应行为之前保持惰性；配置永远不是可执行代码。

## 4. 在主题数据中使用真实 provider 字段和用途

活动主题在配置文件中设置插件实例。可选用途只有在明确接入并审核过的服务后才开启：

```yaml
# themes/default/theme.yml
plugins:
  privacyConsent:
    enabled: true
    provider: Pageskill
    storage: cookie
    retentionDays: 365
    categories:
      - purpose: essential
        required: true
        default: true
        retentionDays: 365
      - purpose: measurement
        required: false
        default: false
        retentionDays: 0
      - purpose: advertising
        required: false
        default: false
        retentionDays: 0
      - purpose: fraud-prevention
        required: false
        default: false
        retentionDays: 0
      - purpose: social-embedding
        required: false
        default: false
        retentionDays: 0
    integrations:
      - provider: google-analytics
        enabled: false
        measurementId: '' # GA4 值，例如 G-XXXXXXXXXX
        purpose: measurement
      - provider: google-ads
        enabled: false
        tagId: '' # Google tag 值，例如 AW-XXXXXXXXXX 或 GT-XXXXXXXX
        purpose: advertising
      - provider: cloudflare-web-analytics
        enabled: false
        token: '' # Cloudflare beacon 代码中的 token
        purpose: measurement
      - provider: baidu-tongji
        enabled: false
        siteSignature: '' # hm.baidu.com/hm.js? 后面的值
        purpose: measurement
      - provider: recaptcha
        enabled: false
        siteKey: ''
        purpose: fraud-prevention
      - provider: hcaptcha
        enabled: false
        siteKey: ''
        purpose: fraud-prevention
      - provider: turnstile
        enabled: false
        siteKey: ''
        purpose: fraud-prevention
      - provider: x-for-websites
        enabled: false
        purpose: social-embedding
    gatedScripts: []
```

这些字段跟随 provider 实际的网页接入约定：[Google Analytics measurement ID](https://support.google.com/analytics/answer/12270356) 使用 `G-...`；Google Ads 的 `tagId` 使用 Ads 显示的 Google tag 标识，例如 `AW-...` 或 `GT-...`，不是自造的 `conversionId`。插件使用 Google 的 basic consent mode：选择前阻止 tag，选择后传递文档规定的 `analytics_storage`、`ad_storage`、`ad_user_data` 和 `ad_personalization` 状态。插件只负责初始化带同意状态的 Google tag，不会凭空创建转化事件或 label。[Cloudflare Web Analytics](https://developers.cloudflare.com/web-analytics/get-started/) 提供 beacon `token`，[百度统计](https://tongji.baidu.com/web/help/article?id=219) 提供 `hm.js?` 后的 `siteSignature`。如果 Cloudflare proxy 或 Pages 自动注入 Web Analytics，请关闭那条独立注入路径，否则它会绕过此选择器。`purpose` 不是账户 ID 或 Cookie 名称，而是代码登记的处理用途，分别对应真实的访问量测量、广告、人机验证/反滥用或社交嵌入行为。

内置用途登记保持小而有依据：`measurement` 对应 GA4 的 `analytics_storage`、Cloudflare Web Analytics 和百度统计；`advertising` 对应 Google Ads 的存储和广告信号；`fraud-prevention` 对应 reCAPTCHA、hCaptcha、Turnstile 的挑战；`social-embedding` 对应 X for Websites widget；`essential` 只保存 Pageskill 的选择记录。只有代码已登记适配器、存在 provider 的真实公开值、用途与可选项匹配，并且访客明确同意时，provider 才会运行。

只有在审核 provider 条款、隐私说明、保存期限和 CSP 后，才把 `enabled` 改为 `true`。验证码适配器使用 [reCAPTCHA](https://developers.google.com/recaptcha/docs/display)、[hCaptcha](https://docs.hcaptcha.com/) 和 [Turnstile](https://developers.cloudflare.com/turnstile/get-started/) 的官方脚本与标记。它们的 `siteKey` 可以公开；secret key 和服务端 token 校验必须留在 `backend/handler.ts` 或其他私有服务中。X 适配器没有账户 ID：只有页面存在 X 标记并且访客同意后，才按 [X for Websites](https://help.x.com/en/using-x/embed-x-feed) 的方式加载官方 widget 资源。

并非每个集成都是字面意义上的 Cookie。Cloudflare Web Analytics 主要使用 beacon token，Turnstile 执行挑战，X widget 运行时可能接收请求或 Cookie 信息。应依据 provider 当前说明填写用途和保存期限，不要宣称所有可选 provider 都会写入同一种 Cookie。浏览器同意状态只把这些用途键作为稳定存储键，不会把它们伪装成 provider 标识。

X 集成按需加载：同意后，只有页面存在 X/Twitter 嵌入标记时才加载 `platform.x.com/widgets.js`。选择前不会加载社交嵌入。其他 provider 专属字段可以保留在主题配置中供未来代码使用，但不会仅因写入配置就发起网络请求。

稳定的政策入口和控制者资料仍然是站点数据：

```yaml
# config.yml
privacy:
  cookieConsent:
    policyRoute: /:locale/privacy/
```

把审核过的政策放在 `content/pages/privacy/<locale>.md`。不要在 YAML 或 Markdown 中放 HTML、JavaScript、CSS、提供者代码或隐藏的脚本 URL。`config.yml` 只在生成时读取，不会复制到 `dist/public`；生成的 backend 也没有写入它的路由。配置是数据，可执行行为由插件模块负责。

## 5. 以安全边界渲染

`renderCookieConsent` 根据经过校验的 context 生成固定的弹窗和横幅。动态值遵循两条不同规则：

```ts
// 文字和 URL 使用不同的安全渲染路径。
const label = context.escapeHtml(category.label);
const href = context.safeUrl(privacy.policyHref);
```

标签和元数据作为文字转义；政策链接和受同意控制的脚本 URL 经过 `safeUrl`，不安全协议会被拒绝。内置 provider 的 URL 固定在已登记的浏览器实现中，canonical provider 名称和公开 token/key 只作为数据处理。浏览器脚本使用 DOM API 创建元素，并且只在同意后加载可选资源。插件界面没有 `innerHTML`、`eval`、任意属性或配置注入的标记。

提供者和保存期限会直接显示在选择器中，帮助访客理解类别用途；法律政策仍然是人工审核的页面，而不是悄悄生成的法律文本。

## 6. 用主题配置控制 nav 和 footer 插入

壳层插入点也是结构化的主题选项。主导航链接仍由 `config.yml` 管理；这个功能允许主题在标准链接前后添加安全链接：

```yaml
# themes/default/theme.yml
plugins:
  chrome:
    enabled: true
    navigation:
      enabled: true
      before: []
      after:
        - label: Plugin tutorial
          labels:
            zh-sg: 插件教程
            zh-tw: 外掛教學
          href: /:locale/posts/cookies/
    footer:
      enabled: true
      before: []
      after: []
```

这里只接受 `label`、可选的本地化 `labels` 和 `href`。编译器会解析 `:locale`，限制链接数量和长度，拒绝不安全协议或目录穿越 URL；壳层输出前还会转义最终标签。原始 HTML、脚本、样式、选择器和任意属性都没有配置字段。

## 7. 不要让翻译进度阻塞发布

站点语言放在 `config.yml`，不放在插件设置中：

```yaml
activeLocales:
  - zh-sg
  - zh-tw
  - en
i18n:
  fallbackLocale: en
  contentFallback: true
```

Cookie 界面消息放在插件旁边的 `messages.yml`。如果新增语言只翻译了 50%，缺少的界面 key 会从 `en` 合并；整篇内容文档缺失时使用配置的内容回退。已经存在但只翻译了一部分的 Markdown 会完全按原文显示，不会静默按段落混入机器翻译或回退内容。

## 8. 检查同意状态

```powershell
npm run compile-theme
npm run g
npm run s
```

用全新的浏览器会话确认选择前不会加载可选脚本。分别接受每个已配置类别，确认只有对应的经过审核的 provider 加载：Google Analytics、Google Ads、Cloudflare Web Analytics、验证码，或在存在嵌入标记时的 X。验证码要在服务端校验 token；X 要先确认页面确实有嵌入再观察 widget 请求。重新打开 Cookie 设置，保存“仅必要项”，确认后续加载停止。同时检查政策链接、键盘焦点、语言链接，以及每种启用语言中的 nav/footer 插入效果。

## 成功结果

Cookie 选择器成为一个可复用的主题插件，拥有本地化界面、明确的类别元数据、可扩展的 provider 配置、安全的同意后加载和经过审核的政策链接。post 仍然是 Markdown，主题也可以增加少量壳层链接，而不会获得 HTML 或脚本注入入口。

## 常见坑

不要默认开启分析、广告、验证码或社交嵌入，不要把未知第三方 URL 当成可信，也不要以为撤回同意可以撤销之前的脚本工作。扩展 integration 数据可以保留，但只有代码模块消费它时才会产生作用。不要把 provider secret 放进 `theme.yml`，不要给插件增加 `language` 设置，也不要在每个 post 复制选择器。如果翻译不完整，让配置的 fallback 填补缺少的界面 key，再有计划地完成内容翻译。

## 下一步

阅读[开发可复用插件](/zh-sg/posts/plugins/)，用同样的模块模式构建更小的能力。
