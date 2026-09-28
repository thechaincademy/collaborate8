import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Slider } from "@/components/ui/slider";
import { useProfile } from "@/hooks/useProfile";

const MEDIATION = 140;
const HOURLY = 13.5;
const WEEKS_PER_MONTH = 52 / 12;
const COLLABOR8_MONTHLY = 7.99;

const CostOfConflict = () => {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const isReceiver = profile?.role === "viewing";
  const weeklyFee = isReceiver ? 3.25 : 2.6;

  const [sessions, setSessions] = useState(3);
  const [months, setMonths] = useState(6);
  const [hours, setHours] = useState(10);

  const total = sessions * MEDIATION + months * WEEKS_PER_MONTH * weeklyFee + hours * HOURLY;
  const collab = Math.max(months, 1) * COLLABOR8_MONTHLY;
  const pct = total > 0 ? Math.max(0, Math.round(((total - collab) / total) * 100)) : 0;
  const fmt = (n: number) => `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const rows = [
    { label: "Mediation sessions", value: sessions, set: setSessions, max: 10, suffix: "" },
    { label: "Months using CMS Collect and Pay", value: months, set: setMonths, max: 24, suffix: "" },
    { label: "Hours spent managing disputes without a dedicated tool", value: hours, set: setHours, max: 50, suffix: "" },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background px-6 pb-24 pt-12 md:max-w-2xl">
      <Helmet>
        <title>Cost of conflict - Collabor8</title>
        <meta name="description" content="Estimate what disputes over child maintenance could cost you." />
      </Helmet>
      <button onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="text-2xl font-bold text-foreground">Cost of conflict</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">Move the sliders to see what disputes could cost.</p>

      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Estimated cost</p>
        <p className="my-2 text-5xl font-bold text-primary md:text-6xl">{fmt(total)}</p>
        <p className="text-sm font-medium text-foreground">Managing this privately through Collabor8 costs {pct}% less.</p>
      </div>

      <div className="mt-6 space-y-6 rounded-2xl border border-border bg-card p-6">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="mb-3 flex items-center justify-between gap-3 text-sm">
              <span className="text-foreground">{r.label}</span>
              <span className="font-semibold text-foreground">{r.value}</span>
            </div>
            <Slider value={[r.value]} min={0} max={r.max} step={1} onValueChange={([v]) => r.set(v)} aria-label={r.label} />
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Figures are estimates based on published average costs. Individual costs may vary.
      </p>
    </div>
  );
};

export default CostOfConflict;
