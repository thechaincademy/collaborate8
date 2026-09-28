import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import TopBanner from "@/components/TopBanner";

const paragraphs = [
  "Collabor8 was built from personal experience.",
  "I am Jade, a single mother who spent five years navigating the UK family court system. Throughout that time, one thing became clear. The hardest conversation I faced was not the legal process. It was money. What one parent owed the other. How shared costs would be managed. How to even begin that conversation without spending thousands in mediation or solicitor fees, without it becoming something else entirely.",
  "I looked for somewhere to have it. A neutral space. Somewhere separate from the parenting conversation, the legal conversation and everything else. Somewhere that was just for the money. It did not exist.",
  "So Rafa and I built it.",
  "Rafa is my co-founder and the technical mind behind Collabor8. A software engineer who has built over 250 platforms professionally, he built every part of this product from the ground up. Between us we bring the lived experience and the technical expertise that this problem deserves.",
  "Our mission is simple. We want to make it easier for separated parents to talk about money. Not because it is easy. It is one of the hardest conversations parents face. But because when parents can discuss finances openly and constructively, children benefit. Less conflict at home. More stability. A better environment for children to grow up in.",
  "Collabor8 gives separated parents a dedicated space to discuss finances, manage child maintenance and sort shared expenses away from everything else in their lives. Whether you are newly separated or have been managing things for years, Collabor8 gives you somewhere to start.",
  "We built this because we believe separated parents deserve better tools. And their children deserve parents who have somewhere proper to have this conversation.",
];

const founders = [
  { name: "Jade Ollivierre", role: "Co-Founder and CEO", initials: "JO" },
  { name: "Rafa Azevedo", role: "Co-Founder and CTO", initials: "RA" },
];

const About = () => (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>About Us | Collabor8</title>
      <meta name="description" content="Collabor8 was built from personal experience by co-founders Jade and Rafa to help separated parents talk about money." />
      <link rel="canonical" href="https://collaborate8.com/about" />
    </Helmet>
    <TopBanner />

    <section className="w-full bg-navy px-6 py-20 text-center md:py-28">
      <h1 className="text-4xl font-bold text-navy-foreground md:text-5xl">About Us.</h1>
      <p className="mt-4 text-lg text-teal md:text-xl" style={{ filter: "brightness(1.8)" }}>
        Built from personal experience. Built for you.
      </p>
    </section>

    <section className="w-full bg-background px-6 py-16 md:py-24">
      <div className="mx-auto max-w-[780px] space-y-6 text-base leading-relaxed text-foreground md:text-lg">
        {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
      </div>
    </section>

    <section className="w-full bg-navy px-6 py-16 md:py-20">
      <div className="mx-auto grid max-w-3xl grid-cols-1 gap-10 md:grid-cols-2">
        {founders.map((f) => (
          <div key={f.name} className="flex flex-col items-center text-center">
            <div className="flex h-32 w-32 items-center justify-center rounded-full border-2 border-teal bg-navy-foreground/10">
              <span className="text-2xl font-bold text-navy-foreground">{f.initials}</span>
            </div>
            <h2 className="mt-5 text-xl font-bold text-navy-foreground">{f.name}</h2>
            <p className="mt-1 text-teal" style={{ filter: "brightness(1.8)" }}>{f.role}</p>
          </div>
        ))}
      </div>
    </section>

    <section className="w-full bg-teal px-6 py-16 text-center md:py-20">
      <h2 className="text-3xl font-bold text-teal-foreground md:text-4xl">Ready to start the conversation?</h2>
      <Link
        to="/#download"
        className="mt-8 inline-flex items-center justify-center rounded-full bg-gold px-8 py-3 text-base font-semibold text-navy transition-opacity hover:opacity-90"
      >
        Download Collabor8
      </Link>
    </section>
  </div>
);

export default About;
