---
kind: release
title: Pageskill 1.0.0 beta
description: 純靜態 Component 系統、命名外部 API 與包含細節圖的無障礙報告。
date: 2026-09-16
---

# Pageskill 1.0.0 beta

這個 beta 建立一套乾淨的公開模型：Markdown 與設定負責內容，Component 負責呈現和行為，Core 永遠只產生靜態檔案。

## 受控瀏覽器行為

每個互動 Component 只宣告一個 client module 與 root selector。統一 Client Runtime 管理生命週期與產生資源；增加 `client.api` 時只開放一個已設定外部服務。Provider 同意仍是 integration 政策，不是另一種 client mode。

## 命名外部 API

Component 可把可選 `client.api` 綁定到一個命名 `config.apis` 項目。每項可使用第三方 HTTP(S) URL，並選擇 Bearer 或 `x-api-key` 用戶端授權。設定 Token 屬於公開瀏覽器資料；資料庫、模型呼叫、寫入操作與私密憑證只留在獨立部署的服務中。

## 可檢查的證據

`page c` 會產生可讀、帶結構標籤的 PDF，包含響應式基線以及本機 Search、行動版目錄、程式碼複製、命名 API 設定與 Provider 隱私修訂細節圖。完整 HTML、JSON 與原始截圖繼續私密保存在 `.pageskill/`。
