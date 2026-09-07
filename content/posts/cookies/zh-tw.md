---
title: Cookie 選擇：先問訪客再載入
description: 重用已有的 Cookie 外掛，讓可選服務預設關閉並在同意後才執行。
date: 2026-09-07
---

# Cookie 選擇：先問訪客再載入

Cookie 同意是網站訪客的選擇。Pageskill 已有 `privacyConsent` 外掛；可選類別預設關閉，訪客同意後才會載入對應服務。

## 1. 開啟現成外掛

在網站的 `config.yml` 保留外掛和政策入口：

```yaml
plugins:
  privacyConsent:
    enabled: true
privacy:
  cookieConsent:
    enabled: true
    policyRoute: /:locale/privacy/
```

政策頁面放在 `content/pages/privacy/`，並準備三個語言版本。必要類別可以運作；分析和廣告類別應保持 `default: false`。

## 2. 只在主題登記可信腳本

如果確實要載入可選腳本，把來源和類別寫在主題 `theme.yml` 的 `gatedScripts`，由網站維護者審閱：

```yaml
plugins:
  privacyConsent:
    enabled: true
    gatedScripts:
      - src: https://analytics.example/script.js
        category: analytics
```

腳本來源是受信設定，不是訪客輸入。撤回同意會阻止後續載入，但不能撤銷腳本已經執行過的動作。

## 3. 產生並查看提示

```powershell
pageskill g
pageskill s
```

在沒有選擇、同意可選類別和撤回三種狀態下查看頁面；確認政策連結和語言版本都能到達。

## 成功結果

首次造訪時可選腳本沒有執行；訪客明確同意後才載入，頁尾仍能開啟政策和 Cookie 設定。

## 常見問題

不要把腳本 URL 寫進文章正文，也不要把可選類別的預設值設為同意。`theme.yml` 的可信清單和外掛開關要同時存在。

## 下一步

閱讀[更換樣式，或讓 Agent 幫你改](/zh-tw/posts/customize/)，學習如何複製一次主題能力。
