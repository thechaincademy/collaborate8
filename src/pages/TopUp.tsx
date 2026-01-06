import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";

const sources = [
  { name: "Bank Account", available: 5000.00 },
  { name: "Credit Card", available: 2500.00 },
  { name: "Apple Pay", available: null },
];

type View = "amount" | "success";

const TopUp = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<View>("amount");
  const [amount, setAmount] = useState("0.00");
  const [selectedSource, setSelectedSource] = useState(sources[0]);

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

  const handleTopUp = () => {
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
            Successful top-up!
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="px-6 pt-12">
        <button onClick={() => navigate(-1)} className="mb-8">
          <ArrowLeft className="h-6 w-6 text-foreground" />
        </button>

        <p className="text-sm text-muted-foreground">Medi8 Balance</p>
        <h1 className="mb-8 text-3xl font-bold text-foreground">Top-up</h1>

        <Drawer>
          <DrawerTrigger asChild>
            <button className="mb-12 flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4">
              <div className="text-left">
                <p className="font-semibold text-foreground">From {selectedSource.name}</p>
                {selectedSource.available && (
                  <p className="text-sm text-muted-foreground">
                    Available £ {selectedSource.available.toFixed(2)}
                  </p>
                )}
              </div>
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            </button>
          </DrawerTrigger>
          <DrawerContent className="px-6 pb-8">
            <div className="mb-6 mt-4">
              <h2 className="text-xl font-bold text-foreground">Top-up from</h2>
            </div>
            {sources.map((source) => (
              <button
                key={source.name}
                onClick={() => setSelectedSource(source)}
                className="flex w-full items-center justify-between border-b border-border py-4"
              >
                <div className="text-left">
                  <p className="font-medium text-foreground">{source.name}</p>
                  {source.available && (
                    <p className="text-sm text-muted-foreground">
                      Available £ {source.available.toFixed(2)}
                    </p>
                  )}
                </div>
                {selectedSource.name === source.name && (
                  <span className="text-foreground">✓</span>
                )}
              </button>
            ))}
          </DrawerContent>
        </Drawer>

        <div className="mb-8 text-center">
          <p className="text-4xl font-light text-muted-foreground">£ {amount}</p>
        </div>
      </div>

      <div className="mt-auto px-6">
        <Button className="mb-6 w-full" size="lg" onClick={handleTopUp}>
          Top-up
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
};

export default TopUp;
