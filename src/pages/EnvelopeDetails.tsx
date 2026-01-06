import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, ChevronDown, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";

const accounts = [
  { name: "Medi8 Account", available: 1546.00 },
  { name: "Moneybox", available: 400.00 },
];

type View = "settings" | "topup" | "withdraw" | "success";

const EnvelopeDetails = () => {
  const navigate = useNavigate();
  const { name } = useParams();
  const envelopeName = name || "Charity";
  
  const [view, setView] = useState<View>("settings");
  const [amount, setAmount] = useState("0.00");
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]);
  const [successType, setSuccessType] = useState<"topup" | "withdraw">("topup");

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

  const handleAction = (type: "topup" | "withdraw") => {
    setSuccessType(type);
    setView("success");
  };

  if (view === "success") {
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
            {successType === "topup" ? "Successful top-up!" : "Withdrawal complete!"}
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

  if (view === "topup" || view === "withdraw") {
    const isTopup = view === "topup";
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="px-6 pt-12">
          <button onClick={() => setView("settings")} className="mb-8">
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>

          <p className="text-sm text-muted-foreground">{envelopeName}</p>
          <h1 className="mb-8 text-3xl font-bold text-foreground">
            {isTopup ? "Top-up" : "Withdraw"}
          </h1>

          <Drawer>
            <DrawerTrigger asChild>
              <button className="mb-8 flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4">
                <div className="text-left">
                  <p className="font-semibold text-foreground">
                    {isTopup ? "From" : "To"} {selectedAccount.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isTopup ? "Available" : ""} £ {selectedAccount.available.toFixed(2)}
                  </p>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              </button>
            </DrawerTrigger>
            <DrawerContent className="px-6 pb-8">
              <div className="mb-6 mt-4">
                <h2 className="text-xl font-bold text-foreground">
                  {isTopup ? "Top-up from" : "Withdraw to"}
                </h2>
              </div>
              {accounts.map((account) => (
                <button
                  key={account.name}
                  onClick={() => setSelectedAccount(account)}
                  className="flex w-full items-center justify-between border-b border-border py-4"
                >
                  <div className="text-left">
                    <p className="font-medium text-foreground">{account.name}</p>
                    <p className="text-sm text-muted-foreground">Available £ {account.available.toFixed(2)}</p>
                  </div>
                  {selectedAccount.name === account.name && (
                    <span className="text-foreground">✓</span>
                  )}
                </button>
              ))}
            </DrawerContent>
          </Drawer>

          {view === "withdraw" && (
            <p className="mb-2 text-center text-sm text-muted-foreground">Available £ 50.00</p>
          )}
          <div className="mb-8 text-center">
            <p className="text-4xl font-light text-muted-foreground">£ {amount}</p>
          </div>
        </div>

        <div className="mt-auto px-6">
          <Button 
            className="mb-6 w-full" 
            size="lg" 
            onClick={() => handleAction(isTopup ? "topup" : "withdraw")}
          >
            {isTopup ? "Top-up" : "Withdraw"}
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
    <div className="flex min-h-screen flex-col bg-background">
      <div className="px-6 pt-12">
        <button onClick={() => navigate("/dashboard")} className="mb-8">
          <ArrowLeft className="h-6 w-6 text-foreground" />
        </button>

        <p className="text-sm text-muted-foreground">{envelopeName}</p>
        <h1 className="mb-8 text-3xl font-bold text-foreground">Envelope settings</h1>

        <div className="mb-8 rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-4">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium text-foreground">{envelopeName}</span>
          </div>
          <div className="flex items-center justify-between p-4">
            <span className="text-muted-foreground">Style</span>
            <span className="font-medium text-foreground">Chosen style</span>
          </div>
        </div>

        <h2 className="mb-4 text-lg font-semibold text-foreground">Reoccurring payments</h2>
        
        <div className="space-y-4">
          <button 
            onClick={() => navigate("/recurring-payment?type=receiving")}
            className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <ArrowDownLeft className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">
                Receiving from <span className="font-semibold">my Medi8 account</span>
              </p>
              <p className="text-sm text-muted-foreground">£ 50.00 Monthly on 1</p>
            </div>
          </button>

          <button 
            onClick={() => navigate("/recurring-payment?type=sending")}
            className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">
                Sending to <span className="font-semibold">[Account Name]</span>
              </p>
              <p className="text-sm text-muted-foreground">£ 50.00 Weekly on Monday</p>
            </div>
          </button>
        </div>
      </div>

      <div className="mt-auto space-y-3 px-6 pb-12">
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1" 
            size="lg"
            onClick={() => setView("topup")}
          >
            Top-up
          </Button>
          <Button 
            variant="outline" 
            className="flex-1" 
            size="lg"
            onClick={() => setView("withdraw")}
          >
            Withdraw
          </Button>
        </div>
        <Button variant="outline" className="w-full" size="lg">
          Delete Envelope
        </Button>
      </div>
    </div>
  );
};

export default EnvelopeDetails;
