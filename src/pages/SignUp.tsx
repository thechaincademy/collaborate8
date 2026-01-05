import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Lock, Search, ScanLine, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SignUpStep = "credentials" | "address" | "identity" | "result";
type ResultType = "success" | "review" | "documents" | "declined";

const SignUp = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<SignUpStep>("credentials");
  const [resultType, setResultType] = useState<ResultType>("success");

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");

  const isCredentialsValid = email.length > 0 && password.length >= 8;
  const isAddressValid = address.length > 0;

  const handleBack = () => {
    if (step === "credentials") {
      navigate("/");
    } else if (step === "address") {
      setStep("credentials");
    } else if (step === "identity") {
      setStep("address");
    }
  };

  const handleCredentialsSubmit = () => {
    if (isCredentialsValid) {
      setStep("address");
    }
  };

  const handleAddressSubmit = () => {
    if (isAddressValid) {
      setStep("identity");
    }
  };

  const handleIdentitySubmit = () => {
    // Simulate verification - for demo, always success
    setResultType("success");
    setStep("result");
  };

  const getStepIndex = () => {
    switch (step) {
      case "credentials": return 0;
      case "address": return 2;
      case "identity": return 3;
      case "result": return 3;
      default: return 0;
    }
  };

  const renderProgressBar = () => {
    const currentStep = getStepIndex();
    return (
      <div className="flex items-center gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= currentStep ? "bg-foreground" : "bg-muted"
            }`}
          />
        ))}
      </div>
    );
  };

  const renderCredentials = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-1 flex-col"
    >
      <h1 className="mb-8 text-3xl font-bold text-foreground">
        Create a Medi8 account
      </h1>

      <div className="flex flex-col gap-4">
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-14 rounded-2xl border-border bg-background pl-12 text-foreground placeholder:text-muted-foreground focus:border-foreground"
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-14 rounded-2xl border-border bg-background pl-12 text-foreground placeholder:text-muted-foreground focus:border-foreground"
          />
        </div>

        <p className="text-sm text-muted-foreground">
          Password should contain both letters and numbers, with minimum length of 8 characters.
        </p>
      </div>

      <div className="flex-1" />

      <div className="pb-8 pt-6">
        <Button
          onClick={handleCredentialsSubmit}
          className="mb-4 w-full"
          size="lg"
          disabled={!isCredentialsValid}
        >
          Continue
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          By proceeding, you accept to our{" "}
          <button type="button" className="font-semibold text-foreground">Privacy Policy</button>
          {" "}and{" "}
          <button type="button" className="font-semibold text-foreground">Terms of Services</button>.
        </p>
      </div>
    </motion.div>
  );

  const renderAddress = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-1 flex-col"
    >
      <h1 className="text-3xl font-bold text-foreground">Add your address</h1>
      <p className="mt-2 text-muted-foreground">Use the one that's on your bills.</p>

      <div className="mt-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Start typing your street number"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="h-14 rounded-2xl border-border bg-background pl-12 text-foreground placeholder:text-muted-foreground focus:border-foreground"
          />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Example: 123 Main Street, London, UK 12345
        </p>
      </div>

      <div className="flex-1" />

      <div className="pb-8 pt-6">
        <Button
          onClick={handleAddressSubmit}
          className="w-full"
          size="lg"
          disabled={!isAddressValid}
        >
          Continue
        </Button>
      </div>
    </motion.div>
  );

  const renderIdentity = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-1 flex-col"
    >
      <h1 className="text-3xl font-bold text-foreground">Verify your identity</h1>
      <p className="mt-2 text-muted-foreground">
        Financial regulations require us to verify your ID. This helps prevent someone else from creating a Medi8 account in your name.
      </p>

      <div className="mt-12 flex flex-col gap-6">
        <div className="flex items-start gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
            1
          </div>
          <p className="pt-1 text-foreground">Prepare a valid government-issued identity document.</p>
        </div>
        <div className="flex items-start gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
            2
          </div>
          <p className="pt-1 text-foreground">Make sure you are in a well-lit room.</p>
        </div>
        <div className="flex items-start gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
            3
          </div>
          <p className="pt-1 text-foreground">Be prepared to take a photo of your document.</p>
        </div>
      </div>

      <div className="flex-1" />

      <div className="pb-8 pt-6">
        <Button
          onClick={handleIdentitySubmit}
          className="mb-4 w-full"
          size="lg"
        >
          <ScanLine className="mr-2 h-5 w-5" />
          Upload Your ID
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Your photo ID captured during the ID verification process may constitute biometric data. Please see our{" "}
          <button type="button" className="font-semibold text-foreground">Privacy Policy</button>
          {" "}for more information.
        </p>
      </div>
    </motion.div>
  );

  const renderResult = () => {
    const content: Record<ResultType, { title: string; description: string; buttonText?: string; showButton?: boolean; showSteps?: boolean }> = {
      success: {
        title: "Your Medi8 account is ready!",
        description: "Ac ut vitae a amet donec etiam lorem at neque. Risus morbi nec facilisis elementum congue.",
        buttonText: "Start Using Medi8",
        showButton: true,
      },
      review: {
        title: "We'll back soon!",
        description: "We need a bit more time to review your application and make sure you can enjoy using Medi8 according with all legal regulations.",
        showSteps: true,
      },
      documents: {
        title: "Bank statement required",
        description: "Ac ut vitae a amet donec etiam lorem at neque. Risus morbi nec facilisis elementum congue.",
        buttonText: "Upload File",
        showButton: true,
      },
      declined: {
        title: "Your application has been declined",
        description: "Hendrerit amet nam placerat mi faucibus donec vitae. Aliquet sit volutpat varius venenatis. Gravida et vulputate at cursus purus iaculis.",
      },
    };

    const current = content[resultType];

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-1 flex-col"
      >
        {/* Image placeholder area */}
        <div className="flex flex-1 items-center justify-center bg-muted/30">
          <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-card shadow-sm">
            <Image className="h-12 w-12 text-muted-foreground/50" />
          </div>
        </div>

        {/* Content area */}
        <div className="bg-background px-6 pb-8 pt-8">
          {resultType === "review" && renderProgressBar()}
          
          <h1 className="mt-4 text-3xl font-bold text-foreground">{current.title}</h1>
          <p className="mt-3 text-muted-foreground">{current.description}</p>

          {resultType === "review" && (
            <div className="mt-8 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                    1
                  </div>
                  <span className="text-foreground">Create your account</span>
                </div>
                <span className="font-semibold text-foreground">Completed</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                    2
                  </div>
                  <span className="text-foreground">Set up your profile</span>
                </div>
                <span className="font-semibold text-foreground">Completed</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                    3
                  </div>
                  <span className="text-foreground">Verify your identity</span>
                </div>
                <span className="font-semibold text-muted-foreground">In Review</span>
              </div>
            </div>
          )}

          {current.showButton && (
            <Button
              onClick={() => navigate("/dashboard")}
              className="mt-6 w-full"
              size="lg"
            >
              {current.buttonText}
            </Button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      {step !== "result" && (
        <div className="px-6 pt-4">
          {/* Header with back button and progress */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <button
              onClick={handleBack}
              className="mb-4 flex h-10 w-10 items-center justify-center"
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
            {renderProgressBar()}
          </motion.div>
        </div>
      )}

      <div className={`flex flex-1 flex-col ${step !== "result" ? "px-6" : ""}`}>
        <AnimatePresence mode="wait">
          {step === "credentials" && renderCredentials()}
          {step === "address" && renderAddress()}
          {step === "identity" && renderIdentity()}
          {step === "result" && renderResult()}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SignUp;
