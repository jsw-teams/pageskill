declare const process: any;
declare const Buffer: any;
declare module 'node:fs' { export const promises: any; export const watch: any; }
declare module 'node:path' { const value: any; export default value; }
declare module 'node:crypto' { const value: any; export default value; }
declare module 'node:url' { export const fileURLToPath: any; export const pathToFileURL: any; }
declare module 'node:module' { export const createRequire: any; }
declare module 'node:http' { export const createServer: any; }
declare module 'node:perf_hooks' { export const performance: any; }
