import lawtechukLogo from "@/assets/lawtechuk-logo.webp.asset.json";
import hackneyLogo from "@/assets/hackney-logo.jpg.asset.json";

const TrustedBy = () => {
  const logoClass =
    "grayscale opacity-60 transition-opacity hover:opacity-100 max-h-10 w-auto object-contain";

  return (
    <section
      className="w-full border-t py-10"
      style={{
        backgroundColor: "hsl(150 3% 96%)",
        borderTopColor: "hsl(var(--teal))",
        borderTopWidth: "1px",
      }}
      aria-label="Trusted by"
    >
      <div className="mx-auto max-w-5xl px-6 text-center">
        <p className="text-sm text-muted-foreground">
          Trusted by leading charities, firms, councils and organisations across the UK.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-16 gap-y-6">
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
            <span className="mt-0.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Council
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustedBy;
