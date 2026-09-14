import { defineTheme } from '../../src/theme-api.ts';
import { components } from './components/index.ts';

/** The default theme exposes one extension vocabulary: Components. */
export default defineTheme({
  name: 'default',
  components
});
