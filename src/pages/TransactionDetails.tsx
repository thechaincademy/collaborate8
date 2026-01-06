import { ArrowLeft, ArrowDownLeft, Wallet } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

const TransactionDetails = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") || "receiving";
  const isReceiving = type === "receiving";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="px-6 pt-12">
        <button onClick={() => navigate(-1)} className="mb-12">
          <ArrowLeft className="h-6 w-6 text-foreground" />
        </button>

        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="mb-1 text-sm text-muted-foreground">
              {isReceiving ? "Top-up from your" : "Sent to"} <span className="font-semibold text-foreground">Medi8 Account</span>
            </p>
            <h1 className={`text-4xl font-bold ${isReceiving ? "text-foreground" : "text-foreground"}`}>
              {isReceiving ? "+ £ 400.00" : "- £ 300.00"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">5 August, 2022, 6:16 PM</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border">
            <ArrowDownLeft className={`h-5 w-5 text-muted-foreground ${!isReceiving && "rotate-180"}`} />
          </div>
        </div>

        <div className="mb-8 flex items-center justify-between rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <Wallet className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="font-medium text-foreground">Envelope Balance</span>
          </div>
          <span className="font-semibold text-foreground">£ 400.00</span>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold text-foreground">Details</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium text-foreground">5 August</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment from</p>
              <p className="font-medium text-foreground">[Sender Name]</p>
            </div>
          </div>

          <div>
            <p className="mb-1 text-sm text-muted-foreground">Payment description</p>
            <p className="text-foreground">Sed aliquam at augue faucibus habitasse.</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Transaction ID</p>
            <p className="font-medium text-foreground">123456789</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetails;
