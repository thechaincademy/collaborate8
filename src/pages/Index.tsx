import { Helmet } from "react-helmet-async";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/sections/HeroSection";
import ProblemSection from "@/components/sections/ProblemSection";
import FeaturesSection from "@/components/sections/FeaturesSection";
import PricingSection from "@/components/sections/PricingSection";
import TestimonialsSection from "@/components/sections/TestimonialsSection";
import CTASection from "@/components/sections/CTASection";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Medi8 - UK's First Digital Child Maintenance Platform</title>
        <meta 
          name="description" 
          content="Simplify child maintenance payments for separated parents. Track expenses, schedule payments, and reduce conflict with Medi8's secure, low-cost platform." 
        />
        <meta name="keywords" content="child maintenance, separated parents, co-parenting, family finance, UK fintech" />
        <link rel="canonical" href="https://medi8.co.uk" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Medi8 - Child Maintenance, Simplified" />
        <meta property="og:description" content="The modern way for separated parents to manage child maintenance payments." />
        <meta property="og:type" content="website" />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Medi8",
            "applicationCategory": "FinanceApplication",
            "description": "Digital child maintenance platform for separated parents in the UK",
            "offers": {
              "@type": "Offer",
              "price": "49",
              "priceCurrency": "GBP"
            }
          })}
        </script>
      </Helmet>

      <main className="min-h-screen">
        <Navbar />
        <HeroSection />
        <ProblemSection />
        <FeaturesSection />
        <TestimonialsSection />
        <PricingSection />
        <CTASection />
        <Footer />
      </main>
    </>
  );
};

export default Index;
