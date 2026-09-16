# Changelog

## 1.0.0-beta.0 — 2026-09-16

- Reset the public version line to the first 1.0.0 beta and removed historical release-note packages.
- Made Core unconditionally static: generation, preview, and accessibility reporting never require a runtime adapter.
- Replaced scattered browser scripts and manual client modes with one generated Client Runtime driven by `ComponentDefinition.client`; DOM/assets need no API declaration and external work adds only a named `client.api`.
- Added named `config.apis` entries for third-party HTTP(S) URLs, Bearer or `x-api-key` client authorization, and Component-to-API binding by id.
- Kept databases, model calls, private credentials, and write logic in independently deployed APIs. Configured browser tokens are explicitly public client data.
- Kept local Search on generated indexes, and made trusted third-party Provider Adapters require consent policy plus exact acknowledgement in every localized privacy page.
- Added a source-controlled Agent Skill developer specification and regenerated discovery from current capabilities instead of sample endpoints.
- Rebuilt the automatic accessibility PDF for readable A4 output, factual Client/API boundaries, responsive evidence, and focused feature detail images.
- Removed retired deployment/runtime configuration, backend build coupling, demo content, legacy extension terminology, and compatibility shims.
