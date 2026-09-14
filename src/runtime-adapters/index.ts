import type { RuntimeBuildAdapter } from '../runtime-contract.ts';

const ADAPTER_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** Load a developer-facing Runtime Adapter without coupling Core to a host. */
export async function loadRuntimeAdapter(id?: string): Promise<RuntimeBuildAdapter | undefined> {
  if (!id) return undefined;
  if (!ADAPTER_ID.test(id)) throw new Error(`runtime adapter "${id}" has an invalid id`);
  try {
    const module = await import(`./${id}.js`);
    const adapter = module.default || module.adapter;
    if (!adapter || adapter.id !== id) throw new Error(`runtime adapter "${id}" does not export a matching adapter definition`);
    return adapter as RuntimeBuildAdapter;
  } catch (error: any) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND' || /Cannot find module/.test(String(error?.message || ''))) {
      throw new Error(`runtime adapter "${id}" is not installed; add its Runtime Adapter implementation or omit runtime.adapter`);
    }
    throw error;
  }
}
