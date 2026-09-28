import { useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Landmark } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const topics = [
  {
    title: "Does child maintenance affect my tax credits?",
    body: "No. Child maintenance you receive is not counted as income for tax credits, so it will not reduce your payments. Most tax credit claims have now moved to Universal Credit.",
    url: "https://www.gov.uk/child-tax-credit",
  },
  {
    title: "Does child maintenance affect my Universal Credit?",
    body: "No. Child maintenance you receive is ignored when your Universal Credit is worked out. Maintenance paid for yourself as a former partner may be counted, so check if that applies to you.",
    url: "https://www.gov.uk/universal-credit/how-your-universal-credit-is-calculated",
  },
  {
    title: "What happens to child benefit when parents separate?",
    body: "Only one person can claim Child Benefit for a child. It usually goes to the parent the child mainly lives with. If the child moves, the other parent can make a new claim and the payments will switch over.",
    url: "https://www.gov.uk/child-benefit",
  },
  {
    title: "Does child maintenance count as income for tax purposes?",
    body: "No. Child maintenance is not taxable for the parent who receives it, and you do not need to declare it on a tax return. The paying parent cannot claim tax relief on it either.",
    url: "https://www.gov.uk/making-child-maintenance-arrangement",
  },
  {
    title: "What financial support is available to single parents?",
    body: "You may be able to get Universal Credit, Child Benefit, help with childcare costs and a Council Tax discount if you live alone with your children. A benefits calculator can show what you might be entitled to.",
    url: "https://www.gov.uk/benefits-calculators",
  },
];

const TaxAndBenefits = () => {
  const navigate = useNavigate();
  return (
    <div className="mx-auto min-h-screen max-w-md bg-background px-6 pb-24 pt-12 md:max-w-2xl">
      <Helmet>
        <title>Tax and benefits - Collabor8</title>
        <meta name="description" content="How child maintenance affects tax, Universal Credit and Child Benefit in the UK." />
      </Helmet>
      <button onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="text-2xl font-bold text-foreground">Tax and benefits</h1>
      <p className="mb-6 mt-1 text-xs text-muted-foreground">
        This information is for general guidance only. For advice specific to your circumstances please contact HMRC, the DWP or Citizens Advice.
      </p>

      <Accordion type="single" collapsible className="space-y-3">
        {topics.map((t) => (
          <AccordionItem key={t.title} value={t.title} className="overflow-hidden rounded-2xl border border-border bg-card">
            <AccordionTrigger className="gap-3 bg-primary/10 px-4 py-4 text-left text-sm font-semibold text-foreground hover:no-underline">
              <span className="flex items-center gap-3">
                <Landmark className="h-4 w-4 shrink-0 text-primary" />
                {t.title}
              </span>
            </AccordionTrigger>
            <AccordionContent className="bg-card px-4 pb-4 pt-3">
              <p className="text-sm leading-relaxed text-foreground/80">{t.body}</p>
              <Button asChild size="sm" className="mt-3 gap-1.5">
                <a href={t.url} target="_blank" rel="noopener noreferrer">
                  Find out more on GOV.UK <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default TaxAndBenefits;
