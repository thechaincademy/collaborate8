import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import TopBanner from "@/components/TopBanner";
import FooterResources from "@/components/FooterResources";
import FooterContact from "@/components/FooterContact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const PLEDGE_OPTIONS = [
  "Share the parent pack",
  "Display the poster or QR code",
  "Mention it in a newsletter or post",
  "Brief staff",
] as const;

const ORG_TYPES = [
  "School",
  "Academy trust",
  "Council or family hub",
  "Charity or community group",
  "Other",
] as const;

const PLEDGE_CARDS = [
  {
    n: "01",
    title: "Share information",
    text: "Pass the campaign resources on to families in your community.",
  },
  {
    n: "02",
    title: "Spread the word",
    text: "Display a poster, share a QR code or include the campaign in your communications.",
  },
  {
    n: "03",
    title: "Engage your team",
    text: "Help staff understand the resources available to families experiencing change.",
  },
];

const NEXT_STEPS = [
  {
    n: "1",
    title: "Campaign resources",
    text: "Posters, QR codes and a parent pack, ready to share in the way that works for your organisation.",
  },
  {
    n: "2",
    title: "Share with your community",
    text: "Distribute the resources in whichever way works best for your organisation.",
  },
  {
    n: "3",
    title: "Help us reach more families",
    text: "Your participation helps build a wider network of support.",
  },
];

const FamiliesChange = () => {
  const [name, setName] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [email, setEmail] = useState("");
  const [orgType, setOrgType] = useState("");
  const [familiesReach, setFamiliesReach] = useState("");
  const [postcode, setPostcode] = useState("");
  const [pledges, setPledges] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [publicListing, setPublicListing] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePledge = (option: string, checked: boolean) => {
    setPledges((prev) =>
      checked ? [...prev, option] : prev.filter((p) => p !== option)
    );
  };

  const scrollToPledge = () => {
    document.getElementById("pledge")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !organisation.trim() || !email.trim()) {
      setError("Please complete your name, organisation and email address.");
      return;
    }
    if (!pledges.length) {
      setError("Please select at least one way to support the campaign.");
      return;
    }
    if (!consent) {
      setError("Please agree to the use of your details in connection with your pledge.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("submit-pledge", {
        body: {
          name: name.trim(),
          organisation: organisation.trim(),
          email: email.trim(),
          orgType: orgType || undefined,
          familiesReach: familiesReach ? Number(familiesReach) : undefined,
          postcode: postcode.trim() || undefined,
          pledgeOptions: pledges,
          consent,
          publicListing,
          website: honeypot,
        },
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);
      setSubmitted(true);
    } catch (err) {
      console.error("Pledge submission failed:", err);
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Something went wrong submitting your pledge. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Families Change Pledge | Collabor8</title>
        <meta
          name="description"
          content="Make a Families Change pledge with Collabor8 and National Family Mediation. Help families navigate separation with better information, understanding and support."
        />
        <link rel="canonical" href="https://collaborate8.com/families-change" />
        <meta property="og:title" content="Families Change Pledge | Collabor8" />
        <meta
          property="og:description"
          content="Make a Families Change pledge with Collabor8 and National Family Mediation. Help families navigate separation with better information, understanding and support."
        />
        <meta property="og:url" content="https://collaborate8.com/families-change" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Families Change Pledge | Collabor8" />
        <meta
          name="twitter:description"
          content="Make a Families Change pledge with Collabor8 and National Family Mediation."
        />
      </Helmet>
      <TopBanner />

      <main id="main" tabIndex={-1} className="focus:outline-none">
        {/* Hero */}
        <section className="relative w-full overflow-hidden bg-primary">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(250, 248, 243, 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(26, 26, 22, 0.1) 0%, transparent 50%)",
            }}
          />
          <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-6 py-16 text-center md:px-8 md:py-24">
            <p className="font-display mb-4 inline-block rounded-full bg-background px-4 py-1.5 text-sm font-semibold text-foreground md:text-base">
              The Families Change Campaign
            </p>
            <h1 className="font-display mb-6 max-w-2xl text-4xl font-extrabold tracking-tight text-foreground md:text-6xl lg:leading-[1.1]">
              A little support can make a big difference.
            </h1>
            <p className="mb-8 max-w-xl text-base leading-relaxed text-foreground/80 md:text-lg">
              Help families navigate separation with better information,
              understanding and support. Make a pledge to share the Families
              Change resources with your community.
            </p>
            <Button
              onClick={scrollToPledge}
              className="h-auto rounded-xl bg-teal-700 px-8 py-4 text-lg font-bold text-teal-foreground shadow-elevated transition-all hover:scale-[1.02] hover:bg-teal-800 active:scale-95"
            >
              Make your pledge →
            </Button>
            <p className="mt-6 flex items-center gap-2 text-sm text-foreground/75">
              <span className="inline-block h-2 w-2 rounded-full bg-foreground" />
              Small actions. Wider reach. Stronger support for families.
            </p>
            <p className="mt-8 text-xs font-semibold uppercase tracking-widest text-foreground/70">
              In partnership with National Family Mediation
            </p>
          </div>
        </section>

        {/* What you're pledging */}
        <section className="px-6 py-16 md:px-8 md:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <p className="font-display inline-block rounded-full border border-primary px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary-ink">
                Get involved
              </p>
              <h2 className="font-display mt-4 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                What you're pledging
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                Three simple ways to help more families access support.
              </p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {PLEDGE_CARDS.map((card) => (
                <article
                  key={card.n}
                  className="rounded-3xl border border-border bg-card p-7"
                >
                  <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background">
                    {card.n}
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {card.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Pledge form */}
        <section id="pledge" className="scroll-mt-24 px-6 pb-16 md:px-8 md:pb-20">
          <div className="mx-auto max-w-2xl">
            <div className="mb-8 text-center">
              <p className="font-display inline-block rounded-full border border-primary px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary-ink">
                Take part
              </p>
              <h2 className="font-display mt-4 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                Make your pledge
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                Let us know how your organisation plans to get involved. It only
                takes a couple of minutes.
              </p>
            </div>

            {submitted ? (
              <div
                role="status"
                className="rounded-3xl border border-border bg-card p-8 text-center"
              >
                <h3 className="font-display text-xl font-semibold text-foreground">
                  Thank you for your pledge.
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Your pledge has been recorded. Thank you for supporting
                  families.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="rounded-3xl border border-border bg-card p-6 md:p-8"
                noValidate
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fc-name">
                      Your name <span className="text-primary-ink">*</span>
                    </Label>
                    <Input
                      id="fc-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fc-org">
                      Organisation name <span className="text-primary-ink">*</span>
                    </Label>
                    <Input
                      id="fc-org"
                      value={organisation}
                      onChange={(e) => setOrganisation(e.target.value)}
                      placeholder="Organisation"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fc-email">
                      Your email <span className="text-primary-ink">*</span>
                    </Label>
                    <Input
                      id="fc-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@organisation.org"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Used only in connection with your pledge.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fc-type">Organisation type</Label>
                    <Select value={orgType} onValueChange={setOrgType}>
                      <SelectTrigger id="fc-type">
                        <SelectValue placeholder="Please select" />
                      </SelectTrigger>
                      <SelectContent>
                        {ORG_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fc-reach">
                      Approximate number of families you could reach{" "}
                      <span className="font-normal text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id="fc-reach"
                      type="number"
                      min={0}
                      value={familiesReach}
                      onChange={(e) => setFamiliesReach(e.target.value)}
                      placeholder="e.g. 500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fc-postcode">
                      Organisation postcode{" "}
                      <span className="font-normal text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id="fc-postcode"
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value)}
                      placeholder="e.g. SW1A 1AA"
                    />
                  </div>

                  {/* Honeypot: hidden from people, attractive to bots. */}
                  <div className="absolute left-[-9999px] top-[-9999px]" aria-hidden="true">
                    <Label htmlFor="fc-website">Website</Label>
                    <Input
                      id="fc-website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                    />
                  </div>

                  <fieldset className="sm:col-span-2">
                    <legend className="text-sm font-semibold text-foreground">
                      How will you support the campaign?{" "}
                      <span className="text-primary-ink">*</span>
                    </legend>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Select all that apply.
                    </p>
                    <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                      {PLEDGE_OPTIONS.map((option) => (
                        <label
                          key={option}
                          className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-3.5 text-sm leading-snug text-foreground transition-colors has-[[data-state=checked]]:border-teal-700 has-[[data-state=checked]]:bg-mist"
                        >
                          <Checkbox
                            checked={pledges.includes(option)}
                            onCheckedChange={(checked) =>
                              togglePledge(option, checked === true)
                            }
                            className="mt-0.5"
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div className="space-y-4 border-t border-border pt-5 sm:col-span-2">
                    <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-foreground">
                      <Checkbox
                        checked={consent}
                        onCheckedChange={(checked) => setConsent(checked === true)}
                        className="mt-0.5"
                      />
                      <span>
                        I agree to the use of my details in connection with my
                        pledge and the campaign.{" "}
                        <span className="text-primary-ink">*</span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-foreground">
                      <Checkbox
                        checked={publicListing}
                        onCheckedChange={(checked) => setPublicListing(checked === true)}
                        className="mt-0.5"
                      />
                      <span>
                        I'm happy for my organisation to be listed publicly as a
                        campaign supporter.
                      </span>
                    </label>
                  </div>

                  <div className="sm:col-span-2">
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="h-auto rounded-xl bg-teal-700 px-8 py-4 text-base font-bold text-teal-foreground shadow-elevated transition-all hover:scale-[1.02] hover:bg-teal-800 active:scale-95 disabled:opacity-60"
                    >
                      {submitting ? "Submitting…" : "Submit my pledge →"}
                    </Button>
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      Your details will only be used in connection with the
                      Families Change campaign.
                    </p>
                    {error && (
                      <p role="alert" className="mt-3 text-sm font-medium text-destructive">
                        {error}
                      </p>
                    )}
                  </div>
                </div>
              </form>
            )}
          </div>
        </section>

        {/* What happens next */}
        <section className="bg-primary px-6 py-16 md:px-8 md:py-20">
          <div className="mx-auto max-w-2xl">
            <p className="font-display inline-block rounded-full bg-background px-3 py-1 text-xs font-bold uppercase tracking-widest text-foreground">
              After you pledge
            </p>
            <h2 className="font-display mt-4 text-3xl font-extrabold tracking-tight text-foreground">
              What happens next?
            </h2>
            <div className="mt-8 grid gap-6">
              {NEXT_STEPS.map((step) => (
                <div key={step.n} className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background">
                    {step.n}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{step.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-foreground/75">
                      {step.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background py-8">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground">
                <span className="text-xs font-bold text-background">C8</span>
              </div>
              <span className="text-sm font-semibold text-foreground">Collabor8</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
              <Link to="/child-maintenance-calculator" className="hover:text-foreground">
                Child Maintenance Calculator
              </Link>
              <Link to="/resources/child-maintenance-guide" className="hover:text-foreground">
                Maintenance Guide
              </Link>
              <Link to="/faq" className="hover:text-foreground">
                FAQ
              </Link>
              <Link to="/privacy" className="hover:text-foreground">
                Privacy Policy
              </Link>
              <Link to="/accessibility" className="inline-flex min-h-6 items-center hover:text-foreground">
                Accessibility
              </Link>
              <span>© {new Date().getFullYear()} Collabor8</span>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground sm:text-left">
            Families Change, a campaign in partnership with National Family
            Mediation (Registered Charity No. 1074796) and Collabor8.
          </p>
          <FooterResources />
          <FooterContact />
        </div>
      </footer>
    </div>
  );
};

export default FamiliesChange;
