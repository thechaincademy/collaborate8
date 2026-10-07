import FooterResources from "@/components/FooterResources";
import FooterContact from "@/components/FooterContact";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import InstallAppButtons from "@/components/InstallAppButtons";
import TopBanner from "@/components/TopBanner";
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
        <meta property="og:title" content="About Us | Collabor8" />
        <meta property="og:description" content="Collabor8 was built from personal experience by co-founders Jade and Rafa to help separated parents talk about money." />
        <meta property="og:url" content="https://collaborate8.com/about" />
        <meta name="twitter:title" content="About Us | Collabor8" />
        <meta name="twitter:description" content="Collabor8 was built from personal experience by co-founders Jade and Rafa to help separated parents talk about money." />
    </Helmet>
    <TopBanner />

    {/* Hero */}
    <section className="relative w-full overflow-hidden bg-background">
      <div className="pointer-events-none absolute -right-16 -top-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 mx-auto grid w-full max-w-5xl gap-12 px-6 pb-16 pt-8 md:grid-cols-2 md:items-center md:gap-16 md:px-8 md:py-24"
      >
        <div className="flex flex-col items-start">
          <div className="mb-5 inline-block rounded-full border border-primary px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
            Our Story
          </div>
          <h1 className="text-6xl font-extrabold italic leading-[0.9] tracking-tighter text-foreground md:text-7xl">
            About
            <br />
            <span className="not-italic text-primary">Us.</span>
          </h1>
          <div className="mt-6 flex items-center gap-4">
            <div className="h-px w-8 shrink-0 bg-primary" />
            <p className="text-lg font-medium leading-tight text-foreground/90 md:text-xl">
              Built from personal experience.
              <br />
              <span className="text-primary">Built for you.</span>
            </p>
          </div>
        </div>
        <div className="relative mt-2 md:mt-0">
          <div className="absolute -bottom-4 -left-4 z-0 h-32 w-32 -rotate-6 rounded-[2.5rem] bg-primary" />
          <div className="relative z-10 overflow-hidden rounded-[2.5rem] border border-white bg-card p-3 shadow-elevated">
            <img
              src={heroImg}
              alt="Illustration of two parents walking hand in hand with their child"
              width={1920}
              height={1440}
              className="aspect-[4/5] w-full rounded-[1.8rem] object-cover md:aspect-[4/3]"
            />
          </div>
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
            <InstallAppButtons />
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
            <span className="text-sm font-semibold text-foreground">Collabor8</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <Link to="/child-maintenance-calculator" className="hover:text-foreground">
              Child Maintenance Calculator
            </Link>
            <Link to="/podcast" className="hover:text-foreground">
              The Blog
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
            <span>© {new Date().getFullYear()} Collabor8</span>
          </div>
        </div>
      </div>
    <FooterResources />
        <FooterContact />
    </footer>
  </div>
);

export default About;
