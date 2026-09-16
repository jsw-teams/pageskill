---
kind: page
title: Privacy policy
description: What this Pageskill demonstration processes, what stays in the browser, and what changes when an external provider is enabled.
toc: false
integrations: []
---

# Privacy policy

This policy describes the Pageskill demonstration at `pageskill.openjsu.com`. It is written for the site's current configuration, not as a promise about every site built with Pageskill.

## Current processing at a glance

| Feature | Information involved | Where it goes | Current state |
| --- | --- | --- | --- |
| Static page delivery | The network information normally required to deliver a web request | Hosting provider | Required to open the site |
| Local Search | Words entered into Search and the generated search index | Your browser only | Enabled |
| Language preference | Chosen locale | Browser storage on this device | Enabled |
| Optional providers | Provider-specific events described before consent | The named provider | Not configured on this demo |
| Named external APIs | Data explicitly sent by a connected Component | The configured API URL | Not configured on this demo |

Pageskill Core does not create visitor accounts, write production databases, call an AI model, or store comments. Those capabilities require a separately deployed API service and must be documented by the site that enables them.

## Browser storage and Cookies

The language selector may remember a locale on this device. If a site enables a consent-requiring Provider Adapter, the consent Component also stores the selected purposes, schema version, and update time. This preference does not contain a profile, fingerprint, IP address, or page history.

This demonstration currently has no analytics, advertising, CAPTCHA, or social-embed provider. It therefore has no optional provider purpose to request. A consent interface appears only when the configuration enables a trusted adapter that requires it.

## Local Search and external APIs

Search reads a generated same-site index in the browser. Search terms are not sent to Pageskill or to a search provider.

A browser Component may call only the named API assigned to it in `config.yml`. The configured origin may be a third-party origin. Any Token placed in browser configuration is public by design; private credentials belong in the external service or its secret store. That service is responsible for authentication, retention, deletion, and its own privacy notice.

## Provider changes and policy revision

Before enabling an optional provider, the site operator must review its purpose, data categories, recipients, retention, cross-border transfer, withdrawal behavior, and policy link. The Provider Adapter controls loading, but this page must still be revised so a visitor can understand the real processing. A configuration switch is not a substitute for a policy review.

## Your choices

Where optional purposes exist, you may reject them, change them later through Privacy settings, or clear this site's browser storage. Withdrawing a choice blocks future provider loads; it cannot reverse a request that was already completed. Requests about data held by an external API must be directed to the operator identified by that service.

## Contact and revisions

The controller for this demonstration is toewpq. Privacy questions and correction requests can be raised through [the Pageskill repository](https://github.com/jsw-teams/pageskill). Material changes to enabled providers or data flows require this policy to be reviewed and updated before deployment.
