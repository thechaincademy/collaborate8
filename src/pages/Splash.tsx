import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";

const Splash = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Get Started - Collabor8</title>
        <meta name="description" content="Create your account or log in to Collabor8. The app helping co-parents manage child maintenance payments with ease." />
        <link rel="canonical" href="https://collaborate8.com/splash" />
      </Helmet>
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background px-6">
      {/* Logo/Brand Area */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center"
        >
          {/* Logo placeholder */}
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-foreground">
            <span className="text-3xl font-bold text-background">C8</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">collabor8</h1>
          <p className="mt-2 text-muted-foreground">Co-parenting made simple</p>
        </motion.div>
      </div>

      {/* Bottom Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="pb-8"
      >
        <Button
          onClick={() => navigate("/signup")}
          className="mb-3 w-full"
          size="lg"
        >
          Create Account
        </Button>
        <Button
          onClick={() => navigate("/login")}
          variant="outline"
          className="w-full"
          size="lg"
        >
          Log In
        </Button>
      </motion.div>
    </div>
    </>
  );
};

export default Splash;
