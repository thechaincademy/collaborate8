// Solana configuration. Devnet only for now - switch via environment variables.
// NOTE: nothing here is user-visible yet; this is backend/infrastructure only.

export type SolanaNetwork = "devnet" | "mainnet-beta";

export const SOLANA_NETWORK: SolanaNetwork =
  (import.meta.env.VITE_SOLANA_NETWORK as SolanaNetwork) || "devnet";

export const SOLANA_RPC_URL: string =
  import.meta.env.VITE_SOLANA_RPC_URL || "https://api.devnet.solana.com";

/** USDC mint (devnet by default), 6 decimals. */
export const USDC_MINT_ADDRESS: string =
  import.meta.env.VITE_USDC_MINT || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

export const USDC_DECIMALS = 6;

/** SPL Memo program. */
export const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

/** Memo prefix - the memo written on chain is `${MEMO_PREFIX}${referenceHash}`. */
export const MEMO_PREFIX = "C8|v1|";

export const SOLANA_EXPLORER_BASE = "https://explorer.solana.com";

export function explorerTxUrl(signature: string, network = SOLANA_NETWORK) {
  const cluster = network === "mainnet-beta" ? "" : `?cluster=${network}`;
  return `${SOLANA_EXPLORER_BASE}/tx/${signature}${cluster}`;
}
