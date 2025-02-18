// src/uhrp-url.d.ts
declare module 'uhrp-url' {
  export function getURLForFile(dataAsBuffer: Buffer): string;
  export function getHashFromURL(data: string): Buffer;
  // Add other exports as needed
}