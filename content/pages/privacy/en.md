---
kind: page
title: Privacy policy
description: How this demo site handles data and how configured integrations participate in consent.
---

# Privacy policy

This fixed policy page explains how the site handles information needed to serve pages and how visitors manage optional integrations.

## This demo's current state

The Pageskill demo does not configure a third-party integration. It therefore does not show a consent banner and does not load analytics, advertising, CAPTCHA, or social-embed services.

When a site owner adds an integration under `config.yml`, the active theme's trusted Provider Adapter supplies its public fields, processing purpose, consent requirement, and load policy. Site YAML does not supply a script URL or choose a purpose.

## Consent choices

Consent purposes are derived from enabled adapters. Only purposes represented by the site's configured integrations appear in the dialog; essential operation is handled by Pageskill and is not a site-level category. A gated provider remains unloaded until the visitor grants its purpose. Withdrawing consent prevents later loads but cannot undo work a provider already performed.

## Decision storage

The consent decision is stored by the runtime as a small browser preference containing the schema version, current purpose choices, and update time. `privacy.consent.decisionRetentionDays` changes how long that choice is remembered; it does not control a provider's server-side data retention or policy.

## Contact

For privacy questions, contact toewpq through [Pageskill GitHub](https://github.com/jsw-teams/pageskill). A site that enables an integration must add its real processing details and contact information to this reviewed policy.
