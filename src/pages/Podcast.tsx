import FooterResources from "@/components/FooterResources";
import FooterContact from "@/components/FooterContact";
import { WebsiteOnly } from "@/hooks/useIsInApp";
import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Play, Youtube, MicVocal } from "lucide-react";
import TopBanner from "@/components/TopBanner";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAppCtaHref } from "@/hooks/useAppCta";

const fade = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.6 },
};

interface Episode {
  number: number;
  title: string;
  description: string;
  publishedAt: string;
  youtubeId: string;
  url: string;
  thumbnail: string;
}

const CHANNEL_URL = "https://www.youtube.com/@collabor8official";

// Built-in list, used when the YouTube feed cannot be reached (and merged with
// the feed so older episodes stay listed once they drop out of it).
const fallbackEpisodes: Episode[] = [
  {
    number: 1,
    title: "Court Is the Last Resort: Co-Parenting Without the Fight | Simon Bassett, RWK Goodman",
    description:
      "What does a leading family lawyer actually want separated parents to know? In our first episode, Jade sits down with Simon Bassett, Lead Partner and Head of Family Law at RWK Goodman, to talk about the money side of co-parenting, why court should be the last resort, and why you'll still be talking to your co-parent long after the lawyers have moved on.",
    publishedAt: "2026-11-01T10:00:35+00:00",
    youtubeId: "IhaPQQCG5Zs",
    url: "https://www.youtube.com/watch?v=IhaPQQCG5Zs",
    thumbnail: "https://i.ytimg.com/vi/IhaPQQCG5Zs/hqdefault.jpg",
  },
];

const sortNewestFirst = (list: Episode[]) =>
  [...list].sort(
    (a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || "") || b.number - a.number,
  );

const mergeEpisodes = (fromFeed: Episode[]) => {
  const byId = new Map<string, Episode>();
  for (const ep of fallbackEpisodes) byId.set(ep.youtubeId, ep);
  for (const ep of fromFeed) byId.set(ep.youtubeId, ep);
  return sortNewestFirst([...byId.values()]);
};

const usePodcastEpisodes = () => {
  const [episodes, setEpisodes] = useState<Episode[]>(() => sortNewestFirst(fallbackEpisodes));

  useEffect(() => {
    let cancelled = false;
    fetch("/api/podcast-episodes", { headers: { accept: "application/json" } })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { episodes?: Episode[] }) => {
        const list = Array.isArray(data?.episodes)
          ? data.episodes.filter((ep) => ep && /^[\w-]{11}$/.test(ep.youtubeId))
          : [];
        if (!cancelled && list.length) setEpisodes(mergeEpisodes(list));
      })
      .catch(() => {
        // Keep the built-in list.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return episodes;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });
};

// A new episode goes out on the 1st of every month.
const upcomingEpisodes = (episodes: Episode[], count: number) => {
  const latest = episodes[0];
  const lastNumber = episodes.reduce((max, ep) => Math.max(max, ep.number || 0), 0);
  const base = latest ? new Date(latest.publishedAt) : new Date();
  const now = new Date();
  const year = base.getUTCFullYear();
  let month = base.getUTCMonth() + 1;
  // Never show a release date that has already passed.
  while (Date.UTC(year, month, 1) <= Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) {
    month += 1;
  }
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(year, month + i, 1));
    return {
      number: lastNumber + i + 1,
      date: date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
    };
  });
};

const EpisodeCard = ({ ep }: { ep: Episode }) => {
  const [playing, setPlaying] = useState(false);
  const date = formatDate(ep.publishedAt);

  return (
    <motion.article
      {...fade}
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
    >
      <div className="aspect-video w-full bg-foreground">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${ep.youtubeId}?autoplay=1&rel=0`}
            title={ep.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group relative block h-full w-full"
            aria-label={`Play episode ${ep.number}: ${ep.title}`}
          >
            <img
              src={ep.thumbnail}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-foreground/20 transition-colors group-hover:bg-foreground/10">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-card">
                <Play className="h-6 w-6 translate-x-0.5 text-primary-foreground" />
              </span>
            </span>
          </button>
        )}
      </div>

      <div className="p-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-extrabold leading-none text-primary-ink">
            {String(ep.number).padStart(2, "0")}
          </span>
          {date && (
            <span className="rounded-full border border-primary px-2.5 py-0.5 text-xs font-bold uppercase tracking-widest text-primary-ink">
              <time dateTime={ep.publishedAt}>{date}</time>
            </span>
          )}
        </div>
        <h3 className="mt-4 text-lg font-bold leading-snug text-foreground">{ep.title}</h3>
        <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-muted-foreground">{ep.description}</p>
        <a
          href={ep.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-6 items-center gap-2 text-sm font-semibold text-primary-ink hover:underline"
        >
          <Youtube className="h-4 w-4" />
          Watch on YouTube
        </a>
      </div>
    </motion.article>
  );
};

const Podcast = () => {
  const ctaHref = useAppCtaHref("/splash");
  const episodes = usePodcastEpisodes();
  const upcoming = upcomingEpisodes(episodes, 5);

  return (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>The Blog | Collabor8</title>
      <meta
        name="description"
        content="Practical guides, videos and resources for separated parents navigating family finances."
      />
      <link rel="canonical" href="https://collaborate8.com/podcast" />
        <meta property="og:title" content="The Blog | Collabor8" />
        <meta property="og:description" content="Practical guides, videos and resources for separated parents navigating family finances." />
        <meta property="og:url" content="https://collaborate8.com/podcast" />
        <meta name="twitter:title" content="The Blog | Collabor8" />
        <meta name="twitter:description" content="Practical guides, videos and resources for separated parents navigating family finances." />
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
        <div className="mb-5 inline-block rounded-full border border-primary px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary-ink">
          The Collabor8 Blog
        </div>
        <h1 className="text-6xl font-extrabold italic leading-[0.9] tracking-tighter text-foreground md:text-7xl">
          The
          <br />
          <span className="not-italic text-primary-ink">Blog.</span>
        </h1>
        <div className="mt-6 flex items-center gap-4">
          <div className="h-px w-8 shrink-0 bg-primary" />
          <p className="max-w-xl text-base font-medium leading-relaxed text-foreground/90 md:text-lg">
            Practical guides, videos and resources for separated parents navigating family
            finances.
          </p>
        </div>
      </motion.div>
    </section>

    {/* Episodes */}
    <main id="main" tabIndex={-1} className="focus:outline-none bg-background">
      <section className="px-6 pb-16 md:px-8 md:pb-24">
        <motion.div {...fade} className="mx-auto max-w-5xl">
          <div className="mb-8 flex items-center gap-4">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">Episodes</h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {episodes.map((ep) => (
              <EpisodeCard key={ep.youtubeId} ep={ep} />
            ))}
          </div>
          <p className="mt-10 flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <Youtube className="h-4 w-4" />
            <span>
              A new episode goes out on the 1st of every month.{" "}
              <a
                href={CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary-ink hover:underline"
              >
                Subscribe on YouTube
              </a>
            </span>
          </p>
        </motion.div>
      </section>

      {/* Coming soon podcast episodes */}
      <section className="px-6 pb-16 md:px-8 md:pb-24">
        <motion.div {...fade} className="mx-auto max-w-5xl">
          <div className="mb-8 flex items-center gap-4">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Coming Soon - Podcast Episodes
            </h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          <ul className="flex flex-col gap-4">
            {upcoming.map(({ number: n, date }) => (
              <li
                key={n}
                className="relative flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-card"
              >
                <span className="absolute right-4 top-4 rounded-full border border-primary-ink px-2.5 py-0.5 text-xs font-bold uppercase tracking-widest text-primary-ink">
                  Coming Soon
                </span>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal/10">
                  <MicVocal className="h-5 w-5 text-teal" />
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-bold text-foreground">Episode {n}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    Out {date}
                  </span>
                </span>
              </li>
            ))}
          </ul>
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
              <Link to={ctaHref}>Get started</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-64 rounded-full">
              <Link to="/child-maintenance-calculator">Try the calculator</Link>
            </Button>
          </div>
          <WebsiteOnly fallback={<p className="mt-6 text-sm text-muted-foreground">Free to use. Paying each other back through the app costs £2.99 per transaction. Some features are part of Collabor8 Premium.</p>}>
          <p className="mt-6 text-sm text-muted-foreground">
            Free to use. Paying each other back through the app costs £2.99 per transaction. Premium features such as the AI mediator in chat cost £4.99 a month, paid yearly.
          </p>
          </WebsiteOnly>
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
            <Link to="/resources/child-maintenance-guide" className="hover:text-foreground">
              Maintenance Guide
            </Link>
            <Link to="/podcast" className="hover:text-foreground">
              The Blog
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
      </div>
    <FooterResources />
        <FooterContact />
    </footer>
  </div>
  );
};

export default Podcast;
