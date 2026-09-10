---
title: Cookie 選擇：先問訪客再載入
description: 啟用 Cookie 外掛，讓可選類別預設關閉，並檢查撤回同意的行為。
date: 2026-09-07
---

# Cookie 選擇：先問訪客再載入

Cookie 同意是訪客的選擇。Pageskill 可以讓可選服務預設關閉，訪客同意後才載入；撤回選擇後不再載入後續腳本。

## 1. 啟用現成外掛

把外掛選項放在 `themes/default/theme.yml`，把穩定政策入口留在 `config.yml`：

```yaml
# themes/default/theme.yml
plugins:
  privacyConsent:
    enabled: true

# config.yml
privacy:
  cookieConsent:
    policyRoute: /:locale/privacy/
```

在每個啟用語言的 `content/pages/privacy/` 下準備政策頁面。

預設實作是 `themes/default/plugins/cookies/` 模組；它的 `index.ts`、CSS、腳本和 messages 放在一起。

## 2. 讓可選類別保持關閉

在 `themes/default/theme.yml` 中讓必要儲存使用 `essential`，可選類別設定 `default: false`：

```yaml
plugins:
  privacyConsent:
    categories:
      - id: essential
        required: true
        default: true
      - id: analytics
        required: false
        default: false
      - id: advertising
        required: false
        default: false
```

網站服務的 ID 等實例資料放在 `config.yml`。不要把服務 ID 寫進文章，也不要預設開啟可選類別。

選擇器會明確顯示每個類別的提供者和保存期限，借鑑政策產生器的透明資訊展示；它仍然只是訪客同意控制，不會悄悄產生法律文字。經過審核的政策請繼續維護在 `content/pages/privacy/<locale>.md`。

## 3. 登記受信任腳本

需要在同意後才載入的腳本，放在主題外掛中，不要放進網站設定。在 `themes/default/plugins/cookies/index.ts` 的現有 `plugin` 匯出中加入：

```ts
// 在現有 plugin 匯出中加入這個屬性。
defaults: {
  gatedScripts: [{ src: 'plugins/cookies/analytics.js', category: 'analytics' }]
}
```

`gatedScripts` 要留在主題擁有的 `defaults` 中；政策/控制者資料放在 `config.yml`，外掛選項放在 `theme.yml`。

在 `themes/default/plugins/cookies/analytics.js` 建立並審查這個檔案。相對 `src` 從主題根目錄解析，產生後位於帶指紋的 `/assets/theme/default/` 下。

類別必須是可選類別。加入前先檢查腳本來源和用途；同意檢查不會讓未知的第三方腳本自動安全。

## 4. 檢查三種狀態

```powershell
npm run g
npm run s
```

用全新的瀏覽器工作階段確認訪客未選擇前不會載入可選腳本。接受分析類別後確認腳本載入，再開啟 Cookie 設定，儲存「僅必要項目」，確認後續載入會停止。

## 成功結果

必要功能立即運作；可選類別預設關閉，只有明確同意後才載入，頁尾仍可開啟政策頁和 Cookie 設定。

## 常見問題

撤回同意會阻止後續載入，但不能撤銷腳本已經完成的工作。不要把腳本 URL 藏在 Markdown 中，不要用必要類別承載分析，也不要在每篇文章重複設定外掛。

## 下一步

Cookie 流程穩定後，閱讀[讓訪客搜到頁面和文章](/zh-tw/posts/search/)。
