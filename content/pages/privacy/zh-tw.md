---
kind: page
title: 隱私政策
description: 說明 Pageskill 示範站處理什麼、什麼只留在瀏覽器，以及啟用外部 Provider 後需要如何更新政策。
toc: false
integrations: []
---

# 隱私政策

本政策適用於 `pageskill.openjsu.com` 的 Pageskill 示範站，描述的是本站目前設定，而不是替所有使用 Pageskill 建置的網站作出承諾。

## 目前處理情況

| 功能 | 涉及資訊 | 資訊去向 | 目前狀態 |
| --- | --- | --- | --- |
| 靜態頁面傳輸 | 提供 Web 請求通常需要的網路資訊 | 託管服務商 | 開啟網站所必需 |
| 本機 Search | 輸入的關鍵字與已產生搜尋索引 | 僅在瀏覽器中 | 已啟用 |
| 語言偏好 | 選擇的語言 | 本裝置瀏覽器儲存 | 已啟用 |
| 可選 Provider | 同意前說明的 Provider 專屬事件 | 對應 Provider | 本示範未設定 |
| 命名外部 API | 已連接 Component 明確傳送的資料 | 設定的 API URL | 本示範未設定 |

Pageskill Core 不建立訪客帳號，不寫入正式資料庫，不呼叫 AI 模型，也不保存留言。這些能力必須由獨立部署的 API 服務提供，並由啟用它們的網站另行說明。

## 瀏覽器儲存與 Cookie

語言選擇器可能在本裝置保存語言偏好。如果網站啟用了需要同意的 Provider Adapter，Consent Component 還會保存所選用途、schema 版本和更新時間。這項偏好不包含使用者輪廓、指紋、IP 位址或瀏覽紀錄。

本站目前沒有分析、廣告、驗證碼或社交嵌入 Provider，因此沒有需要請求的可選用途。只有設定啟用了確實需要同意的受信任 Adapter 時，才會顯示同意介面。

## 本機 Search 與外部 API

Search 在瀏覽器中讀取同站產生索引，搜尋詞不會傳送給 Pageskill 或第三方搜尋服務。

瀏覽器 Component 只能呼叫 `config.yml` 中分配給它的命名 API；該 origin 可以屬於第三方。寫入瀏覽器設定的 Token 按設計屬於公開資訊，私密憑證必須保存在外部服務或其 Secret Store。外部服務負責驗證、保存、刪除及自身隱私說明。

## Provider 變更與政策修訂

啟用可選 Provider 前，網站營運者必須審查其用途、資料類別、接收方、保存期限、跨境傳輸、撤回行為和政策連結。Provider Adapter 負責控制載入，但仍必須修訂本頁，讓訪客理解真實處理流程。設定開關不能取代隱私政策審查。

## 你的選擇

如果存在可選用途，你可以拒絕，透過「隱私設定」稍後修改，或清除本站的瀏覽器儲存。撤回選擇會阻止之後載入 Provider，但無法撤銷已經完成的請求。對於外部 API 保存的資料，應聯絡該服務標明的營運者。

## 聯絡與修訂

本示範站的資料控制者是 toewpq。隱私問題和更正請求可透過 [Pageskill 儲存庫](https://github.com/jsw-teams/pageskill) 提出。啟用的 Provider 或資料流發生實質變更時，必須在部署前複核並更新本政策。
