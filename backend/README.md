# External API reference

This directory is not part of the Pageskill static build. It demonstrates the private-credential proxy option: deploy it as a separate Web-standard API service, then point a named `config.apis` URL at the public gateway route. That route may be same-origin or third-party as long as CORS permits the site.

The gateway owns two private settings:

- `PAGESKILL_API_URL`: the upstream service URL used only by the gateway.
- `PAGESKILL_API_TOKEN`: a strong shared secret stored by both the gateway and API service.

The gateway adds `Authorization: Bearer <token>` after receiving the browser's same-origin request. Never expose that token to browser JavaScript, Pageskill YAML, generated HTML, discovery output, or accessibility reports. Database and model bindings are configured only in the API service environment. Apply `migrations/` with the database provider's administration workflow.

`handler.ts` exports `handleApi(request, env)` and rejects a missing token configuration with 503 or an invalid bearer token with 401 before routing the request.
