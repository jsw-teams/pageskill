---
title: 安全設定 Cookie 同意
description: 讓可選類別在同意前關閉，只載入管理員審查過的 HTTP(S) 腳本。
pattern: docs
---

# 安全設定 Cookie 同意

Pageskill 的 `privacyConsent` 主題外掛提供本地化 Cookie 選擇器。必要的同意儲存仍然可用，可選類別預設關閉，gated script 只有在訪客選擇對應類別後才插入。現有偏好鍵是 `pagekiln-consent`；更換主題時保留它，既有選擇才能繼續相容。

## 啟用功能的兩側

網站設定啟用功能，目前主題外掛提供瀏覽器程式碼和呈現。在網站根設定中保留兩個開關：

```yaml
plugins:
  privacyConsent:
    enabled: true
privacy:
  cookieConsent:
    enabled: true
    storage: cookie
    retentionDays: 365
```

預設主題已經宣告受信任的 `privacyConsent` 外掛腳本。複製主題時要保留這個外掛宣告和經過審查的瀏覽器模組。中性 starter 不含完整 Cookie 外掛；請使用儲存庫的預設主題，或複製 `catalog` 顯示提供 `privacyConsent` 的主題。

## 在網站設定中定義類別

在網站根目錄 `config.yml` 中新增 `default: false` 的可選類別：

```yaml
privacy:
  cookieConsent:
    categories:
      - id: essential
        required: true
        default: true
      - id: analytics
        required: false
        default: false
```

## 在目前主題中登記一個 gated script

編輯 `themes/<active>/theme.yml`，不要把它和上面的 `privacy.cookieConsent` 設定區塊混在一起。把以下片段合併到既有映射中的受信任主題外掛：

```yaml
plugins:
  privacyConsent:
    enabled: true
    script: scripts/cookie-consent.js
    gatedScripts:
      - source: https://analytics.example.test/script.js
        category: analytics
```

只使用管理員或主題作者審查過的 HTTP(S) 來源。協定驗證會阻止 `javascript:` 和 `data:` 注入，但不能證明第三方腳本本身安全。不要把 query、表單或 URL 內容拼進 `gatedScripts`，也不要讓訪客決定 `src`。

## 在同意前後驗證

執行原始碼檢查並建置：

```bash
pageskill check
pageskill build
```

預期 HTML 會包含 gated script 的資料模板，但可選外部腳本不會在同意前載入。使用 `pageskill s` 開啟建置結果，清除舊的 `pagekiln-consent` 選擇，並用瀏覽器 Network 面板檢查：

1. 作出選擇前，不應出現對 `analytics.example.test` 的請求。
2. 選擇 `analytics` 類別並儲存後，瀏覽器才可能請求設定的 HTTP(S) 腳本。
3. 拒絕可選類別或撤回選擇後，未來的 gated load 會遵循新狀態，但撤回無法撤銷已經執行的第三方 JavaScript 或已經傳送的資料。自訂腳本必須監聽 `pagekiln:consent` 並自行清理，或要求重新整理頁面；不要承諾所有服務會立即停止。

框架負責呈現選擇器和門控設定來源；HTTP(S) 驗證只驗證協定，並不會讓腳本自動可信。網站所有者仍需負責服務商隱私聲明、資料處理、保存期限和法律依據。

## 常見錯誤

- **看不到橫幅：** 同時檢查 `plugins.privacyConsent.enabled` 和 `privacy.cookieConsent.enabled`，再確認主題外掛已啟用。
- **同意後腳本仍不載入：** 確認 `gatedScripts` 的類別 id 與可選類別完全一致，並查看瀏覽器 Network 面板。
- **`javascript:` 或 `data:` URL 被忽略：** 使用經過審查的 `http://` 或 `https://` 來源；協定驗證本來就很保守。
- **訪客可以改來源：** 刪除這條輸入路徑。`src` 必須來自受信任的網站或主題設定。
- **以為撤回能撤銷腳本：** 自訂程式碼監聽 `pagekiln:consent` 並定義清理或重新整理路徑；已經執行的程式碼和已經傳送的資料無法收回。
- **改版後原有同意消失：** 保留 `pagekiln-consent` 鍵和相容的值結構。

## 預期結果與下一步

可選腳本現在會等待明確的類別同意，受信任的來源也與訪客資料分開。繼續閱讀[自訂渲染](/zh-tw/guide/customize/)審查主題擴充，或返回 [Guide](/zh-tw/guide/)。

[返回 Guide](/zh-tw/guide/) · [下一步：自訂渲染](/zh-tw/guide/customize/)
