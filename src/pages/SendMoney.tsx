import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown, Wallet, User, MessageSquare, Image, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";

const envelopes = [
  { name: "Charity", amount: 400.00 },
  { name: "Moneybox", amount: 650.00 },
  { name: "Savings", amount: 320.00 },
];

const contacts = [
  { name: "Hanna Mango", account: "Account number" },
  { name: "Davis Levin", account: "Account number" },
];

type Step = "recipient" | "amount" | "success";

const SendMoney = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromEnvelope = searchParams.get("envelope");
  
  const [step, setStep] = useState<Step>("recipient");
  const [iban, setIban] = useState("");
  const [amount, setAmount] = useState("0.00");
  const [comment, setComment] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<{ name: string; iban: string } | null>(null);

  const handleSelectRecipient = (contact: typeof contacts[0]) => {
    setSelectedRecipient({ name: contact.name, iban: "IBAN 123123123123123" });
    setStep("amount");
  };

  const handleIbanSubmit = () => {
    if (iban.length > 5) {
      setSelectedRecipient({ name: "Bank Transfer", iban: `IBAN ${iban}` });
      setStep("amount");
    }
  };

  const handleSend = () => {
    setStep("success");
  };

  const handleKeyPress = (digit: string) => {
    if (digit === "delete") {
      setAmount(prev => {
        const newVal = prev.replace(".", "").slice(0, -1) || "0";
        const num = parseInt(newVal, 10);
        return (num / 100).toFixed(2);
      });
    } else {
      setAmount(prev => {
        const current = prev.replace(".", "");
        const newVal = current + digit;
        const num = parseInt(newVal, 10);
        return (num / 100).toFixed(2);
      });
    }
  };

  if (step === "success") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex flex-1 items-center justify-center">
          <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-card">
            <Image className="h-16 w-16 text-muted-foreground" />
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6 pb-12"
        >
          <h1 className="mb-3 text-3xl font-bold text-foreground">
            Money has been sent!
          </h1>
          <p className="mb-8 text-muted-foreground">
            Ac ut vitae a amet donec etiam lorem at neque. Risus morbi nec facilisis elementum congue.
          </p>
          <Button className="w-full" size="lg" onClick={() => navigate("/dashboard")}>
            Done
          </Button>
        </motion.div>
      </div>
    );
  }

  if (step === "amount") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="px-6 pt-12">
          <button onClick={() => setStep("recipient")} className="mb-8">
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>

          <Drawer>
            <DrawerTrigger asChild>
              <button className="mb-12 flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4">
                <div className="text-left">
                  <p className="font-semibold text-foreground">Bank Transfer</p>
                  <p className="text-sm text-muted-foreground">To: {selectedRecipient?.iban}</p>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              </button>
            </DrawerTrigger>
            <DrawerContent className="px-6 pb-8">
              <div className="mb-6 mt-4">
                <h2 className="text-xl font-bold text-foreground">Select recipient</h2>
              </div>
              {contacts.map((contact) => (
                <button
                  key={contact.name}
                  onClick={() => handleSelectRecipient(contact)}
                  className="flex w-full items-center gap-3 border-b border-border py-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">{contact.name}</p>
                    <p className="text-sm text-muted-foreground">{contact.account}</p>
                  </div>
                </button>
              ))}
            </DrawerContent>
          </Drawer>

          <div className="mb-8 text-center">
            <p className="text-4xl font-light text-muted-foreground">£ {amount}</p>
          </div>
        </div>

        <div className="mt-auto px-6">
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add comment..."
              className="border-0 bg-transparent p-0 focus-visible:ring-0"
            />
          </div>

          <Button className="mb-6 w-full" size="lg" onClick={handleSend}>
            Send
          </Button>

          <div className="grid grid-cols-3 gap-2 pb-8">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "delete"].map((key, i) => (
              <button
                key={i}
                onClick={() => key && handleKeyPress(key)}
                className={`flex h-14 items-center justify-center rounded-xl text-xl font-medium ${
                  key === "" ? "" : "bg-card text-foreground active:bg-muted"
                }`}
              >
                {key === "delete" ? "⌫" : key}
                {["2", "3", "4", "5", "6", "7", "8", "9"].includes(key) && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    {key === "2" ? "ABC" : key === "3" ? "DEF" : key === "4" ? "GHI" :
                     key === "5" ? "JKL" : key === "6" ? "MNO" : key === "7" ? "PQRS" :
                     key === "8" ? "TUV" : "WXYZ"}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-card">
      <div className="px-6 pt-12">
        <button onClick={() => navigate(-1)} className="mb-8">
          <ArrowLeft className="h-6 w-6 text-foreground" />
        </button>

        <h1 className="mb-6 text-2xl font-bold text-foreground">Send money</h1>

        <Input
          value={iban}
          onChange={(e) => setIban(e.target.value)}
          placeholder="Enter Recipient IBAN"
          className="mb-8"
          onKeyDown={(e) => e.key === "Enter" && handleIbanSubmit()}
        />

        <h2 className="mb-4 text-sm font-semibold text-foreground">Your Envelopes</h2>
        <div className="mb-8 flex gap-3 overflow-x-auto pb-2">
          {envelopes.map((envelope) => (
            <button
              key={envelope.name}
              className="flex min-w-[140px] items-center gap-3 rounded-2xl border border-border bg-background p-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <Wallet className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">{envelope.name}</p>
                <p className="text-sm text-muted-foreground">£ {envelope.amount.toFixed(2)}</p>
              </div>
            </button>
          ))}
        </div>

        <h2 className="mb-4 text-sm font-semibold text-foreground">Contact book</h2>
        <div className="space-y-0">
          {contacts.map((contact) => (
            <button
              key={contact.name}
              onClick={() => handleSelectRecipient(contact)}
              className="flex w-full items-center gap-3 border-b border-border py-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">{contact.name}</p>
                <p className="text-sm text-muted-foreground">{contact.account}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SendMoney;
