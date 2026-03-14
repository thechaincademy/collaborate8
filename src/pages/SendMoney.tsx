import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Construction, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const SendMoney = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="px-6 pt-12">
        <button onClick={() => navigate(-1)} className="mb-8">
          <ArrowLeft className="h-6 w-6 text-foreground" />
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-1 flex-col items-center justify-center px-6 text-center"
      >
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <Construction className="h-10 w-10 text-muted-foreground" />
        </div>
        <div className="mb-2 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-2xl font-bold text-foreground">Open Banking Payments</h2>
        </div>
        <span className="mb-4 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Coming Soon
        </span>
        <p className="max-w-xs text-muted-foreground">
          Send payments directly from your bank account via Open Banking. This feature is currently under development.
        </p>
        <Button onClick={() => navigate(-1)} variant="outline" className="mt-8">
          Go Back
        </Button>
      </motion.div>
    </div>
  );
};

export default SendMoney;
