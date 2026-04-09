import { useState, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";

interface CalcResult {
  rateName: string;
  rateClass: string;
  weekly: number;
  monthly: number;
  annual: number;
  weeklyGross: number;
  adjIncome: number;
  rateDesc: string;
  beforeReduction: number;
  deductionRate: number;
  reductionPct: number;
  extraReduction: number;
  otherKids: number;
  nightsVal: number;
}

const ChildMaintenanceCalculator = () => {
  const navigate = useNavigate();
  const [income, setIncome] = useState("");
  const [benefits, setBenefits] = useState("no");
  const [otherKids, setOtherKids] = useState("0");
  const [kids, setKids] = useState("1");
  const [nights, setNights] = useState("0");

  const calculate = useCallback((): CalcResult | null => {
    const annualIncome = parseFloat(income) || 0;
    const isBenefits = benefits === "yes";
    const otherKidsNum = parseInt(otherKids);
    const kidsNum = parseInt(kids);
    const nightsVal = parseInt(nights);

    const weeklyGross = annualIncome / 52;
    const otherKidsRates = [0, 0.11, 0.14, 0.16];
    const deductionRate = otherKidsRates[Math.min(otherKidsNum, 3)];
    const adjIncome = weeklyGross * (1 - deductionRate);

    let rateName: string, rateClass: string, weeklyAmount: number, rateDesc: string;

    if (isBenefits) {
      rateName = "Flat rate"; rateClass = "flat"; weeklyAmount = 7; rateDesc = "£7 flat (benefits)";
    } else if (weeklyGross < 7) {
      rateName = "Nil rate"; rateClass = "nil"; weeklyAmount = 0; rateDesc = "Income below £7/wk";
    } else if (weeklyGross < 100) {
      rateName = "Flat rate"; rateClass = "flat"; weeklyAmount = 7; rateDesc = "£7 flat";
    } else if (weeklyGross < 200) {
      rateName = "Reduced rate"; rateClass = "reduced";
      const reducedRates = [0, 0.17, 0.25, 0.31];
      const r = reducedRates[Math.min(kidsNum, 3)];
      weeklyAmount = 7 + r * (adjIncome - 100);
      rateDesc = "Reduced rate formula";
    } else {
      rateName = "Basic rate"; rateClass = "basic";
      const tier1Rates = [[0, 0.12, 0.16, 0.19], [0, 0.09, 0.12, 0.15]];
      const k = Math.min(kidsNum, 3);
      let amount = 0;
      if (adjIncome <= 800) { amount = adjIncome * tier1Rates[0][k]; }
      else if (adjIncome <= 3000) { amount = 800 * tier1Rates[0][k] + (adjIncome - 800) * tier1Rates[1][k]; }
      else { amount = 800 * tier1Rates[0][k] + 2200 * tier1Rates[1][k]; }
      weeklyAmount = amount;
      rateDesc = "Basic rate formula";
    }

    const beforeReduction = weeklyAmount;
    let reductionPct = 0, extraReduction = 0;
    if (nightsVal >= 175) { reductionPct = 0.5; extraReduction = 7; }
    else if (nightsVal >= 156) { reductionPct = 0.4286; }
    else if (nightsVal >= 104) { reductionPct = 0.2857; }
    else if (nightsVal >= 52) { reductionPct = 0.1429; }

    let finalAmount = weeklyAmount * (1 - reductionPct) - extraReduction;
    if (finalAmount < 7 && weeklyAmount > 0 && nightsVal > 0 && !isBenefits) finalAmount = 7;
    if (nightsVal >= 175 && isBenefits) finalAmount = 0;
    finalAmount = Math.max(0, finalAmount);

    return {
      rateName, rateClass, weekly: finalAmount,
      monthly: finalAmount * 52 / 12, annual: finalAmount * 52,
      weeklyGross, adjIncome, rateDesc, beforeReduction,
      deductionRate, reductionPct, extraReduction,
      otherKids: otherKidsNum, nightsVal,
    };
  }, [income, benefits, otherKids, kids, nights]);

  const result = calculate();
  const fmt = (n: number) => `£${n.toFixed(2)}`;
  const fmtW = (n: number) => `£${n.toFixed(2)}/wk`;

  const rateBadgeColors: Record<string, string> = {
    nil: "bg-muted text-muted-foreground",
    flat: "bg-blue-100 text-blue-800",
    reduced: "bg-amber-100 text-amber-800",
    basic: "bg-green-100 text-green-800",
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Child Maintenance Calculator UK",
    "description": "Free child maintenance calculator based on the official CMS formula. Calculate how much child maintenance you should pay or receive in the UK.",
    "url": "https://collabor8.lovable.app/child-maintenance-calculator",
    "applicationCategory": "FinanceApplication",
    "operatingSystem": "Web",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "GBP" },
    "provider": {
      "@type": "Organization",
      "name": "Collabor8",
      "url": "https://collabor8.lovable.app"
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Child Maintenance Calculator UK 2025 — Free CMS Calculator | Collabor8</title>
        <meta name="description" content="Free child maintenance calculator based on the official UK CMS formula. Calculate weekly, monthly & annual child maintenance payments. Used by thousands of separated parents." />
        <meta name="keywords" content="child maintenance calculator, child maintenance service, CMS calculator, child maintenance UK, how much child maintenance, child maintenance login, separated parents, co-parenting finances" />
        <link rel="canonical" href="https://collabor8.lovable.app/child-maintenance-calculator" />
        <meta property="og:title" content="Child Maintenance Calculator UK 2025 — Free CMS Calculator" />
        <meta property="og:description" content="Calculate your child maintenance using the official CMS formula. Free, instant results." />
        <meta property="og:url" content="https://collabor8.lovable.app/child-maintenance-calculator" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="mx-auto max-w-3xl px-6 py-12">
        <button
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="mb-2 text-3xl font-bold text-foreground">Child Maintenance Calculator</h1>
          <p className="mb-8 text-sm text-muted-foreground">
            Based on the official Child Maintenance Service (CMS) formula — Great Britain
          </p>
        </motion.div>

        <div className="space-y-6">
          {/* Paying Parent */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl bg-card p-5">
            <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Paying parent</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Gross annual income</label>
                <p className="mb-1.5 text-xs text-muted-foreground">Before tax, after pension contributions</p>
                <input
                  type="number"
                  placeholder="e.g. 35000"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Income type</label>
                <p className="mb-1.5 text-xs text-muted-foreground">&nbsp;</p>
                <select value={benefits} onChange={(e) => setBenefits(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                  <option value="no">Employment / self-employment</option>
                  <option value="yes">Receiving qualifying benefits</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Other children in household</label>
                <p className="mb-1.5 text-xs text-muted-foreground">Children the paying parent supports at home</p>
                <select value={otherKids} onChange={(e) => setOtherKids(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                  <option value="0">None</option>
                  <option value="1">1 child</option>
                  <option value="2">2 children</option>
                  <option value="3">3+ children</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Qualifying children</label>
                <p className="mb-1.5 text-xs text-muted-foreground">Children this maintenance covers</p>
                <select value={kids} onChange={(e) => setKids(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                  <option value="1">1 child</option>
                  <option value="2">2 children</option>
                  <option value="3">3+ children</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* Shared Care */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl bg-card p-5">
            <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Shared care (overnight stays)</p>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Agreed overnight stays per year</label>
              <select value={nights} onChange={(e) => setNights(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                <option value="0">Fewer than 52 nights — no reduction</option>
                <option value="52">52–103 nights — 14.29% reduction</option>
                <option value="104">104–155 nights — 28.57% reduction</option>
                <option value="156">156–174 nights — 42.86% reduction</option>
                <option value="175">175+ nights — 50% reduction + £7/week</option>
              </select>
            </div>
          </motion.div>

          {/* Result */}
          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-2xl bg-card p-5">
              <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Result</p>
              <span className={`mb-4 inline-block rounded-full px-3 py-1 text-xs font-medium ${rateBadgeColors[result.rateClass] || "bg-muted text-muted-foreground"}`}>
                {result.rateName}
              </span>

              <div className="mb-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-background p-4 text-center">
                  <p className="text-xs text-muted-foreground">Weekly</p>
                  <p className="text-xl font-semibold text-primary">{fmt(result.weekly)}</p>
                </div>
                <div className="rounded-xl bg-background p-4 text-center">
                  <p className="text-xs text-muted-foreground">Monthly (avg)</p>
                  <p className="text-lg font-medium text-foreground">{fmt(result.monthly)}</p>
                </div>
                <div className="rounded-xl bg-background p-4 text-center">
                  <p className="text-xs text-muted-foreground">Annual</p>
                  <p className="text-lg font-medium text-foreground">{fmt(result.annual)}</p>
                </div>
              </div>

              <div className="space-y-1.5 border-t border-border pt-4 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Gross weekly income</span><span className="font-medium text-foreground">{fmtW(result.weeklyGross)}</span></div>
                {result.otherKids > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Adjusted for other children</span><span className="font-medium text-foreground">{fmtW(result.adjIncome)} (−{Math.round(result.deductionRate * 100)}%)</span></div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">Rate applied</span><span className="font-medium text-foreground">{result.rateDesc}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Before shared care reduction</span><span className="font-medium text-foreground">{fmtW(result.beforeReduction)}</span></div>
                {result.nightsVal > 0 && result.reductionPct > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Shared care reduction</span><span className="font-medium text-foreground">−{Math.round(result.reductionPct * 100)}%{result.extraReduction > 0 ? " and −£7/wk" : ""}</span></div>
                )}
                <div className="flex justify-between border-t border-border pt-2 mt-2">
                  <span className="font-medium text-foreground">Weekly child maintenance</span>
                  <span className="font-semibold text-primary">{fmtW(result.weekly)}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* CTA */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-2xl bg-card p-5 text-center">
            <h2 className="mb-2 text-lg font-semibold text-foreground">Manage your child maintenance with Collabor8</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Set up automated payments, track expenses, earn rewards — all based on this calculation.
            </p>
            <Link to="/" className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background hover:opacity-90 transition-opacity">
              Join the Waitlist
            </Link>
          </motion.div>

          {/* SEO Content */}
          <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">How is child maintenance calculated in the UK?</h2>
              <p>
                The Child Maintenance Service (CMS) uses a formula based on the paying parent's gross weekly income, the number of qualifying children, shared overnight stays, and whether the parent supports other children. Our calculator uses the exact same CMS formula to give you an accurate estimate. For a definitive figure, visit{" "}
                <a href="https://www.gov.uk/calculate-child-maintenance" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">gov.uk/calculate-child-maintenance</a> or contact the Child Maintenance Service directly.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Understanding the CMS rates</h2>
              <ul className="ml-5 list-disc space-y-1">
                <li><strong className="text-foreground">Nil rate</strong> — Income below £7 per week. No maintenance payable.</li>
                <li><strong className="text-foreground">Flat rate</strong> — Income between £7 and £100/week, or on qualifying benefits. Fixed at £7/week.</li>
                <li><strong className="text-foreground">Reduced rate</strong> — Income between £100 and £200/week. A graduated formula applies.</li>
                <li><strong className="text-foreground">Basic rate</strong> — Income above £200/week. 12% for 1 child, 16% for 2, 19% for 3+.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Related resources</h2>
              <ul className="ml-5 list-disc space-y-1">
                <li><Link to="/resources/child-maintenance-guide" className="underline hover:text-foreground">Child Maintenance Made Simple — Full Guide</Link></li>
                <li><Link to="/resources/financial-coparenting-tips" className="underline hover:text-foreground">Financial Co-parenting Tips</Link></li>
              </ul>
            </section>
          </div>

          <p className="text-xs text-muted-foreground border-t border-border pt-4">
            This calculator follows the official CMS formula. Results are indicative only. The CMS may also consider pension income, rental income, and other factors. For a definitive figure, use{" "}
            <a href="https://www.gov.uk/calculate-child-maintenance" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">gov.uk/calculate-child-maintenance</a> or contact the Child Maintenance Service.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChildMaintenanceCalculator;
