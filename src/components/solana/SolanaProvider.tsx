import { ReactNode, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { SOLANA_RPC_URL } from "@/config/solana";
// Local copy without the Google Fonts @import (fonts are self-hosted).
import "./wallet-adapter.css";

/**
 * Wallet context for Solana / USDC payments.
 * Non-custodial: all signing happens inside the user's own wallet.
 * The app never creates, stores or transmits private keys.
 */
const SolanaProvider = ({ children }: { children: ReactNode }) => {
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={SOLANA_RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default SolanaProvider;
