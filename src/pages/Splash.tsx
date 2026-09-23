import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import splashFamily from "@/assets/splash-family.jpg";

const Splash = () => {
  const navigate = useNavigate();



  return (
    <>
      <Helmet>
        <title>Get Started - Collabor8</title>
        <meta name="description" content="Create your account or log in to Collabor8. The app helping co-parents manage child maintenance payments with ease." />
        <link rel="canonical" href="https://collaborate8.com/splash" />
      </Helmet>
      <div className="mx-auto flex min-h-screen max-w-md md:max-w-lg flex-col bg-background px-6">
        <div className="flex flex-1 flex-col items-center justify-center pt-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center"
          >
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-foreground">
              <span className="text-2xl font-bold text-background">C8</span>
            </div>
            <h1 className="text-center text-2xl font-bold text-foreground">Collabor8</h1>
            <p className="mt-1 text-center text-muted-foreground">Co-parenting made simple</p>

            <div className="mt-6 w-full overflow-hidden rounded-3xl border border-border bg-card">
              <img
                src={splashFamily}
                alt="A parent and child sharing a warm moment together"
                width={1024}
                height={1024}
                className="h-52 w-full object-cover"
              />
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3 pb-8 pt-8"
        >
          <Button onClick={() => navigate("/signup")} className="w-full" size="lg">
            Create account
          </Button>
          <Button onClick={() => navigate("/login")} variant="outline" className="w-full" size="lg">
            Log in
          </Button>
        </motion.div>
      </div>
    </>
  );
};

export default Splash;
