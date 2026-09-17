import { Buffer } from "buffer";
import { useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { supabase } from "@/integrations/supabase/client";
import {
  MEMO_PREFIX,
  MEMO_PROGRAM_ID,
  SOLANA_NETWORK,
  USDC_DECIMALS,
  USDC_MINT_ADDRESS,
} from "@/config/solana";
import { computeReferenceHash, generateSalt } from "@/lib/solanaReference";

export interface SolanaPaymentParams {
  arrangementId?: string | null;
  payerId: string;
  receiverId: string;
  receiverWallet: string;
  period?: string | null;
  paymentType?: "maintenance" | "expense";
  expenseId?: string | null;
  amountUsdc: number;
  /** Stored in the database only - never written on chain. */
  amountGbpReference?: number | null;
}

/**
 * Non-custodial USDC transfer over Solana.
 * The app builds an unsigned transaction, the user's wallet signs it, and we keep
 * an audit record. Collabor8 never holds or moves funds and never sees a private key.
 */
export const useSolanaPayment = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  const [sending, setSending] = useState(false);

  const sendUsdcPayment = useCallback(
    async (params: SolanaPaymentParams) => {
      if (!connected || !publicKey) throw new Error("Wallet not connected");

      setSending(true);
      let recordId: string | null = null;

      try {
        const paymentType = params.paymentType ?? "maintenance";
        const salt = generateSalt();
        const payerWallet = publicKey.toBase58();

        const referenceHash = await computeReferenceHash({
          arrangementId: params.arrangementId ?? null,
          payerId: params.payerId,
          receiverId: params.receiverId,
          period: params.period ?? null,
          paymentType,
          expenseId: params.expenseId ?? null,
          amountUsdc: params.amountUsdc,
          salt,
        });

        // 1. Audit record first, as "pending".
        const { data: record, error: insertError } = await supabase
          .from("payment_records")
          .insert({
            arrangement_id: params.arrangementId ?? null,
            payer_id: params.payerId,
            receiver_id: params.receiverId,
            period: params.period ?? null,
            payment_type: paymentType,
            expense_id: params.expenseId ?? null,
            amount_usdc: params.amountUsdc,
            amount_gbp_reference: params.amountGbpReference ?? null,
            payer_wallet: payerWallet,
            receiver_wallet: params.receiverWallet,
            reference_hash: referenceHash,
            salt,
            network: SOLANA_NETWORK,
            status: "pending",
          })
          .select("id")
          .single();

        if (insertError || !record) throw insertError ?? new Error("Could not create record");
        recordId = record.id;

        // 2. Build the transfer + memo (hash only, no personal data).
        const mint = new PublicKey(USDC_MINT_ADDRESS);
        const receiver = new PublicKey(params.receiverWallet);
        const source = await getAssociatedTokenAddress(mint, publicKey);
        const destination = await getAssociatedTokenAddress(mint, receiver);
        const rawAmount = BigInt(Math.round(params.amountUsdc * 10 ** USDC_DECIMALS));

        const tx = new Transaction().add(
          createTransferCheckedInstruction(
            source,
            mint,
            destination,
            publicKey,
            rawAmount,
            USDC_DECIMALS
          ),
          new TransactionInstruction({
            keys: [{ pubkey: publicKey, isSigner: true, isWritable: false }],
            programId: new PublicKey(MEMO_PROGRAM_ID),
            data: Buffer.from(`${MEMO_PREFIX}${referenceHash}`, "utf8"),
          })
        );

        // 3. Sign in the user's wallet and send.
        const signature = await sendTransaction(tx, connection);
        const latest = await connection.getLatestBlockhash();
        await connection.confirmTransaction(
          { signature, ...latest },
          "confirmed"
        );

        await supabase
          .from("payment_records")
          .update({
            tx_signature: signature,
            status: "confirmed",
            confirmed_at: new Date().toISOString(),
          })
          .eq("id", recordId);

        // 4. Independent verification.
        await verifyPayment(recordId);

        return { recordId, signature };
      } catch (e) {
        if (recordId) {
          await supabase
            .from("payment_records")
            .update({ status: "failed" })
            .eq("id", recordId);
        }
        throw e;
      } finally {
        setSending(false);
      }
    },
    [connected, publicKey, sendTransaction, connection]
  );

  return { sendUsdcPayment, sending, connected, walletAddress: publicKey?.toBase58() ?? null };
};

/** Ask the backend to independently verify a payment record against Solana. */
export const verifyPayment = async (recordId: string) => {
  const { data, error } = await supabase.functions.invoke("verify-payment", {
    body: { recordId },
  });
  if (error) throw error;
  return data as { verified: boolean; failedCheck?: string; status?: string };
};
