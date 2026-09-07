import { Router } from '../src/fetch-router.ts';

export type BackendEnvironment = Record<string, unknown>;

export const router = new Router<BackendEnvironment>();

router.get('/api/health', () => Response.json({
  ok: true,
  service: 'pageskill',
  runtime: 'web-standard-fetch'
}));
