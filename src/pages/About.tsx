import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import TopBanner from "@/components/TopBanner";
import heroImg from "@/assets/about-hero.jpg";

const fade = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.3 },
};

const blocks = [
  {
    n: "01",
    label: "The problem",
    bg: "bg-background",
    paras: [
      "Collabor8 was built from personal experience.",
      "I am Jade, a single mother who spent five years navigating the UK family court system. Throughout that time, one thing became clear. The hardest conversation I faced was not the legal process. It was money. What one parent owed the other. How shared costs would be managed. How to even begin that conversation without spending thousands in mediation or solicitor fees, without it becoming something else entirely.",
      "I looked for somewhere to have it. A neutral space. Somewhere separate from the parenting conversation, the legal conversation and everything else. Somewhere that was just for the money. It did not exist.",
    ],
  },
  {
    n: "02",
    label: "The solution",
    bg: "bg-mist",
    paras: [
      "So Rafa and I built it.",
      "Rafa is my co-founder and the technical mind behind Collabor8. A software engineer who has built over 250 platforms professionally, he built every part of this product from the ground up. Between us we bring the lived experience and the technical expertise that this problem deserves.",
    ],
  },
  {
    n: "03",
    label: "The mission",
    bg: "bg-background",
    paras: [
      "Our mission is simple. We want to make it easier for separated parents to talk about money. Not because it is easy. It is one of the hardest conversations parents face. But because when parents can discuss finances openly and constructively, children benefit. Less conflict at home. More stability. A better environment for children to grow up in.",
      "Collabor8 gives separated parents a dedicated space to discuss finances, manage child maintenance and sort shared expenses away from everything else in their lives. Whether you are newly separated or have been managing things for years, Collabor8 gives you somewhere to start.",
      "We built this because we believe separated parents deserve better tools. And their children deserve parents who have somewhere proper to have this conversation.",
    ],
  },
];


const section = "px-6 py-10 md:py-20";

const Block = ({ b }: { b: (typeof blocks)[number] }) => (
  <section className={`${b.bg} ${section}`}>
    <motion.div {...fade} className="mx-auto flex max-w-4xl flex-col gap-6 md:flex-row md:gap-12">
      <div className="shrink-0 md:w-32">
        <span className="block text-6xl font-bold leading-none text-gold md:text-7xl">{b.n}</span>
        <span className="mt-2 block text-xs font-semibold uppercase tracking-widest text-teal">{b.label}</span>
      </div>
      <div className="space-y-5 text-base leading-[1.7] text-body-ink">
        {b.paras.map((p, i) => <p key={i}>{p}</p>)}
      </div>
    </motion.div>
  </section>
);

const Rule = () => <div className="mx-auto h-px w-full max-w-4xl bg-teal/60" />;

const About = () => (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>About Us | Collabor8</title>
      <meta name="description" content="Collabor8 was built from personal experience by co-founders Jade and Rafa to help separated parents talk about money." />
      <link rel="canonical" href="https://collaborate8.com/about" />
    </Helmet>
    <TopBanner />

    {/* Hero */}
    <section className="grid w-full bg-navy md:grid-cols-2">
      <motion.div {...fade} className="flex flex-col justify-center px-6 py-10 md:px-16 md:py-20">
        <h1 className="text-5xl font-bold text-navy-foreground md:text-7xl">About Us</h1>
        <p className="mt-5 text-xl font-medium text-teal brightness-[1.8] md:text-2xl">
          Built from personal experience. Built for you.
        </p>
      </motion.div>
      <div className="relative min-h-[280px] md:min-h-[480px]">
        <img
          src={heroImg}
          alt="Illustration of two parents walking hand in hand with their child"
          width={1920}
          height={1440}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </section>

    {/* Story */}
    <Block b={blocks[0]} />
    <Rule />
    <Block b={blocks[1]} />

    {/* Pull quote */}
    <section className={`bg-cream ${section}`}>
      <motion.blockquote {...fade} className="relative mx-auto max-w-3xl text-center">
        <span aria-hidden className="block font-serif text-8xl leading-none text-teal md:text-9xl">&ldquo;</span>
        <p className="-mt-6 text-[1.4rem] font-medium italic leading-relaxed text-navy md:-mt-10">
          Money after separation is one of the most taboo conversations parents face. We built Collabor8 because we believe it does not have to be.
        </p>
        <span aria-hidden className="mt-2 block font-serif text-8xl leading-[0.5] text-teal md:text-9xl">&rdquo;</span>
      </motion.blockquote>
    </section>


    {/* CTA */}
    <section className={`bg-navy text-center ${section}`}>
      <motion.div {...fade}>
        <h2 className="text-3xl font-bold text-navy-foreground md:text-5xl">Ready to start the conversation?</h2>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link to="/#download" className="inline-flex w-64 items-center justify-center rounded-full bg-gold px-6 py-3 font-semibold text-navy transition-opacity hover:opacity-90">
            Download on the App Store
          </Link>
          <Link to="/#download" className="inline-flex w-64 items-center justify-center rounded-full border-2 border-navy-foreground px-6 py-3 font-semibold text-navy-foreground transition-colors hover:bg-navy-foreground/10">
            Get it on Google Play
          </Link>
        </div>
        <p className="mt-6 text-sm text-navy-foreground/80">Free to download. Low cost to use. Built for you.</p>
      </motion.div>
    </section>
  </div>
);

export default About;
