declare module 'markdown-it-task-lists' {
  const component: (instance: unknown, options?: { enabled?: boolean; label?: boolean; labelAfter?: boolean }) => void;
  export default component;
}

declare module 'node:child_process' {
  type ChildProcessLike = {
    once(event: 'error', listener: (error: unknown) => void): ChildProcessLike;
    once(event: 'close', listener: (code: number | null) => void): ChildProcessLike;
  };
  export function spawn(command: string, args?: readonly string[], options?: Record<string, unknown>): ChildProcessLike;
}
