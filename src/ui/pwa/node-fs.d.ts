// Minimal types for the two Node APIs vite.config.ts uses to list and hash public/ files. The project has no
// @types/node (and adds no dependencies); if it is ever added, these merge with it as overloads.
declare module 'node:fs' {
  export function readdirSync(path: string, options: { recursive: true }): string[];
  export function readFileSync(path: string): Uint8Array;
  export function statSync(path: string): { isFile(): boolean };
}
