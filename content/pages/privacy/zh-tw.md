---
kind: page
title: 隱私說明
description: 說明本站如何處理資料，以及已設定的 Integration 如何參與同意流程。
---

# 隱私說明

這是一份固定的隱私政策頁面，說明本站如何處理執行頁面所需的資訊，以及訪客如何管理可選 Integration。

## 本 Demo 目前狀態

Pageskill Demo 沒有設定第三方 Integration，因此不會顯示同意橫幅，也不會載入分析、廣告、驗證碼或社交嵌入服務。

網站負責人在 `config.yml` 的 `integrations` 下加入服務後，啟用主題的受信任 Provider Adapter 會提供公開欄位、處理用途、同意要求和載入策略。網站 YAML 不能提供腳本 URL，也不能自行選擇 purpose。

## 同意選擇

同意用途由已啟用的 Adapter 自動推導。對話框只顯示本站實際設定的 Integration 所對應用途；Pageskill 自身的必要執行能力由系統處理，不作為網站級分類。需要同意的 Provider 在訪客允許對應用途前不會載入。撤回同意會阻止之後的載入，但不能撤銷 Provider 已完成的工作。

## 選擇保存

執行階段會把同意選擇保存為小型瀏覽器偏好，內容只有 schema 版本、目前用途選擇和更新時間。`privacy.consent.decisionRetentionDays` 只控制瀏覽器記住選擇多久，不代表 Provider 服務端的資料保存期限或隱私政策。

## 聯絡我們

隱私問題請透過 [Pageskill GitHub](https://github.com/jsw-teams/pageskill) 聯絡 toewpq。啟用 Integration 的網站必須在這份經過審核的政策中補充真實的資料處理和聯絡人資訊。
