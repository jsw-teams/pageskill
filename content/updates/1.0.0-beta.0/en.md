---
kind: release
title: Pageskill 1.0.0 beta
description: A static-first Component system with named external APIs and a detailed accessibility report.
date: 2026-09-16
---

# Pageskill 1.0.0 beta

This beta establishes one clean public model: Markdown and configuration own content, Components own presentation and behavior, and Core always produces static files.

## Governed browser behavior

Each interactive Component declares one client module and root selector. The unified Client Runtime handles lifecycle and generated assets; adding `client.api` grants only one configured external service. Provider consent remains an integration policy, not another client mode.

## Named external APIs

A Component may bind its optional `client.api` to one named `config.apis` entry. Each entry can target a third-party HTTP(S) URL and select Bearer or `x-api-key` client authorization. Configured tokens are public browser data; databases, model calls, writes, and private credentials stay in independently deployed services.

## Evidence you can inspect

`page c` now generates a readable tagged PDF with responsive baselines and focused detail images for local Search, mobile table of contents, code copy, named API configuration, and Provider privacy revision. The complete HTML report, JSON, and original screenshots remain private under `.pageskill/`.
