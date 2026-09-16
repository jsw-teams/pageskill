---
kind: post
title: 設定 Integration 與隱私同意
description: 只加入網站真正使用的第三方服務，由受信任的適配器負責驗證、用途和安全載入。
date: 2026-09-07
category: tutorial
---

# 設定 Integration 與隱私同意

Integration 是網站能力，不是主題外觀選項。請把它寫在根 `config.yml` 或其 `extends` 檔案中，再讓目前主題的受信任 Provider Adapter 提供欄位 schema、隱私用途、同意要求和載入器。

沒有設定 Integration 的網站不會顯示同意橫幅。只有當實際啟用的適配器宣告資源需要訪客選擇時，隱私同意 UI 才會出現。這樣一個普通靜態網站不會詢問本站根本沒有使用的第三方服務。

## 1. 只設定本站真正使用的服務

最小的真實範例是：

```yaml
# config.yml
integrations:
  google-analytics:
    measurementId: G-XXXXXXXXXX
```

這裡不需要寫 `purpose`、`enabled: true`、Provider Catalog、分類列表、腳本 URL 或 HTML。Provider 節點存在就表示預設啟用；如果想保留公開識別但暫時停用，可以寫 `enabled: false`。

一個網站使用多個服務時，按註冊過的 adapter ID 各寫一個節點：

```yaml
integrations:
  google-analytics:
    measurementId: G-XXXXXXXXXX
  cloudflare-web-analytics:
    token: public-beacon-token
  turnstile:
    siteKey: 0x4AAAA...
```

這裡只能放公開識別。驗證碼 secret、簽章金鑰或伺服器端驗證 token 應放在獨立部署的驗證服務環境，不能放進 YAML。

## 2. 讓 Adapter 自己擁有契約

預設主題在 `themes/default/components/consent/integrations.ts` 註冊 Provider。每個適配器自己負責：

| Adapter 中繼資料 | 含義 |
| --- | --- |
| `schema` | 必需公開欄位和識別格式驗證。 |
| `privacy.purpose` | `measurement`、`advertising` 等穩定的機器用途。 |
| `privacy.consent` | 適配器是否等待可選同意。 |
| `privacy.load` | 立即載入、同意後載入，或按需載入。 |
| runtime/resource | 受信任的實作和官方 Provider URL。 |

例如，Google Analytics 是屬於 `measurement` 的適配器，其標籤會等待訪問量測量同意；X for Websites 屬於 `social-embedding`，只有頁面有嵌入標記且適配器策略允許時才按需載入。驗證碼適配器也可以按需載入；這裡描述的是技術載入契約，不是法律結論。

網站不能透過另寫一個 `purpose` 或腳本 URL 改變這些事實。未知 Provider、未支援欄位、格式錯誤的識別、任意 `secret` 或可執行欄位都會在產生前驗證失敗。

## 3. 同意分類從實際 Integration 推導

Pageskill 會按適配器登記的 purpose 把目前啟用的服務分組。如果網站只設定 Google Analytics，對話框就只顯示訪問量測量；沒有實際 Provider 使用時，不會出現廣告、反濫用或社交內容分類。`essential` 屬於網站自身執行機制，不需要使用者在 YAML 中重複宣告。

預設行為是：

- 沒有需要同意的活動 Integration：沒有橫幅，也沒有同意對話框；
- 有需要同意的 Integration：顯示本地化同意 UI，並在選擇對應 purpose 前保持資源不載入；
- 按需 Integration：只有頁面功能請求它且適配器策略允許時才載入；
- `enabled: false`：不載入該適配器，也不把它列為目前啟用服務。

如果確實要改變瀏覽器保存選擇的時間，可以使用範圍很小的網站策略覆寫：

```yaml
privacy:
  consent:
    decisionRetentionDays: 180
```

它只控制瀏覽器記住訪客選擇多久，不控制 Google、Cloudflare 或其他 Provider 在服務端保留資料多久。Provider 的資料保留政策應以其自身說明和網站審核過的隱私政策為準。

如果設定了需要同意的適配器，卻把 `privacy.consent.enabled` 設為 `false`，產生會明確失敗。Pageskill 不會把關閉對話框誤當成允許無同意載入 Provider。

## 4. 理解瀏覽器狀態

瀏覽器只保存選擇，不保存 Provider 設定：

```json
{
  "version": 1,
  "purposes": {
    "measurement": false
  },
  "updatedAt": "2026-09-12T00:00:00.000Z"
}
```

Provider ID、測量 ID、site key 和 token 不會寫入這個狀態。網站後來新增 purpose 時，它會從未選擇開始；過去的「全部接受」不會靜默授權未來新增的分類。全部接受只表示同意目前頁面和目前設定宣告的所有可選 purpose。

## 5. 把政策和 UI 文案放在正確層級

請把審核過的政策寫成 `content/pages/privacy/<locale>.md`。每個啟用語言都必須在 Frontmatter 中宣告全部已啟用 Provider ID，例如 `integrations: [google-analytics]`，並說明真實供應商、目的、資料類別、保留來源、撤回方式與聯絡人。宣告缺漏或過期時產生會失敗。產生隱私資訊不是法律意見，也不能取代該頁面；同意按鈕和簡短用途說明屬於 Component 的 `messages.yml`。

不要在網站設定中加入第三方 URL、inline script、`onclick`、HTML 或 secret。Provider 資源由受信任程式碼固定，撤回同意會阻止之後的載入，但不會假裝可以撤銷已經發出的請求。

## 6. 啟用 Provider 前先驗證

```powershell
npm run compile-runtime
npm run compile-theme
npm run compile-backend
page g --profile
page s
```

在全新的瀏覽器工作階段中確認：沒有 `integrations` 的網站沒有橫幅；測試站設定真實適配器值後，在同意前看不到它的資源，選擇對應 purpose 後才載入，撤回可選用途後不再載入。檢查所有啟用語言的對話框，並查看產生的 Catalog：它應把程式碼登記的 Provider Registry 與本站已設定、去掉 secret 的 Provider 摘要分開列出。

驗證碼 token 驗證繼續放在服務端。社交嵌入應使用適配器的安全佔位或按需行為，不要自行新增腳本。啟用生產 Integration 前先閱讀[隱私政策](/zh-tw/privacy/)。

## 預期結果

網站作者只需表達「我要使用 Google Analytics」，並提供一個公開識別。Pageskill 內部負責知道它如何驗證、屬於哪個用途、何時可以載入，以及怎樣顯示同意選擇，而不會把 YAML 變成程式語言。

## 下一步

當主題還沒有你需要的能力時，閱讀[開發可重用元件](/zh-tw/posts/components/)，再新增一個受信任的註冊模組。
