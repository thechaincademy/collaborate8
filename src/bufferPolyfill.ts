import { Buffer } from "buffer";

// Buffer polyfill required by the Solana web3 libraries.
// Imported first in main.tsx so it runs before any Solana module is evaluated.
if (!(globalThis as { Buffer?: unknown }).Buffer) {
  (globalThis as { Buffer?: unknown }).Buffer = Buffer;
}
