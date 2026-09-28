import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import TopBanner from "@/components/TopBanner";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/about-hero.jpg";

const fade = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.6 },
};

const blocks = [
  {
    n: "01",
    label: "The problem",
    paras: [
      "Collabor8 was built from personal experience.",
      "I am Jade, a single mother who spent five years navigating the UK family court system. Throughout that time, one thing became clear. The hardest conversation I faced was not the legal process. It was money. What one parent owed the other. How shared costs would be managed. How to even begin that conversation without spending thousands in mediation or solicitor fees, without it becoming something else entirely.",
      "I looked for somewhere to have it. A neutral space. Somewhere separate from the parenting conversation, the legal conversation and everything else. Somewhere that was just for the money. It did not exist.",
    ],
  },
  {
    n: "02",
    label: "The solution",
    paras: [
      "So Rafa and I built it.",
      "Rafa is my co-founder and the technical mind behind Collabor8. Between us, and our very dedicated team, we bring the lived experience and the technical expertise that this problem deserves.",
    ],
  },
  {
    n: "03",
    label: "The mission",
    paras: [
      "Our mission is simple. We want to make it easier for separated parents to talk about money. Not because it is easy. It is one of the hardest conversations parents face. But because when parents can discuss finances openly and constructively, children benefit. Less conflict at home. More stability. A better environment for children to grow up in.",
      "Collabor8 gives separated parents a dedicated space to discuss finances, manage child maintenance and sort shared expenses away from everything else in their lives. Whether you are newly separated or have been managing things for years, Collabor8 gives you somewhere to start.",
      "We built this because we believe separated parents deserve better tools. And their children deserve parents who have somewhere proper to have this conversation.",
    ],
  },
];

const Block = ({ b }: { b: (typeof blocks)[number] }) => (
  <section className="px-6 py-16 md:px-8 md:py-20">
    <motion.div {...fade} className="mx-auto flex max-w-5xl flex-col gap-6 md:flex-row md:gap-12">
      <div className="shrink-0 md:w-32">
        <span className="block text-5xl font-extrabold leading-none text-primary md:text-6xl">{b.n}</span>
        <span className="mt-2 block text-xs font-bold uppercase tracking-widest text-foreground/70">{b.label}</span>
      </div>
      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground md:text-base">
        {b.paras.map((p, i) => <p key={i}>{p}</p>)}
      </div>
    </motion.div>
  </section>
);

const Rule = () => <div className="mx-auto h-px w-full max-w-5xl bg-border" />;

const About = () => (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>About Us | Collabor8</title>
      <meta name="description" content="Collabor8 was built from personal experience by co-founders Jade and Rafa to help separated parents talk about money." />
      <link rel="canonical" href="https://collaborate8.com/about" />
    </Helmet>
    <TopBanner />

    {/* Hero */}
    <section className="relative w-full overflow-hidden bg-primary">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(250, 248, 243, 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(26, 26, 22, 0.1) 0%, transparent 50%)",
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 mx-auto grid w-full max-w-5xl gap-10 px-6 py-16 md:grid-cols-2 md:px-8 md:py-24"
      >
        <div className="flex flex-col justify-center">
          <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">About Us</h1>
          <p className="max-w-xl text-base leading-relaxed text-foreground/80 md:text-lg">
            Built from personal experience. Built for you.
          </p>
        </div>
        <div className="overflow-hidden rounded-2xl shadow-elevated">
          <img
            src={heroImg}
            alt="Illustration of two parents walking hand in hand with their child"
            width={1920}
            height={1440}
            className="h-full w-full object-cover"
          />
        </div>
      </motion.div>
    </section>

    {/* Story */}
    <main className="bg-background">
      <Block b={blocks[0]} />
      <Rule />
      <Block b={blocks[1]} />

      {/* Pull quote */}
      <section className="px-6 py-16 md:px-8 md:py-20">
        <motion.blockquote
          {...fade}
          className="mx-auto max-w-3xl rounded-2xl border-l-4 border-primary bg-card p-6 shadow-card md:p-10"
        >
          <p className="text-lg font-medium italic leading-relaxed text-foreground md:text-xl">
            "Money after separation is one of the most taboo conversations parents face. We built Collabor8 because we believe it does not have to be."
          </p>
        </motion.blockquote>
      </section>

      <Rule />
      <Block b={blocks[2]} />

      {/* CTA */}
      <section className="px-6 pb-16 md:px-8 md:pb-20">
        <motion.div
          {...fade}
          className="mx-auto max-w-5xl rounded-2xl border-l-4 border-primary bg-card p-6 text-center md:p-10"
        >
          <h2 className="text-2xl font-bold text-foreground md:text-3xl">Ready to start the conversation?</h2>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="w-64 gap-2 rounded-full">
              <Link to="/#download">
                Download on the App Store <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-64 rounded-full">
              <Link to="/#download">Get it on Google Play</Link>
            </Button>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">Free to download. Low cost to use. Built for you.</p>
        </motion.div>
      </section>
    </main>

    <footer className="border-t border-border bg-background py-8">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground">
              <span className="text-xs font-bold text-background">C8</span>
            </div>
            <span className="text-sm font-semibold text-foreground">collabor8</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <Link to="/child-maintenance-calculator" className="hover:text-foreground">
              Child Maintenance Calculator
            </Link>
            <Link to="/resources/child-maintenance-guide" className="hover:text-foreground">
              Maintenance Guide
            </Link>
            <Link to="/resources/child-maintenance-guide#money-help" className="hover:text-foreground">
              Money Help
            </Link>
            <Link to="/faq" className="hover:text-foreground">
              FAQ
            </Link>
            <Link to="/privacy" className="hover:text-foreground">
              Privacy Policy
            </Link>
            <span>© 2025 collabor8</span>
          </div>
        </div>
      </div>
    </footer>
  </div>
);

export default About;
