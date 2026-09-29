import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ONBOARDING_STEPS, readTutorialState, writeTutorialState } from "./OnboardingTutorial";

/** Floating "Done? Next step" pill shown on in-app pages while the tutorial is in progress. */
const TutorialNextPill = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  const state = readTutorialState(user.id);
  if (!state || state.done || state.index >= ONBOARDING_STEPS.length) return null;

  const next = () => {
    writeTutorialState(user.id, { done: false, index: state.index + 1 });
    navigate("/dashboard");
  };

  return (
    <button
      onClick={next}
      className="fixed bottom-24 right-4 z-40 flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-lg transition-transform active:scale-95"
    >
      Done? Next step ({state.index + 1} of {ONBOARDING_STEPS.length})
      <ArrowRight className="h-3.5 w-3.5" />
    </button>
  );
};

export default TutorialNextPill;
