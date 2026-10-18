import lawtechukLogo from "@/assets/lawtechuk-logo.png.asset.json";
import hackneyLogo from "@/assets/hackney-logo.png.asset.json";

const TrustedBy = () => {
  const logoClass =
    "grayscale opacity-60 transition-opacity duration-300 hover:opacity-100 h-8 md:h-10 w-auto object-contain";

  return (
    <section
      className="w-full py-12 md:py-14"
      style={{
        backgroundColor: "hsl(150 3% 96%)",
        boxShadow: "inset 0 1px 0 0 hsl(var(--teal))",
      }}
      aria-label="Trusted by"
    >
      <div className="mx-auto max-w-5xl px-6 text-center">
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Trusted by leading charities, firms, councils and organisations across the UK.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-20 gap-y-8">
          <div className="flex items-center">
            <img
              src={lawtechukLogo.url}
              alt="LawtechUK logo"
              className={logoClass}
              loading="lazy"
            />
          </div>
          <div className="flex flex-col items-center">
            <img
              src={hackneyLogo.url}
              alt="Hackney Council logo"
              className={`${logoClass} mix-blend-multiply`}
              loading="lazy"
            />
            <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              Council
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustedBy;
