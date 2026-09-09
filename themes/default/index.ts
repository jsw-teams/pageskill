import { defineTheme, type ThemeI18nSource, type ThemePluginDefinition, type ThemeResources } from '../../src/theme-api.ts';
import { modules as componentModules } from './components/index.ts';
import { modules as layoutModules } from './layouts/index.ts';
import { plugins } from './plugins/index.ts';
import { tocBlock } from './plugins/toc/index.ts';
import { renderShell } from './layouts/site/shell.ts';

const resources: ThemeResources = {
  styles: ['layouts/site/style.css']
};

const i18n: ThemeI18nSource[] = [
  'layouts/site/messages.yml'
];

const themePlugins: Record<string, ThemePluginDefinition> = plugins;

export default defineTheme({
  name: 'default',
  resources,
  i18n,
  plugins: themePlugins,
  modules: [...componentModules, ...layoutModules],
  blocks: { toc: tocBlock },
  shell: renderShell
});
