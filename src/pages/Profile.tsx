import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Mail, CreditCard, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useStripePayments, useStripeConnect } from "@/hooks/useStripe";

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading } = useProfile();
  const { signOut } = useAuth();
  const { cards, fetchCards, setupCard, cardsLoading, loading: stripeLoading } = useStripePayments();
  const { checkAccountStatus, startOnboarding, loading: connectLoading } = useStripeConnect();
  const [connectStatus, setConnectStatus] = useState<string>("loading");

  useEffect(() => {
    fetchCards();
    checkAccountStatus().then((s) => {
      setConnectStatus(s?.status ?? "not_created");
    });
  }, []);

  const isContentLoading = loading || cardsLoading || connectStatus === "loading";

  if (isContentLoading) {
    return (
      <div className="mx-auto min-h-screen max-w-md bg-background">
        <div className="px-6 pt-4">
          <div className="mb-6 flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center">
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
            <h1 className="text-xl font-semibold text-foreground">Profile</h1>
          </div>
        </div>
        <div className="mb-8 flex flex-col items-center px-6">
          <Skeleton className="mb-4 h-24 w-24 rounded-full" />
          <Skeleton className="mb-2 h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="px-6 space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <Skeleton className="mb-3 h-4 w-28" />
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "User";
  const email = user?.email || "";
  const isManaging = profile?.role === "managing";

  const handleSetupCard = async () => {
    const result = await setupCard();
    if (result?.url) window.open(result.url, "_blank");
  };

  const handleConnectOnboarding = async () => {
    const result = await startOnboarding();
    if (result?.url) window.open(result.url, "_blank");
  };

  const profileSections = [
    {
      title: "Personal Information",
      items: [
        { icon: User, label: "Full Name", value: fullName },
        { icon: Mail, label: "Email", value: email },
      ],
    },
    {
      title: "Co-Parent",
      items: [
        {
          icon: Users,
          label: "Status",
          value: profile?.coparent_id ? "Connected" : "Not connected",
        },
      ],
    },
    // Payment Card (to SEND payments) — for ALL users
    {
      title: "Payment Card (Send)",
      subtitle: "Add a card to send payments to your co-parent",
      items: cards.length > 0
        ? cards.map((c) => ({
            icon: CreditCard,
            label: `${c.brand.charAt(0).toUpperCase() + c.brand.slice(1)}`,
            value: `****${c.last4} (${c.expMonth}/${c.expYear})`,
          }))
        : [
            {
              icon: CreditCard,
              label: "Card",
              value: "Not added",
              action: handleSetupCard,
              actionLabel: "Add Card",
            },
          ],
    },
    // Payout Account (to RECEIVE payments) — for ALL users
    {
      title: "Payout Account (Receive)",
      subtitle: "Set up your account to receive payments from your co-parent",
      items: [
        {
          icon: CreditCard,
          label: "Stripe Connect",
          value:
            connectStatus === "complete"
              ? "Active"
              : connectStatus === "pending_capabilities"
                ? "Under review"
                : connectStatus === "pending"
                  ? "Pending"
                  : "Not set up",
          sublabel:
            connectStatus === "pending_capabilities"
              ? "Verification may take a few minutes or hours"
              : undefined,
          action: connectStatus === "not_created" || connectStatus === "pending" ? handleConnectOnboarding : undefined,
          actionLabel: connectStatus === "not_created" || connectStatus === "pending" ? "Set Up" : undefined,
        },
      ],
    },
    {
      title: "Account",
      items: [
        { icon: Shield, label: "Role", value: isManaging ? "Managing Parent" : "Viewing Parent" },
      ],
    },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background">
      <div className="px-6 pt-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-4"
        >
          <button onClick={() => { if (window.history.length > 2) { navigate(-1); } else { navigate("/dashboard"); } }} className="flex h-10 w-10 items-center justify-center">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-xl font-semibold text-foreground">Profile</h1>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8 flex flex-col items-center px-6"
      >
        <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
          <User className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">{fullName}</h2>
        <p className="text-muted-foreground">{email}</p>
        <p className="mt-1 text-xs text-muted-foreground capitalize">
          {isManaging ? "Managing Parent" : "Viewing Parent"}
        </p>
      </motion.div>

      <div className="px-6">
        {profileSections.map((section, sectionIndex) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + sectionIndex * 0.1 }}
            className="mb-6"
          >
            <h3 className="mb-1 text-sm font-medium text-muted-foreground">
              {section.title}
            </h3>
            {(section as any).subtitle && (
              <p className="mb-2 text-xs text-muted-foreground">{(section as any).subtitle}</p>
            )}
            <div className="overflow-hidden rounded-2xl bg-card">
              {section.items.map((item: any, index: number) => (
                <div
                  key={item.label + index}
                  className={`flex w-full items-center justify-between p-4 ${
                    index !== section.items.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-foreground">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="text-sm text-muted-foreground">{item.value}</span>
                      {item.sublabel && (
                        <p className="text-[10px] text-muted-foreground">{item.sublabel}</p>
                      )}
                    </div>
                    {item.action && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={item.action}
                        className="ml-2 h-7 text-xs"
                        disabled={stripeLoading || connectLoading}
                      >
                        {item.actionLabel || "Go"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="px-6 pb-8"
      >
        <Button onClick={handleSignOut} variant="outline" className="mb-3 w-full">
          Sign Out
        </Button>
        <Button variant="ghost" className="w-full text-destructive hover:text-destructive">
          Delete Account
        </Button>
      </motion.div>
    </div>
  );
};

export default Profile;
