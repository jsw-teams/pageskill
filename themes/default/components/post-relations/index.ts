import type { ComponentRenderContext } from '../../../../src/theme-api.ts';

export function postRelations(context: ComponentRenderContext): string {
  return context.blogRelations();
}
