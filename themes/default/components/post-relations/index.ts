import type { ThemeRenderContext } from '../../../../src/theme-api.ts';

export function postRelations(context: ThemeRenderContext): string {
  return context.blogRelations();
}
