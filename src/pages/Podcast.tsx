import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Play, Youtube } from "lucide-react";
import TopBanner from "@/components/TopBanner";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const fade = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.6 },
};

interface Episode {
  number: string;
  title: string;
  description: string;
  duration: string;
  // Drop the real YouTube video ID in here (e.g. "dQw4w9WgXcQ") when each
  // episode is live and the embed will render automatically.
  youtubeId: string | null;
}

const episodes: Episode[] = [
  {
    number: "01",
    title: "How child maintenance works in the UK",
    description:
      "A plain-English walkthrough of the Child Maintenance Service: who it applies to, how arrangements are made, and what your options are when you agree between yourselves.",
    duration: "Coming soon",
    youtubeId: null,
  },
  {
    number: "02",
    title: "How contributions are calculated",
    description:
      "We break down how the CMS works out what a paying parent contributes, including gross income bands, shared care reductions and other children in the household.",
    duration: "Coming soon",
    youtubeId: null,
  },
  {
    number: "03",
    title: "Enforcement basics: what happens if payments stop",
    description:
      "What the CMS can do when payments are missed, the steps that usually happen first, and why a clear, documented arrangement between parents can prevent it getting that far.",
    duration: "Coming soon",
    youtubeId: null,
  },
  {
    number: "04",
    title: "Co-parenting money conversations without the conflict",
    description:
      "Practical tips for talking about money with your co-parent: separating the money conversation from everything else, putting agreements in writing, and keeping things calm.",
    duration: "Coming soon",
    youtubeId: null,
  },
  {
    number: "05",
    title: "Shared expenses: school costs, uniforms and holidays",
    description:
      "How separated parents handle costs that fall outside regular maintenance - what to split, how to agree it, and simple ways to track who has paid what.",
    duration: "Coming soon",
    youtubeId: null,
  },
  {
    number: "06",
    title: "Your questions answered",
    description:
      "We answer the questions separated parents ask us most, from changing an arrangement to what happens when one parent's circumstances change.",
    duration: "Coming soon",
    youtubeId: null,
  },
];

const EpisodeCard = ({ ep }: { ep: Episode }) => (
  <motion.article
    {...fade}
    className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
  >
    {/* Embed slot - renders the YouTube player when youtubeId is set */}
    {ep.youtubeId ? (
      <div className="aspect-video w-full bg-foreground">
        <iframe
          src={`https://www.youtube.com/embed/${ep.youtubeId}`}
          title={ep.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    ) : (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 border-b border-border bg-secondary px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
          <Play className="h-6 w-6 translate-x-0.5 text-primary" />
        </div>
        <p className="text-sm font-semibold text-foreground">Episode coming soon</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          This slot is reserved for the episode video, ready for the YouTube embed.
        </p>
      </div>
    )}

    <div className="p-6">
      <div className="flex items-center gap-3">
        <span className="text-2xl font-extrabold leading-none text-primary">{ep.number}</span>
        <span className="rounded-full border border-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
          {ep.duration}
        </span>
      </div>
      <h3 className="mt-4 text-lg font-bold leading-snug text-foreground">{ep.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{ep.description}</p>
    </div>
  </motion.article>
);

const Podcast = () => (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>Podcast | Collabor8</title>
      <meta
        name="description"
        content="Practical conversations about child maintenance in the UK - CMS, arrangements, calculating contributions and common questions for separated parents."
      />
      <link rel="canonical" href="https://collaborate8.com/podcast" />
    </Helmet>
    <TopBanner />

    {/* Hero */}
    <section className="relative w-full overflow-hidden bg-background">
      <div className="pointer-events-none absolute -right-16 -top-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-start px-6 pb-16 pt-8 md:px-8 md:py-24"
      >
        <div className="mb-5 inline-block rounded-full border border-primary px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
          The Collabor8 Podcast
        </div>
        <h1 className="text-6xl font-extrabold italic leading-[0.9] tracking-tighter text-foreground md:text-7xl">
          The
          <br />
          <span className="not-italic text-primary">Podcast.</span>
        </h1>
        <div className="mt-6 flex items-center gap-4">
          <div className="h-px w-8 shrink-0 bg-primary" />
          <p className="max-w-xl text-base font-medium leading-relaxed text-foreground/90 md:text-lg">
            This is where we share practical conversations about child maintenance in the UK.
            From how the CMS works to calculating contributions and the questions separated
            parents ask most, each episode is built to be helpful, calm and practical.
          </p>
        </div>
      </motion.div>
    </section>

    {/* Episodes */}
    <main className="bg-background">
      <section className="px-6 pb-16 md:px-8 md:pb-24">
        <motion.div {...fade} className="mx-auto max-w-5xl">
          <div className="mb-8 flex items-center gap-4">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">Episodes</h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {episodes.map((ep) => (
              <EpisodeCard key={ep.number} ep={ep} />
            ))}
          </div>
          <p className="mt-10 flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <Youtube className="h-4 w-4" />
            New episodes will appear here as they are released.
          </p>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-16 md:px-8 md:pb-20">
        <motion.div
          {...fade}
          className="mx-auto max-w-5xl rounded-2xl border-l-4 border-primary bg-card p-6 text-center md:p-10"
        >
          <h2 className="text-2xl font-bold text-foreground md:text-3xl">
            Want to manage payments as well as talk about them?
          </h2>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="w-64 gap-2 rounded-full">
              <Link to="/splash">Get started</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-64 rounded-full">
              <Link to="/child-maintenance-calculator">Try the calculator</Link>
            </Button>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Free to download. Low cost to use. Built for you.
          </p>
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
            <Link to="/podcast" className="hover:text-foreground">
              Podcast
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

export default Podcast;
