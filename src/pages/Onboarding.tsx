import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles, Image } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";

const features = [
  { icon: Sparkles, text: "Automated on-time payments" },
  { icon: Sparkles, text: "Reminders to prevent missed payments" },
  { icon: Sparkles, text: "Connect your bank account to Medi8" },
  { icon: Sparkles, text: "Payment records and statements" },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<"annual" | "monthly">("annual");
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleSubscribe = () => {
    navigate("/login");
  };

  return (
    <MobileLayout showNav={true}>
      <div className="flex min-h-screen flex-col px-6 pt-12">
        {/* Slides */}
        <AnimatePresence mode="wait">
          {currentSlide === 0 ? (
            <motion.div
              key="slide-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-1 flex-col"
            >
              {/* Image Placeholder */}
              <div className="mb-8 flex flex-1 items-center justify-center">
                <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-card">
                  <Image className="h-16 w-16 text-muted-foreground/50" />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="slide-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-1 flex-col"
            >
              {/* Features Grid */}
              <div className="mb-8 grid grid-cols-2 gap-4 pt-8">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.text}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex flex-col gap-2"
                  >
                    <Sparkles className="h-5 w-5 text-foreground" />
                    <p className="text-sm font-medium text-foreground">{feature.text}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Slide Indicators */}
        <div className="mb-8 flex justify-center gap-2">
          <button
            onClick={() => setCurrentSlide(0)}
            className={`h-1.5 rounded-full transition-all ${
              currentSlide === 0 ? "w-8 bg-foreground" : "w-1.5 bg-muted-foreground/30"
            }`}
          />
          <button
            onClick={() => setCurrentSlide(1)}
            className={`h-1.5 rounded-full transition-all ${
              currentSlide === 1 ? "w-8 bg-foreground" : "w-1.5 bg-muted-foreground/30"
            }`}
          />
        </div>

        {/* Bottom Section - Fixed */}
        <div className="pb-8">
          {/* Title */}
          <h1 className="mb-6 text-3xl font-bold text-foreground">
            Create a wallet with Medi8 subscription
          </h1>

          {/* Pricing Cards */}
          <div className="mb-6 grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedPlan("annual")}
              className={`rounded-2xl border-2 p-4 text-left transition-all ${
                selectedPlan === "annual"
                  ? "border-foreground bg-card"
                  : "border-transparent bg-card"
              }`}
            >
              <p className="text-2xl font-bold text-foreground">£49.99</p>
              <p className="font-medium text-foreground">Annually</p>
              <p className="mt-2 text-sm text-muted-foreground">Save 15%</p>
            </button>

            <button
              onClick={() => setSelectedPlan("monthly")}
              className={`rounded-2xl border-2 p-4 text-left transition-all ${
                selectedPlan === "monthly"
                  ? "border-foreground bg-card"
                  : "border-transparent bg-card"
              }`}
            >
              <p className="text-2xl font-bold text-foreground">£4.99</p>
              <p className="font-medium text-foreground">Monthly</p>
              <p className="mt-2 text-sm text-muted-foreground">Start Today</p>
            </button>
          </div>

          {/* CTA Button */}
          <Button
            onClick={handleSubscribe}
            className="mb-4 w-full"
            size="lg"
          >
            {currentSlide === 0 ? "Create & Subscribe" : "Sign Up & Subscribe"}
          </Button>

          {/* Links */}
          <div className="flex justify-between text-sm">
            <button className="font-medium text-foreground">Restore Purchase</button>
            <button className="text-muted-foreground">Terms of Services</button>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Onboarding;
