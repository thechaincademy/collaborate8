import { useState, useCallback, useMemo } from "react";
import { ArrowLeft, Download, Info } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import TopBanner from "@/components/TopBanner";

const nightOptions = [
  { value: 0, label: "Fewer than 52 nights" },
  { value: 52, label: "52-103 nights" },
  { value: 104, label: "104-155 nights" },
  { value: 156, label: "156-174 nights" },
  { value: 175, label: "175 or more nights" },
];

function ordinal(n: number) {
  const s = ["st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v - 1] || "th");
}

function getNightsPct(nights: number) {
  if (nights >= 175) return { pct: 0.5, extra: 7 };
  if (nights >= 156) return { pct: 0.4286, extra: 0 };
  if (nights >= 104) return { pct: 0.2857, extra: 0 };
  if (nights >= 52) return { pct: 0.1429, extra: 0 };
  return { pct: 0, extra: 0 };
}

const fmt = (n: number) => "£" + n.toFixed(2);
const fmtW = (n: number) => "£" + n.toFixed(2) + "/wk";

const ChildMaintenanceCalculator = () => {
  const navigate = useNavigate();
  const [income, setIncome] = useState("");
  const [incomePeriod, setIncomePeriod] = useState("annual");
  const [benefits, setBenefits] = useState("no");
  const [otherKids, setOtherKids] = useState("0");
  const [kids, setKids] = useState("1");
  const [childNights, setChildNights] = useState<number[]>([0]);

  const kidsNum = parseInt(kids);

  // Sync childNights array length with kids count
  const handleKidsChange = (val: string) => {
    setKids(val);
    const newCount = parseInt(val);
    setChildNights((prev) => {
      if (newCount > prev.length) return [...prev, ...Array(newCount - prev.length).fill(0)];
      return prev.slice(0, newCount);
    });
  };

  const setNightsForChild = (index: number, value: number) => {
    setChildNights((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const incomeLabels: Record<string, { label: string; placeholder: string }> = {
    annual: { label: "Gross annual income", placeholder: "e.g. 35000" },
    monthly: { label: "Gross monthly income", placeholder: "e.g. 2916" },
    weekly: { label: "Gross weekly income", placeholder: "e.g. 673" },
  };

  const result = useMemo(() => {
    const incomeVal = parseFloat(income) || 0;
    const annualIncome = incomePeriod === "weekly" ? incomeVal * 52 : incomePeriod === "monthly" ? incomeVal * 12 : incomeVal;
    const isBenefits = benefits === "yes";
    const otherKidsNum = parseInt(otherKids);
    const weeklyGross = annualIncome / 52;
    const otherKidsRates = [0, 0.11, 0.14, 0.16, 0.16, 0.16];
    const deductionRate = otherKidsRates[Math.min(otherKidsNum, 5)];
    const adjIncome = weeklyGross * (1 - deductionRate);

    let rateName: string, baseWeekly: number, rateDesc: string;
    if (isBenefits) {
      rateName = "Flat rate"; baseWeekly = 7 * kidsNum; rateDesc = "£7 flat (benefits)";
    } else if (weeklyGross < 7) {
      rateName = "Nil rate"; baseWeekly = 0; rateDesc = "Income below £7/wk";
    } else if (weeklyGross < 100) {
      rateName = "Flat rate"; baseWeekly = 7; rateDesc = "£7 flat";
    } else if (weeklyGross < 200) {
      rateName = "Reduced rate";
      const reducedRates = [0, 0.17, 0.25, 0.31, 0.31, 0.31];
      const r = reducedRates[Math.min(kidsNum, 5)];
      baseWeekly = 7 + r * (adjIncome - 100);
      rateDesc = "Reduced rate formula";
    } else {
      rateName = "Basic rate";
      const tier1Rates = [[0, 0.12, 0.16, 0.19, 0.19, 0.19], [0, 0.09, 0.12, 0.15, 0.15, 0.15]];
      const k = Math.min(kidsNum, 5);
      let amount = 0;
      if (adjIncome <= 800) amount = adjIncome * tier1Rates[0][k];
      else if (adjIncome <= 3000) amount = 800 * tier1Rates[0][k] + (adjIncome - 800) * tier1Rates[1][k];
      else amount = 800 * tier1Rates[0][k] + 2200 * tier1Rates[1][k];
      baseWeekly = amount;
      rateDesc = "Basic rate formula";
    }

    const perChildBase = baseWeekly / kidsNum;
    let totalFinal = 0;
    const childResults: Array<{ nights: number; pct: number; extra: number; base: number; final: number }> = [];

    for (let i = 0; i < kidsNum; i++) {
      const nights = childNights[i] || 0;
      const { pct, extra } = getNightsPct(nights);
      let childAmount = perChildBase * (1 - pct) - extra;
      if (childAmount < 0) childAmount = 0;
      childResults.push({ nights, pct, extra, base: perChildBase, final: childAmount });
      totalFinal += childAmount;
    }
    totalFinal = Math.max(0, totalFinal);

    return {
      incomeVal, incomePeriod, annualIncome, isBenefits, otherKidsNum, weeklyGross, adjIncome,
      deductionRate, rateName, rateDesc, baseWeekly, perChildBase, childResults, totalFinal,
    };
  }, [income, incomePeriod, benefits, otherKids, kidsNum, childNights]);

  const downloadSummary = () => {
    const d = result;
    const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    let childRows = "";
    d.childResults.forEach((c, i) => {
      const nightOpt = nightOptions.find((o) => o.value === c.nights) || nightOptions[0];
      let adjText = "No adjustment";
      if (c.pct > 0) adjText = "−" + Math.round(c.pct * 100) + "%" + (c.extra > 0 ? " and −£7/wk" : "");
      childRows += `<tr><td>${ordinal(i + 1)} child</td><td>${nightOpt.label}</td><td>${adjText}</td><td><strong>${fmt(c.final)}/wk</strong></td></tr>`;
    });

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Child Maintenance Estimate - Collabor8</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:40px auto;padding:0 20px;color:#1A1A18;font-size:14px}
.header{border-bottom:2px solid #1A1A18;padding-bottom:16px;margin-bottom:24px}
h1{font-size:20px;font-weight:700;margin-bottom:4px}.date{font-size:12px;color:#AEADA5}
.result-box{background:#1A1A18;border-radius:12px;padding:20px;margin:20px 0;color:#fff}
.result-box .amount{font-size:40px;font-weight:700;margin-bottom:12px}
table{width:100%;border-collapse:collapse;font-size:13px}td,th{padding:8px 10px;text-align:left;border-bottom:1px solid #F0E4D6}
th{background:#FAF1E6;font-weight:600;font-size:12px;color:#6B6B64;text-transform:uppercase}
.footer{margin-top:32px;padding-top:16px;border-top:1px solid #E4E2DA;font-size:11px;color:#AEADA5;line-height:1.6}
</style></head><body>
<div class="header"><h1>Child maintenance estimate</h1><div class="date">Generated on ${date}</div></div>
<div class="result-box"><div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;opacity:0.65;margin-bottom:6px">Weekly estimate</div>
<div class="amount">${fmt(d.totalFinal)}</div></div>
<h2 style="font-size:12px;font-weight:700;color:#AEADA5;text-transform:uppercase;margin-bottom:10px">Income details</h2>
<table><tr><td>Gross annual income</td><td style="text-align:right">${fmt(d.annualIncome)}</td></tr>
<tr><td>Gross weekly income</td><td style="text-align:right">${fmt(d.weeklyGross)}</td></tr>
${d.otherKidsNum > 0 ? `<tr><td>Adjusted weekly income</td><td style="text-align:right">${fmt(d.adjIncome)} (−${Math.round(d.deductionRate * 100)}%)</td></tr>` : ""}
<tr><td>Rate applied</td><td style="text-align:right">${d.rateName}</td></tr>
<tr><td>Base weekly amount</td><td style="text-align:right">${fmt(d.baseWeekly)}</td></tr></table>
<h2 style="font-size:12px;font-weight:700;color:#AEADA5;text-transform:uppercase;margin:20px 0 10px">Shared care breakdown</h2>
<table><tr><th>Child</th><th>Overnight stays</th><th>Adjustment</th><th style="text-align:right">Weekly amount</th></tr>${childRows}</table>
<div class="footer"><strong>Please note:</strong> This is a general estimate based on the standard CMS formula. This document is not financial or legal advice.<br><br>Generated by Collabor8 - collaborate8.com</div>
</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "collabor8-child-maintenance-estimate.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectClass = "w-full rounded-[10px] border-[1.5px] border-[#E4E2DA] bg-white px-3 py-2.5 pr-8 text-sm text-[#1A1A18] transition-colors focus:border-[#1A1A18] focus:outline-none focus:ring-[3px] focus:ring-[#1A1A18]/10";
  const inputClass = "w-full rounded-[10px] border-[1.5px] border-[#E4E2DA] bg-white px-3 py-2.5 text-sm text-[#1A1A18] placeholder:text-[#E4E2DA] transition-colors focus:border-[#1A1A18] focus:outline-none focus:ring-[3px] focus:ring-[#1A1A18]/10";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Child Maintenance Calculator UK",
    description: "Free child maintenance calculator based on the official CMS formula.",
    url: "https://collabor8.lovable.app/child-maintenance-calculator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
    provider: { "@type": "Organization", name: "Collabor8", url: "https://collabor8.lovable.app" },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F2DFCF] via-[#F7E9D8] to-[#FBF1E4]" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <TopBanner />
      <div className="px-4 py-10 bg-white">
      <Helmet>
        <title>Child Maintenance Calculator UK 2025 - Free CMS Calculator | Collabor8</title>
        <meta name="description" content="Free child maintenance calculator based on the official UK CMS formula. Calculate weekly, monthly & annual child maintenance payments." />
        <meta name="keywords" content="child maintenance calculator, child maintenance service, CMS calculator, child maintenance UK, how much child maintenance, child maintenance login" />
        <link rel="canonical" href="https://collabor8.lovable.app/child-maintenance-calculator" />
        <meta property="og:title" content="Child Maintenance Calculator UK 2025 - Free CMS Calculator" />
        <meta property="og:description" content="Calculate your child maintenance using the official CMS formula. Free, instant results." />
        <meta property="og:url" content="https://collabor8.lovable.app/child-maintenance-calculator" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="mx-auto max-w-[640px]">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-1.5 text-[26px] font-semibold tracking-tight text-[#1A1A18]">Child maintenance calculator</h1>
          <p className="text-sm leading-relaxed text-[#6B6B64]">An estimate based on Child Maintenance Service (CMS) calculations. Enter your details below to see an indicative figure.</p>
        </div>

        {/* Paying parent card */}
        <div className="mb-4 rounded-2xl border border-[#E4E2DA] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="mb-5 flex items-center gap-2.5">
            <div className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-[#F0E4D6]">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="2.5" stroke="#1A1A18" strokeWidth="1.5" /><path d="M2.5 14c0-2.761 2.462-4.5 5.5-4.5s5.5 1.739 5.5 4.5" stroke="#1A1A18" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </div>
            <span className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#3D3D38]">Parent making payments</span>
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#3D3D38]">{incomeLabels[incomePeriod].label}</label>
              <p className="mb-1.5 text-xs leading-snug text-[#AEADA5]">Before tax and National Insurance, after pension contributions</p>
              <input type="number" placeholder={incomeLabels[incomePeriod].placeholder} value={income} onChange={(e) => setIncome(e.target.value)} className={inputClass} min="0" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#3D3D38]">Income period</label>
              <p className="mb-1.5 text-xs leading-snug text-[#AEADA5]">How your income figure is expressed</p>
              <select value={incomePeriod} onChange={(e) => setIncomePeriod(e.target.value)} className={selectClass}>
                <option value="annual">Annual</option>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>
          <div className="mt-3.5">
            <label className="mb-1 block text-sm font-medium text-[#3D3D38]">Income type</label>
            <select value={benefits} onChange={(e) => setBenefits(e.target.value)} className={selectClass}>
              <option value="no">Employment / self-employment</option>
              <option value="yes">Receiving qualifying benefits</option>
            </select>
          </div>
          <div className="mt-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#3D3D38]">Other children in household</label>
              <p className="mb-1.5 text-xs leading-snug text-[#AEADA5]">Children supported in your household</p>
              <select value={otherKids} onChange={(e) => setOtherKids(e.target.value)} className={selectClass}>
                <option value="0">None</option>
                <option value="1">1 child</option>
                <option value="2">2 children</option>
                <option value="3">3 children</option>
                <option value="4">4 children</option>
                <option value="5">5 or more children</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#3D3D38]">Qualifying children</label>
              <p className="mb-1.5 text-xs leading-snug text-[#AEADA5]">Children this arrangement covers</p>
              <select value={kids} onChange={(e) => handleKidsChange(e.target.value)} className={selectClass}>
                <option value="1">1 child</option>
                <option value="2">2 children</option>
                <option value="3">3 children</option>
                <option value="4">4 children</option>
                <option value="5">5 children</option>
              </select>
            </div>
          </div>
        </div>

        {/* Shared care card */}
        <div className="mb-4 rounded-2xl border border-[#E4E2DA] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="mb-5 flex items-center gap-2.5">
            <div className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-[#F0E4D6]">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="2" stroke="#1A1A18" strokeWidth="1.5" /><path d="M5 3V2m6 1V2M2 7h12" stroke="#1A1A18" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </div>
            <span className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#3D3D38]">Shared care - overnight stays</span>
          </div>
          <p className="mb-3 text-xs leading-snug text-[#AEADA5]">Enter the number of nights per year each child spends with the parent making payments. The CMS adjusts the amount for each child individually based on this.</p>
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: kidsNum }).map((_, i) => (
              <div key={i} className="grid grid-cols-[100px_1fr] items-center gap-3 max-[480px]:grid-cols-[80px_1fr]">
                <span className="text-[13px] font-medium text-[#3D3D38]">{ordinal(i + 1)} child</span>
                <select value={childNights[i] || 0} onChange={(e) => setNightsForChild(i, parseInt(e.target.value))} className={selectClass}>
                  {nightOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Result card */}
        <div className="mb-4 rounded-2xl bg-[#1A1A18] p-7">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/60">Estimated child maintenance</div>
          <div className="mb-6 flex items-end gap-1.5">
            <span className="text-[56px] font-semibold leading-none tracking-tight text-white max-[480px]:text-[44px]">{fmt(result.totalFinal)}</span>
            <span className="mb-2.5 text-base font-medium text-white/60">per week</span>
          </div>
          <div className="mb-5 grid grid-cols-2 gap-2.5">
            <div className="rounded-[10px] bg-white/10 p-3.5">
              <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.06em] text-white/55">Monthly</div>
              <div className="text-[22px] font-semibold text-white">{fmt(result.totalFinal * 52 / 12)}</div>
            </div>
            <div className="rounded-[10px] bg-white/10 p-3.5">
              <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.06em] text-white/55">Annual</div>
              <div className="text-[22px] font-semibold text-white">{fmt(result.totalFinal * 52)}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1A1A18]" />
              {result.rateName}
            </span>
            <button onClick={downloadSummary} className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-[#1A1A18] transition-colors hover:bg-white">
              <Download className="h-3.5 w-3.5" />
              Download summary
            </button>
          </div>
        </div>

        {/* Breakdown card */}
        <div className="mb-4 rounded-2xl border border-[#E4E2DA] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#AEADA5]">How this is calculated</div>
          <div className="flex items-center justify-between border-b border-[#F0E4D6] py-2">
            <span className="text-[13px] text-[#6B6B64]">Gross weekly income</span>
            <span className="text-[13px] font-medium text-[#1A1A18]">{fmtW(result.weeklyGross)}</span>
          </div>
          {result.otherKidsNum > 0 && (
            <div className="flex items-center justify-between border-b border-[#F0E4D6] py-2">
              <span className="text-[13px] text-[#6B6B64]">Adjusted for other children</span>
              <span className="text-[13px] font-medium text-[#1A1A18]">{fmtW(result.adjIncome)} (−{Math.round(result.deductionRate * 100)}%)</span>
            </div>
          )}
          <div className="flex items-center justify-between border-b border-[#F0E4D6] py-2">
            <span className="text-[13px] text-[#6B6B64]">Rate applied</span>
            <span className="text-[13px] font-medium text-[#1A1A18]">{result.rateDesc}</span>
          </div>
          <div className="flex items-center justify-between border-b border-[#F0E4D6] py-2">
            <span className="text-[13px] text-[#6B6B64]">Base amount (before shared care)</span>
            <span className="text-[13px] font-medium text-[#1A1A18]">{fmtW(result.baseWeekly)}</span>
          </div>

          {/* Per-child breakdowns */}
          {kidsNum > 1 && result.childResults.map((c, i) => {
            const nightOpt = nightOptions.find((o) => o.value === c.nights) || nightOptions[0];
            let adjText = "No adjustment";
            if (c.pct > 0) adjText = "−" + Math.round(c.pct * 100) + "%" + (c.extra > 0 ? " and −£7/wk" : "");
            return (
              <div key={i} className="my-1.5 rounded-[10px] border border-[#F0E4D6] bg-[#FAF1E6] p-3">
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-[#AEADA5]">{ordinal(i + 1)} child</div>
                <div className="flex justify-between py-0.5 text-xs text-[#6B6B64]"><span>Overnight stays</span><span className="font-medium text-[#3D3D38]">{nightOpt.label}</span></div>
                <div className="flex justify-between py-0.5 text-xs text-[#6B6B64]"><span>Base amount</span><span className="font-medium text-[#3D3D38]">{fmtW(c.base)}</span></div>
                <div className="flex justify-between py-0.5 text-xs text-[#6B6B64]"><span>Shared care adjustment</span><span className="font-medium text-[#3D3D38]">{adjText}</span></div>
                <div className="flex justify-between py-0.5 text-xs text-[#6B6B64]"><span>Child estimate</span><span className="font-medium text-[#3D3D38]">{fmtW(c.final)}</span></div>
              </div>
            );
          })}

          <div className="mt-2 flex items-center justify-between border-t border-[#F0E4D6] pt-2.5">
            <span className="text-sm font-semibold text-[#1A1A18]">Weekly estimate</span>
            <span className="text-sm font-semibold text-[#1A1A18]">{fmtW(result.totalFinal)}</span>
          </div>
        </div>

        {/* Notice */}
        <div className="mb-6 rounded-xl border border-[#E4E2DA] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex gap-2.5">
            <Info className="mt-0.5 h-[18px] w-[18px] flex-shrink-0 text-[#AEADA5]" />
            <p className="text-xs leading-relaxed text-[#AEADA5]">
              <strong className="font-medium text-[#6B6B64]">Please note:</strong> This calculator provides a general estimate based on the standard CMS formula. Every family's circumstances are different, and factors such as pension contributions, rental income, overseas income and other variables may affect the actual figure. This tool is intended to help you understand how child maintenance is typically calculated - it is not financial or legal advice. We recommend speaking with a qualified adviser for guidance specific to your situation.
            </p>
          </div>
        </div>

        {/* SEO Content */}
        <div className="space-y-6 text-sm leading-relaxed text-[#6B6B64]">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-[#1A1A18]">How is child maintenance calculated in the UK?</h2>
            <p>
              The Child Maintenance Service (CMS) uses a formula based on the paying parent's gross weekly income, the number of qualifying children, shared overnight stays, and whether the parent supports other children. Our calculator uses the exact same CMS formula to give you an accurate estimate. For a definitive figure, visit{" "}
              <a href="https://www.gov.uk/calculate-child-maintenance" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#1A1A18]">gov.uk/calculate-child-maintenance</a> or contact the Child Maintenance Service directly.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold text-[#1A1A18]">Understanding the CMS rates</h2>
            <ul className="ml-5 list-disc space-y-1">
              <li><strong className="text-[#1A1A18]">Nil rate</strong> - Income below £7 per week. No maintenance payable.</li>
              <li><strong className="text-[#1A1A18]">Flat rate</strong> - Income between £7 and £100/week, or on qualifying benefits. Fixed at £7/week.</li>
              <li><strong className="text-[#1A1A18]">Reduced rate</strong> - Income between £100 and £200/week. A graduated formula applies.</li>
              <li><strong className="text-[#1A1A18]">Basic rate</strong> - Income above £200/week. 12% for 1 child, 16% for 2, 19% for 3+.</li>
            </ul>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold text-[#1A1A18]">Related resources</h2>
            <ul className="ml-5 list-disc space-y-1">
              <li><Link to="/resources/child-maintenance-guide" className="underline hover:text-[#1A1A18]">Child Maintenance Made Simple - Full Guide</Link></li>
              <li><Link to="/resources/financial-coparenting-tips" className="underline hover:text-[#1A1A18]">Financial Co-parenting Tips</Link></li>
            </ul>
          </section>
        </div>
      </div>
      </div>
    </div>
  );
};

export default ChildMaintenanceCalculator;
