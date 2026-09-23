import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfileTool from "./tools/get-my-profile";
import listArrangementsTool from "./tools/list-arrangements";
import listPaymentsTool from "./tools/list-payments";
import listExpensesTool from "./tools/list-expenses";
import createExpenseTool from "./tools/create-expense";
import listManualPaymentsTool from "./tools/list-manual-payments";
import recordManualPaymentTool from "./tools/record-manual-payment";
import listChatMessagesTool from "./tools/list-chat-messages";
import sendChatMessageTool from "./tools/send-chat-message";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "medi8-your-connection-hub",
  title: "Medi8: Your Connection Hub",
  version: "0.1.0",
  instructions:
    "Tools for Collabor8, a co-parenting finance app. Acts as the signed-in parent: read their profile and co-parent link status, read child maintenance arrangements and payment history, list and raise shared expenses, record payments sent from their own bank, and read or send messages in the financial chat. All amounts are in GBP.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getMyProfileTool,
    listArrangementsTool,
    listPaymentsTool,
    listExpensesTool,
    createExpenseTool,
    listManualPaymentsTool,
    recordManualPaymentTool,
    listChatMessagesTool,
    sendChatMessageTool,
  ],
});
